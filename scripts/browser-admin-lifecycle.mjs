import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.SAM_PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.SAM_TEST_ORIGIN||'http://127.0.0.1:8780';
const access=JSON.parse(await readFile('/private/tmp/sam-laravel-runtime/preview-access.json','utf8'));
const out='qa/admin-lifecycle';await mkdir(out,{recursive:true});
const report={method:'Real browser login and multipart uploads, then anonymous public verification. Only disposable QA records are changed.',cases:[],records:[],failures:[]};
for(const [engineName,engine,width,height,touch]of [['chromium',chromium,1440,1000,false],['webkit',webkit,390,844,true]]){
 const browser=await engine.launch({headless:true});
 const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
 const anonymous=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,serviceWorkers:'block'});
 const p=await context.newPage(),publicPage=await anonymous.newPage(),errors=[];
 p.setDefaultTimeout(12000);publicPage.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));publicPage.on('pageerror',e=>errors.push(e.message));
 const name='QA Browser '+engineName,slug='qa-browser-'+engineName+'-'+Date.now();let id;
 const save=async()=>{const response=p.waitForResponse(r=>r.url().startsWith(origin+'/admin/cars')&&r.request().method()==='POST');await p.getByRole('button',{name:'Save car',exact:true}).click();assert.ok([302,303].includes((await response).status()));await p.getByRole('status').filter({hasText:/Car saved|Car details/}).waitFor();};
 const data=async()=>{const response=await anonymous.request.get(origin+'/cars.json');assert.equal(response.status(),200);return response.json();};
 const home=async()=>{await publicPage.goto(origin+'/');await publicPage.waitForSelector('[data-frontend]');return publicPage.evaluate(()=>JSON.parse(document.querySelector('script[data-page=app]').textContent).props);};
 try{
  await p.goto(origin+'/admin/login');await p.locator('[name=email]').fill(access.email);await p.locator('[name=password]').fill(access.password);await p.getByRole('button',{name:'Sign in',exact:true}).click();await p.waitForURL(origin+'/admin');
  await p.getByRole('link',{name:'Add a car',exact:false}).click();await p.waitForURL('**/admin/cars/create');
  for(const [key,value]of Object.entries({name,slug,make:'QA',model:'Browser verification',year:'2025',mileage:'1500',trim:'Disposable test record',best_for:'QA only. <img src=x onerror=window.qaInjected=true> This listing is removed after browser testing.',usp:'Verifies the complete owner workflow.',features:'Temporary equipment\nSecond temporary feature',notes:'Temporary additional note'}))await p.locator('[name='+key+']').fill(value);
  await p.locator('[name=status]').selectOption('available');await p.locator('[name=is_featured]').check();await p.locator('[name=featured_order]').fill('0');
  await p.locator('input[type=file]').setInputFiles(out+'/upload-1.jpg');await save();await p.waitForURL(/\/admin\/cars\/\d+\/edit/);id=Number(p.url().match(/cars\/(\d+)/)[1]);report.records.push({id,slug,name,engine:engineName});await writeFile(out+'/records.json',JSON.stringify(report.records,null,2));
  await p.locator('[data-admin-photo]').first().waitFor();assert.equal(await p.locator('[data-admin-photo]').count(),1);
  let car=(await data()).find(c=>c.id===slug);assert.ok(car);assert.equal(car.status,'available');assert.equal(car.photos.length,1);assert.ok(car.photos[0].src.startsWith('/storage/cars/'));
  const imageResponse=await anonymous.request.get(origin+car.photos[0].medium);assert.equal(imageResponse.status(),200);assert.ok(imageResponse.headers()['content-type'].includes('image/webp'));
  let props=await home();assert.ok(props.featuredCars.some(c=>c.id===slug));assert.ok(await publicPage.locator('[data-catalogue-stage] [data-catalogue-car="'+slug+'"]').count());
  await publicPage.goto(origin+'/cars/'+slug+'/');await publicPage.waitForSelector('[data-gallery]');assert.equal(await publicPage.locator('h1').textContent(),name);assert.equal(await publicPage.locator('img[src=x]').count(),0);assert.equal(await publicPage.evaluate(()=>window.qaInjected),undefined);assert.equal(await publicPage.locator('script[type="application/ld+json"]').evaluate(s=>JSON.parse(s.textContent)['@type']),'Vehicle');assert.ok((await publicPage.locator('main').textContent()).includes('Temporary additional note'));await publicPage.screenshot({path:out+'/'+engineName+'-published.png',fullPage:true});
  await p.locator('input[type=file]').setInputFiles(out+'/upload-2.jpg');await save();await p.waitForFunction(()=>document.querySelectorAll('[data-admin-photo]').length===2);
  await p.getByRole('button',{name:'Move photograph 2 earlier',exact:true}).click();const coverId=await p.locator('[data-admin-photo]').first().getAttribute('data-admin-photo');
  await p.locator('[data-admin-photo]').first().getByRole('textbox',{name:'Description',exact:true}).fill('QA revised cover photograph');await p.locator('[data-admin-photo]').first().getByRole('textbox',{name:'Accessible image description',exact:true}).fill('QA accessible cover');await p.locator('[name=features]').fill('');await p.locator('[name=notes]').fill('');await save();
  car=(await data()).find(c=>c.id===slug);assert.equal(car.photos.length,2);assert.equal(car.photos[0].description,'QA revised cover photograph');assert.equal(car.photos[0].alt,'QA accessible cover');assert.deepEqual(car.features,[]);assert.deepEqual(car.notes,[]);assert.equal(await p.locator('[data-admin-photo]').first().getAttribute('data-admin-photo'),coverId);
  const csrf=await context.request.patch(origin+'/admin/cars/'+id+'/status',{headers:{Accept:'application/json'},data:{status:'sold'}});assert.equal(csrf.status(),419);assert.equal((await data()).find(c=>c.id===slug).status,'available');
  await p.locator('[name=status]').selectOption('sold');await save();car=(await data()).find(c=>c.id===slug);assert.equal(car.status,'sold');props=await home();assert.ok(!props.featuredCars.some(c=>c.id===slug));assert.ok(props.soldCars.some(c=>c.id===slug));assert.ok(await publicPage.locator('[data-recently-sold] a[href="/cars/'+slug+'/"]').count());
  await publicPage.goto(origin+'/inventory/?status=sold');await publicPage.waitForSelector('[data-car-id="'+slug+'"][data-status=sold]');assert.ok((await publicPage.locator('[data-car-id="'+slug+'"]').textContent()).includes('Sold'));await publicPage.screenshot({path:out+'/'+engineName+'-sold.png',fullPage:true});
  await p.locator('[name=status]').selectOption('available');await p.locator('[name=is_featured]').check();await save();props=await home();assert.ok(props.featuredCars.some(c=>c.id===slug));
  p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Archive car',exact:true}).click();await p.waitForURL(origin+'/admin');assert.ok(!(await data()).some(c=>c.id===slug));assert.equal((await anonymous.request.get(origin+'/cars/'+slug+'/')).status(),404);
  await p.getByRole('combobox',{name:'Status',exact:true}).selectOption('archived');const archived=p.locator('[data-admin-car="'+id+'"]');await archived.getByRole('button',{name:'Restore as draft',exact:true}).click();await archived.waitFor({state:'hidden'});await p.getByRole('combobox',{name:'Status',exact:true}).selectOption('draft');await p.locator('[data-admin-car="'+id+'"]').getByText('Draft',{exact:true}).waitFor();assert.ok(!(await data()).some(c=>c.id===slug));assert.equal((await anonymous.request.get(origin+'/cars/'+slug+'/')).status(),404);
  assert.deepEqual(errors,[]);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1));
  report.cases.push({engine:engineName,viewport:{width,height},create:true,realUpload:true,responsivePhotos:true,publish:true,feature:true,reorderCover:true,editCaptions:true,clearLists:true,csrf419:true,soldTag:true,recentlySold:true,archive:true,restorePrivateDraft:true,errors});
  console.log(engineName+': complete inventory lifecycle passed');
 }catch(error){report.failures.push({engine:engineName,message:error.stack,errors});await p.screenshot({path:out+'/'+engineName+'-failure.png',fullPage:true});console.error(engineName+': '+error.message);}
 finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await anonymous.close();await context.close();await browser.close();}
}
if(report.failures.length)process.exitCode=1;
