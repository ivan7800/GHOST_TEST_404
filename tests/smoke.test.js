'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {validateTarget}=require('../src/config');const {start}=require('../src/server');
test('URL local permitida y destinos externos rechazados',()=>{assert.match(validateTarget('http://localhost:8080'),/^http:/);assert.throws(()=>validateTarget('https://example.com'));assert.throws(()=>validateTarget('file:///etc/passwd'));assert.throws(()=>validateTarget('http://192.168.1.1'));});
test('servidor sirve UI, salud y bloquea API externa',async()=>{const server=start(0);await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;try{let r=await fetch(base+'/api/health');assert.equal(r.status,200);assert.equal((await r.json()).phase,7);r=await fetch(base);assert.equal(r.status,200);assert.match(await r.text(),/GHOST/);r=await fetch(base+'/api/run',{method:'POST',headers:{'content-type':'application/json','origin':'https://evil.example'},body:'{}'});assert.equal(r.status,403);r=await fetch(base+'/not-found');assert.equal(r.status,404);}finally{server.close();}});

test('Host inesperado bloqueado, body excesivo da 413 y origen local permite validar entrada',async()=>{
 const server=start(0);await new Promise(r=>server.once('listening',r));
 const port=server.address().port,base=`http://127.0.0.1:${port}`;
 try{
  let status=await new Promise((resolve,reject)=>{const req=require('node:http').request({hostname:'127.0.0.1',port,path:'/api/health',headers:{Host:'localhost:'+port}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(status,403);
  let r;
  r=await fetch(base+'/api/run',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'x'.repeat(17000)});assert.equal(r.status,413);
  r=await fetch(base+'/api/run',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({url:'https://example.com'})});assert.equal(r.status,400);
 }finally{server.close();}
});
