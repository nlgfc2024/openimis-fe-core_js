const {browser,context,current,login,base,assert,fs}=require('./common.cjs');
const root='/tmp/mlatho-local-prod';
const decode=t=>JSON.parse(Buffer.from(t.split('.')[1],'base64url'));
(async()=>{
 const b=await browser();let p;const started=Date.now();
 const heartbeat=setInterval(()=>console.log('JWT renewal observation',Math.round((Date.now()-started)/1000)+'s'),30000);
 try{
  const c=await context(b);p=await c.newPage();
  let ready=false;const deadline=Date.now()+90000;
  while(Date.now()<deadline){const r=await c.request.get(base+'/api/core/users/current_user/');if(r.status()===401){ready=true;break}await p.waitForTimeout(1000)}
  assert.ok(ready,'Backend ready');
  const renewal=[];
  p.on('response',r=>{if(r.url().endsWith('/api/graphql')&&r.request().postData()?.includes('mutation refreshAuthToken'))renewal.push({status:r.status,at:Date.now()})});
  await login(p);const loggedInAt=Date.now();
  const initial=(await c.cookies()).find(x=>x.name==='JWT');const old=decode(initial.value);
  const remaining=old.exp-Date.now()/1000;assert.ok(remaining>150&&remaining<=180,'Accelerated JWT is 180 seconds');
  assert.equal((await c.cookies()).some(x=>x.name==='JWT-refresh-token'),false);
  const response=await p.waitForResponse(r=>r.url().endsWith('/api/graphql')&&r.request().postData()?.includes('mutation refreshAuthToken'),{timeout:150000});
  assert.equal(response.status(),200);const body=await response.json();assert.equal(body.errors,undefined);
  await p.waitForTimeout(500);
  const updated=(await c.cookies()).find(x=>x.name==='JWT');const newer=decode(updated.value);
  assert.ok(newer.exp>=old.exp+110);assert.ok(Date.now()-loggedInAt>=110000);
  console.log('PASS unmodified two-minute tick renewed JWT before expiry');
  while(Date.now()<old.exp*1000+2000)await p.waitForTimeout(Math.min(1000,old.exp*1000+2000-Date.now()));
  assert.equal((await current(p)).status,200);assert.ok(await p.getByTitle('Log out',{exact:true}).isVisible());
  const isolated=await context(b);
  await isolated.addCookies([{...initial,expires:-1}]);
  const stale=await isolated.request.get(base+'/api/core/users/current_user/');assert.equal(stale.status(),401);
  await isolated.close();
  await p.screenshot({path:root+'/evidence/jwt-past-original-expiry.png'});
  const result={name:'Periodic JWT sliding',status:'PASS',testTokenLifetimeSeconds:180,productionTokenLifetimeSeconds:86400,unmodifiedRefreshIntervalSeconds:120,renewalHttp:response.status(),renewalDelaySeconds:Math.round((renewal[0].at-loggedInAt)/1000),expiryAdvancedSeconds:newer.exp-old.exp,pastOriginalExpiryHttp:200,originalExpiredTokenHttp:401,separateRefreshCookie:false};
  fs.writeFileSync(root+'/evidence/sliding-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(e){if(p)await p.screenshot({path:root+'/evidence/sliding-failure.png'});fs.writeFileSync(root+'/evidence/sliding-results.json',JSON.stringify({status:'FAIL',error:e.stack},null,2));throw e}
 finally{clearInterval(heartbeat);await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
