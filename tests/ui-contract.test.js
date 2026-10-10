'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');
test('todos los IDs referidos por app.js aparecen exactamente una vez en el HTML', () => {
  const uses = [...app.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
  for (const id of new Set(uses)) {
    const occurrences = [...html.matchAll(new RegExp('\\bid="'+id+'"','g'))].length;
    assert.equal(occurrences, 1, `ID ${id}: se esperaban una aparición, hay ${occurrences}`);
  }
});
test('controles críticos mantienen tipo, scripts locales y selector de tema', () => {
  assert.match(html, /<form id="test-form"/);
  assert.match(html, /<button id="run" type="submit"/);
  assert.match(html, /<button type="button" class="ghost-button" id="clear-history"/);
  assert.match(html, /<script src="\/app\.js" defer><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="\/styles\.css">/);
  assert.match(app, /addEventListener\('submit'/);
  assert.match(app, /addEventListener\('change'/);
  assert.match(app, /addEventListener\('click'/);
  assert.match(css, /\[data-theme/);
});
