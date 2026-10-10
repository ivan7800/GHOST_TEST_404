'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {classify}=require('../src/audit');
test('rechaza acciones potencialmente destructivas',()=>{for(const label of ['Borrar caso','Guardar','Delete item','Submit','Enviar','Pay now'])assert.equal(classify(label),'blocked');});
test('selecciona solo etiquetas reconocidas para clic de prueba',()=>{assert.equal(classify('Abrir menú'),'candidate');assert.equal(classify('Cambiar tema'),'candidate');assert.equal(classify('Nuevo caso'),'manual');});
const {checkLink}=require('../src/audit');
test('verifica HEAD sin realizar GET y distingue 404',async()=>{
 const calls=[];
 const request={head:async(url,options)=>{calls.push({url,options});return {status:()=>404};}};
 const result=await checkLink(request,'/no-existe','http://127.0.0.1:4177/');
 assert.equal(result.status,'BROKEN');assert.equal(result.httpStatus,404);
 assert.equal(calls.length,1);assert.equal(calls[0].url,'http://127.0.0.1:4177/no-existe');
 assert.equal(calls[0].options.maxRedirects,0);
});
test('no consulta enlaces externos; 405 y redirects quedan sin verificar',async()=>{
 let count=0;
 const request={head:async()=>{count++;return {status:()=>405};}};
 assert.equal((await checkLink(request,'https://example.com','http://127.0.0.1:4177')).status,'SKIPPED');
 assert.equal(count,0);
 assert.equal((await checkLink(request,'/pagina','http://127.0.0.1:4177')).status,'UNVERIFIED');
});
