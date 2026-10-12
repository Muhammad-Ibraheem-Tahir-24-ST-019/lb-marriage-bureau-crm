import { chromium } from 'playwright';
const browser=await chromium.launch();
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message)});
 page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error('CONSOLE:',m.text())}});
 await page.goto('http://127.0.0.1:8081/register');
 await page.getByLabel('Your full name').fill('Release Test Owner');
 await page.getByLabel('Bureau name').fill('Clean Install Bureau');
 await page.getByLabel('Email address').fill('release-test@example.test');
 await page.getByLabel(/^Password/).fill('ReleaseTestPassword123');
 await page.getByLabel('Confirm password').fill('ReleaseTestPassword123');
 await page.getByRole('button',{name:'Create bureau account'}).click();
 await page.getByRole('heading',{name:/Good .*Release/}).waitFor();
 const state=await page.evaluate(()=>fetch('/api/state',{headers:{Accept:'application/json'}}).then(r=>r.json()));
 if(state.profiles.length!==0||state.staff.length!==1)throw new Error('Fresh install contains unexpected records');
 await page.getByRole('button',{name:'Add profile',exact:true}).click();
 await page.getByLabel('Full name *',{exact:true}).fill('Release Test Adult');
 await page.getByLabel('Date of birth * (18+)').fill('1995-01-01');
 await page.getByLabel('City *',{exact:true}).fill('Lahore');
 await page.getByRole('button',{name:'Notes & consent'}).click();
 await page.getByRole('dialog').getByRole('checkbox').check();
 await page.getByLabel('Tags (comma separated)').pressSequentially('Reviewed, Family consent');
 await page.getByRole('button',{name:'Save profile'}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 const result=await page.evaluate(()=>fetch('/api/state',{headers:{Accept:'application/json'}}).then(r=>r.json()));
 if(result.profiles[0]?.tags?.length!==2)throw new Error('Profile tags not saved correctly');
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('Fresh production upload: registration, login, empty bureau, profile creation, tags, CSP, and compiled React assets passed.');
}finally{await browser.close()}
