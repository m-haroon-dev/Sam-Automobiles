import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {inspectPhotoFrames,validatePhotoFrames} from './lib/release-photo-checks.mjs';
const {chromium,webkit}=await import(process.env.SAM_PLAYWRIGHT_MODULE||'playwright');
const engineName=process.env.SAM_BROWSER||'chromium',origin=process.env.SAM_TEST_ORIGIN||'http://127.0.0.1:8780';
const out=`qa/stress-second-pass-${engineName}`;await mkdir(out,{recursive:true});
const cars=JSON.parse(await readFile('resources/inventory/cars.json','utf8'));
const browser=await {chromium,webkit}[engineName].launch({headless:true});
const report={engine:engineName,method:'Expanded responsive layouts, real input bursts, rotation, actual displayed main-gallery photos and runtime reduced motion. Chromium uses native CDP touch; WebKit uses browser-native scroll position for its touch catalogue.',cases:[],failures:[]};
async function ready(p){await p.waitForSelector('[data-frontend]');await p.evaluate(()=>document.fonts.ready);if(await p.locator('[data-lead-fields]').count())await p.waitForFunction(()=>!document.querySelector('[data-lead-fields]').disabled);}
async function go(p,path){const r=await p.goto(origin+path,{waitUntil:'load'});assert.equal(r.status(),200);await ready(p);}
async function swipe(p,c,touch,dx){
 const element=p.locator('[data-catalogue-viewport]');await element.scrollIntoViewIfNeeded();const b=await element.boundingBox();
 if(touch&&engineName==='chromium'){
  const cdp=await c.newCDPSession(p),x=b.x+b.width*(dx<0?.8:.2),y=Math.max(20,Math.min(p.viewportSize().height-50,b.y+120));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y}]});await p.waitForTimeout(10);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 }else if(touch)await element.evaluate((v,dx)=>v.scrollBy({left:-dx,behavior:'smooth'}),dx);
 else{const x=b.x+b.width*(dx<0?.75:.25),y=Math.max(20,Math.min(p.viewportSize().height-50,b.y+120));await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+dx,y,{steps:12});await p.mouse.up();}
}
try{
 const routes=['/','/inventory/','/cars/mercedes-s580e-l-2022/','/compare/?cars='+cars.slice(0,3).map(c=>c.id).join(','),'/visit/','/sell/'];
 for(const [device,width,height,touch]of [['small-phone',320,740,true],['samsung-size',412,915,true],['tablet-landscape',1024,768,true],['wide-desktop',1920,1080,false]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:touch?3:1,serviceWorkers:'block'});
  const p=await context.newPage();p.setDefaultTimeout(12000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  for(const route of routes){
   try{await go(p,route);await p.evaluate(async()=>{const imgs=[...document.images].filter(i=>i.getAttribute('src'));for(const i of imgs)i.loading='eager';await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));});
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1),'Page overflow');validatePhotoFrames(await p.evaluate(inspectPhotoFrames));
    assert.deepEqual(await p.evaluate(()=>[...document.images].filter(i=>i.getAttribute('src')&&!i.naturalWidth).map(i=>i.src)),[]);assert.deepEqual(errors,[]);
    report.cases.push({device,width,route,status:'passed'});
   }catch(e){report.failures.push({device,route,message:e.message});}
  }
  await context.close();console.log(`${engineName} ${device}: six edge-layout pages checked.`);
 }
 for(const [device,width,height,touch]of [['phone',390,844,true],['tablet',834,1112,true],['laptop',1440,1000,false]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:touch?3:1,serviceWorkers:'block'});
  const p=await c.newPage();p.setDefaultTimeout(12000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  try{
   await go(p,'/');await p.waitForSelector('[data-catalogue-stage].is-enhanced');
   await p.locator('[data-catalogue-car] img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
   const root=p.locator('[data-catalogue-stage]'),viewport=p.locator('[data-catalogue-viewport]');
   await root.focus();await p.keyboard.press('Home');await p.waitForTimeout(750);
   for(let i=0;i<16;i++){await swipe(p,c,touch,(i%8<4?-1:1)*Math.min(260,width*.55));await p.waitForTimeout(90);}
   await p.waitForTimeout(900);assert.equal(new URL(p.url()).pathname,'/','Swipes must never open a listing');
   assert.equal(await root.locator('.catalogue-slide.is-centre').count(),1);assert.equal(await root.locator('.is-centre img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
   await root.focus();await p.keyboard.press('Home');await p.waitForTimeout(800);
   for(let i=0;i<4;i++){await p.locator('[data-stage-next]').click();await p.waitForTimeout(750);}
   const selected=await root.getAttribute('data-active-car');
   await p.setViewportSize({width:touch?height:1280,height:touch?width:800});await p.waitForTimeout(750);
   assert.equal(await root.getAttribute('data-active-car'),selected,'Rotation/resizing must preserve the selected car');
   await p.setViewportSize({width,height});await p.waitForTimeout(750);assert.equal(await root.getAttribute('data-active-car'),selected);
   const order=await root.locator('[data-catalogue-car]').evaluateAll(nodes=>nodes.map(n=>n.dataset.catalogueCar));
   for(let i=0;i<20;i++){await p.locator('[data-stage-next]').click({force:true});await p.waitForTimeout(35);}
   await p.waitForTimeout(1300);assert.equal(await root.getAttribute('data-active-car'),order[(order.indexOf(selected)+20)%order.length],'Rapid Next presses must each advance the intended selection');assert.equal(await root.locator('.is-centre').count(),1);assert.ok(Number(await p.locator('[data-stage-progress]').getAttribute('aria-valuenow'))>=1);
   await go(p,'/cars/lexus-lx570-2018/');const gallery=p.locator('.gallery-main img');
   for(let i=0;i<18;i++)await p.locator(`[data-photo-index="${i%6}"]`).evaluate(b=>b.click());
   await gallery.evaluate(i=>i.decode());assert.ok((await gallery.evaluate(i=>i.currentSrc)).includes('lexus-lx570-2018-6-'));
   const inactiveSource=await gallery.evaluate(i=>i.closest('picture').querySelector('source').srcset);assert.ok(inactiveSource.includes('lexus-lx570-2018-6-'));
   if(engineName==='chromium'){
    const cdp=await c.newCDPSession(p);await cdp.send('HeapProfiler.collectGarbage');const before=await cdp.send('Memory.getDOMCounters');
    await p.evaluate(async()=>{const buttons=[...document.querySelectorAll('[data-photo-index]')];for(let i=0;i<60;i++){buttons[i%buttons.length].click();await new Promise(requestAnimationFrame);}});
    await p.waitForTimeout(500);await cdp.send('HeapProfiler.collectGarbage');const after=await cdp.send('Memory.getDOMCounters');
    assert.ok(after.nodes-before.nodes<100,'Gallery interaction must not accumulate DOM nodes');assert.ok(after.jsEventListeners-before.jsEventListeners<20,'Gallery interaction must not accumulate listeners');
    report.cases.push({device,name:'Sixty repeated gallery changes and post-GC DOM/listener bounds',before,after,status:'passed'});await cdp.detach();
   }
   await go(p,'/');await p.waitForFunction(()=>document.querySelector('[data-road-stage]')?.dataset.roadPlaying==='true');await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>!document.querySelector('[data-showroom-motion]').hasAttribute('src'),null,{timeout:3000});
   assert.equal(await p.locator('[data-showroom-motion]').getAttribute('src'),null);const first=await p.locator('[data-wheel-link]').getAttribute('href');await p.locator('[data-wheel-next]').click();assert.notEqual(await p.locator('[data-wheel-link]').getAttribute('href'),first);
   await p.emulateMedia({reducedMotion:'no-preference'});await p.locator('[data-showroom-motion]').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('[data-road-stage]').dataset.roadPlaying==='true');
   assert.deepEqual(errors,[]);report.cases.push({device,name:'Sixteen swipe/drag reversals, rotation, twenty rapid selections, gallery bursts and live motion-preference switching',status:'passed'});
   console.log(`${engineName} ${device}: interaction stress passed.`);
  }catch(e){report.failures.push({device,message:e.stack});console.log(`FAIL ${device}: ${e.message}`);}
  finally{await c.close();}
 }
}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
if(report.failures.length){console.log(report.failures);process.exitCode=1;}
