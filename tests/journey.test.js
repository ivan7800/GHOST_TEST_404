'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {validateJourney,isAllowed}=require('../src/journey');
const target='http://localhost:8080';
test('acepta recorridos declarativos y mantiene el orden',()=>{const j=validateJourney({name:'persistencia',steps:[{action:'fill',selector:'#name',value:'Eva'},{action:'click',selector:'#save'},{action:'reload'},{action:'expectValue',selector:'#name',value:'Eva'}]},target);assert.equal(j.steps.length,4);assert.equal(j.steps[2].action,'reload');});
test('rechaza acciones arbitrarias y selectores inseguros',()=>{assert.throws(()=>validateJourney({name:'x',steps:[{action:'evaluate',selector:'body',value:'alert(1)'}]},target));assert.throws(()=>validateJourney({name:'x',steps:[{action:'click',selector:'body'}]},target));assert.throws(()=>validateJourney({name:'x',steps:[]},target));});
test('excluye destinos externos y protocolos no HTTP',()=>{assert.equal(isAllowed('http://localhost:8080/path',new URL(target).origin),true);assert.equal(isAllowed('http://localhost.evil.com',new URL(target).origin),false);assert.equal(isAllowed('https://example.com',new URL(target).origin),false);assert.equal(isAllowed('file:///etc/passwd',new URL(target).origin),false);});
