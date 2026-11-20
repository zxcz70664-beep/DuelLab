const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../public'),port=Number(process.env.PORT||8080);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
http.createServer((req,res)=>{
 if(req.url==='/api/health'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,version:'0.1.0'}))}
 const url=decodeURIComponent((req.url||'/').split('?')[0]),file=path.resolve(root,'.'+(url==='/'?'/index.html':url));
 if(!file.startsWith(root)){res.writeHead(403);return res.end('Forbidden')}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','x-content-type-options':'nosniff'});res.end(data)})
}).listen(port,'0.0.0.0',()=>console.log('DuelLab listening on '+port));
