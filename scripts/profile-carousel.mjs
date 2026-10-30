import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
const {chromium}=await import(process.env.SAM_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:chromium.executablePath()});
const target=process.env.SAM_PROFILE_TARGET||'catalogue',selector=target==='orbit'?'.orbit-wheel .wheel-stage':'[data-catalogue-viewport]';
const dir=`qa/profile-carousel-${process.env.SAM_AUDIT_TAG||'continuous'}`;await mkdir(dir,{recursive:true});
const report={target,method:'Headless Chromium during native CDP phone touch and desktop wheel momentum, not just next-button clicks. Phone: 390px, DPR 2, CPU 4x. Desktop: 1440px, CPU 1x. Warm responsive images. These are bounded emulated measurements, not physical-device FPS.',runs:[]};
try{
 for(const width of (process.env.SAM_PROFILE_WIDTHS||'390,834,1440').split(',').map(Number)){
  const mobile=width<1200,context=await browser.newContext({viewport:{width,height:mobile?844:1000},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,serviceWorkers:'block'}),page=await context.newPage();
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:mobile?4:1});
  await page.goto((process.env.SAM_TEST_ORIGIN||'http://127.0.0.1:8780')+(process.env.SAM_TEST_ROUTE||'/'));await page.waitForSelector(target==='orbit'?'.orbit-wheel [aria-current="true"]':'[data-catalogue-stage].is-enhanced');
  await page.evaluate(async selector=>{const root=document.querySelector(selector);await Promise.all([...root.querySelectorAll('img')].map(image=>image.decode()));scrollTo({top:root.getBoundingClientRect().top+scrollY-24,behavior:'instant'});},selector);await delay(600);
  const before=await cdp.send('Performance.getMetrics');
  await page.evaluate(()=>{window.carouselSamples=[];window.carouselTasks=[];window.carouselSampling=true;let previous;const frame=time=>{if(previous)window.carouselSamples.push(time-previous);previous=time;if(window.carouselSampling)requestAnimationFrame(frame);};requestAnimationFrame(frame);window.carouselObserver=new PerformanceObserver(list=>window.carouselTasks.push(...list.getEntries().map(entry=>+entry.duration.toFixed(2))));window.carouselObserver.observe({type:'longtask',buffered:false});});
  if(mobile){
   for(let gesture=0;gesture<8;gesture++){
    const distance=target==='catalogue'?Math.min(width*.62,width-100):190;const dx=gesture<5?-distance:distance,x=dx<0?width*.78:width*.22,y=145;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let step=1;step<=14;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*step/14,y}]});await delay(12);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(440);
   }
  }else{
   await page.mouse.move(width/2,145);
   for(let gesture=0;gesture<6;gesture++){
    const sign=gesture<3?1:-1;
    for(const delta of [...Array(16).fill(48),30,20,12,6,3,1]){await page.mouse.wheel(delta*sign,0);await delay(16);}
    await delay(440);
   }
  }
  const sample=await page.evaluate(()=>{window.carouselSampling=false;window.carouselObserver.disconnect();const values=window.carouselSamples.sort((a,b)=>a-b),sum=values.reduce((a,b)=>a+b,0);return {frames:values.length,meanMs:+(sum/values.length).toFixed(2),p95Ms:+values[Math.floor(values.length*.95)].toFixed(2),maxMs:+values.at(-1).toFixed(2),over25ms:values.filter(x=>x>25).length,over50ms:values.filter(x=>x>50).length,longTasks:window.carouselTasks};});
  const after=await cdp.send('Performance.getMetrics'),a=Object.fromEntries(after.metrics.map(m=>[m.name,m.value])),b=Object.fromEntries(before.metrics.map(m=>[m.name,m.value]));
  const work=Object.fromEntries(['LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration'].map(key=>[key,+(a[key]-b[key]).toFixed(4)]));
  const row={width,cpuThrottle:mobile?4:1,input:mobile?'Eight native touch gestures, five forward and three reverse':'Six long trackpad-style wheel streams with momentum tails and reversal',...sample,work,heroPausedOffscreen:await page.locator('[data-road-stage]').count()?await page.locator('[data-road-stage]').getAttribute('data-road-playing')==='false':null};
  report.runs.push(row);console.log(JSON.stringify(row));await context.close();
 }
}finally{await writeFile(dir+'/report.json',JSON.stringify(report,null,2));await browser.close();}
