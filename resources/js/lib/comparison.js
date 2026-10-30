import {escapeHTML as e,formatPrice,mileage,enquiryURL,askPriceURL,photoSrcset,photoPosition} from './data.js';
const value = data => data == null || data === '' ? 'Ask SAM' : String(data);
export function comparisonGroups(cars,{differencesOnly=false}={}) {
 if(!cars.length)return [];
 const fields=[
  ['At a glance','Model year',c=>c.year],['At a glance','Mileage',c=>mileage(c)],
  ['At a glance','Body style',c=>c.body],['At a glance','Powertrain',c=>c.fuel],
  ['At a glance','Price',c=>formatPrice(c.price)],['At a glance','Listing status',c=>c.status==='sold'?'Sold':'Confirm availability with SAM'],
  ['The right fit','Suited to',c=>c.bestFor],['The right fit','Standout feature',c=>c.usp],
  ['The details','Trim',c=>c.trim],['The details','Import year',c=>c.importYear],
  ['The details','Registration',c=>c.registration],['The details','Exterior',c=>c.colour||c.exterior],
  ['The details','Interior',c=>c.interior],['The details','Import origin',c=>c.origin],
  ['The details','Auction grade',c=>c.auctionGrade]
 ];
 const groups=[];
 for(const [group,label,get] of fields){
  const values=cars.map(c=>value(get(c)));
  const same=values.length>1&&values.every(item=>item.toLocaleLowerCase().trim()===values[0].toLocaleLowerCase().trim());
  if(differencesOnly&&same)continue;
  let section=groups.find(section=>section.title===group);if(!section){section={title:group,rows:[]};groups.push(section);}
  section.rows.push({label,values,same});
 }
 return groups;
}
