// Runs against disposable test data only. Screenshots stay in qa-results/.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {app} from '../test-support.mjs';
import {chromium,webkit} from 'playwright';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),cleanups=[];
const selected=process.argv.includes('--browser')?process.argv[process.argv.indexOf('--browser')+1]:'both';
const h=await app({after:fn=>cleanups.push(fn)});
const reports=[];
try {
 await h.alice.call('settings',{language:'de',theme:'night'});
 await h.alice.call('post',{body:'Du bist mein Lieblingsproblem. Mit Stil und Charme.',category:'Alltag'});
 await h.bob.call('post',{body:'Deine To-do-Liste hat inzwischen ein eigenes Geschichtsbuch.',category:'Internet'});
 await h.alice.upload('upload-post',{body:'Ein eigenes Foto für den Browser-Test.'});
 const request=await h.chat(h.alice,h.bob);await h.bob.call('message',{request,body:'Ein guter Konter ist auch ein Anfang.',expectedCost:5,sendToken:crypto.randomUUID()});
 mkdirSync(path.join(root,'qa-results'),{recursive:true});
 for(const [name,engine]of Object.entries({chromium,webkit})){
  if(selected!=='both'&&selected!==name)continue;
  const browser=await engine.launch({headless:true});
  try{
   for(const width of [320,390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:900},locale:'de-DE',isMobile:width<600,hasTouch:width<600});
    await context.addCookies([{name:'f_session',value:h.alice.cookie.split('=')[1],url:h.base}]);
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=500)errors.push(r.status()+' '+new URL(r.url()).pathname);});
    await page.goto(h.base,{waitUntil:'networkidle'});await page.waitForFunction(()=>!!globalThis.fStudio&&document.querySelectorAll('.post-card').length>0);
    for(const theme of ['night','pride','forest','ice']){
     await page.evaluate(async theme=>{await fStudio.settings();const b=document.querySelector('[data-theme-choice="'+theme+'"]');b.click();},theme);
     await page.waitForFunction(theme=>document.body.dataset.theme===theme,theme);await page.waitForTimeout(600);await page.click('#modal .modal-close');
     const sizing=await page.evaluate(()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,hero:document.querySelector('.hero').getBoundingClientRect().right,header:document.querySelector('.header-inner').getBoundingClientRect().right}));
     assert.ok(sizing.doc<=sizing.inner+1,`${name} ${width} ${theme}: horizontal overflow ${JSON.stringify(sizing)}`);assert.ok(sizing.hero<=width+1);assert.ok(sizing.header<=width+1);
     await page.screenshot({path:path.join(root,'qa-results',`${name}-${width}-${theme}-feed.png`),fullPage:true});
    }
    await page.evaluate(()=>fStudio.games());await page.waitForSelector('#modal .studio-game-tile');assert.equal(await page.locator('.studio-game-tile').count(),5);
    await page.screenshot({path:path.join(root,'qa-results',`${name}-${width}-games.png`)});
    await page.click('#modal .modal-close');await page.evaluate(async request=>{const d=await api('people'),r=d.requests.find(r=>r.id===request);await openChat(r.id,{id:r.sender===user.id?r.receiver:r.sender,name:r.name,color:r.color});},request);
    await page.waitForSelector('#message-input');await page.fill('#message-input','Nur für mich und für beide löschen testen.');await page.click('#message-form button[type=submit]');
    await page.waitForSelector('.message.mine .message-delete-button');await page.click('.message.mine .message-delete-button');
    assert.ok(await page.locator('text=Nur für mich').count());
    await page.keyboard.press('Escape');
    await page.screenshot({path:path.join(root,'qa-results',`${name}-${width}-chat.png`)});
    await page.evaluate(()=>closeModal());await page.evaluate(()=>fStudio.settings());
    for(const [language,heading]of [['en','Settings'],['ru','Настройки'],['uk','Налаштування'],['de','Einstellungen']]){
      await page.selectOption('#studio-language',language);await page.waitForFunction(lang=>document.documentElement.lang===lang,language);await page.waitForTimeout(200);
      assert.ok((await page.locator('#modal-title').textContent()).includes(heading),language);
    }
    await page.evaluate(()=>closeModal());await page.evaluate(async()=>{await fStudio.startOnboarding();});
    await page.click('[data-studio=onboarding-next]');await page.click('[data-studio=onboarding-next]');
    assert.equal(await page.locator('[data-studio=onboarding-next]').isDisabled(),true);await page.click('[data-studio=onboarding-answer][data-correct="1"]');await page.click('[data-studio=onboarding-next]');await page.click('[data-studio=onboarding-next]');
    await page.evaluate(()=>fStudio.achievements());await page.waitForSelector('.achievement-card');assert.equal(await page.locator('.achievement-card').count(),7);
    await page.evaluate(()=>closeModal());
    if(width===390){
      await page.click('.feedback-fab');await page.selectOption('#studio-feedback-form select','idea');await page.fill('#studio-feedback-form textarea','Ein Feedback aus dem echten Browser-Test '+name+'.');await page.click('#studio-feedback-form button[type=submit]');await page.waitForSelector('.feedback-success');await page.evaluate(()=>closeModal());
      await page.evaluate(()=>fStudio.achievements());await page.click('[data-studio=share]');await page.waitForSelector('[data-studio=share-download]:not([disabled])');
      const [download]=await Promise.all([page.waitForEvent('download'),page.click('[data-studio=share-download]')]);assert.equal(download.suggestedFilename(),'Feindschaft-Rekord.png');await page.evaluate(()=>closeModal());
      await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload({waitUntil:'networkidle'});await context.setOffline(true);await page.goto(h.base);await page.waitForSelector('[data-offline=title]');
      const keys=await page.evaluate(async()=>{const names=await caches.keys(),urls=[];for(const name of names){const cache=await caches.open(name);for(const req of await cache.keys())urls.push(req.url);}return urls;});assert.equal(keys.some(url=>/\/(?:api|media)\//.test(url)),false);await context.setOffline(false);await page.goto(h.base,{waitUntil:'networkidle'});
    }
    await page.emulateMedia({reducedMotion:'reduce'});const animated=await page.evaluate(()=>getComputedStyle(document.querySelector('.flower-character')).animationName);assert.equal(animated,'none');
    const performance=await page.evaluate(()=>globalThis.fPerformance);reports.push({engine:name,width,errors,performance});assert.deepEqual(errors,[],`${name} ${width}`);
    await context.close();
   }
  }finally{await browser.close();}
 }
 writeFileSync(path.join(root,'qa-results','browser-report.json'),JSON.stringify(reports,null,2));
 console.log('Browser checks passed for '+reports.length+' engine/viewport combinations, four themes each.');
}finally{for(const cleanup of cleanups.reverse())await cleanup();}
