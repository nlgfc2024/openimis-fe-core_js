const {browser,context,current,login,base,assert,fs}=require('./common.cjs');
const {execFileSync}=require('child_process');
const root='/tmp/mlatho-local-prod';
const field=(p,name)=>p.locator('label').filter({hasText:new RegExp('^'+name+'[\\s\\u2009*]*$')}).locator('..').locator('input').first();
const control=(action)=>execFileSync('python3',[root+'/control.py',action],{encoding:'utf8'});
(async()=>{
 const b=await browser();let p;let stopped=false;
 const heartbeat=setInterval(()=>console.log('Waiting for the real two-minute background check',new Date().toISOString()),30000);
 try{
  const c=await context(b);p=await c.newPage();await login(p);
  await p.goto(base+'/front/admin/users/new');await field(p,'Last name').waitFor({timeout:30000});
  await field(p,'Last name').fill('Unsaved restart validation');
  await p.waitForLoadState('networkidle');
  const tick=p.waitForResponse(r=>r.url().endsWith('/api/core/users/current_user/')&&r.status()===502,{timeout:150000});
  console.log(control('stop'));stopped=true;
  const failure=await tick;
  await p.waitForTimeout(1000);
  assert.equal(await field(p,'Last name').inputValue(),'Unsaved restart validation');
  assert.equal(await p.getByTitle('Log out',{exact:true}).isVisible(),true);
  assert.equal(await p.getByRole('dialog').count(),0);
  await p.screenshot({path:root+'/evidence/restart-502-unsaved-form.png'});
  console.log('PASS real background tick got 502; unsaved form retained');
  console.log(control('start'));stopped=false;
  let healthy=false;const deadline=Date.now()+90000;
  while(Date.now()<deadline){const r=await c.request.get(base+'/api/core/users/current_user/');if(r.status()===200){healthy=true;break}await p.waitForTimeout(1000)}
  assert.ok(healthy,'Backend recovered');
  assert.equal(await field(p,'Last name').inputValue(),'Unsaved restart validation');
  assert.equal((await current(p)).status,200);
  await p.screenshot({path:root+'/evidence/restart-recovered-unsaved-form.png'});
  const result={name:'Backend restart during unsaved form',status:'PASS',mode:'prod',trigger:'Unmodified two-minute RefreshAuthToken timer',outageHttp:502,afterRestartHttp:200,draft:'Unsaved restart validation',draftPreserved:true,dialogs:0};
  fs.writeFileSync(root+'/evidence/restart-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(e){if(p)await p.screenshot({path:root+'/evidence/restart-failure.png'});fs.writeFileSync(root+'/evidence/restart-results.json',JSON.stringify({status:'FAIL',error:e.stack},null,2));throw e}
 finally{clearInterval(heartbeat);if(stopped)console.log(control('start'));await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
