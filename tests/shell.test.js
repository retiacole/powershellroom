'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Shell=require('../src/shell.js');
const fresh=()=>Shell.createSession();
function ok(s,line){const r=Shell.run(s,line);assert.equal(r.code,0,line+'\n'+r.stderr);return r;}
const items=r=>r.trace.at(-1).objects;
const file=(s,path)=>Shell.listFiles(s).find(f=>f.path.toLowerCase()===path.toLowerCase());

test('fresh sessions have canonical paths and survive JSON restore',()=>{const s=fresh();assert.equal(Shell.restoreSession(JSON.parse(JSON.stringify(s))).cwd,s.cwd);assert.ok(Shell.listFiles(s).every(f=>/^[CD]:\\/.test(f.path)));assert.equal(file(s,'C:\\Lab\\readme.txt').content,'PowerShell practice lab.\nRead, filter, and verify.\n');});
test('aliases and mixed case resolve to cmdlets without losing trace identity',()=>{const r=ok(fresh(),'gCi -pAtH C:\\Lab -fIlE');assert.equal(r.trace[0].name,'get-childitem');assert.equal(items(r).length,4);assert.equal(items(r).find(x=>x.Name==='readme.txt').Length,51);});
test('all four path separators work for relative and quoted path input',()=>{for(const sep of ['\\','/','¥','￥']){const s=fresh();ok(s,'Set-Location C:'+sep+'Lab');const r=ok(s,'Get-Content "Shared Files'+sep+'guide.txt"');assert.match(r.stdout,/Quote paths/);assert.deepEqual(r.trace[0].resolvedPaths,['C:\\Lab\\Shared Files\\guide.txt']);}});
test('Get-ChildItem filters and recursively visits only selected subtree',()=>{const s=fresh();const a=ok(s,'Get-ChildItem C:\\Lab -File -Recurse -Filter *.log');assert.deepEqual(items(a).map(x=>x.Name),['app.log','archive.log']);const b=ok(s,'Get-ChildItem C:\\Lab\\Logs\\*.log');assert.equal(items(b).length,2);assert.ok(items(ok(s,'Get-ChildItem C:\\ -Directory')).some(x=>x.Name==='Lab'));});
test('file reads support line limits and raw preserves newlines',()=>{const s=fresh();assert.equal(items(ok(s,'Get-Content C:\\Lab\\Logs\\app.log -Tail 1'))[0],'09:10 INFO Retry scheduled');assert.equal(items(ok(s,'Get-Content C:\\Lab\\Logs\\app.log -TotalCount 2')).length,2);assert.match(items(ok(s,'Get-Content C:\\Lab\\Logs\\app.log -Raw'))[0],/\n09:05/);assert.notEqual(Shell.run(s,'Get-Content C:\\Lab -Raw').code,0);});
test('move and rename preserve content and cannot rename across folders',()=>{const s=fresh();ok(s,'Copy-Item C:\\Lab\\notes.txt C:\\Lab\\Reports\\draft.txt');for(const target of ['C:\\Lab\\Archive\\final.txt','..\\Archive\\final.txt','..¥Archive¥final.txt','../Archive/final.txt','C:ticket.txt']){const r=Shell.run(s,'Rename-Item C:\\Lab\\Reports\\draft.txt '+target);assert.equal(r.code,1,target);assert.ok(file(s,'C:\\Lab\\Reports\\draft.txt'));}ok(s,'Move-Item C:\\Lab\\Reports\\draft.txt C:\\Lab\\Archive');ok(s,'Rename-Item C:\\Lab\\Archive\\draft.txt final.txt');assert.match(file(s,'C:\\Lab\\Archive\\final.txt').content,/Ticket 1042/);assert.equal(file(s,'C:\\Lab\\Reports\\draft.txt'),undefined);});
test('WhatIf previews mutations and does not satisfy actual filesystem effects',()=>{const s=fresh();const snapshot=JSON.stringify(s.files);for(const line of ['Remove-Item C:\\Lab\\notes.txt -WhatIf','Move-Item C:\\Lab\\notes.txt C:\\Lab\\Archive -WhatIf','Rename-Item C:\\Lab\\notes.txt changed.txt -WhatIf','New-Item C:\\Lab\\Reports\\new.txt -ItemType File -WhatIf','Set-Content C:\\Lab\\notes.txt -Value changed -WhatIf']){assert.match(ok(s,line).stdout,/What if/);assert.equal(JSON.stringify(s.files),snapshot);}});
test('yen currency, string payloads and literal search are not path-normalized',()=>{const s=fresh();ok(s,'Set-Content C:¥Lab¥Reports¥amount.txt -Value "¥1000 ￥2000"');assert.equal(file(s,'C:\\Lab\\Reports\\amount.txt').content,'¥1000 ￥2000\n');assert.match(ok(s,'Select-String -Path C:¥Lab¥Reports¥amount.txt -Pattern ¥1000 -SimpleMatch').stdout,/¥1000/);ok(s,'"Price ¥3000" > C:¥Lab¥Reports¥extra.txt');assert.equal(file(s,'C:\\Lab\\Reports\\extra.txt').content,'Price ¥3000\n');});
test('object pipeline keeps numbers and selects properties without reparsing display text',()=>{const r=ok(fresh(),'Get-Process | Where-Object CPU -gt 10 | Select-Object ProcessName,CPU');assert.deepEqual(items(r),[{ProcessName:'NotesApp',CPU:125}]);assert.equal(r.trace[1].inputCount,14);assert.equal(r.trace[1].outputCount,1);assert.equal(r.trace[1].inputType,'System.Diagnostics.Process');});
test('Where script blocks and simplified property form are equivalent',()=>{const s=fresh();const a=ok(s,'Get-Process | Where-Object { $_.CPU -gt 10 }');const b=ok(s,'Get-Process | Where-Object CPU -gt 10');assert.deepEqual(items(a),items(b));assert.equal(items(ok(s,"Get-Service | Where-Object { $_.Status -eq 'Stopped' }")).length,6);});
test('CSV values are strings; explicit cast controls numeric comparison',()=>{const s=fresh();const a=ok(s,'Import-Csv C:\\Lab\\devices.csv');assert.equal(typeof items(a)[0].FreeGB,'string');assert.deepEqual(items(ok(s,'Import-Csv C:\\Lab\\devices.csv | Where-Object { [int]$_.FreeGB -lt 10 } | Select-Object Name')).map(x=>x.Name),['PC-014','PC-032']);assert.equal(items(ok(s,'Import-Csv C:\\Lab\\devices.csv | Where-Object FreeGB -lt 10')).length,0);});
test('sort, group, measure and foreach operate on objects',()=>{const s=fresh();assert.equal(items(ok(s,'Get-Process | Sort-Object CPU -Descending | Select-Object -First 1'))[0].Id,4320);assert.equal(items(ok(s,'Get-Process | Measure-Object CPU -Sum'))[0].Sum,175);assert.deepEqual(items(ok(s,'Import-Csv C:\\Lab\\devices.csv | Group-Object Department')).map(x=>[x.Name,x.Count]),[['Sales',2],['Support',1]]);assert.deepEqual(items(ok(s,'Get-Process | ForEach-Object { $_.ProcessName }')),s.pc.processes.map(p=>p.ProcessName));});
test('CSV export and import round-trip selected fields and quoting',()=>{const s=fresh();ok(s,'Get-Process | Select-Object ProcessName,CPU | Export-Csv C:\\Lab\\Reports\\processes.csv -NoTypeInformation');const r=ok(s,'Import-Csv C:\\Lab\\Reports\\processes.csv');assert.deepEqual(items(r)[0],{ProcessName:'NotesApp',CPU:'125'});ok(s,"Set-Content C:\\Lab\\Reports\\quoted.csv -Value 'Name,Note`nA,"+'"a,b"'+"'");const q=Shell.run(s,'Import-Csv C:\\Lab\\Reports\\quoted.csv');assert.equal(q.code,0);assert.equal(items(q).length,0,'single quotes keep a literal backtick-n, not a newline');assert.match(file(s,'C:\\Lab\\Reports\\quoted.csv').content,/`n/);ok(s,'Set-Content C:\\Lab\\Reports\\quoted.csv -Value "Name,Note`nA,`"a,b`""');assert.deepEqual(items(ok(s,'Import-Csv C:\\Lab\\Reports\\quoted.csv')),[{Name:'A',Note:'a,b'}]);});
test('Format commands retain display intent and reject downstream CSV misuse',()=>{const s=fresh();const r=ok(s,'Get-Process | Format-Table ProcessName,CPU -AutoSize');assert.equal(r.trace.at(-1).outputType,'PSR.FormatData');assert.match(r.stdout,/NotesApp/);const bad=Shell.run(s,'Get-Process | Format-Table | Export-Csv C:\\Lab\\Reports\\bad.csv -NoTypeInformation');assert.equal(bad.code,1);assert.equal(file(s,'C:\\Lab\\Reports\\bad.csv'),undefined);ok(s,'Get-Process | Format-List ProcessName,CPU | Out-File C:\\Lab\\Reports\\processes.txt -Encoding utf8');assert.match(file(s,'C:\\Lab\\Reports\\processes.txt').content,/CPU : 125/);});
test('JSON converts data with types intact and rejects unsafe keys',()=>{const s=fresh();const r=ok(s,'Get-Content C:\\Lab\\settings.json -Raw | ConvertFrom-Json | Select-Object Name,FreeGB');assert.deepEqual(items(r),[{Name:'PC-014',FreeGB:8}]);ok(s,'Get-Process | Select-Object ProcessName,CPU | ConvertTo-Json | Set-Content C:\\Lab\\Reports\\p.json');assert.equal(items(ok(s,'Get-Content C:\\Lab\\Reports\\p.json -Raw | ConvertFrom-Json')).length,14);assert.equal(Shell.run(s,"'{\"__proto__\":{\"polluted\":true}}' | ConvertFrom-Json").code,1);assert.equal({}.polluted,undefined);});
test('variables preserve objects rather than formatted text across restore',()=>{const s=fresh();assert.equal(ok(s,'$procs = Get-Process').stdout,'');assert.equal(ok(s,'$procs').trace[0].name,'$procs');assert.equal(items(ok(s,'$procs | Measure-Object'))[0].Count,14);const restored=Shell.restoreSession(JSON.parse(JSON.stringify(s)));assert.deepEqual(items(ok(restored,'$procs | Select-Object -ExpandProperty Id')),s.pc.processes.map(p=>p.Id));assert.equal(ok(s,'$PSVersionTable').trace[0].name,'$psversiontable');assert.match(ok(s,'$env:COMPUTERNAME').stdout,/PC-014/);});
test('Get-Member exposes hidden process properties, native definitions and methods',()=>{
 const s=fresh(),display=ok(s,'Get-Process');
 for(const name of ['Path','StartTime','Responding'])assert.ok(!display.stdout.includes(name));
 const r=ok(s,'Get-Process | Get-Member');
 assert.match(r.stdout,/TypeName: System.Diagnostics.Process/);
 const member=name=>items(r).find(x=>x.Name===name);
 assert.equal(member('Id').Definition,'int Id {get;}');
 assert.equal(member('StartTime').Definition,'datetime StartTime {get;}');
 assert.equal(member('Responding').Definition,'bool Responding {get;}');
 assert.equal(member('CPU').MemberType,'ScriptProperty');
 assert.equal(member('Path').MemberType,'ScriptProperty');
 assert.equal(member('Refresh').MemberType,'Method');
 assert.equal(member('Refresh').Definition,'void Refresh()');
 const selected=items(ok(s,'Get-Process -Id 4320 | Select-Object Path,StartTime,Responding'))[0];
 assert.equal(selected.Path,'C:\\Program Files\\NotesApp\\NotesApp.exe');
 assert.match(selected.StartTime,/^2026-10-28T/);assert.equal(selected.Responding,true);
});
test('process Name alias works in property selection, filters and restored variables',()=>{
 const s=fresh();
 assert.deepEqual(items(ok(s,'Get-Process | Select-Object Name')),s.pc.processes.map(p=>({Name:p.ProcessName})));
 assert.deepEqual(items(ok(s,"Get-Process | Where-Object Name -eq NotesApp | Select-Object -ExpandProperty Name")),['NotesApp']);
 assert.deepEqual(items(ok(s,'Get-Process | ForEach-Object { $_.Name }')),s.pc.processes.map(p=>p.ProcessName));
 ok(s,'$procs = Get-Process');
 const restored=Shell.restoreSession(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(items(ok(restored,'$procs | Select-Object Name')),items(ok(restored,'$procs | Select-Object ProcessName')).map(x=>({Name:x.ProcessName})));
});
test('Get-Member groups aliases, methods, properties and script properties by member type',()=>{
 const members=items(ok(fresh(),'Get-Process | Get-Member'));
 assert.deepEqual([...new Set(members.map(x=>x.MemberType))],['AliasProperty','Method','Property','ScriptProperty']);
 assert.deepEqual(members.find(x=>x.Name==='Name'),{Name:'Name',MemberType:'AliasProperty',Definition:'Name = ProcessName'});
 for(const kind of ['AliasProperty','Method','Property','ScriptProperty']){
  const names=members.filter(x=>x.MemberType===kind).map(x=>x.Name);
  assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b)));
 }
});

test('published-version process variables gain aliases without refreshing their saved values',()=>{
 const s=fresh();ok(s,'$procs = Get-Process');s.variables.procs.items=s.variables.procs.items.slice(0,3);ok(s,'Stop-Process -Id 4320');
 for(const item of s.variables.procs.items)for(const key of ['Name','Handles','SI','HandleCount','SessionId'])delete item[key];
 s.variables.procs.items[0].CPU=77;
 s.variables.procs.items[0].Path='C:\\Earlier\\NotesApp.exe';
 const restored=Shell.restoreSession(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(items(ok(restored,'$procs | Select-Object -ExpandProperty Name')),['NotesApp','explorer','pwsh']);
 const saved=items(ok(restored,'$procs | Select-Object CPU,Path,Handles,SI'))[0];
 assert.equal(saved.CPU,77);assert.equal(saved.Path,'C:\\Earlier\\NotesApp.exe');
 assert.equal(typeof saved.Handles,'number');assert.equal(typeof saved.SI,'number');
 assert.match(ok(restored,'$procs | Format-List').stdout,/Name : NotesApp/);
 assert.equal(restored.pc.processes.some(p=>p.Id===4320),false,'restoring a snapshot does not restart a process');
});
test('process Format-List defaults differ from explicit all-property and selected views',()=>{
 const s=fresh(),read=ok(s,'Get-Process NotesApp'),row=items(read)[0];
 const list=ok(s,'Get-Process NotesApp | Format-List');
 assert.equal(list.stdout,`Id : 4320\nHandles : ${row.HandleCount}\nCPU : 125\nSI : ${row.SessionId}\nName : NotesApp`);
 assert.doesNotMatch(list.stdout,/Path|StartTime|Responding|WorkingSet64/);
 const all=ok(s,'Get-Process NotesApp | Format-List *');
 for(const name of Object.keys(row))assert.ok(all.stdout.includes(name+' : '),name);
 assert.match(all.stdout,/Path : C:\\Program Files\\NotesApp\\NotesApp.exe/);
 assert.match(ok(s,'Get-Process NotesApp | Format-List Name,Path').stdout,/^Name : NotesApp\nPath :/);
 assert.equal(ok(s,'Get-Process NotesApp | Select-Object Name,CPU | Format-List').stdout,'Name : NotesApp\nCPU : 125');
 ok(s,'Get-Process NotesApp | Format-List | Out-File C:\\Lab\\Reports\\process-list.txt');
 assert.equal(file(s,'C:\\Lab\\Reports\\process-list.txt').content,list.stdout+'\n');
});
test('unquoted paths identify the unexpected positional argument before changing files',()=>{
 const s=fresh(),before=JSON.stringify(s.files);
 for(const command of ['Get-Content C:\\Lab\\Shared Files\\guide.txt','Remove-Item C:\\Lab\\Shared Files\\guide.txt']){
  const r=Shell.run(s,command);
  assert.equal(r.code,1);
  assert.ok(r.stderr.startsWith("A positional parameter cannot be found that accepts argument 'Files\\guide.txt'."));
  assert.match(r.stderr,/空白で引数が分かれています/);
  assert.equal(JSON.stringify(s.files),before);
 }
 assert.match(ok(s,'Get-Content "C:\\Lab\\Shared Files\\guide.txt"').stdout,/Quote paths/);
});
test('unsupported commands, flags, syntax and malformed paths fail before effects',()=>{const s=fresh();for(const line of ['Start-ImaginaryService','Remove-Item C:\\Lab\\notes.txt -Wrong','Get-Content C:\\Lab\\notes.txt |','Get-Process; Stop-Process 4320','Get-Content "unclosed','Get-ChildItem \\\\server\\share','Rename-Item C:\\Lab\\notes.txt C:/Lab/x.txt']){const before=JSON.stringify(s.files);assert.notEqual(Shell.run(s,line).code,0,line);assert.equal(JSON.stringify(s.files),before);}});
test('completion accepts yen paths and results are executable',()=>{const s=fresh();assert.ok(Shell.complete(s,'Get-Ch').includes('Get-ChildItem '));const candidates=Shell.complete(s,'Get-Content C:¥Lab¥read');assert.ok(candidates.includes('Get-Content C:\\Lab\\readme.txt'));ok(s,candidates[0]);});
test('history stays bounded while current files, variables and PC state survive',()=>{const s=fresh();for(let i=0;i<90;i++)ok(s,'Write-Output '+i);assert.equal(s.history.length,80);const copy=Shell.restoreSession(JSON.parse(JSON.stringify(s)));assert.equal(copy.history.at(-1).line,'Write-Output 89');});
test('malformed saved sessions cannot overwrite paths or prototype fields',()=>{const s=fresh();for(const mutate of [x=>x.cwd='Z:\\',x=>x.files['c:\\escape']={path:'C:\\..\\escape',dir:false,content:''},x=>x.variables.constructor={items:[],type:'Object'},x=>x.pc.services[0].Extra=true,x=>x.history.push({line:'x',trace:[]})]){const raw=JSON.parse(JSON.stringify(s));mutate(raw);assert.throws(()=>Shell.restoreSession(raw));}});
test('redirection validates destination before mutating a service and separates output from source paths',()=>{const s=Shell.createSession({scenario:'service-stopped'});const r=Shell.run(s,'Start-Service Spooler > C:\\missing\\out.txt');assert.equal(r.code,1);assert.equal(s.pc.services.find(x=>x.Name==='Spooler').Status,'Stopped');const read=ok(s,'Get-Content C:\\Lab\\readme.txt > C:\\Lab\\Reports\\out.txt');assert.deepEqual(read.trace[0].resolvedPaths,['C:\\Lab\\readme.txt']);assert.equal(read.trace[0].redirectionPath,'C:\\Lab\\Reports\\out.txt');});
test('Get-Help examples contain runnable examples and arbitrary absent examples are not invented',()=>{const s=fresh();const r=ok(s,'Get-Help Get-Content -Examples');assert.match(r.stdout,/EXAMPLES\n    Get-Content -Path C:\\Lab\\readme.txt/);assert.equal(Shell.run(s,'Get-Help ConvertFrom-Json -Examples').code,1);});
test('double quoted strings expand bounded scalar variables and environment values; single quotes stay literal',()=>{const s=fresh();assert.equal(ok(s,'Write-Output "Hello $env:COMPUTERNAME"').stdout,'Hello PC-014');ok(s,"$root = 'C:\\Lab'");assert.match(ok(s,'Get-Content "${root}\\Shared Files\\guide.txt"').stdout,/Quote paths/);assert.equal(ok(s,"Write-Output '${root}\\readme.txt'").stdout,'${root}\\readme.txt');assert.equal(ok(s,'Write-Output "Literal `$env:COMPUTERNAME"').stdout,'Literal $env:COMPUTERNAME');assert.equal(ok(s,'"${env:COMPUTERNAME}.txt"').stdout,'PC-014.txt');ok(s,'Set-Content "${root}\\Reports\\pc.txt" -Value "$env:COMPUTERNAME ¥1000"');assert.equal(file(s,'C:\\Lab\\Reports\\pc.txt').content,'PC-014 ¥1000\n');});
test('unsupported subexpressions and object interpolation report errors without executing embedded commands',()=>{const s=Shell.createSession({scenario:'service-stopped'});const before=JSON.stringify(s.pc);const r=Shell.run(s,'Write-Output "$(Start-Service Spooler)"');assert.equal(r.code,1);assert.match(r.stderr,/Subexpression interpolation/);assert.equal(JSON.stringify(s.pc),before);ok(s,'$procs = Get-Process');const obj=Shell.run(s,'Write-Output "Processes: $procs"');assert.equal(obj.code,1);assert.match(obj.stderr,/Only scalar values/);assert.equal(ok(s,"Write-Output '$(Start-Service Spooler)'").stdout,'$(Start-Service Spooler)');assert.equal(JSON.stringify(s.pc),before);});
test('property lists accept spaces around commas and preserve requested order',()=>{const s=fresh();for(const line of ['Get-Process | Select-Object ProcessName, Id -First 1','Get-Process | Select-Object -First 1 -Property ProcessName , Id','Get-Process | Select-Object -Property "ProcessName, Id" -First 1']){const row=items(ok(s,line))[0];assert.deepEqual(Object.keys(row),['ProcessName','Id']);assert.deepEqual(row,{ProcessName:'NotesApp',Id:4320});}const table=ok(s,'Get-Service | Format-Table Name, Status -AutoSize');assert.match(table.stdout,/^Name\s+Status/);const list=ok(s,'Get-Service | Format-List -Property Status , Name');assert.match(list.stdout,/^Status : Running\nName : Spooler/);assert.equal(Shell.run(s,'Get-Process | Select-Object ProcessName, -First 1').code,1);assert.equal(Shell.run(s,'Get-Process | Select-Object ProcessName,,Id').code,1);});
test('property-list joining does not rewrite strings and unimplemented multi-key sorting/grouping errors',()=>{const s=fresh();assert.equal(ok(s,'Write-Output "Name, Id"').stdout,'Name, Id');ok(s,'Set-Content C:\\Lab\\Reports\\commas.txt -Value "Name, Id"');assert.equal(file(s,'C:\\Lab\\Reports\\commas.txt').content,'Name, Id\n');assert.equal(items(ok(s,'Select-String -Path C:\\Lab\\Reports\\commas.txt -Pattern "Name, Id" -SimpleMatch')).length,1);for(const command of ['Sort-Object CPU,Id','Sort-Object -Property CPU, Id','Group-Object Status,Name','Group-Object -Property Status , Name']){const r=Shell.run(s,'Get-Process | '+command);assert.equal(r.code,1,command);assert.match(r.stderr,/multiple .* keys are not implemented/);}});
test('service default view hides startup configuration without removing the property',()=>{
 const s=fresh(),r=ok(s,'Get-Service');
 assert.match(r.stdout,/^Status\s+Name\s+DisplayName\n/);
 assert.doesNotMatch(r.stdout,/StartType|Automatic/);
 assert.doesNotMatch(ok(s,'Get-Service | Format-Table').stdout,/StartType/);
 assert.match(ok(s,'Get-Service | Format-Table Name,StartType').stdout,/StartType/);
 assert.equal(items(r)[0].StartType,'Automatic');
 assert.match(ok(s,'Get-Service | Select-Object Name,Status,StartType').stdout,/StartType/);
 assert.match(ok(s,'Get-Service | Get-Member').stdout,/StartType/);
 assert.match(ok(s,'Get-Service Spooler | Format-List').stdout,/StartType : Automatic/);
 ok(s,'$services = Get-Service');
 const restored=Shell.restoreSession(JSON.parse(JSON.stringify(s)));
 assert.doesNotMatch(ok(restored,'$services').stdout,/StartType/);
 assert.match(ok(restored,'$services | Select-Object StartType').stdout,/Automatic/);
});
test('network commands use list views while their pipeline objects retain nested properties',()=>{
 const s=fresh(),ip=ok(s,'Get-NetIPConfiguration'),tcp=ok(s,'Test-NetConnection intranet.corp.example -Port 443');
 assert.match(ip.stdout,/^InterfaceAlias : Ethernet\n/);
 assert.match(ip.stdout,/IPv4Address : 10\.20\.0\.14/);
 assert.match(ip.stdout,/IPv4DefaultGateway : 10\.20\.0\.1/);
 assert.doesNotMatch(ip.stdout,/@\{/);
 assert.equal(items(ip)[0].IPv4Address.PrefixLength,24);
 assert.match(tcp.stdout,/^ComputerName : intranet\.corp\.example\n/);
 assert.match(tcp.stdout,/TcpTestSucceeded : True/);
 assert.match(ok(s,'Test-NetConnection intranet.corp.example -Port 443 | Select-Object ComputerName,TcpTestSucceeded').stdout,/^ComputerName\s+TcpTestSucceeded\n/);
});
test('Select-Object Last selects the tail including zero, oversize and mixed first/last limits',()=>{
 const s=fresh();
 const tail=items(ok(s,'Get-Content C:\\Lab\\Logs\\app.log -Tail 2'));
 assert.deepEqual(items(ok(s,'Get-Content C:\\Lab\\Logs\\app.log | Select-Object -Last 2')),tail);
 assert.deepEqual(items(ok(s,'Get-Process | Select-Object -Last 1 -Property Id, ProcessName')),[{Id:8220,ProcessName:'OneDrive'}]);
 assert.deepEqual(items(ok(s,'Get-Process | Select-Object -Last 0')),[]);
 assert.equal(items(ok(s,'Get-Process | Select-Object -Last 100')).length,14);
 assert.deepEqual(items(ok(s,'Get-Process | Select-Object -First 1 -Last 1 -ExpandProperty Id')),[4320,8220]);
 assert.deepEqual(items(ok(s,'Get-Process | Select-Object -First 2 -Last 2 -ExpandProperty Id')),[4320,2080,8040,8220]);
 for(const value of ['-1','1.5','x'])assert.equal(Shell.run(s,'Get-Process | Select-Object -Last '+value).code,1);
});
test('file WhatIf uses operation and target wording while preserving file contents',()=>{
 const s=fresh(),before=JSON.stringify(s.files);
 assert.equal(ok(s,'Remove-Item C:\\Lab\\notes.txt -WhatIf').stdout,'What if: Performing the operation "Remove File" on target "C:\\Lab\\notes.txt".');
 for(const [command,action]of [
  ['Copy-Item C:\\Lab\\notes.txt C:\\Lab\\Reports\\copy.txt','Copy File'],
  ['Move-Item C:\\Lab\\notes.txt C:\\Lab\\Reports\\move.txt','Move File'],
  ['Rename-Item C:\\Lab\\notes.txt new.txt','Rename File'],
  ['New-Item C:\\Lab\\Reports\\new.txt -ItemType File','Create File'],
  ['New-Item C:\\Lab\\Reports\\NewFolder -ItemType Directory','Create Directory'],
  ['Set-Content C:\\Lab\\notes.txt -Value x','Set Content'],
  ['Add-Content C:\\Lab\\notes.txt -Value x','Add Content'],
  ['Get-Process | Out-File C:\\Lab\\Reports\\out.txt','Output to File'],
  ['Get-Process | Export-Csv C:\\Lab\\Reports\\out.csv','Export-Csv']
 ]){const r=ok(s,command+' -WhatIf');assert.ok(r.stdout.startsWith('What if: Performing the operation "'+action+'" on target "'));assert.deepEqual(r.effects,[]);assert.equal(JSON.stringify(s.files),before);}
});
test('trace input snapshots survive mutation and restore, and reject malformed saved input',()=>{
 const s=Shell.createSession({scenario:'service-stopped'});
 const r=ok(s,'Get-Service Spooler | Start-Service');
 assert.equal(r.trace[1].inputObjects[0].Name,'Spooler');
 assert.equal(r.trace[1].inputObjects[0].Status,'Stopped');
 assert.equal(s.pc.services[0].Status,'Running');
 const raw=JSON.parse(JSON.stringify(s));
 assert.deepEqual(Shell.restoreSession(raw).history[0].trace[1].inputObjects,r.trace[1].inputObjects);
 delete raw.history[0].trace[1].inputObjects;
 assert.doesNotThrow(()=>Shell.restoreSession(raw),'older progress has no input snapshots');
 raw.history[0].trace[1].inputObjects={Name:'Spooler'};
 assert.throws(()=>Shell.restoreSession(raw),/Invalid trace input/);
 raw.history[0].trace[1].inputObjects=[JSON.parse('{"__proto__":true}')];
 assert.throws(()=>Shell.restoreSession(raw),/Unsupported property name/);
});
test('process target snapshots survive stopping and restore while malformed targets are rejected',()=>{
 const s=fresh(),r=ok(s,'Stop-Process -Name NotesApp');
 assert.deepEqual(r.trace[0].targetObjects,[{Id:4320,ProcessName:'NotesApp'}]);
 const raw=JSON.parse(JSON.stringify(s));
 assert.deepEqual(Shell.restoreSession(raw).history[0].trace[0].targetObjects,r.trace[0].targetObjects);
 delete raw.history[0].trace[0].targetObjects;
 assert.doesNotThrow(()=>Shell.restoreSession(raw),'older progress has no target snapshots');
 for(const targets of [{Id:4320,ProcessName:'NotesApp'},[null],[{Id:'4320',ProcessName:'NotesApp'}],[{Id:4320,ProcessName:1}],[{Id:0,ProcessName:'NotesApp'}]]){
  raw.history[0].trace[0].targetObjects=targets;
  assert.throws(()=>Shell.restoreSession(raw),/Invalid trace targets/);
 }
 raw.history[0].trace[0].targetObjects=[JSON.parse('{"Id":4320,"ProcessName":"NotesApp","__proto__":true}')];
 assert.throws(()=>Shell.restoreSession(raw),/Unsupported property name/);
});

test('full-width syntax errors explain replacements but preserve quoted Japanese content and filenames',()=>{
 for(const [line,symbol]of [
  ['Get-Process ｜ Select-Object Name','｜'],['Get-Process | Select-Object ProcessName、Id','、'],
  ['Get-ChildItem －File','－'],['Get－Process','－'],['Get-Service　-Name Spooler','　']
 ])for(const language of ['ja','en']){
  const s=fresh(),before=JSON.stringify(s.pc),r=Shell.run(s,line,{language});
  assert.equal(r.code,1,line);assert.ok(r.stderr.includes(symbol));
  assert.match(r.stderr,language==='ja'?/全角文字/:/Full-width syntax character/);
  assert.equal(JSON.stringify(s.pc),before);
 }
 const s=fresh();ok(s,'Set-Content "C:\\Lab\\Reports\\営業、報告－一覧.txt" -Value "税込　¥1000｜税抜、明細"');
 assert.equal(ok(s,'Get-Content "C:\\Lab\\Reports\\営業、報告－一覧.txt"').stdout,'税込　¥1000｜税抜、明細');
 assert.equal(ok(s,"Write-Output '全角 ｜ － 、　を本文に使う'").stdout,'全角 ｜ － 、　を本文に使う');
});

test('CMD habits show actionable supported replacements without running native commands',()=>{
 for(const [command,replacement]of [['ping','Test-Connection'],['ipconfig','Get-NetIPConfiguration'],['nslookup','Resolve-DnsName'],['findstr','Select-String'],['mkdir','New-Item'],['systeminfo','Get-CimInstance'],['wevtutil','Get-WinEvent']]){
  for(const language of ['ja','en']){
   const r=Shell.run(fresh(),command+'.exe',{language});assert.equal(r.code,1);
   assert.ok(r.stderr.includes(replacement));assert.match(r.stderr,language==='ja'?/この教材では/:/In this simulator/);
  }
 }
});

test('missing Where braces and unquoted values get bilingual corrective guidance',()=>{
 for(const language of ['ja','en']){
  const s=fresh();
  for(const parameter of ['','-Property ','-Prop ']){
   const r=Shell.run(s,'Get-Service | Where-Object '+parameter+'$_.Status -eq Stopped',{language});
   assert.equal(r.code,1);assert.match(r.stderr,/Where-Object \{ \$_\.Status -eq Stopped \}/);
   assert.match(r.stderr,language==='ja'?/簡易形式/:/simplified form/);
  }
  const before=file(s,'C:\\Lab\\notes.txt').content;
  const value=Shell.run(s,'Set-Content C:\\Lab\\notes.txt -Value Ticket 1042',{language});
  assert.equal(value.code,1);assert.match(value.stderr,language==='ja'?/引用符/:/quotes/);
  assert.equal(file(s,'C:\\Lab\\notes.txt').content,before);
 }
});

test('unique parameter prefixes normalize evidence and ambiguous prefixes name the candidates',()=>{
 const s=fresh();
 const r=ok(s,'gci -Pa C:\\Lab\\Logs -FilE | Measure-Object -Pro Length -Su');
 assert.deepEqual(r.trace[0].args,['-path','C:\\Lab\\Logs','-file']);
 assert.deepEqual(r.trace[1].args,['-property','Length','-sum']);
 const selected=ok(s,'Get-Process | Select-Object -Pro Name, Id -Fir 1');
 assert.deepEqual(items(selected),[{Name:'NotesApp',Id:4320}]);
 assert.deepEqual(selected.trace[1].args,['-property','Name,Id','-first','1']);
 assert.match(ok(s,'Get-Process | Format-Table -Pro Name, Id -Au').stdout,/^Name\s+Id/);
 assert.equal(items(ok(s,'Get-Process | Where-Object -Pro Name -eq NotesApp')).length,1);
 const ambiguous=Shell.run(s,'Get-ChildItem C:\\Lab -Fi');assert.equal(ambiguous.code,1);
 assert.match(ambiguous.stderr,/Ambiguous parameter/);assert.match(ambiguous.stderr,/-file/);assert.match(ambiguous.stderr,/-filter/);
 assert.equal(Shell.run(s,'Set-Content -Pa C:\\Lab\\notes.txt -Val x -P C:\\Lab\\readme.txt').code,1);
});

test('Select-String supports positional Pattern then Path and mixed named arguments',()=>{
 const s=fresh(),named=items(ok(s,'Select-String -Pattern ERROR -Path C:\\Lab\\Logs\\app.log -SimpleMatch'));
 for(const line of ['Select-String ERROR C:\\Lab\\Logs\\app.log -SimpleMatch','Select-String -PaTt ERROR C:\\Lab\\Logs\\app.log -Sim','Select-String -Path C:\\Lab\\Logs\\app.log ERROR -SimpleMatch'])assert.deepEqual(items(ok(s,line)),named);
 assert.deepEqual(items(ok(s,'Get-Content C:\\Lab\\Logs\\app.log | Select-String ERROR -SimpleMatch')).map(x=>x.Line),named.map(x=>x.Line));
});

test('file timestamps support the default view, sorting, content changes and older saved files',()=>{
 const s=fresh(),listed=ok(s,'Get-ChildItem C:\\Lab\\Logs');
 assert.match(listed.stdout,/^Mode\s+LastWriteTime\s+Length\s+Name/);assert.doesNotMatch(listed.stdout,/FullName|PSIsContainer/);
 assert.equal(items(ok(s,'Get-ChildItem C:\\Lab\\Logs | Sort-Object LastWriteTime -Descending | Select-Object -First 1'))[0].Name,'app.log');
 const before=items(ok(s,'Get-Item C:\\Lab\\notes.txt'))[0].LastWriteTime;
 ok(s,'Add-Content C:\\Lab\\notes.txt -Value Updated');
 const updated=items(ok(s,'Get-Item C:\\Lab\\notes.txt'))[0].LastWriteTime;assert.ok(updated>before);
 ok(s,'Rename-Item C:\\Lab\\notes.txt renamed.txt');assert.equal(items(ok(s,'Get-Item C:\\Lab\\renamed.txt'))[0].LastWriteTime,updated);
 const raw=JSON.parse(JSON.stringify(s));assert.equal(items(ok(Shell.restoreSession(raw),'Get-Item C:\\Lab\\renamed.txt'))[0].LastWriteTime,updated);
 for(const f of Object.values(raw.files))delete f.lastWriteTime;
 assert.match(items(ok(Shell.restoreSession(raw),'Get-Item C:\\Lab\\renamed.txt'))[0].LastWriteTime,/^2026-/);
 raw.files['c:\\lab\\renamed.txt'].lastWriteTime='yesterday';assert.throws(()=>Shell.restoreSession(raw),/Invalid file timestamp/);
});

test('PowerShell 7.3+ measurement skips missing properties instead of counting directories as zero',()=>{
 const s=fresh(),files=items(ok(s,'Get-ChildItem C:\\Lab -File'));
 const folders=items(ok(s,'Get-ChildItem C:\\Lab -Directory'));assert.ok(folders.every(x=>!Object.hasOwn(x,'Length')));
 const measured=items(ok(s,'Get-ChildItem C:\\Lab | Measure-Object Length -Sum -Average'))[0];
 assert.equal(measured.Count,files.length);assert.equal(measured.Sum,files.reduce((n,f)=>n+f.Length,0));assert.equal(measured.Average,measured.Sum/files.length);
 assert.deepEqual(items(ok(s,'Get-ChildItem C:\\Lab -Directory | Measure-Object Length -Sum')),[{Count:0,Property:'Length',Sum:0}]);
 assert.equal(items(ok(s,'Get-Process | Measure-Object ProcessName'))[0].Count,s.pc.processes.length);
 assert.equal(Shell.run(s,'Get-Process | Measure-Object ProcessName -Sum').code,1);
});
