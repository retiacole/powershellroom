'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const Data=require('../src/data.js');
const root=path.resolve(__dirname,'..'),output=path.join(root,'test-artifacts');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(fs.readFileSync(path.join(root,'powershellroom.html')));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.PSR_BROWSER_CHANNEL?{channel:process.env.PSR_BROWSER_CHANNEL}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
  const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('file:'))external.push(r.url());});
  const url=`http://127.0.0.1:${server.address().port}/`;
  await page.goto(url);await page.locator('.hero').waitFor();assert.equal(await page.locator('.course-card').count(),6);
  assert.ok((await page.locator('.sample-terminal').textContent()).includes('PS C:¥Lab'));
  await page.screenshot({path:path.join(output,'home-desktop.png'),fullPage:true});
  await page.locator('#home-button').click();assert.equal(await page.locator('.map-lesson').count(),50);await page.locator('#dialog-close').click();
  await page.locator('.hero-actions [data-open]').click();
  const input=()=>page.locator('#command-input');const run=async line=>{await input().fill(line);await input().press('Enter');};
  let wrongAnswers=0;
  for(const [i,l]of Data.lessons.entries()){
   await page.locator(`.lesson-item[data-open="${l.id}"]`).click();
   await page.locator('[data-action="check"]').click();assert.equal(await page.locator('#feedback .success').count(),0,l.id+' fresh');
   await page.locator('[data-action="solution"]').click();const displayed=await page.locator('.solution pre').textContent();
   assert.equal(displayed,l.solution.join('\n').replace(/\\/g,'¥'));
   for(const cmd of displayed.split('\n'))await run(cmd);
   if(l.question){for(const c of l.question.choices.filter(c=>c.id!==l.question.answer)){
    await page.locator(`input[name="answer"][value="${c.id}"]`).check();await page.locator('[data-action="check"]').click();
    assert.equal(await page.locator('#feedback .success').count(),0,l.id+' wrong answer');
    assert.equal(await page.locator('.choice-feedback').textContent(),c.feedback.ja.replace(/\\/g,'¥'));wrongAnswers++;
   }await page.locator(`input[name="answer"][value="${l.question.answer}"]`).check();await page.locator('[data-action="check"]').click();}
   assert.equal(await page.locator('#feedback .success').count(),1,l.id+' complete');
   if(i===14)await page.screenshot({path:path.join(output,'lesson-objects.png'),fullPage:true});
  }
  assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem(PSREngine.KEY)).completed).length),50);
  console.log(`All 50 displayed Japanese solutions passed; ${wrongAnswers} wrong interpretation choices rejected with individual feedback.`);
  // Reviewed alternative answers must also work through the displayed terminal and saved progress.
  const alternatives=[
   ['quoted-path',lines=>lines.map(line=>line.replace('-LiteralPath','-Path'))],
   ['tail-log',()=>['Get-Content C:\\Lab\\Logs\\app.log | Select-Object -Last 2']],
   ['large-files',lines=>lines.map(line=>line.replace('Where-Object Length -gt 200','Where-Object { $_.Length -gt 200 }'))],
   ['filter-memory',lines=>lines.map(line=>line.replace('209715200','200MB'))],
   ['filter-memory',lines=>lines.map(line=>line.replace(/Where-Object WorkingSet64 -gt (?:209715200|200MB)/,'Where-Object { $_.WorkingSet64 -gt 200MB }'))],
   ['dns-failure',lines=>lines.map(line=>line.replace('Resolve-DnsName -Name','Resolve-DnsName'))],
   ['capstone-web-503',lines=>lines.map(line=>line.replace('Invoke-WebRequest -Uri','Invoke-WebRequest -Method Head'))],
   ['stop-one-process',lines=>lines.map(line=>line.replace('Stop-Process -Id 4320','Get-Process -Name NotesApp | Stop-Process'))],
   ['stop-one-process',lines=>lines.map(line=>line.replace('Stop-Process -Id 4320','Get-Process -Name NotesApp | Select-Object Id | Stop-Process'))],
   ['start-service',lines=>lines.map(line=>line.replace('Start-Service -Name Spooler','Get-Service Spooler | Start-Service'))],
   ['start-service',lines=>lines.map(line=>line.replace('Start-Service -Name Spooler','Get-Service Spooler | Select-Object Name | Start-Service'))],
   ['capstone-printing',lines=>lines.map(line=>line.replace('Start-Service -Name Spooler','Get-Service Spooler | Start-Service'))]
  ];
  for(const [id,alternate] of alternatives){
   const lesson=Data.lessons.find(l=>l.id===id);
   await page.locator(`.lesson-item[data-open="${id}"]`).click();await page.locator('#lesson-reset').click();
   for(const line of alternate(lesson.solution))await run(line);
   if(lesson.question)await page.locator(`input[name="answer"][value="${lesson.question.answer}"]`).check();
   await page.locator('[data-action="check"]').click();assert.equal(await page.locator('#feedback .success').count(),1,id+' alternative');
  }
  await page.reload();await page.locator('.hero-actions [data-open]').click();
  await page.locator('[data-action="check"]').click();assert.equal(await page.locator('#feedback .success').count(),1,'pipeline answer survives reload');
  console.log(`All ${alternatives.length} reviewed alternative answer sequences passed; pipeline evidence survived reload.`);
  // Inspect actual object values in a pipeline, not just its text rendering.
  await page.locator('#sandbox-button').click();await run('Get-Process | Where-Object CPU -gt 10 | Select-Object ProcessName,CPU');
  await page.locator('.trace-open').last().click();assert.equal(await page.locator('.trace-stage').count(),3);
  assert.ok((await page.locator('.object-flow').last().textContent()).includes('1'));
  await page.locator('.object-details').last().locator('summary').click();assert.ok((await page.locator('.object-details').last().textContent()).includes('NotesApp'));
  await page.screenshot({path:path.join(output,'pipeline-objects.png'),fullPage:true});await page.locator('#dialog-close').click();
  // No HTML interpolation of typed strings.
  await run("Write-Output '<img src=x onerror=alert(1)>'");assert.equal(await page.locator('#console-output img').count(),0);
  // Yen paths and English backslashes; inserted examples match the shown text.
  const pathLesson=Data.lessons.find(l=>l.task.ja.includes('\\')&&l.example.command.includes('\\'));
  await page.locator(`.lesson-item[data-open="${pathLesson.id}"]`).click();await page.locator('#lesson-reset').click();
  assert.ok((await page.locator('.task').textContent()).includes('¥'));
  await page.locator('.example [data-insert]').click();assert.equal(await input().inputValue(),await page.locator('.example pre').textContent());
  const draft='Get-Content "C:\\Lab\\readme.txt"';await input().fill(draft);await page.locator('#language-button').click();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.ok((await page.locator('.task').textContent()).includes('\\'));assert.equal(await input().inputValue(),draft);
  // Persistence, input, language, completion record survive reload.
  await page.reload();await page.locator('.hero-actions [data-open]').click();assert.equal(await input().inputValue(),draft);
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  await input().fill('Get-Cont');await input().press('Tab');assert.ok((await input().inputValue()).startsWith('Get-Content'));
  await input().fill('unfinished');await input().press('ArrowRight');assert.equal(await input().inputValue(),'unfinished');
  await input().evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true}));});
  assert.equal(await input().inputValue(),'unfinished');await input().evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));
  await run('Get-Location');await input().press('ArrowUp');assert.equal(await input().inputValue(),'Get-Location');
  // Reset current lesson only.
  await run("Set-Content C:\\Lab\\notes.txt -Value 'changed'");const before=await page.evaluate(()=>JSON.parse(localStorage.getItem(PSREngine.KEY)));
  await page.locator('#lesson-reset').click();const after=await page.evaluate(()=>JSON.parse(localStorage.getItem(PSREngine.KEY)));
  assert.deepEqual(after.completed,before.completed);assert.equal(after.checkpoints[pathLesson.id].session.history.length,0);assert.equal(after.checkpoints[pathLesson.id].input,'');
  assert.notEqual(after.checkpoints[pathLesson.id].session.files['c:\\lab\\notes.txt'].content,'changed\n');
  const other=Data.lessons.find(l=>l.id!==pathLesson.id);assert.deepEqual(after.checkpoints[other.id],before.checkpoints[other.id]);
  assert.equal(await page.locator('#feedback .success').count(),0);
  assert.ok((await page.locator('#evidence').textContent()).includes('Previously completed'));
  // Download and load saved work; malformed data cannot replace it.
  await page.locator('#menu-button').click();const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="export"]').click();
  const download=await downloadPromise, saved=path.join(output,'progress.json');await download.saveAs(saved);
  const checkpoint=JSON.parse(fs.readFileSync(saved,'utf8'));assert.equal(checkpoint.schema,'powershellroom.progress');assert.equal(Object.keys(checkpoint.completed).length,50);
  await page.locator('[data-action="erase"]').click();assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem(PSREngine.KEY)).completed).length),0);
  await page.locator('#menu-button').click();await page.locator('#import-file').setInputFiles(saved);await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem(PSREngine.KEY)).completed).length),50);
  await page.locator('#import-file').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem(PSREngine.KEY)).completed).length),50);
  if(await page.locator('#dialog').evaluate(el=>el.open))await page.locator('#dialog-close').click();
  await page.locator('#toast').waitFor({state:'hidden'});
  // Responsive layout plus independently usable playground scenarios.
  await page.locator('.hero-actions [data-open]').click();
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(width===390)await page.screenshot({path:path.join(output,'lesson-mobile.png'),fullPage:true});
   await page.locator('#brand').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(width===390)await page.screenshot({path:path.join(output,'home-mobile.png'),fullPage:true});await page.locator('.hero-actions [data-open]').click();
  }
  await page.locator('#sandbox-button').click();for(const scenario of ['base','service-stopped','dns-wrong','tcp-blocked','web-503','low-disk']){await page.locator('#scenario-select').selectOption(scenario);await run('Get-Service -Name Spooler');assert.ok((await page.locator('#console-output').textContent()).includes('Spooler'));}
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await context.close();
  // A standalone HTML with the network disabled and separate CMD storage.
  const offline=await browser.newContext();await offline.setOffline(true);const offPage=await offline.newPage();
  await offPage.goto(pathToFileURL(path.join(root,'powershellroom.html')).href);await offPage.locator('.hero').waitFor();
  await offPage.evaluate(()=>localStorage.setItem('windowsCLIroom.progress.v1','unchanged CMD data'));
  await offPage.locator('.hero-actions [data-open]').click();await offPage.locator('#command-input').fill('Get-Command');await offPage.locator('#command-input').press('Enter');
  assert.ok((await offPage.locator('#console-output').textContent()).includes('Get-Process'));
  assert.equal(await offPage.evaluate(()=>localStorage.getItem('windowsCLIroom.progress.v1')),'unchanged CMD data');await offline.close();
  console.log('Object trace, locale-specific paths, insertion, IME, history, completion, reset, persistence, import/export, responsive layout and offline file passed. No external requests or page errors.');
 } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
