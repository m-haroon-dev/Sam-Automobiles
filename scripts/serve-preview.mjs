// Local QA transport: PHP serves Laravel; this proxy adds normal web-server
// byte ranges/gzip for media and public build assets. Not needed on Hostinger.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createReadStream} from 'node:fs';
import {gzipSync} from 'node:zlib';
const port=Number(process.env.PORT||8780),backend=Number(process.env.SAM_PHP_PORT||8781),root=resolve('public');
const mime={'.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2','.mp4':'video/mp4','.html':'text/html'};
http.createServer(async(req,res)=>{let path;try{path=decodeURIComponent(new URL(req.url,'http://local').pathname);}catch{res.writeHead(400).end();return;}
 const local=path.startsWith('/assets/')||path.startsWith('/build/')||path.startsWith('/storage/')||['/sw.js','/offline-fallback.html'].includes(path);
 if(local&&['GET','HEAD'].includes(req.method)){
  const folder=path.startsWith('/storage/')?resolve('storage/app/public'):root,relative=path.startsWith('/storage/')?path.slice(9):path.slice(1),file=resolve(folder,relative);
  if(!file.startsWith(folder+'/')){res.writeHead(403).end();return;}
  try{const s=await stat(file);if(!s.isFile())throw 0;const type=mime[extname(file)]||'application/octet-stream';let start=0,end=s.size-1,status=200;
   const headers={'Content-Type':type,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
   if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':'bytes */'+s.size}).end();return;}
    start=m[1]?Number(m[1]):Math.max(0,s.size-Number(m[2]));end=m[1]&&m[2]?Math.min(s.size-1,Number(m[2])):s.size-1;
    if(start>=s.size||start>end){res.writeHead(416,{'Content-Range':'bytes */'+s.size}).end();return;}status=206;headers['Content-Range']=`bytes ${start}-${end}/${s.size}`;}
   if(status===200&&/javascript|text\/css|svg|json/.test(type)&&req.headers['accept-encoding']?.includes('gzip')){const bytes=gzipSync(await readFile(file));res.writeHead(200,{...headers,'Content-Encoding':'gzip','Content-Length':bytes.length,'Vary':'Accept-Encoding'});if(req.method==='HEAD')res.end();else res.end(bytes);return;}
   res.writeHead(status,{...headers,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).pipe(res);return;
  }catch{res.writeHead(404).end('Not found');return;}
 }
 const proxy=http.request({host:'127.0.0.1',port:backend,path:req.url,method:req.method,headers:req.headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});proxy.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('Laravel preview is starting.');});req.pipe(proxy);
}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
