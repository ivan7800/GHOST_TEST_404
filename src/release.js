'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {ROOT}=require('./config');
function evaluate(record,policy={},requirements={}){
 if(requirements===null||typeof requirements!=='object'||Array.isArray(requirements)||Object.keys(requirements).some(k=>!['journey','verifiedLinks','visual'].includes(k)||typeof requirements[k]!=='boolean'))throw new Error('Requisitos inválidos.');
 if(!record||typeof record!=='object'||!record.id&&!record.target)throw new Error('Informe inválido.');
 const limits={jsErrors:0,networkErrors:0,httpFailures:0,brokenLinks:0,failedClicks:0,visualFailures:0};
 for(const [key,value] of Object.entries(policy)){if(!Object.hasOwn(limits,key)||!Number.isSafeInteger(value)||value<0)throw new Error('Política inválida: '+key);limits[key]=value;}
 const counts={jsErrors:record.jsErrors?.length||0,networkErrors:record.networkErrors?.length||0,httpFailures:record.httpFailures?.length||0,brokenLinks:record.audit?.links?.filter(x=>['BROKEN','HTTP_ERROR'].includes(x.status)).length||0,failedClicks:record.clicks?.filter(x=>x.status==='CLICK_FAILED').length||0,visualFailures:record.visual?.profiles?.filter(x=>['DIFF','NO_BASELINE','ERROR'].includes(x.status)).length||0};
 const blockers=Object.keys(limits).filter(k=>counts[k]>limits[k]).map(k=>({criterion:k,actual:counts[k],maximum:limits[k]}));
 if(record.result!=='PASS')blockers.push({criterion:'resultado',actual:record.result||'DESCONOCIDO',expected:'PASS'});
 if(record.journey&&record.journey.status!=='PASS')blockers.push({criterion:'journey',actual:record.journey.status||'UNKNOWN'});
 if(record.audit?.truncated)blockers.push({criterion:'coverageTruncated',actual:'Inspection capped',expected:'All controls inspected'});
 if(record.clicks?.some(x=>['INCONCLUSIVE','BLOCKED_REQUEST'].includes(x.status)))blockers.push({criterion:'clicksInconclusive',actual:'Some interactions unverified'});
 if(requirements.journey===true&&record.journey?.status!=='PASS')blockers.push({criterion:'journeyRequired',actual:record.journey?.status||'MISSING',expected:'PASS'});
 if(record.journey?.steps?.some(s=>s.status!=='PASS'))blockers.push({criterion:'journeyStepFailure',actual:'Paso fallido',expected:'Todos PASS'});
 if(record.journey?.blockedRequests?.length)blockers.push({criterion:'journeyBlockedRequests',actual:record.journey.blockedRequests.length,expected:0});
 if(requirements.journey===true&&record.journey?.status==='PASS'){
  const steps=record.journey.steps;
  const assertions=new Set(['expectText','expectVisible','expectValue','expectCount']);
  if(!Array.isArray(steps)||!steps.some(s=>s.status==='PASS'&&assertions.has(s.action)))blockers.push({criterion:'journeyAssertions',actual:0,expected:'Al menos una comprobación explícita'});

 }

 if(requirements.verifiedLinks===true&&(!record.audit?.links||record.audit.links.some(x=>x.status!=='VERIFIED')))blockers.push({criterion:'unverifiedLinks',actual:'Presentes',expected:'Todos los enlaces locales verificados'});
 if(requirements.visual===true&&(!record.visual?.profiles?.length||record.visual.profiles.some(x=>!['MATCH','CAPTURED','BASELINE_SAVED'].includes(x.status))))blockers.push({criterion:'visualRequired',actual:'Ausente, incompleto o fallido'});
 return {schemaVersion:1,decision:blockers.length?'BLOCK':'ALLOW',target:record.target,runId:record.id||null,checkedAt:new Date().toISOString(),limits,counts,blockers,disclaimer:'ALLOW no certifica funcionalidad no cubierta. Solo valida las comprobaciones ejecutadas.'};
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function html(record,gate){const payload=esc(JSON.stringify(record,null,2));return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ghost Test 404 · Reporte</title><style>body{background:#101820;color:#e2f4f2;font:16px system-ui;margin:0;padding:2rem;line-height:1.5}main{max-width:960px;margin:auto}h1{color:#9ff0d9}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#17262d;padding:1.5rem;border-radius:12px}.status{font-size:1.4rem;font-weight:800;color:${gate.decision==='ALLOW'?'#9ff0d9':'#ffb1b1'}}small{color:#c0d1d5}</style></head><body><main><h1>GHOST TEST 404</h1><p>Objetivo: ${esc(record.target)}</p><p class="status">Release Gate: ${esc(gate.decision)}</p><small>${esc(gate.disclaimer)}</small><h2>Resultado completo</h2><pre>${payload}</pre></main></body></html>`;}
function writeReport(record,folder,requirements={}){const gate=evaluate(record,{},requirements);const dir=path.resolve(folder||path.join(ROOT,'reports'));fs.mkdirSync(dir,{recursive:true});const name='ghost-report';for(const [ext,content] of [['json',JSON.stringify({result:record,gate},null,2)],['html',html(record,gate)]])fs.writeFileSync(path.join(dir,`${name}.${ext}`),content,{mode:0o600});return {gate,files:[path.join(dir,name+'.json'),path.join(dir,name+'.html')]};}
module.exports={evaluate,html,writeReport};
