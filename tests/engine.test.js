'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const Data=require('../src/data.js'),Shell=require('../src/shell.js'),Engine=require('../src/engine.js');
function solve(lesson, separator='\\') {
 const cp=Engine.fresh(lesson);
 for(const raw of lesson.solution) {
  const line=raw.replace(/\\/g,separator), entry=Shell.run(cp.session,line);
  cp.evidence=Engine.observe(lesson,entry,cp.evidence);
 }
 cp.answer=lesson.question?.answer || '';
 return cp;
}
for(const l of Data.lessons) test(`${l.id}: fresh fails, actual solution passes, wrong interpretation fails, save restores`,()=>{
 const fresh=Engine.fresh(l);
 assert.equal(Engine.grade(l,fresh.session,l.question?.answer,fresh.evidence).ok,false,'Fresh lesson must require work');
 const cp=solve(l);
 assert.equal(Engine.grade(l,cp.session,cp.answer,cp.evidence).ok,true,JSON.stringify(cp.session.history.map(h=>({line:h.line,error:h.stderr})))+'\n'+JSON.stringify(Engine.grade(l,cp.session,cp.answer,cp.evidence)));
 for(const wrong of l.question?.choices.filter(c=>c.id!==l.question.answer)||[]) assert.equal(Engine.grade(l,cp.session,wrong.id,cp.evidence).ok,false);
 const state=Engine.empty();state.checkpoints[l.id]=cp;state.completed[l.id]={at:'2026-10-28',hints:0,solutionUsed:false};
 const restored=Engine.parse(JSON.stringify(state));
 assert.equal(Engine.grade(l,restored.checkpoints[l.id].session,cp.answer,restored.checkpoints[l.id].evidence).ok,true);
});
test('all authored path solutions also run with Japanese yen and fullwidth yen',()=>{
 for(const l of Data.lessons.filter(l=>l.solution.some(c=>c.includes('\\')))) for(const separator of ['¥','￥','/']) {
  const cp=solve(l,separator);assert.equal(Engine.grade(l,cp.session,cp.answer,cp.evidence).ok,true,`${l.id} separator ${separator}`);
 }
});
test('curriculum has complete bilingual instructions, varied choices and five tracks',()=>{
 assert.equal(Data.tracks.length,5);assert.equal(Data.lessons.length,50);assert.equal(new Set(Data.lessons.map(l=>l.id)).size,50);
 const localized=v=>{assert.equal(typeof v.ja,'string');assert.ok(v.ja.length);assert.equal(typeof v.en,'string');assert.ok(v.en.length);};
 const correctPositions=new Set();
 for(const l of Data.lessons) {
  for(const v of [l.title,l.goal,l.task,l.success,l.example.note,...l.explanation,...l.hints])localized(v);
  assert.equal(l.hints.length,3);assert.ok(l.solution.length);assert.ok(Data.tracks.some(t=>t.id===l.track));
  if(l.question){localized(l.question.prompt);assert.equal(l.question.choices.length,3);correctPositions.add(l.question.choices.findIndex(c=>c.id===l.question.answer));for(const c of l.question.choices){localized(c.text);localized(c.feedback);}}
 }
 assert.equal(correctPositions.size,3);
});
test('unrelated output cannot satisfy command evidence; target matching is exact',()=>{
 const l={verify:{commands:[{name:'test-netconnection',contains:['10.20.0.1']}]}};
 const s=Shell.createSession();Shell.run(s,"Write-Output '10.20.0.1 True'");assert.equal(Engine.grade(l,s).ok,false);
 const entry={code:0,trace:[{name:'test-netconnection',code:0,args:['10.20.0.10'],output:'True',resolvedPaths:[]}]};
 assert.equal(Engine.observe(l,entry).commands[0],false);
});
test('evidence survives display history pruning; resetting starts a fresh environment',()=>{
 const l=Data.lessons[0],cp=solve(l);
 for(let i=0;i<90;i++){const entry=Shell.run(cp.session,`Write-Output 'practice ${i}'`);cp.evidence=Engine.observe(l,entry,cp.evidence);}
 assert.equal(Engine.grade(l,cp.session,cp.answer,cp.evidence).ok,true);
 assert.equal(Engine.grade(l,Engine.fresh(l).session,cp.answer).ok,false);
});
test('progress storage is independent and malformed or foreign imports are rejected',()=>{
 assert.equal(Engine.KEY,'powershellroom.progress.v1');assert.equal(Engine.empty().schema,'powershellroom.progress');
 assert.throws(()=>Engine.parse('{broken'));assert.throws(()=>Engine.parse(JSON.stringify({...Engine.empty(),schema:'windowsCLIroom.progress'})));
 assert.throws(()=>Engine.parse('{"schema":"powershellroom.progress","version":1,"completed":{"__proto__":{}},"checkpoints":{}}'));
 assert.throws(()=>Engine.parse(JSON.stringify({...Engine.empty(),checkpoints:{unknown:Engine.fresh(Data.lessons[0])}})));
});

