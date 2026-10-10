'use strict';
// Run with `node scripts/ci.js`; only local fixture app, isolated disposable data.
const http=require('node:http');
const {run}=require('../src/runner');
const {writeReport}=require('../src/release');
const host='127.0.0.1';
const fixture=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html><head><title>Ghost Fixture</title></head><body><h1>Ghost Fixture</h1><input id="name" aria-label="Nombre"><button id="save" type="button">Guardar</button><p id="saved"></p><script>document.querySelector("#saved").textContent=localStorage.getItem("ghost-fixture")||"";document.querySelector("#save").addEventListener("click",()=>{const v=document.querySelector("#name").value;localStorage.setItem("ghost-fixture",v);document.querySelector("#saved").textContent=v;});</script></body></html>');});
(async()=>{
 await new Promise(resolve=>fixture.listen(0,host,resolve));
 try{
  const url=`http://${host}:${fixture.address().port}/`;
  const record=await run(url,{journeyEnabled:true,journey:{name:'Smoke CI',steps:[{action:'expectVisible',selector:'#save'},{action:'expectText',selector:'h1',value:'Ghost Fixture'},{action:'fill',selector:'#name',value:'Ghost RC3'},{action:'click',selector:'#save'},{action:'expectText',selector:'#saved',value:'Ghost RC3'},{action:'reload'},{action:'expectText',selector:'#saved',value:'Ghost RC3'}]}});
  const {gate,files}=writeReport(record,process.env.GHOST_REPORT_DIR,{journey:true});
  if(record.journey?.steps?.length!==7)throw new Error('El recorrido CI no ejecutó los 7 pasos previstos.');
  console.log(JSON.stringify({decision:gate.decision,blockers:gate.blockers,files},null,2));
  if(gate.decision!=='ALLOW')process.exitCode=1;
 }finally{await new Promise(resolve=>fixture.close(resolve));}
})().catch(err=>{console.error('CI FAILED:',err.stack||err);process.exitCode=1;fixture.close();});
