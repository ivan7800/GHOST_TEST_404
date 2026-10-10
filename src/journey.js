'use strict';
const {validateTarget}=require('./config');
const ACTIONS=new Set(['click','fill','check','uncheck','expectText','expectVisible','expectValue','expectCount','reload']);
function validateJourney(raw,target){
 validateTarget(target);
 if(!raw||typeof raw!=='object'||Array.isArray(raw)) throw Error('El escenario debe ser un objeto JSON.');
 if(typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>100) throw Error('Nombre de escenario inválido.');
 if(!Array.isArray(raw.steps)||raw.steps.length<1||raw.steps.length>30) throw Error('El escenario debe tener entre 1 y 30 pasos.');
 const steps=raw.steps.map((step,i)=>{
  if(!step||typeof step!=='object'||Array.isArray(step)||!ACTIONS.has(step.action)) throw Error(`Paso ${i+1}: acción no reconocida.`);
  if(step.action!=='reload'&&(typeof step.selector!=='string'||!step.selector.trim()||step.selector.length>250)) throw Error(`Paso ${i+1}: selector CSS necesario (máx. 250).`);
  if(['fill','expectText','expectValue'].includes(step.action)&&(typeof step.value!=='string'||step.value.length>500)) throw Error(`Paso ${i+1}: value debe ser texto (máx. 500).`);
  if(step.action==='expectCount'&&(!Number.isInteger(step.value)||step.value<0||step.value>10000)) throw Error(`Paso ${i+1}: value debe ser un entero positivo.`);
  if(step.action!=='reload'&&/^(?:html|body|\*)$/.test(step.selector.trim())&&['click','fill','check','uncheck'].includes(step.action)) throw Error(`Paso ${i+1}: selector demasiado amplio.`);
  return {action:step.action,...(step.action==='reload'?{}:{selector:step.selector}),...(['fill','expectText','expectValue','expectCount'].includes(step.action)?{value:step.value}:{})};
 });
 return {name:raw.name.trim(),steps};
}
function isAllowed(url,origin){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)&&u.origin===origin&&['127.0.0.1','localhost','[::1]'].includes(u.hostname);}catch{return false;}}
async function executeJourney(context,target,scenario){
 const origin=new URL(target).origin;
 const page=await context.newPage();const steps=[];const blockedRequests=[];
 await page.route('**/*',async route=>{
  const request=route.request();const url=request.url();
  if(!isAllowed(url,origin)){blockedRequests.push({method:request.method(),url:url.slice(0,180)});return route.abort();}
  return route.continue();
 });
 try{
  await page.goto(target,{waitUntil:'domcontentloaded',timeout:15000});
  if(new URL(page.url()).origin!==origin) throw Error('Redirección fuera del origen permitido.');
  for(let i=0;i<scenario.steps.length;i++){
   const step=scenario.steps[i];const started=Date.now();
   try{
    const loc=step.selector?page.locator(step.selector):null;
    switch(step.action){
     case 'click':await loc.click({timeout:4000});break;
     case 'fill':await loc.fill(step.value,{timeout:4000});break;
     case 'check':await loc.check({timeout:4000});break;
     case 'uncheck':await loc.uncheck({timeout:4000});break;
     case 'expectVisible':await loc.waitFor({state:'visible',timeout:4000});break;
     case 'expectText':await loc.filter({hasText:step.value}).first().waitFor({state:'visible',timeout:4000});break;
     case 'expectValue':{const value=await loc.inputValue({timeout:4000});if(value!==step.value)throw Error(`Valor distinto del esperado (longitud actual: ${value.length}).`);break;}
     case 'expectCount':{const count=await loc.count();if(count!==step.value)throw Error(`Esperados ${step.value} elementos; encontrados ${count}.`);break;}
     case 'reload':await page.reload({waitUntil:'domcontentloaded',timeout:10000});break;
    }
    if(new URL(page.url()).origin!==origin)throw Error('Navegación fuera del origen permitido.');
    steps.push({number:i+1,action:step.action,selector:step.selector||null,status:'PASS',durationMs:Date.now()-started});
   }catch(e){steps.push({number:i+1,action:step.action,selector:step.selector||null,status:'FAIL',durationMs:Date.now()-started,error:String(e.message).slice(0,240)});break;}
  }
  return {name:scenario.name,status:steps.length===scenario.steps.length&&steps.every(s=>s.status==='PASS')?'PASS':'FAIL',steps,blockedRequests:blockedRequests.slice(0,20),note:'Afirmaciones explícitas verificadas; los pasos de acción sin expect posterior no prueban el resultado de negocio.'};
 }finally{await page.close();}
}
module.exports={validateJourney,executeJourney,isAllowed};