test('property selection accepts reordered or spaced lists without changing the required fields',()=>{
 const l={verify:{pipelines:[[{name:'get-process'},{name:'select-object',contains:['ProcessName,Id']}]]}};
 for(const command of ['Get-Process | Select-Object Id,ProcessName','Get-Process | Select-Object Id, ProcessName','Get-Process | Select-Object -Property "Id, ProcessName"']){const s=Shell.createSession();Shell.run(s,command);assert.equal(Engine.grade(l,s).ok,true,command);}
 const s=Shell.createSession();Shell.run(s,'Get-Process | Select-Object ProcessName,CPU');assert.equal(Engine.grade(l,s).ok,false);
});
test('service recovery accepts the positional target but a WhatIf preview cannot complete it',()=>{
 const l=Data.lessons.find(l=>l.id==='start-service');assert.ok(l);
 for(const preview of [false,true]){const cp=Engine.fresh(l);for(const cmd of ['Get-Service Spooler','Start-Service Spooler'+(preview?' -WhatIf':''),'Get-Service Spooler']){const entry=Shell.run(cp.session,cmd);cp.evidence=Engine.observe(l,entry,cp.evidence);}assert.equal(Engine.grade(l,cp.session,l.question?.answer,cp.evidence).ok,!preview);}
});

function exercise(id, lines) {
 const lesson=Data.lessons.find(l=>l.id===id),cp=Engine.fresh(lesson);
 for(const line of lines){const entry=Shell.run(cp.session,line);cp.evidence=Engine.observe(lesson,entry,cp.evidence);}
 cp.answer=lesson.question?.answer || '';
 return {lesson,cp,grade:()=>Engine.grade(lesson,cp.session,cp.answer,cp.evidence)};
}
function assertSolved(id,lines) {
 const {lesson,cp,grade}=exercise(id,lines);
 assert.equal(grade().ok,true,`${id}: ${lines.join('; ')}\n${JSON.stringify(grade())}`);
 assert.equal(Engine.grade(lesson,cp.session,cp.answer).ok,true,'history alone retains alternate-solution evidence');
 const state=Engine.empty();state.checkpoints[id]=cp;
 const restored=Engine.parse(JSON.stringify(state)).checkpoints[id];
 assert.equal(Engine.grade(lesson,restored.session,restored.answer,restored.evidence).ok,true,'alternate solution survives save/restore');
 return {lesson,cp,grade};
}

test('memory grading accepts byte suffixes and either supported filter syntax',()=>{
 for(const condition of [
  'WorkingSet64 -gt 200MB','-Property WorkingSet64 -gt 204800KB',
  '{ $_.WorkingSet64 -gt 200MB }','{ $_.WorkingSet64 -gt 209715200 }',
  '{ [double] $_.WorkingSet64 -gt 0.1953125GB }'
 ])assertSolved('filter-memory',[`Get-Process | Where-Object ${condition} | Select-Object ProcessName,WorkingSet64`]);
});

test('filter grading preserves the property, operator and threshold even when output happens to match',()=>{
 for(const condition of ['WorkingSet64 -ge 200MB','WorkingSet64 -gt 199MB','CPU -gt 100','WorkingSet64 -gt 200KB']){
  const result=exercise('filter-memory',[`Get-Process | Where-Object ${condition} | Select-Object ProcessName,WorkingSet64`]);
  assert.equal(result.grade().ok,false,condition);
 }
 const check={verify:{commands:[{name:'where-object',contains:['WorkingSet64','-gt','209715200']}]}};
 const session=Shell.createSession();Shell.run(session,"Get-Process | Where-Object { $_.WorkingSet64 -gt '200MB' }");
 assert.equal(Engine.grade(check,session).ok,false,'a quoted suffix is a string, not a numeric unit');
});

test('large-file grading accepts the script-block form taught in the CSV lesson',()=>{
 for(const condition of ['Length -gt 200','{ $_.Length -gt 200 }'])
  assertSolved('large-files',[`Get-ChildItem C:\\Lab -File -Recurse | Where-Object ${condition} | Sort-Object Length -Descending`]);
 for(const condition of ['{ $_.Length -ge 200 }','{ $_.Length -gt 199 }'])
  assert.equal(exercise('large-files',[`Get-ChildItem C:\\Lab -File -Recurse | Where-Object ${condition} | Sort-Object Length -Descending`]).grade().ok,false);
});

