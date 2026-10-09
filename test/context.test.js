const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {verifyContext}=require('../learner-context');
const {createApp}=require('../server');
const secret='local-test-key-not-a-production-secret';
const serviceSecret='service-only-test-key';
const now=1900000000;
function token(overrides={},key=secret) {
 const c={v:1,iss:'https://linguai.pl',aud:'linguai-memory',sub:11,language:'włoski',scope:'memory:save',iat:now,exp:now+7200,...overrides};
 const payload=Buffer.from(JSON.stringify(c)).toString('base64url');
 return payload+'.'+crypto.createHmac('sha256',key).update('linguai-learner-v1.'+payload).digest('base64url');
}
test('signed context rejects tampering, wrong scope, expiration and invalid claims',()=>{
 assert.equal(verifyContext(token(),secret,'memory:save',now).sub,11);
 for(const value of [undefined,'','x.y',token({},'other'),token().replace(/^./,'x'),token()+'.extra'])
  assert.throws(()=>verifyContext(value,secret,'memory:save',now));
 for(const claims of [{sub:0},{sub:'11'},{sub:true},{sub:1e20},{language:'pl'},{scope:'memory:get'},
  {iss:'https://other.invalid'},{aud:'other'},{v:2},{iat:now+31},{exp:now},{exp:now+7201},{iat:now-10000}])
  assert.throws(()=>verifyContext(token(claims),secret,'memory:save',now));
 assert.throws(()=>verifyContext(token({scope:'memory:get',exp:now+121}),secret,'memory:get',now));
});
test('API rejects cross-user/language operations before touching the database',async()=>{
 let calls=0;const writes=[];
 const db={rpc:async(name,args)=>{calls++;writes.push(args);return{data:{},error:null}},from:()=>{calls++;throw new Error('unexpected read')}};
 const server=createApp(db,serviceSecret,secret).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const liveNow=Math.floor(Date.now()/1000);
 const capability=token({iat:liveNow,exp:liveNow+3600});
 const call=(body,context=capability,path='/api/memory/save',service=serviceSecret)=>fetch('http://127.0.0.1:'+server.address().port+path,
  {method:'POST',headers:{'content-type':'application/json','x-linguai-secret':service,...(context?{'x-linguai-context':context}:{})},body:JSON.stringify(body)});
 try {
  for(const body of [{wp_user_id:12},{wpUserId:12},{wp_user_id:11,wpUserId:12},{language:'en'}])
   assert.equal((await call(body)).status,403);
  assert.equal((await call({},null)).status,401);
  assert.equal((await call({},capability,'/api/memory/get')).status,401);
  assert.equal((await call({},capability,'/api/memory/save','')).status,401);
  assert.equal((await call({},token({iat:liveNow,exp:liveNow+3600},serviceSecret))).status,401);
  assert.equal(calls,0);
  const response=await call({level:'A1'});assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(writes,[{p_wp_user_id:11,p_language:'włoski',p_patch:{level:'A1'}}]);
 } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('missing, weak and reused signing keys fail closed',()=>{
 for(const key of [undefined,'short',serviceSecret]) assert.throws(()=>createApp({},serviceSecret,key));
 assert.throws(()=>createApp({},secret,secret));
});
