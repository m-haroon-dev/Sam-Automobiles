import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.SAM_PLAYWRIGHT_MODULE||'playwright');
const access=JSON.parse(await readFile('/private/tmp/sam-laravel-runtime/preview-access.json','utf8')),origin='http://127.0.0.1:8780';
await mkdir('qa/admin',{recursive:true});const report={cases:[],failures:[]};
for(const [engineName,engine]of Object.entries({chromium,webkit})){
 const b=await engine.launch({headless:true});let session;
 try{for(const [device,width,height,touch]of [['phone',390,844,true],['tablet',834,1112,true],['laptop',1440,1000,false]]){
  const c=await b.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,serviceWorkers:'block',...(session?{storageState:session}:{})}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  if(!session){await p.goto(origin+'/admin/login');await p.locator('input[name=email]').fill(access.email);await p.locator('input[name=password]').fill(access.password);await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.waitForURL(origin+'/admin');session=await c.storageState();}else await p.goto(origin+'/admin');await p.waitForSelector('[data-admin-car]');assert.equal(await p.locator('[data-admin-car]').count(),9);await p.evaluate(()=>document.fonts.ready);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1),'Admin dashboard overflow');await p.screenshot({path:`qa/admin/${engineName}-${device}-dashboard.png`,fullPage:true});
  await p.getByRole('link',{name:'Edit car',exact:true}).first().click();await p.waitForSelector('input[name=name]');assert.ok(await p.locator('[data-admin-photo]').count());assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1),'Editor overflow');await p.screenshot({path:`qa/admin/${engineName}-${device}-editor.png`,fullPage:true});
  await p.goto(origin+'/inventory/');await p.waitForSelector('[data-catalogue]');await p.screenshot({path:`qa/admin/${engineName}-${device}-public-inventory.png`});await p.goto(origin+'/cars/mercedes-s580e-l-2022/');await p.waitForSelector('[data-gallery]');await p.screenshot({path:`qa/admin/${engineName}-${device}-public-detail.png`});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1));
  assert.deepEqual(errors,[]);report.cases.push({engine:engineName,device,login:true,dashboard:true,editor:true,publicInventory:true,publicDetail:true,errors});console.log(engineName+' '+device+': admin first pass succeeded');await c.close();
 }}finally{await b.close();}
}
await writeFile('qa/admin/report.json',JSON.stringify(report,null,2));