test('DNS failure grading accepts positional names but requires an actual default-server failure',()=>{
 assertSolved('dns-failure',['Get-DnsClientServerAddress','Resolve-DnsName intranet.corp.example','Resolve-DnsName intranet.corp.example -Server 10.20.0.10']);
 for(const first of [
  'Resolve-DnsName intranet.corp.example -Server 192.0.2.53',
  'Resolve-DnsName intranet.corp.example -Invalid',
  'Resolve-DnsName unknown.corp.example',
  'Resolve-DnsName intranet.corp.example -Server 10.20.0.10'
 ])assert.equal(exercise('dns-failure',['Get-DnsClientServerAddress',first,'Resolve-DnsName intranet.corp.example -Server 10.20.0.10']).grade().ok,false,first);
});

test('web capstone accepts HEAD and positional URI while keeping failure before inspected response',()=>{
 const setup=['Resolve-DnsName intranet.corp.example','Test-NetConnection intranet.corp.example -Port 443'];
 for(const target of ['-Uri https://intranet.corp.example','https://intranet.corp.example'])for(const method of ['',' -Method Head']){
  const request=`Invoke-WebRequest ${target}${method}`;
  assertSolved('capstone-web-503',[...setup,request,request+' -SkipHttpErrorCheck | Select-Object StatusCode,Headers']);
 }
 const inspected='Invoke-WebRequest https://intranet.corp.example -Method Head -SkipHttpErrorCheck | Select-Object StatusCode,Headers';
 for(const first of [inspected,'Invoke-WebRequest https://intranet.corp.example -Method Post','Invoke-WebRequest https://example.com'])
  assert.equal(exercise('capstone-web-503',[...setup,first,inspected]).grade().ok,false,first);
 assert.equal(exercise('capstone-web-503',[...setup,inspected,'Invoke-WebRequest https://intranet.corp.example']).grade().ok,false,'reversed observations are incomplete');
});

test('stop-process accepts a verified process pipeline and still requires post-change observation',()=>{
 const result=exercise('stop-one-process',['Get-Process -Name NotesApp | Stop-Process']);
 assert.equal(result.grade().ok,false);
 const entry=Shell.run(result.cp.session,'Get-Process');
 result.cp.evidence=Engine.observe(result.lesson,entry,result.cp.evidence);
 assert.equal(result.grade().ok,true);
 assertSolved('stop-one-process',['Get-Process -Name NotesApp | Stop-Process','Get-Process']);
 assert.equal(exercise('stop-one-process',['Get-Process -Name NotesApp | Stop-Process -WhatIf','Get-Process']).grade().ok,false);
 assert.equal(exercise('stop-one-process',['Get-Process -Name NotesApp','Get-Process -Name explorer | Stop-Process','Get-Process']).grade().ok,false);
});

test('start-service and printing capstone accept pipeline targets and reject WhatIf-only changes',()=>{
 const printing=Data.lessons.find(l=>l.id==='capstone-printing');
 for(const preview of [false,true]){
  const start='Get-Service Spooler | Start-Service'+(preview?' -WhatIf':'');
  const service=exercise('start-service',[start,'Get-Service Spooler']);
  const capstone=exercise('capstone-printing',[printing.solution[0],start,...printing.solution.slice(3)]);
  assert.equal(service.grade().ok,!preview);
  assert.equal(capstone.grade().ok,!preview);
 }
 assertSolved('start-service',['Get-Service Spooler | Start-Service','Get-Service Spooler']);
 assertSolved('capstone-printing',[printing.solution[0],'Get-Service Spooler | Start-Service',...printing.solution.slice(3)]);
});

test('another pipeline change invalidates a previously saved post-change observation',()=>{
 const {lesson,cp}=assertSolved('start-service',['Get-Service Spooler | Start-Service','Get-Service Spooler']);
 const prior=JSON.parse(JSON.stringify(cp.evidence));
 Shell.run(cp.session,'Get-Service Spooler | Start-Service');
 assert.equal(Engine.grade(lesson,cp.session,cp.answer,prior).ok,false);
 Shell.run(cp.session,'Get-Service Spooler');
 assert.equal(Engine.grade(lesson,cp.session,cp.answer,prior).ok,true);
});

