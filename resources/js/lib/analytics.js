const EVENTS=new Set(['whatsapp_click','ask_for_price','form_submit','car_detail_view']);
const FIELDS=new Set(['car_id','form_type','placement']);
export function track(event,properties={},win=globalThis.window){
 if(!win||!EVENTS.has(event))return null;
 const payload={event};
 for(const [key,value] of Object.entries(properties))if(FIELDS.has(key)&&typeof value==='string'&&/^[a-z0-9/_-]{0,100}$/i.test(value))payload[key]=value;
 // Ephemeral integration hooks only. No provider, identifiers, cookies or network
 // requests are installed by this module. Never include names, phones or text.
 win.dataLayer=win.dataLayer||[];win.dataLayer.push(payload);
 if(win.dataLayer.length>100)win.dataLayer.splice(0,win.dataLayer.length-100);
 win.dispatchEvent(new win.CustomEvent('sam:analytics',{detail:payload}));
 return payload;
}
export function initAnalytics({doc=document,win=window,carId=null}={}){
 if(carId)track('car_detail_view',{car_id:carId},win);
 const click=event=>{const anchor=event.target.closest('a[href]');if(!anchor)return;let url;try{url=new URL(anchor.href,win.location.href);}catch{return;}
  if(url.hostname!=='wa.me'||url.protocol!=='https:')return;
  const car_id=anchor.dataset.whatsapp||anchor.dataset.askPrice||carId||'';
  const placement=anchor.closest('[data-mobile-enquiry]')?'mobile_bar':anchor.hasAttribute('data-whatsapp-float')?'floating':anchor.closest('[data-lead-form]')?'form':'page';
  if(anchor.hasAttribute('data-ask-price'))track('ask_for_price',{car_id,placement},win);
  track('whatsapp_click',{car_id,placement},win);
 };
 doc.addEventListener('click',click);
 return ()=>doc.removeEventListener('click',click);
}
