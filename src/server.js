'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { PORT, HOST, ROOT, MAX_BODY } = require('./config');
const runner = require('./runner');
const visual = require('./visual');
const history = require('./history');
const release = require('./release');
const PUBLIC = path.join(ROOT, 'public');
const VERSION = require('../package.json').version;
const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml' };
function json(res, code, body) { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(body)); }
function serve(req, res) {
  const expectedHost = `${HOST}:${req.socket.localPort}`;
  if (req.headers.host !== expectedHost) return json(res,403,{error:'Host no autorizado.'});
  const address = new URL(req.url, 'http://127.0.0.1');
  if (address.pathname === '/api/health' && req.method === 'GET') return json(res,200,{ok:true,name:'Ghost Test 404',version:VERSION,phase:7});
  if (address.pathname.startsWith('/api/report/') && req.method === 'GET') {
    const match=/^\/api\/report\/([0-9a-f-]{36})\.(json|html)$/.exec(address.pathname);
    if(!match)return json(res,400,{error:'Ruta de informe inválida.'});
    const record=history.get(match[1]);if(!record)return json(res,404,{error:'Informe no encontrado.'});
    const gate=release.evaluate(record);
    const format=match[2];const content=format==='html'?release.html(record,gate):JSON.stringify({result:record,gate},null,2);
    res.writeHead(200,{'Content-Type':format==='html'?'text/html; charset=utf-8':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename=ghost-report-${match[1]}.${format}`,'X-Content-Type-Options':'nosniff'});
    return res.end(content);
  }
  if (address.pathname === '/api/history' && req.method === 'GET') return json(res,200,{items:history.list()});
  if (address.pathname.startsWith('/api/history/') && req.method === 'GET') { const id=address.pathname.slice('/api/history/'.length);if(!/^[0-9a-f-]{36}$/.test(id))return json(res,400,{error:'ID inválido.'});const record=history.get(id);return record?json(res,200,record):json(res,404,{error:'Sesión no encontrada.'}); }
  if (address.pathname === '/api/history' && req.method === 'DELETE') {if(req.headers.origin!==`http://${expectedHost}`)return json(res,403,{error:'Origen no autorizado.'});history.clear();return json(res,200,{ok:true});}
  if (address.pathname === '/api/status' && req.method === 'GET') return json(res,200,runner.status());
  if (address.pathname.startsWith('/api/visual/artifact/') && req.method==='GET') {
    const parts=address.pathname.split('/');
    const filename=visual.artifactPath(parts[4]||'',parts[5]||'');
    if(!filename)return json(res,404,{error:'Archivo no encontrado.'});
    return fs.readFile(filename,(err,data)=>{if(err)return json(res,404,{error:'Archivo no encontrado.'});res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);});
  }
  if (address.pathname === '/api/run' && req.method === 'POST') {
    // Only same-origin requests from the local UI may initiate a browser process.
    if (req.headers.origin !== `http://${expectedHost}`) return json(res,403,{error:'Origen no autorizado.'});
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res,415,{error:'Se requiere JSON.'});
    let buf = ''; let exceeded = false;
    req.on('data', chunk => { if (exceeded) return; buf += chunk; if (Buffer.byteLength(buf, 'utf8') > MAX_BODY) { exceeded = true; json(res,413,{error:'JSON demasiado grande.'}); } });
    req.on('end', async () => {
      if (exceeded) return;
      try { const data = JSON.parse(buf); const result = await runner.run(data.url, {safeClicks:data.safeClicks===true,journeyEnabled:data.journeyEnabled===true,journey:data.journey,visual:data.visual}); json(res,200,result); }
      catch(err) { json(res,err.status || 400,{error:err.message}); }
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res,405,{error:'Método no permitido.'});
  const allowed = {'/':'index.html','/index.html':'index.html','/app.js':'app.js','/styles.css':'styles.css'};
  const name = allowed[address.pathname];
  if (!name) return json(res,404,{error:'Recurso no encontrado.'});
  const p = path.join(PUBLIC,name);
  fs.readFile(p,(err,data)=>{
    if(err) return json(res,500,{error:'No se pudo cargar el recurso.'});
    res.writeHead(200,{'Content-Type':TYPES[path.extname(p)],'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}
function start(port = PORT) { const server=http.createServer(serve); server.listen(port,HOST,()=>console.log(`GHOST TEST 404 → http://${HOST}:${server.address().port}`)); return server; }
if(require.main===module) start();
module.exports={start};