test('projected Id and Name properties bind pipeline targets without requiring the original object type',()=>{
 assertSolved('stop-one-process',['Get-Process NotesApp | Select-Object Id | Stop-Process','Get-Process']);
 assertSolved('start-service',['Get-Service Spooler | Select-Object Name | Start-Service','Get-Service Spooler']);
 const printing=Data.lessons.find(l=>l.id==='capstone-printing');
 assertSolved('capstone-printing',[printing.solution[0],'Get-Service Spooler | Select-Object Name | Start-Service',...printing.solution.slice(3)]);
 for(const lines of [
  ['Get-Service Spooler | Select-Object Name | Start-Service'],
  ['Get-Service Spooler | Select-Object Name | Start-Service -WhatIf','Get-Service Spooler'],
  ['Get-Service Spooler','Get-Service Dnscache | Select-Object Name | Start-Service','Get-Service Spooler']
 ])assert.equal(exercise('start-service',lines).grade().ok,false,lines.join('; '));
 const {lesson,cp}=assertSolved('start-service',['Get-Service Spooler | Select-Object Name | Start-Service','Get-Service Spooler']);
 Shell.run(cp.session,'Get-Service Spooler | Select-Object Name | Start-Service');
 assert.equal(Engine.grade(lesson,cp.session,cp.answer,cp.evidence).ok,false,'a later projected-target change needs another observation');
});

test('pipeline property binding retains value types, exact targets and explicit argument precedence',()=>{
 for(const [name,property,value,wrong] of [['start-service','Name','Spooler','Dnscache'],['stop-process','Id',4320,2080]]){
  const lesson={verify:{commands:[{name,contains:[String(value)],argsExcludes:['-WhatIf']}]}};
  const trace={name,args:[],code:0,inputType:'System.Management.Automation.PSCustomObject',input:'',output:'',inputObjects:[{[property]:value}]};
  const observed=overrides=>Engine.observe(lesson,{code:0,trace:[{...trace,...overrides}]}).commands[0];
  assert.equal(observed({}),true);
  assert.equal(observed({inputObjects:[{[property]:[value]}]}),false,'the simulator binds only scalar target properties');
  assert.equal(observed({inputObjects:[{[property]:value},{[property]:wrong}]}),false,'all targets must match');
  assert.equal(observed({args:['-'+property,String(wrong)]}),false,'explicit target overrides pipeline values');
  assert.equal(observed({args:[String(wrong)]}),false,'positional target overrides pipeline values');
  assert.equal(observed({args:['-'+property,String(value)],inputObjects:[{[property]:wrong}]}),true,'explicit matching target is sufficient');
  assert.equal(observed({args:['-WhatIf']}),false,'preview never satisfies an actual change');
 }
});

test('pipeline target evidence never uses display text, unrelated properties, or mixed targets',()=>{
 const lesson={verify:{commands:[{name:'start-service',contains:['Spooler']}]}};
 const trace={name:'start-service',args:[],code:0,inputType:'System.ServiceProcess.ServiceController',input:'Spooler',output:''};
 for(const inputObjects of [[{Name:'SpoolerBackup'}],[{DisplayName:'Spooler'}],[{Name:'Spooler'},{Name:'Dnscache'}],[]])
  assert.equal(Engine.observe(lesson,{code:0,trace:[{...trace,inputObjects}]}).commands[0],false);
 assert.equal(Engine.observe(lesson,{code:0,trace:[{...trace,inputObjects:[{Name:'Spooler'}]}]}).commands[0],true);
 assert.equal(Engine.observe(lesson,{code:0,trace:[{...trace,inputType:'System.String',inputObjects:['Spooler']}]}).commands[0],false);
});

test('quoted paths accept positional, Path and LiteralPath arguments',()=>{
 for(const parameter of ['','-Path ','-LiteralPath '])
  assertSolved('quoted-path',[`Get-Content ${parameter}'C:\\Lab\\Shared Files\\guide.txt'`]);
});

test('tail lesson accepts Select-Object Last as a complete alternative pipeline',()=>{
 assertSolved('tail-log',['Get-Content C:\\Lab\\Logs\\app.log | Select-Object -Last 2']);
 for(const lines of [
  ['Get-Content C:\\Lab\\Logs\\app.log | Select-Object -First 2'],
  ['Get-Content C:\\Lab\\Logs\\app.log | Select-Object -Last 3'],
  ['Get-Content C:\\Lab\\Logs\\app.log -Raw | Select-Object -Last 2'],
  ['Get-Content C:\\Lab\\Logs\\app.log',"Write-Output 'Job failed' 'Retry scheduled' | Select-Object -Last 2"]
 ])assert.equal(exercise('tail-log',lines).grade().ok,false,lines.join('; '));
});
