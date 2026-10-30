import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.SAM_PLAYWRIGHT_MODULE||'playwright');
await mkdir('qa/first-look',{recursive:true});const results=[];
for(const [name,engine]of Object.entries({chromium,webkit})){
 const b=await engine.launch({headless:true});
 try{for(const [device,width,height,touch]of [['phone',390,844,true],['tablet',834,1112,true],['laptop',1440,1000,false]]){
  const c=await b.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,serviceWorkers:'block'}),p=await c.newPage(),errors=[],consoleErrors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  const response=await p.goto('http://127.0.0.1:8780/',{waitUntil:'load'});await p.waitForSelector('[data-frontend]');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(1200);
  const state=await p.evaluate(()=>({heading:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth-innerWidth,hero:document.querySelector('[data-road-stage]')?.dataset,carousel:document.querySelector('[data-catalogue-stage]')?.className}));
  await p.screenshot({path:`qa/first-look/${name}-${device}.png`});results.push({engine:name,device,status:response.status(),...state,errors,consoleErrors});console.log(JSON.stringify(results.at(-1)));await c.close();
 }}finally{await b.close();}
}
await writeFile('qa/first-look/report.json',JSON.stringify(results,null,2));
