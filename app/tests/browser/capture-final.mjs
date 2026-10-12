import { chromium } from 'playwright';
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 await page.goto('http://127.0.0.1:8080/login');
 await page.getByLabel('Email address').fill('owner@demo.rishtahub.test');
 await page.getByLabel('Password',{exact:true}).fill('DemoBureau2026!');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('heading',{name:/Good .*Amina/}).waitFor();
 await page.screenshot({path:'screenshots/Rishtahub-preview.png',fullPage:true});
 await page.getByRole('button',{name:'dark theme',exact:true}).click();
 await page.screenshot({path:'screenshots/Rishtahub-dark.png',fullPage:true});
 await page.getByRole('button',{name:'light theme',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'screenshots/Rishtahub-mobile.png',fullPage:true,animations:'disabled'});
}finally{await browser.close()}
