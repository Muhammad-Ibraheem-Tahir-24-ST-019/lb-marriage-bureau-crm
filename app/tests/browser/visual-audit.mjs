import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1440,height:1050}});
const page=await context.newPage();
const report=[];
const theme=process.argv[2]||'light';
try {
 await page.goto('http://127.0.0.1:8080/login');
 await page.getByLabel('Email address').fill('owner@demo.rishtahub.test');
 await page.getByLabel('Password',{exact:true}).fill('DemoBureau2026!');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('heading',{name:/Good .*Amina/}).waitFor();
 await page.getByRole('button',{name:theme+' theme',exact:true}).click();
 for(const path of ['','profiles','matching','proposals','followups','meetings','reports','staff','settings']){
  await page.goto('http://127.0.0.1:8080/app/'+path);
  await page.locator('.page-heading h1').waitFor();
  await page.screenshot({path:'screenshots/'+(path||'overview')+'-'+theme+'-final.png',fullPage:true});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  report.push({path,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({selector:n.target,summary:n.failureSummary}))}))});
  await page.setViewportSize({width:390,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)report.push({path,mobileOverflow:true});
  await page.setViewportSize({width:1440,height:1050});
 }
 fs.writeFileSync('screenshots/accessibility-'+theme+'.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report.map(r=>({path:r.path,violations:r.violations?.map(v=>({id:v.id,count:v.nodes.length})),mobileOverflow:r.mobileOverflow}))));
}finally{await browser.close()}
