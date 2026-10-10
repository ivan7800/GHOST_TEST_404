'use strict';
// Real browser test of the actual dashboard, distinct from the fixture CI journey.
const assert = require('node:assert/strict');
const {start} = require('../src/server');
async function main() {
  const {chromium} = require('playwright');
  const server = start(0);
  await new Promise(resolve => server.listening ? resolve() : server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base,{waitUntil:'networkidle'});
    await page.locator('#backend').getByText('MOTOR CONECTADO').waitFor({timeout:10000});
    assert.equal(await page.locator('#run').isEnabled(),true);
    await page.selectOption('#theme','violet');
    assert.equal(await page.locator('html').getAttribute('data-theme'),'violet');
    await page.reload();
    assert.equal(await page.locator('#theme').inputValue(),'violet');
    await page.selectOption('#theme','amber');
    assert.equal(await page.locator('html').getAttribute('data-theme'),'amber');
    await page.locator('#target').fill('not-a-valid-url');
    await page.locator('#run').click();
    assert.equal(await page.locator('#target').evaluate(el=>el.validity.valid),false);
    await page.locator('#target').fill(base);
    page.once('dialog',dialog=>dialog.dismiss());
    await page.locator('#clear-history').click();
    assert.equal(await page.locator('#history-count').textContent(),'0');
    assert.deepEqual(errors,[],'Errores JS en dashboard');
    for (const width of [390,768,1440]) {
      await page.setViewportSize({width,height:900});
      assert.equal(await page.locator('#run').count(),1);
      assert.equal(await page.locator('#test-form').isVisible(),true);
    }
    console.log('UI SMOKE PASS: carga, salud, tema persistente, validación del formulario, diálogo historial, 3 tamaños, consola.');
  } finally {
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(err=>{console.error('UI SMOKE FAIL:',err.stack||err);process.exitCode=1;});
