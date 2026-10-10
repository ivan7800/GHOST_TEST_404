'use strict';
const {validateTarget}=require('./config');
const MAX_ITEMS=80;
const DANGEROUS=/(delete|remove|destroy|logout|sign\s*out|pay|purchase|checkout|submit|send|upload|import|export|borrar|eliminar|suprimir|cerrar sesi[oó]n|pagar|comprar|enviar|guardar|save|reset|vaciar|formatear)/i;
const SAFE=/(menu|men[uú]|toggle|expand|collapse|mostrar|ocultar|open|abrir|close|cerrar|tab|pesta[nñ]a|help|ayuda|info|theme|tema|skin|details|detalles)/i;
function classify(text){ return DANGEROUS.test(text)?'blocked':SAFE.test(text)?'candidate':'manual'; }
async function checkLink(request, href, target){
  let resolved;
  try { resolved = new URL(href,target); }
  catch { return {status:'BROKEN',reason:'URL inválida'}; }
  if(!['http:','https:'].includes(resolved.protocol)) return {status:'SKIPPED',reason:'No HTTP'};
  if(resolved.origin!==new URL(target).origin) return {status:'SKIPPED',reason:'Enlace externo no comprobado'};
  // HEAD only; never GET/POST on untrusted hrefs. Redirects must remain in scope.
  try {
    const response=await request.head(resolved.toString(),{timeout:4000,maxRedirects:0});
    const code=response.status();
    if(code===404||code===410)return {status:'BROKEN',httpStatus:code,reason:'Recurso inexistente'};
    if(code>=300&&code<400)return {status:'UNVERIFIED',httpStatus:code,reason:'Redirección no seguida'};
    if(code===405||code===501)return {status:'UNVERIFIED',httpStatus:code,reason:'HEAD no admitido'};
    if(code>=400)return {status:'HTTP_ERROR',httpStatus:code,reason:'HTTP '+code};
    return {status:'VERIFIED',httpStatus:code,reason:'HEAD respondió correctamente'};
  }catch(error){return {status:'UNVERIFIED',reason:String(error.message).slice(0,130)};}
}
async function inspect(page,target){
 const data=await page.evaluate((limit)=>{
  const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
  const label=e=>(e.getAttribute('aria-label')||e.innerText||e.textContent||e.value||e.title||'').trim().replace(/\s+/g,' ').slice(0,100);
  const controls=[...document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"],a[href],summary')].slice(0,limit).map((e,i)=>({index:i,tag:e.tagName.toLowerCase(),label:label(e),visible:visible(e),disabled:!!e.disabled||e.getAttribute('aria-disabled')==='true',href:e.tagName==='A'?e.getAttribute('href'):null,hasInlineHandler:!!e.onclick||e.hasAttribute('onclick'),selector:null}));
  const links=[...document.querySelectorAll('a[href]')].slice(0,limit).map(e=>({label:label(e),href:e.getAttribute('href')}));
  return {controls,links,totalControls:document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"],a[href],summary').length,totalLinks:document.querySelectorAll('a[href]').length};
 },MAX_ITEMS);
 const links=[];
 for(const link of data.links){
   const check=await checkLink(page.request,link.href,page.url());
   links.push({...link,...check});
 }
 return {controls:data.controls.map(c=>({...c,clickPolicy:c.tag==='a'?'navigation-not-clicked':classify(c.label),status:c.disabled?'DISABLED':c.visible?'INSPECTED':'HIDDEN'})),links,totalControls:data.totalControls,totalLinks:data.totalLinks,truncated:data.totalControls>MAX_ITEMS||data.totalLinks>MAX_ITEMS};
}
async function safeClicks(page, audit, target){
 const results=[]; const candidates=audit.controls.filter(c=>c.clickPolicy==='candidate'&&c.visible&&!c.disabled&&c.tag!=='a').slice(0,8);
 for(const c of candidates){
  // Each candidate gets a fresh isolated page; do not submit POST/PUT/etc.
  const probe=await page.context().newPage();
  const blocked=[];
  await probe.route('**/*',async route=>{
    const req=route.request();
    if(!['GET','HEAD'].includes(req.method()) || new URL(req.url()).origin!==new URL(target).origin){blocked.push(req.url().slice(0,200));return route.abort();}
    return route.continue();
  });
  try{
    await probe.goto(target,{waitUntil:'domcontentloaded',timeout:8000});
    const before=await probe.locator('body').evaluate(e=>({text:e.innerText.slice(0,3000),html:e.innerHTML.length}));
    const loc=probe.locator('button,[role="button"],input[type="button"],input[type="submit"],a[href],summary').nth(c.index);
    await loc.click({timeout:2000,noWaitAfter:true});
    await probe.waitForTimeout(250);
    const after=await probe.locator('body').evaluate(e=>({text:e.innerText.slice(0,3000),html:e.innerHTML.length}));
    results.push({label:c.label,index:c.index,status:blocked.length?'BLOCKED_REQUEST':before.text!==after.text||before.html!==after.html?'OBSERVED_CHANGE':'INCONCLUSIVE',blockedRequests:blocked.length});
  }catch(err){results.push({label:c.label,index:c.index,status:'CLICK_FAILED',reason:String(err.message).slice(0,180)});}
  finally{await probe.close();}
 }
 return results;
}
module.exports={inspect,safeClicks,classify,checkLink};
