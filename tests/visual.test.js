'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {validateVisual,key,artifactPath,PROFILES}=require('../src/visual');
test('permite capturas y perfiles conocidos',()=>{const x=validateVisual({enabled:true,mode:'capture',devices:['mobile','desktop'],threshold:0.01});assert.equal(x.devices.length,2);assert.equal(PROFILES.mobile.width,390);});
test('rechaza perfiles duplicados, operación y umbral incorrectos',()=>{for(const input of [{mode:'wrong',devices:['mobile']},{mode:'capture',devices:['mobile','mobile']},{mode:'compare',devices:['tv']},{mode:'compare',devices:['tablet'],threshold:1.1}])assert.throws(()=>validateVisual({enabled:true,...input}));});
test('claves estables y archivos solo bajo runs',()=>{assert.equal(key('http://localhost:8080','mobile'),key('http://localhost:8080','mobile'));assert.notEqual(key('http://localhost:8080','mobile'),key('http://localhost:8080','tablet'));assert.equal(artifactPath('../','../../secret'),null);assert.match(artifactPath('12345678-1234-1234-1234-123456789abc','mobile.png'),/mobile.png$/);});
