const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('node:assert/strict');
const base = 'https://localhost:8443';
const credentials = JSON.parse(fs.readFileSync('/tmp/mlatho-local-prod/credentials.json'));
async function browser() {
 return chromium.launch({headless:true, executablePath:'/tmp/mlatho-local-prod/browser-cache/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox'],env:{...process.env,LD_LIBRARY_PATH:'/tmp/mlatho-local-prod/browser-libs/root/usr/lib/x86_64-linux-gnu'}});
}
async function context(browser) { return browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}}); }
async function current(page) {
 return page.evaluate(async()=>{const r=await fetch('/api/core/users/current_user/');return {status:r.status,body:await r.json()}});
}
async function login(page) {
 await page.goto(base+'/front/', {waitUntil:'networkidle',timeout:90000});
 await page.locator('input[type="password"]').waitFor({timeout:30000});
 await page.locator('input[type="text"]').first().fill(credentials.username);
 await page.locator('input[type="password"]').fill(credentials.password);
 await page.getByRole('button',{name:/^log ?in$|^sign ?in$/i}).click();
 await page.locator('input[type="password"]').waitFor({state:'hidden',timeout:30000});
 await page.waitForLoadState('networkidle');
 const user=await current(page);assert.equal(user.status,200);assert.equal(user.body.username,credentials.username);
 return user;
}
module.exports={browser,context,current,login,base,credentials,assert,fs};
