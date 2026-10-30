import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.SAM_PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.SAM_TEST_ORIGIN||'http://127.0.0.1:8780';
const report={method:'Inertia links, browser back/forward, metadata, saved state and motion remounts in the same browser document.',cases:[],failures:[]};await mkdir('qa/spa',{recursive:true});
for(const [name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch({headless:true});
 try{for(const [device,width,height,touch]of [['phone',390,844,true],['tablet',834,1112,true],['laptop',1440,1000,false]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,serviceWorkers:'block'}),p=await c.newPage(),errors=[];p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
  try{
   await p.goto(origin+'/');await p.waitForSelector('[data-frontend]');await p.evaluate(()=>window.qaDocumentMarker='sam-spa');
   for(let i=0;i<4;i++){
    await p.locator('a[href="/inventory/"]:visible').first().click();await p.waitForURL(origin+'/inventory/');await p.waitForSelector('[data-catalogue]');
    const card=p.locator('[data-catalogue] .car-card').first(),slug=await card.getAttribute('data-car-id');
    if(i===0){await card.locator('[data-save]').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('sam:saved')||'[]').length===1);}
    await card.locator('.car-photo').click();await p.waitForURL(origin+'/cars/'+slug+'/');await p.waitForSelector('[data-gallery]');
    assert.equal(await p.evaluate(()=>window.qaDocumentMarker),'sam-spa','Public links must retain the browser document');
    assert.equal(await p.locator('head title').count(),1);assert.equal(await p.locator('meta[name=description]').count(),1);assert.equal(await p.locator('link[rel=canonical]').count(),1);
    assert.ok((await p.locator('link[rel=canonical]').getAttribute('href')).includes('/cars/'+slug));assert.equal(await p.locator('script[type="application/ld+json"]').evaluate(s=>JSON.parse(s.textContent)['@type']),'Vehicle');
    await p.goBack();await p.waitForURL(origin+'/inventory/');await p.waitForSelector('[data-catalogue]');assert.equal(await p.locator('[data-save="'+slug+'"]').getAttribute('aria-pressed'),'true');
    await p.goForward();await p.waitForSelector('[data-gallery]');await p.locator('header .brand').click();await p.waitForURL(origin+'/');await p.waitForSelector('[data-road-stage]');
    await p.waitForFunction(()=>document.querySelector('[data-road-stage]').dataset.roadPlaying==='true');assert.equal(await p.locator('[data-showroom-motion]').count(),1);assert.equal(await p.locator('[data-catalogue-stage]').count(),1);
   }
   assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>window.qaDocumentMarker),'sam-spa');
   await p.screenshot({path:'qa/spa/'+name+'-'+device+'-home.png'});
   await p.locator('[data-catalogue-stage]').scrollIntoViewIfNeeded();await p.locator('[data-catalogue-stage]').screenshot({path:'qa/spa/'+name+'-'+device+'-featured.png'});
   report.cases.push({engine:name,device,cycles:4,noFullReload:true,backForward:true,savedState:true,metadata:true,heroRemount:true,errors});console.log(name+' '+device+': SPA navigation passed');
  }catch(e){report.failures.push({engine:name,device,message:e.stack,errors});}finally{await c.close();}
 }}finally{await browser.close();await writeFile('qa/spa/report.json',JSON.stringify(report,null,2));}
}
if(report.failures.length)process.exitCode=1;
