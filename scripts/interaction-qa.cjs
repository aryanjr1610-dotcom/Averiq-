/* global require, process, console, document */
/* eslint @typescript-eslint/no-require-imports: "off" */
const {setup,base,output,chromium} = require('./visual-qa.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
async function main() {
 const browser = await chromium.launch({channel:'chrome',headless:true,args:['--renderer-process-limit=2']});
 const checks=[];
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:'dark',reducedMotion:'reduce'});
  await setup(context,true);
  const page=await context.newPage();
  await page.goto(base+'/app/dashboard',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'More destinations',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  for(let i=0;i<20;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement?.closest('[role="dialog"]')))}
  await page.keyboard.press('Escape');
  assert(await page.getByRole('button',{name:'More destinations',exact:true}).evaluate(el=>el===document.activeElement));
  checks.push('Mobile More traps focus, dismisses with Escape and restores its trigger.');
  await page.goto(base+'/app/settings',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Change password',exact:true}).click();
  const input=page.getByLabel('New password',{exact:false});
  await input.fill('short');
  assert.equal(await input.evaluate(el=>el.checkValidity()),false);
  for(let i=0;i<9;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement?.closest('[role="dialog"]')))}
  await page.screenshot({path:path.join(output,'settings-password-390.png')});
  await page.keyboard.press('Escape');
  assert(await page.getByRole('button',{name:'Change password',exact:true}).evaluate(el=>el===document.activeElement));
  checks.push('Account dialog has a labelled password input, validation, focus containment and focus restoration.');
  await page.getByRole('button',{name:'Appearance',exact:true}).click();
  await page.getByRole('button',{name:'Light',exact:true}).click();
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  await page.screenshot({path:path.join(output,'settings-light-390.png')});
  checks.push('Appearance changes to light theme immediately.');
  await page.getByRole('button',{name:'Accessibility',exact:true}).click();
  await page.getByLabel('Larger reading text').check();
  await page.waitForFunction(()=>document.documentElement.dataset.textScale==='large');
  checks.push('Larger reading preference reaches the root typography tokens.');
  await page.goto(base+'/app/focus',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.mobile-bottom-nav').count(),0);
  assert.equal(await page.locator('.desktop-navigation').count(),0);
  await page.getByRole('link',{name:'Back to study'}).waitFor();
  await page.screenshot({path:path.join(output,'focus-390.png')});
  checks.push('Focus mode removes primary navigation and preserves a clear exit.');
  await page.goto(base+'/app/visual-lab/electric-field-2d',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.mobile-bottom-nav').count(),0);
  checks.push('Visual Lab uses the compact immersive shell.');
  await page.goto(base+'/app/search',{waitUntil:'networkidle'});
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  checks.push('Global search opens by keyboard and closes with Escape.');
  await page.goto(base+'/app/dashboard',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'AI',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  await page.screenshot({path:path.join(output,'ai-tutor-390.png')});
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  checks.push('AI opens as a full-height mobile dialog and closes with Escape.');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.motion),'reduce');
  checks.push('OS reduced motion remains active across navigation and preferences.');
  await context.close();
 } finally { await browser.close(); await fs.writeFile(path.join(output,'interaction-report.json'),JSON.stringify(checks,null,2)); }
 console.log(checks.join('\n'));
}
main().catch(error=>{console.error(error);process.exitCode=1});
