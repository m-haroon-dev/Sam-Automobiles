import assert from 'node:assert/strict';
export function inspectPhotoFrames() {
 const shown=e=>e.getClientRects().length&&e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden],[inert]');
 return [...document.querySelectorAll('.car-image-frame,.thumbnail-strip button')].filter(shown).map(e=>{
  const r=e.getBoundingClientRect(),picture=e.querySelector('picture'),img=e.querySelector('img');
  return {source:img?.getAttribute('src'),ratio:r.width/r.height,radius:getComputedStyle(e).borderRadius,width:e.clientWidth,height:e.clientHeight,pictureWidth:picture?.clientWidth??null,pictureHeight:picture?.clientHeight??null,imageWidth:img?.clientWidth??null,imageHeight:img?.clientHeight??null,objectFit:img?getComputedStyle(img).objectFit:null};
 });
}
export function validatePhotoFrames(frames) {
 for(const f of frames){
  assert.ok(Math.abs(f.ratio-4/3)<.025,'Photo frame must stay 4:3: '+f.source);
  assert.equal(f.radius,'10px','Photo radius: '+f.source);
  assert.equal(f.objectFit,'cover','Photo must use object-fit cover: '+f.source);
  for(const prefix of ['picture','image'])if(f[prefix+'Width']!==null){
   assert.ok(Math.abs(f.width-f[prefix+'Width'])<=1,'Photo '+prefix+' must fill frame width: '+f.source);
   assert.ok(Math.abs(f.height-f[prefix+'Height'])<=1,'Photo '+prefix+' must fill frame height: '+f.source);
  }
 }
}
export async function checkPhotoFrames(page) {
 const frames=await page.evaluate(inspectPhotoFrames);validatePhotoFrames(frames);return frames.length;
}
