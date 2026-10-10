'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {ROOT}=require('./config');
const BASE=path.join(ROOT,'.ghost-visual');
const PROFILES=Object.freeze({desktop:{width:1440,height:900},tablet:{width:768,height:1024},mobile:{width:390,height:844}});
function validateVisual(input){
 if(!input||input.enabled!==true)return null;
 const mode=input.mode;
 if(!['capture','compare','baseline'].includes(mode))throw new Error('Modo visual inválido.');
 const devices=input.devices;
 if(!Array.isArray(devices)||!devices.length||devices.length>3||new Set(devices).size!==devices.length||devices.some(x=>!Object.hasOwn(PROFILES,x)))throw new Error('Selecciona entre 1 y 3 perfiles únicos.');
 const threshold=input.threshold===undefined?0.01:Number(input.threshold);
 if(!Number.isFinite(threshold)||threshold<0||threshold>1)throw new Error('Umbral visual fuera del rango 0–1.');
 return {mode,devices,threshold};
}
function key(url,device){return crypto.createHash('sha256').update(url+'|'+device+'|v1').digest('hex').slice(0,32);}
function comparePNG(a,b){
 const {PNG}=require('pngjs');const x=PNG.sync.read(a),y=PNG.sync.read(b);
 if(x.width!==y.width||x.height!==y.height)return {different:true,ratio:1,reason:'Resoluciones diferentes',width:x.width,height:x.height};
 let count=0;const diff=new PNG({width:x.width,height:x.height});
 for(let i=0;i<x.data.length;i+=4){
   const delta=Math.max(...[0,1,2,3].map(c=>Math.abs(x.data[i+c]-y.data[i+c])));
   if(delta>16)count++;
   const red=delta>16;diff.data[i]=red?255:x.data[i];diff.data[i+1]=red?58:x.data[i+1];diff.data[i+2]=red?98:x.data[i+2];diff.data[i+3]=255;
 }
 return {different:count>0,ratio:count/(x.width*x.height),width:x.width,height:x.height,diff:PNG.sync.write(diff)};
}
async function runVisual(browser,url,options){
 if(!options)return null;
 await fs.mkdir(path.join(BASE,'runs'),{recursive:true});await fs.mkdir(path.join(BASE,'baselines'),{recursive:true});
 const runId=crypto.randomUUID();const runDir=path.join(BASE,'runs',runId);await fs.mkdir(runDir);
 const results=[];
 for(const device of options.devices){
  const viewport=PROFILES[device]; const context=await browser.newContext({viewport,deviceScaleFactor:1,serviceWorkers:'block',acceptDownloads:false,reducedMotion:'reduce'});
  try{
   // Block off-origin navigation and subrequests. Still test only trusted local apps.
   await context.route('**/*',route=>{let u;try{u=new URL(route.request().url());}catch{return route.abort();}return u.origin===new URL(url).origin?route.continue():route.abort();});
   const page=await context.newPage();await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000});
   if(new URL(page.url()).origin!==new URL(url).origin)throw new Error('Redirección a otro origen.');
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
   const shot=await page.screenshot({animations:'disabled',fullPage:false});
   const file=`${device}.png`;await fs.writeFile(path.join(runDir,file),shot);
   const item={device,viewport,screenshot:`/api/visual/artifact/${runId}/${file}`,status:'CAPTURED'};
   const baselinePath=path.join(BASE,'baselines',key(url,device)+'.png');
   if(options.mode==='baseline'){await fs.writeFile(baselinePath,shot);item.status='BASELINE_SAVED';}
   if(options.mode==='compare'){
    let baseline;try{baseline=await fs.readFile(baselinePath);}catch(err){if(err.code==='ENOENT'){item.status='NO_BASELINE';results.push(item);continue;}throw err;}
    const {diff,...metrics}=comparePNG(shot,baseline);item.metrics=metrics;item.status=metrics.ratio>options.threshold?'DIFF':'MATCH';
    if(diff){const name=`${device}-diff.png`;await fs.writeFile(path.join(runDir,name),diff);item.diff=`/api/visual/artifact/${runId}/${name}`;}
   }
   results.push(item);
  }catch(err){results.push({device,status:'ERROR',error:String(err.message).slice(0,300)});}
  finally{await context.close();}
 }
 return {mode:options.mode,threshold:options.threshold,runId,profiles:results};
}
function artifactPath(runId,name){if(!/^[0-9a-f-]{36}$/.test(runId)||!/^(desktop|tablet|mobile)(-diff)?\.png$/.test(name))return null;return path.join(BASE,'runs',runId,name);}
module.exports={validateVisual,runVisual,comparePNG,artifactPath,PROFILES,key};
