'use strict';
const { validateTarget } = require('./config');
const history = require('./history');
const {inspect,safeClicks}=require('./audit');
const {validateJourney,executeJourney}=require('./journey');
const {validateVisual,runVisual}=require('./visual');
let active = false;
let latest = null;
function status() { return { active, latest }; }
async function run(target, options={}) {
  const url = validateTarget(target);
  if (active) { const err = new Error('Ya hay una prueba en marcha.'); err.status = 409; throw err; }
  const scenario=options.journeyEnabled===true?validateJourney(options.journey,url):null;
  const visualOptions=validateVisual(options.visual);
  active = true;
  const startedAt = new Date().toISOString();
  try {
    let chromium;
    try { ({ chromium } = require('playwright')); }
    catch { throw new Error('Falta Playwright. Ejecuta INSTALAR_WINDOWS.bat.'); }
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block', acceptDownloads: false });
      // Keep the entire main audit within the explicitly authorised origin.
      const origin = new URL(url).origin;
      await context.route('**/*', route => {
        let requested;
        try { requested = new URL(route.request().url()); } catch { return route.abort(); }
        return requested.origin === origin ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      const jsErrors = [], networkErrors = [], httpFailures=[];
      page.on('pageerror', err => jsErrors.push(String(err.message).slice(0, 500)));
      page.on('requestfailed', req => networkErrors.push({ url: req.url().slice(0, 500), reason: req.failure()?.errorText || 'Desconocido' }));
      page.on('response',r=>{if(r.status()>=400) httpFailures.push({url:r.url().slice(0,300),status:r.status()});});
      let response;
      try { response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }); }
      catch (err) { throw new Error('No se pudo abrir la aplicación: ' + err.message); }
      if (new URL(page.url()).origin !== new URL(url).origin) throw new Error('La aplicación ha redirigido fuera del origen permitido.');
      const audit=await inspect(page,url);
      const clicks=options.safeClicks===true?await safeClicks(page,audit,url):[];
      const journey=scenario?await executeJourney(context,url,scenario):null;
      const visual=await runVisual(browser,url,visualOptions);
      const issues=jsErrors.length+networkErrors.length+httpFailures.length+audit.links.filter(l=>['BROKEN','HTTP_ERROR'].includes(l.status)).length+clicks.filter(c=>c.status==='CLICK_FAILED').length+(journey?.status==='FAIL'?1:0)+(visual?.profiles.filter(p=>['DIFF','NO_BASELINE','ERROR'].includes(p.status)).length||0);
      const result = {target:url,finalUrl:page.url(),startedAt,finishedAt:new Date().toISOString(),title:await page.title(),httpStatus:response?.status()??null,jsErrors,networkErrors,httpFailures,audit,clicks,journey,visual,viewport:{width:1366,height:768},result:response?.ok()&&issues===0?'PASS':'REVIEW',note:'PASS significa sin errores detectados en las comprobaciones realizadas; no certifica el funcionamiento de todos los botones. Los enlaces locales se comprueban solo mediante HEAD; los no verificables se señalan como tales.'};
      latest=history.append(result);
      await context.close();
      return latest;
    } finally { await browser.close(); }
  } finally { active = false; }
}
module.exports = { run, status };
