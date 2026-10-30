import test from 'node:test';
import assert from 'node:assert/strict';
import {formatPrice,matchesFilters,sortCars,parseSelection,photoSrcset,enquiryURL} from '../resources/js/lib/data.js';

test('a missing price stays on request, while a supplied amount uses PKR',()=>{
 assert.equal(formatPrice(null),'Price on request');
 assert.equal(formatPrice(undefined),'Price on request');
 assert.equal(formatPrice(12300000),'PKR 12,300,000');
 assert.equal(formatPrice(0),'PKR 0');
});
test('new records with missing mileage sort last without mutating the original collection',()=>{
 const cars=[{id:'unknown',name:'Unknown',year:2025,mileage:null},{id:'used',name:'Used',year:2023,mileage:4000},{id:'low',name:'Low',year:2022,mileage:500}];
 assert.deepEqual(sortCars(cars,'mileage').map(c=>c.id),['low','used','unknown']);
 assert.deepEqual(cars.map(c=>c.id),['unknown','used','low']);
 assert.equal(matchesFilters({name:'Mercedes E200',make:'Mercedes-Benz',features:['Ventilated seats']},{q:'mercedes ventilated'}),true);
 assert.equal(matchesFilters({name:'Mercedes E200',make:'Mercedes-Benz',features:[]},{q:'mercedes ventilated'}),false);
});
test('shared selections discard unknown identifiers and duplicates',()=>{
 assert.deepEqual(parseSelection('?cars=first,unknown,first,second',new Set(['first','second'])),['first','second']);
 assert.equal(parseSelection('',new Set(['first'])),null);
});
test('small uploads use their actual responsive widths and enquiries use the current domain',()=>{
 assert.equal(photoSrcset({small:'/small.webp',medium:'/medium.webp',src:'/original.webp',smallWidth:300,mediumWidth:300,srcWidth:300}),'/original.webp 300w');
 const link=new URL(enquiryURL({origin:'https://samautomobiles.co',phone:'+923242607773'},{id:'test-car',name:'Test car',year:2025}));
 assert.equal(link.hostname,'wa.me');
 assert.equal(link.pathname,'/923242607773');
 assert.ok(link.searchParams.get('text').includes('https://samautomobiles.co/cars/test-car/'));
});
test('the category filter matches the admin-assigned category and search includes it',()=>{
 const car={name:'Lexus LX570',make:'Lexus',category:'SUV',features:[]};
 assert.equal(matchesFilters(car,{category:'SUV'}),true);
 assert.equal(matchesFilters(car,{category:'Saloon'}),false);
 assert.equal(matchesFilters({...car,category:null},{category:'SUV'}),false);
 assert.equal(matchesFilters(car,{q:'lexus suv'}),true);
});
