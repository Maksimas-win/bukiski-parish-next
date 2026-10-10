import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT||4173);
const base=(process.env.BASE_PATH||'').replace(/\/$/,'');
const types={'.html':'text/html; charset=utf-8','.woff2':'font/woff2','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.gif':'image/gif','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.ics':'text/calendar; charset=utf-8','.vcf':'text/vcard; charset=utf-8'};
createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(base&&pathname!==base&&!pathname.startsWith(base+'/')){res.writeHead(404);res.end();return;}
    const local=pathname.slice(base.length)||'/';
    if(local.split('/').some(part=>part.startsWith('.'))){res.writeHead(403);res.end();return;}
    let path=resolve(root,'.'+local);
    if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    if((await stat(path)).isDirectory()){
      if(!pathname.endsWith('/')){res.writeHead(301,{Location:pathname+'/'});res.end();return;}
      path=resolve(path,'index.html');
    }
    const data=await readFile(path);
    res.writeHead(200,{'Content-Type':types[extname(path).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(data);
  }catch{
    res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});
    try{res.end(await readFile(resolve(root,'404.html')));}catch{res.end('Build the site first.');}
  }
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}${base}/`));
