'use strict';
const path = require('node:path');
const PORT = Number(process.env.GHOST_PORT || 4177);
const HOST = '127.0.0.1';
const ROOT = path.resolve(__dirname, '..');
const MAX_BODY = 16 * 1024;
function validateTarget(input) {
  if (typeof input !== 'string' || input.length > 2048) throw new Error('Introduce una URL válida.');
  let url;
  try { url = new URL(input); } catch { throw new Error('La URL no tiene un formato válido.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Solo se permiten URLs HTTP/HTTPS.');
  if (url.username || url.password) throw new Error('No se permiten credenciales en la URL.');
  // Phase 1: tests are local only. Public and remote URLs will require explicit opt-in in a later phase.
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('En fase 1 solo se prueban sitios locales (localhost o 127.0.0.1).');
  return url.toString();
}
module.exports = { PORT, HOST, ROOT, MAX_BODY, validateTarget };
