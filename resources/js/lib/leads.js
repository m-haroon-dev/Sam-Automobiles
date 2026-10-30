// No form data is stored, uploaded or sent until the visitor chooses WhatsApp
// or the native share sheet. Tracking receives event names, never form contents.
export function normalizePakistanPhone(value='') {
  const raw=String(value).trim();
  if(!/^[+\d\s()-]+$/.test(raw))return null;
  let phone=raw.replace(/[\s()-]/g,'');
  if(phone.startsWith('0092'))phone='+'+phone.slice(2);
  if(/^03\d{9}$/.test(phone))phone='+92'+phone.slice(1);
  if(/^923\d{9}$/.test(phone))phone='+'+phone;
  return /^\+923\d{9}$/.test(phone)?phone:null;
}
export function karachiClock(now=new Date()) {
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 return {day:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};
}
export function validateViewing(fields,now=new Date()) {
 const errors={};const name=String(fields.name||'').trim();
 if(name.length<2||name.length>100)errors.name='Enter your name (2–100 characters).';
 const phone=normalizePakistanPhone(fields.phone);
 if(!phone)errors.phone='Enter a Pakistan mobile number such as +92 324 2607773.';
 const day=String(fields.day||'');const time=String(fields.time||'');const clock=karachiClock(now);
 const date=/^\d{4}-\d{2}-\d{2}$/.test(day)?new Date(day+'T12:00:00Z'):new Date(NaN);
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==day)errors.day='Choose a valid viewing date.';
 else if(day<clock.day)errors.day='Choose today or a future date.';
 else if(date.getUTCDay()===0)errors.day='The showroom is open Monday–Saturday. Choose another day.';
 if(!/^(?:1[1-9]):(?:00|30)$/.test(time)||time>'19:00')errors.time='Choose a time from 11 am to 7 pm, in 30-minute slots.';
 else if(day===clock.day&&time<=clock.time)errors.time='Choose a time that has not already passed in Karachi.';
 if(String(fields.message||'').length>1800)errors.message='Keep your note to 1,800 characters.';
 return {errors,values:{...fields,name,phone,day,time}};
}
export function validateTrade(fields,files=[],now=new Date()) {
 const errors={};const name=String(fields.name||'').trim();const phone=normalizePakistanPhone(fields.phone);
 if(name.length<2||name.length>100)errors.name='Enter your name (2–100 characters).';
 if(!phone)errors.phone='Enter a Pakistan mobile number such as +92 324 2607773.';
 const car=String(fields.car||'').trim();if(car.length<3||car.length>150)errors.car='Enter the make, model and trim of your car.';
 const year=Number(fields.year);if(!/^\d{4}$/.test(String(fields.year||''))||year<1900||year>now.getUTCFullYear()+1)errors.year='Enter a valid four-digit model year.';
 const mileage=Number(fields.mileage);if(!/^\d+$/.test(String(fields.mileage??''))||!Number.isSafeInteger(mileage)||mileage<0||mileage>10000000)errors.mileage='Enter the mileage as a whole number of kilometres.';
 if(!['sell','trade'].includes(fields.intent))errors.intent='Choose sell or trade in.';
 if(String(fields.message||'').length>1800)errors.message='Keep your note to 1,800 characters.';
 const imageTypes=new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif']);
 if(files.length>6)errors.photos='Choose no more than 6 photographs.';
 else if(files.some(file=>file.size>10*1024*1024))errors.photos='Each photograph must be 10 MB or smaller.';
 else if(files.some(file=>file.size===0||(!imageTypes.has(file.type)&&!(!file.type&&/\.(heic|heif)$/i.test(file.name)))))errors.photos='Choose JPEG, PNG, WebP or HEIC photographs.';
 return {errors,values:{...fields,name,phone,car,year,mileage}};
}
export function viewingMessage(fields,car,site){return [`Hello SAM Automobiles, I’d like to request a viewing.`,`Name: ${fields.name}`,`Mobile: ${fields.phone}`,car?`Car: ${car.year||''} ${car.name}${car.trim?' · '+car.trim:''}`:'Car: I’m exploring the collection.',`Preferred day: ${fields.day}`,`Preferred time: ${fields.time} (Karachi, UTC+05:00)`,fields.message?.trim()||'',car?`${site.origin}/cars/${car.id}/`:`${site.origin}/inventory/`].filter(Boolean).join('\n');}
export function tradeMessage(fields,files=[]){return [`Hello SAM Automobiles, I’d like to ${fields.intent==='trade'?'discuss a trade-in':'sell my car'}.`,`Name: ${fields.name}`,`Mobile: ${fields.phone}`,`Car: ${fields.year} ${fields.car}`,`Mileage: ${Number(fields.mileage).toLocaleString('en-GB')} km`,fields.message?.trim()||'',files.length?`${files.length} photo${files.length===1?'':'s'} selected; I will attach them in this conversation.`:'Photos can be provided on request.'].filter(Boolean).join('\n');}
export const whatsappMessageURL=(site,message)=>'https://wa.me/'+site.phone.replace(/\D/g,'')+'?text='+encodeURIComponent(message);
