const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createApp,validate}=require('./server');
test('strict identity and language validation',()=>{
 for(const id of [true,[],{},0,-1,'1.2','1e2',Number.MAX_SAFE_INTEGER+1]) assert.throws(()=>validate({wp_user_id:id,language:'en'},true));
 for(const language of ['en','es','it','zh','zh-CN','Mandarin','chiński','Chiński mandaryński','włoski','English']) assert.ok(validate({wp_user_id:'12',language,level:'A0'},true));
 assert.throws(()=>validate({wp_user_id:12},true));
 assert.throws(()=>validate({wp_user_id:12,language:'pl'},true));
 for(const language of ['constructor','__proto__','toString']) assert.throws(()=>validate({wp_user_id:12,language},true));
 assert.throws(()=>validate({wp_user_id:12,language:'en',level:'C2'},true));
 assert.throws(()=>validate({wp_user_id:12,language:'en',words_to_review:[]},true));
 assert.deepEqual(validate({wp_user_id:12,language:'en',name:'A',id:'other'},true).patch,{name:'A'});
});
test('API authenticates before writes and scopes reads',async()=>{
 const writes=[],filters=[];
 const query={select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return this},limit(){return this},async maybeSingle(){return{data:null,error:null}}};
 const db={from(){return query},async rpc(name,args){writes.push(args);return{data:{wp_user_id:args.p_wp_user_id,language:args.p_language,...args.p_patch},error:null}}};
 const server=createApp(db,'test-only-secret').listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const url='http://127.0.0.1:'+server.address().port;
 const call=(path,body,auth=true)=>fetch(url+path,{method:'POST',headers:{'content-type':'application/json',...(auth?{'x-linguai-secret':'test-only-secret'}:{})},body:JSON.stringify(body)});
 try{
  assert.equal((await call('/api/memory/save',{wp_user_id:1,language:'en'},false)).status,401);assert.equal(writes.length,0);
  assert.equal((await call('/api/memory/save',{wp_user_id:1})).status,400);assert.equal(writes.length,0);
  for(const lang of ['en','es','it','zh']) assert.equal((await call('/api/memory/save',{wp_user_id:1,language:lang,level:'A0'})).status,200);
  assert.deepEqual(writes.map(x=>x.p_language),['angielski','hiszpański','włoski','chiński']);
  const response=await call('/api/memory/get',{wp_user_id:2,language:'es'});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(filters,[['wp_user_id',2],['language','hiszpański']]);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
