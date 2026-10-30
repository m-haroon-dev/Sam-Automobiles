// Cache immutable public assets only. Laravel documents, inventory responses,
// administrator pages and Inertia requests always use the live backend.
const CACHE='sam-webapp-assets-v1';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.add('/offline-fallback.html')).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>(n.startsWith('sam-showroom-')||n.startsWith('sam-webapp-'))&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/admin')||r.headers.has('X-Inertia')||r.headers.has('range')||/\.(mp4|webm)$/.test(u.pathname))return;
if(r.mode==='navigate'){e.respondWith(fetch(r).catch(()=>caches.open(CACHE).then(c=>c.match('/offline-fallback.html'))));return;}
if(!u.pathname.startsWith('/build/')&&!u.pathname.startsWith('/assets/')&&!u.pathname.startsWith('/storage/'))return;
e.respondWith((async()=>{const c=await caches.open(CACHE),hit=await c.match(r);if(hit)return hit;const response=await fetch(r);if(response.ok&&!response.redirected)e.waitUntil(c.put(r,response.clone()).catch(()=>{}));return response;})());});
