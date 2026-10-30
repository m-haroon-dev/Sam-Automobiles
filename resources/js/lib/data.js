// Laravel owns live inventory. These pure helpers format and filter its public props.
export function normalizeCar(car) {
  return {...car, mileageKm: car.mileage, exterior: car.colour, sourceUrl: car.instagramPermalink,
    make: car.make || '', model: car.model || '', features: car.features || [],
    attractions: car.attractions || [], bestFor: car.bestFor || '', usp: car.usp || '',
    advertisedDate: car.advertisedDate || '', notes: car.notes || []};
}
export const availableCars = cars => cars.filter(car => car.status === 'available');
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function matchesFilters(car,filters={}){
  const q=String(filters.q||'').trim().toLocaleLowerCase();
  const text=[car.name,car.make,car.model,car.category,car.trim,car.colour ?? car.exterior,car.interior,car.bestFor,car.usp,...(car.features||[]),...(car.attractions||[]).map(a=>a.label+' '+a.value)].filter(Boolean).join(' ').toLocaleLowerCase();
  return (!q||q.split(/\s+/).every(term=>text.includes(term)))&&(!filters.category||car.category===filters.category)&&(!filters.make||car.make===filters.make)&&(!filters.body||car.body===filters.body)&&(!filters.fuel||car.fuel===filters.fuel)&&(!filters.year||String(car.year)===String(filters.year));
}
export function sortCars(cars,sort='recent'){
  return [...cars].sort((a,b)=>sort==='year'?b.year-a.year||String(b.advertisedDate||'').localeCompare(String(a.advertisedDate||'')):sort==='mileage'?(a.mileage ?? a.mileageKm ?? Infinity)-(b.mileage ?? b.mileageKm ?? Infinity)||b.year-a.year:sort==='make'?String(a.make||'').localeCompare(String(b.make||''))||a.name.localeCompare(b.name):String(b.advertisedDate||'').localeCompare(String(a.advertisedDate||''))||a.name.localeCompare(b.name));
}
export function enquiryURL(site,car,fields={}){
  const lines=[`Hello SAM Automobiles${fields.name?.trim()?`, I’m ${fields.name.trim()}`:''}.`,car?`I’m interested in the ${car.year?car.year+' ':''}${car.name}${car.trim?' '+car.trim:''}.`:'I’m exploring your collection.',fields.message?.trim()||'Please confirm availability and price.',car?site.origin+'/cars/'+car.id+'/':site.origin+'/inventory/'];
  return 'https://wa.me/'+site.phone.replace(/\D/g,'')+'?text='+encodeURIComponent(lines.join('\n\n'));
}
export const mileage=c=>(c.mileage ?? c.mileageKm)!=null?Number(c.mileage ?? c.mileageKm).toLocaleString('en-GB')+' km':'Ask SAM';
export function parseSelection(search,validIds){const params=new URLSearchParams(search);if(!params.has('cars'))return null;return [...new Set((params.get('cars')||'').split(',').filter(id=>validIds.has(id)))];}

// Prices are nullable whole-rupee PKR amounts; null never becomes a zero price.
export const formatPrice = price => price == null ? 'Price on request' : 'PKR ' + Number(price).toLocaleString('en-PK', {maximumFractionDigits: 0});
export const askPriceURL = (site,car) => enquiryURL(site,car,{message:'Please share the price in PKR and confirm current availability.'});

export function photoSrcset(photo){
  const candidates=[[photo.small,photo.smallWidth||400],[photo.medium,photo.mediumWidth||800],[photo.src,photo.srcWidth||1280]];
  return [...new Map(candidates.map(([src,width])=>[width,src])).entries()].sort((a,b)=>a[0]-b[0]).map(([width,src])=>src+' '+width+'w').join(', ');
}

// Editorial framing is metadata, so a new photograph never needs a CSS edit.
export const photoPosition = photo => photo?.objectPosition || '50% 85%';
