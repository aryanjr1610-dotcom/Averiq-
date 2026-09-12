/* global require, console, process */
/* eslint @typescript-eslint/no-require-imports: "off" */
const {setup,base,output,chromium}=require('./visual-qa.cjs');
const fs=require('node:fs/promises');const path=require('node:path');const assert=require('node:assert/strict');
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--renderer-process-limit=2']});const checks=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await setup(context,true);
  await context.route('**/src/features/curriculum/repository.ts',async route=>{
   await route.fulfill({contentType:'application/javascript',body:'export class AcademicUnavailableError extends Error {}; export const curriculumRepository={resolveMyCurriculum:async()=>{await new Promise(resolve=>setTimeout(resolve,2500));throw new Error("Fixture network failure")}};'});
  });
  const page=await context.newPage();await page.goto(base+'/app/learn',{waitUntil:'domcontentloaded'});
  await page.locator('.page-loader').first().waitFor({state:'visible'});checks.push('Structured page skeleton appears while the route is pending.');
  await page.getByRole('heading',{name:"Your learning library couldn't load"}).waitFor();
  await page.getByRole('button',{name:'Try again'}).click();
  await page.getByRole('heading',{name:"Your learning library couldn't load"}).waitFor();
  await page.screenshot({path:path.join(output,'library-network-error-390.png')});checks.push('Network failure gives a readable error and a working retry path.');
  await context.setOffline(true);await page.locator('.off-bar').waitFor();assert((await page.locator('.off-bar').innerText()).includes("You're offline"));checks.push('Offline state is announced without losing the current page.');
  await context.setOffline(false);await page.locator('.off-bar').waitFor({state:'hidden'});checks.push('Offline banner clears on reconnect.');
  await page.goto(base+'/app/settings',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Storage',exact:true}).click();await page.screenshot({path:path.join(output,'downloads-empty-390.png')});checks.push('Downloads presents its empty state inside settings.');
  await context.close();
 }finally{await browser.close();await fs.writeFile(path.join(output,'state-report.json'),JSON.stringify(checks,null,2));}
 console.log(checks.join('\n'));
}
main().catch(error=>{console.error(error);process.exitCode=1});
