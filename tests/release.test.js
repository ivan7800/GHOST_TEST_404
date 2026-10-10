'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {evaluate,html}=require('../src/release');
const good={target:'http://localhost:9999',result:'PASS',jsErrors:[],networkErrors:[],httpFailures:[],audit:{links:[]},clicks:[],visual:null,journey:{status:'PASS'}};
test('permite reporte sin defectos verificados',()=>{assert.equal(evaluate(good).decision,'ALLOW');});
test('bloquea errores y recorridos fallidos',()=>{assert.equal(evaluate({...good,jsErrors:['boom']}).decision,'BLOCK');assert.equal(evaluate({...good,journey:{status:'FAIL'}}).decision,'BLOCK');assert.equal(evaluate({...good,result:'REVIEW'}).decision,'BLOCK');});
test('bloquea regresiones y valida política',()=>{assert.equal(evaluate({...good,visual:{profiles:[{status:'DIFF'}]}}).decision,'BLOCK');assert.throws(()=>evaluate(good,{jsErrors:-1}));assert.equal(evaluate({...good,jsErrors:['minor']},{jsErrors:1}).decision,'ALLOW');});
test('HTML de reporte escapa HTML inyectado',()=>{const output=html({...good,target:'<script>alert(1)</script>'},evaluate(good));assert.doesNotMatch(output,/<script>alert/);assert.match(output,/&lt;script&gt;/);});

test('CI bloquea recorridos ausentes o inconclusos',()=>{assert.equal(evaluate({...good,journey:null},{},{journey:true}).decision,'BLOCK');assert.equal(evaluate({...good,journey:{status:'SKIPPED'}},{},{journey:true}).decision,'BLOCK');assert.equal(evaluate({...good,journey:{status:'PASS',steps:[{action:'expectVisible',status:'PASS'}]}},{},{journey:true}).decision,'ALLOW');});
test('gate estricto bloquea enlaces pendientes, ausencia de capturas y errores HTTP',()=>{
 const unverified={...good,audit:{links:[{status:'UNVERIFIED'}]}};
 assert.equal(evaluate(unverified,{}, {verifiedLinks:true}).decision,'BLOCK');
 assert.equal(evaluate(good,{}, {visual:true}).decision,'BLOCK');
 assert.equal(evaluate({...good,audit:{links:[{status:'HTTP_ERROR'}]}}).decision,'BLOCK');
 assert.equal(evaluate({...good,visual:{profiles:[{status:'MATCH'}]}},{},{visual:true}).decision,'ALLOW');
});

test('no aprueba cobertura truncada ni clics inconclusos',()=>{
 assert.equal(evaluate({...good,audit:{links:[],truncated:true}}).decision,'BLOCK');
 assert.equal(evaluate({...good,clicks:[{status:'INCONCLUSIVE'}]}).decision,'BLOCK');
 assert.equal(evaluate({...good,clicks:[{status:'BLOCKED_REQUEST'}]}).decision,'BLOCK');
 assert.equal(evaluate({...good,journey:{status:'ERROR'}}).decision,'BLOCK');
});
test('en modo estricto SKIPPED no equivale a enlace verificado',()=>{
 assert.equal(evaluate({...good,audit:{links:[{status:'SKIPPED'}]}},{},{verifiedLinks:true}).decision,'BLOCK');
 assert.equal(evaluate({...good,audit:{}},{},{verifiedLinks:true}).decision,'BLOCK');
});

test('RC7: requiere afirmaciones y bloquea peticiones no autorizadas del recorrido',()=>{
 const actionsOnly={...good,journey:{status:'PASS',steps:[{action:'click',status:'PASS'}]}};
 assert.equal(evaluate(actionsOnly,{}, {journey:true}).decision,'BLOCK');
 const withAssertion={...good,journey:{status:'PASS',steps:[{action:'expectVisible',status:'PASS'}]}};
 assert.equal(evaluate(withAssertion,{}, {journey:true}).decision,'ALLOW');
 assert.equal(evaluate({...withAssertion,journey:{...withAssertion.journey,blockedRequests:[{url:'https://example.com'}]}}).decision,'BLOCK');
 assert.equal(evaluate({...withAssertion,journey:{status:'PASS',steps:[{action:'expectVisible',status:'FAIL'}]}}).decision,'BLOCK');
});
