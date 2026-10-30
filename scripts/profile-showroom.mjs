import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.SAM_PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.SAM_TEST_ORIGIN||'http://127.0.0.1:8780';
const out='qa/profile-showroom-'+(process.env.SAM_AUDIT_TAG||'final');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={date:'2026-10-29',method:'Isolated Chromium browser preview: 14 seconds of native video across two car chapters. Phone and touch tablet at DPR 2 and 4x CPU throttle; laptop at normal CPU. RAF timings and native video frame counters are bounded emulation, not physical iPhone/Samsung FPS.',runs:[]};
try{
 for(const [device,width,height,touch]of [['phone',390,844,true],['tablet',834,1112,true],['laptop',1440,1000,false]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:touch?2:1,serviceWorkers:'block'});
  const p=await c.newPage(),cdp=await c.newCDPSession(p);await cdp.send('Performance.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:touch?4:1});
  await p.goto(origin+'/',{waitUntil:'load'});await p.waitForFunction(()=>document.querySelector('[data-road-stage]').dataset.roadPlaying==='true');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(1400);
  const before=await cdp.send('Performance.getMetrics');
  await p.evaluate(()=>{
   const v=document.querySelector('[data-showroom-motion]'),quality=v.getVideoPlaybackQuality();
   window.qaHero={frames:[],tasks:[],totalBefore:quality.totalVideoFrames,droppedBefore:quality.droppedVideoFrames,timeBefore:v.currentTime};
   let previous;window.qaHeroRunning=true;
   const frame=time=>{if(previous)window.qaHero.frames.push(time-previous);previous=time;if(window.qaHeroRunning)requestAnimationFrame(frame);};requestAnimationFrame(frame);
   window.qaHeroObserver=new PerformanceObserver(list=>window.qaHero.tasks.push(...list.getEntries().map(e=>+e.duration.toFixed(2))));window.qaHeroObserver.observe({type:'longtask',buffered:false});
  });
  await p.waitForTimeout(14000);
  const sample=await p.evaluate(()=>{
   window.qaHeroRunning=false;window.qaHeroObserver.disconnect();
   const q=window.qaHero,a=q.frames.sort((x,y)=>x-y),v=document.querySelector('[data-showroom-motion]'),quality=v.getVideoPlaybackQuality();
   return {frames:a.length,meanMs:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2),p95Ms:+a[Math.floor(a.length*.95)].toFixed(2),maxMs:+a.at(-1).toFixed(2),over25ms:a.filter(x=>x>25).length,longTasks:q.tasks,video:{timeAdvanced:+(v.currentTime-q.timeBefore).toFixed(3),frames:quality.totalVideoFrames-q.totalBefore,dropped:quality.droppedVideoFrames-q.droppedBefore,width:v.videoWidth,height:v.videoHeight,source:v.getAttribute('src')}};
  });
  const after=await cdp.send('Performance.getMetrics'),a=Object.fromEntries(after.metrics.map(x=>[x.name,x.value])),b=Object.fromEntries(before.metrics.map(x=>[x.name,x.value]));
  const work=Object.fromEntries(['LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration'].map(key=>[key,+(a[key]-b[key]).toFixed(4)]));
  const row={device,width,height,cpuThrottle:touch?4:1,...sample,work};report.runs.push(row);console.log(JSON.stringify(row));await c.close();
 }
}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
