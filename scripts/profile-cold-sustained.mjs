import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.SAM_PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.SAM_TEST_ORIGIN||'http://127.0.0.1:8780',seconds=Number(process.env.SAM_STRESS_SECONDS||84);
const browser=await chromium.launch({headless:true});const out='qa/cold-sustained-'+(process.env.SAM_AUDIT_TAG||'second-pass');await mkdir(out,{recursive:true});
const report={method:'Cold browser cache, phone 390x844 at DPR 3, 6x CPU slowdown, 1.6 Mbps down/600 kbps up and 150 ms latency through local web-server gzip/range delivery. Sustained native hero playback for two complete six-car cycles. This does not emulate real cellular packet loss or certify a physical phone.',seconds,failures:[]};
try{
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3,serviceWorkers:'block'}),p=await c.newPage(),cdp=await c.newCDPSession(p),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:75000,connectionType:'cellular4g'});await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
 await p.addInitScript(()=>{window.qaFcp=null;new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.name==='first-contentful-paint')window.qaFcp=e.startTime;}).observe({type:'paint',buffered:true});});
 await p.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>document.querySelector('[data-road-stage]')?.dataset.roadPlaying==='true',null,{timeout:45000});
 await p.locator('[data-showroom-motion]').evaluate(v=>new Promise(resolve=>v.requestVideoFrameCallback?v.requestVideoFrameCallback(resolve):resolve()));
 report.startup=await p.evaluate(()=>({firstHeroFrameMs:Math.round(performance.now()),firstContentfulPaintMs:Math.round(window.qaFcp||0),readyCovers:[...document.querySelectorAll('[data-catalogue-car] img')].filter(i=>i.complete&&i.naturalWidth).length,domContentLoadedMs:Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd)}));
 console.log('Cold phone startup: '+JSON.stringify(report.startup));
 await p.evaluate(()=>{
  const v=document.querySelector('[data-showroom-motion]'),q=v.getVideoPlaybackQuality(),stage=document.querySelector('[data-road-stage]');
  window.sustained={samples:[],tasks:[],models:[stage.dataset.roadIndex],waits:0,total:q.totalVideoFrames,dropped:q.droppedVideoFrames};window.collectingSustained=true;let previous;
  const frame=time=>{if(previous)window.sustained.samples.push(time-previous);previous=time;if(window.collectingSustained)requestAnimationFrame(frame);};requestAnimationFrame(frame);
  window.sustainedObserver=new MutationObserver(()=>{const id=stage.dataset.roadIndex;if(window.sustained.models.at(-1)!==id)window.sustained.models.push(id);});window.sustainedObserver.observe(stage,{attributes:true,attributeFilter:['data-road-index']});
  window.sustainedTasks=new PerformanceObserver(list=>window.sustained.tasks.push(...list.getEntries().map(e=>+e.duration.toFixed(2))));window.sustainedTasks.observe({type:'longtask',buffered:false});
  v.addEventListener('waiting',()=>window.sustained.waits++);
 });
 const nodeStarted=process.hrtime.bigint(),browserStarted=await p.evaluate(()=>performance.now());
 for(let elapsed=0;elapsed<seconds;elapsed+=14){await p.waitForTimeout(Math.min(14,seconds-elapsed)*1000);console.log('Sustained phone playback sampled '+Math.min(elapsed+14,seconds)+' seconds.');}
 report.clock={nodeElapsedMs:Number(process.hrtime.bigint()-nodeStarted)/1e6,browserElapsedMs:await p.evaluate(start=>performance.now()-start,browserStarted)};
 report.playback=await p.evaluate(()=>{
  window.collectingSustained=false;window.sustainedObserver.disconnect();window.sustainedTasks.disconnect();const s=window.sustained,a=s.samples.sort((x,y)=>x-y),v=document.querySelector('[data-showroom-motion]'),q=v.getVideoPlaybackQuality();
  return {frames:a.length,meanMs:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2),p95Ms:+a[Math.floor(a.length*.95)].toFixed(2),maxMs:+a.at(-1).toFixed(2),over25ms:a.filter(n=>n>25).length,longTasks:s.tasks,modelSequence:s.models,bufferWaits:s.waits,videoFrames:q.totalVideoFrames-s.total,droppedVideoFrames:q.droppedVideoFrames-s.dropped,paused:v.paused,mediaError:v.error?.message||null,readyCovers:[...document.querySelectorAll('[data-catalogue-car] img')].filter(i=>i.complete&&i.naturalWidth).length,resources:performance.getEntriesByType('resource').filter(e=>e.transferSize>0).map(e=>({path:new URL(e.name).pathname,bytes:e.transferSize,durationMs:Math.round(e.duration)}))};
 });
 assert.deepEqual(errors,[]);assert.equal(report.playback.mediaError,null);assert.equal(report.playback.paused,false);assert.equal(report.playback.readyCovers,9);
 if(seconds>=42)assert.equal(new Set(report.playback.modelSequence).size,6,'All six car chapters must play');
 assert.ok(report.playback.p95Ms<=33.5,'Sustained frame budget exceeded');assert.ok(report.playback.droppedVideoFrames/Math.max(1,report.playback.videoFrames)<=.01,'More than 1% dropped video frames');
 report.errors=errors;console.log('Sustained result: '+JSON.stringify({...report.playback,resources:undefined}));await c.close();
}catch(e){report.failures.push(e.stack);console.log(e.stack);process.exitCode=1;}
finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
