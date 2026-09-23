const express = require('express');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const LANGUAGES = {en:'angielski', english:'angielski',angielski:'angielski',es:'hiszpański',spanish:'hiszpański','español':'hiszpański',hiszpanski:'hiszpański','hiszpański':'hiszpański',it:'włoski',italian:'włoski',italiano:'włoski',wloski:'włoski','włoski':'włoski',zh:'chiński', 'zh-cn':'chiński',chinese:'chiński',mandarin:'chiński',chinski:'chiński','chiński':'chiński','chiński mandaryński':'chiński'};
const FIELDS = ['name','gender','level','last_lesson_topic','what_was_practiced','words_to_review','mistakes_to_review','next_lesson_plan'];
const SELECT = 'id,wp_user_id,name,gender,language,level,last_lesson_topic,what_was_practiced,words_to_review,mistakes_to_review,next_lesson_plan,updated_at';
function userId(body) {
 const v=body?.wp_user_id ?? body?.wpUserId;
 if (!(typeof v==='number'||typeof v==='string') || !/^[1-9][0-9]*$/.test(String(v)) || !Number.isSafeInteger(Number(v))) return null;
 return Number(v);
}
function language(v) {
 const key=typeof v==='string'?v.trim().toLowerCase():'';
 return Object.hasOwn(LANGUAGES,key)?LANGUAGES[key]:null;
}
function validate(body, save=false) {
 if(!body || Array.isArray(body) || typeof body!=='object' || !userId(body)) throw new Error('Wymagany prawidłowy wp_user_id.');
 const lang=language(body.language);
 if((save || Object.hasOwn(body,'language')) && !lang) throw new Error('Wybierz język: en, es, it lub zh.');
 const patch={};
 if(save) for(const field of FIELDS) if(Object.hasOwn(body,field)) {
  const value=body[field];
  if(typeof value!=='string' || value.length>(['name','gender','level'].includes(field)?200:6000)) throw new Error('Nieprawidłowe pole: '+field);
  patch[field]=value.trim();
 }
 if(Object.hasOwn(patch,'level') && !['','A0','A1','A2','B1','B2','C1'].includes(patch.level)) throw new Error('Poziom musi być od A0 do C1.');
 if(Object.hasOwn(patch,'gender') && !['','male','female','unknown'].includes(patch.gender)) throw new Error('Nieprawidłowa wartość gender.');
 return {id:userId(body),lang,patch};
}
function createApp(db,secret) {
 if(!secret) throw new Error('Missing backend secret');
 const app=express();
 app.disable('x-powered-by');
 app.use('/api',(req,res,next)=>{
  const a=Buffer.from(req.get('x-linguai-secret')||''), b=Buffer.from(secret);
  if(a.length!==b.length || !crypto.timingSafeEqual(a,b)) return res.status(401).json({success:false,error:'Unauthorized'});
  res.set('Cache-Control','no-store'); next();
 });
 app.use(express.json({limit:'128kb'}));
 app.get('/',(req,res)=>res.json({status:'ok',service:'LinguAI Memory API',version:'2.2'}));
 app.post('/api/memory/get',async(req,res)=>{
  let input;try {input=validate(req.body);}catch(e){return res.status(400).json({found:false,error:e.message});}
  try {
   let query=db.from('student_memory').select(SELECT).eq('wp_user_id',input.id);
   if(input.lang) query=query.eq('language',input.lang);
   // Legacy WordPress callers without language receive the most recent memory.
   // All new callers must pass language for deterministic isolation.
   const {data,error}=await query.order('updated_at',{ascending:false,nullsFirst:false}).limit(1).maybeSingle();
   if(error) throw error;
   return res.json(data?{found:true,memory:data}:{found:false,wp_user_id:input.id,language:input.lang});
  }catch(e){console.error('memory/get failed',e.code||'database_error');return res.status(503).json({found:false,error:'Pamięć jest chwilowo niedostępna. Spróbuj ponownie.'});}
 });
 app.post('/api/memory/save',async(req,res)=>{
  let input;try {input=validate(req.body,true);}catch(e){return res.status(400).json({success:false,error:e.message});}
  try {
   const {data,error}=await db.rpc('linguai_save_memory',{p_wp_user_id:input.id,p_language:input.lang,p_patch:input.patch});
   if(error) throw error;
   return res.json({success:true,memory:data});
  }catch(e){console.error('memory/save failed',e.code||'database_error');return res.status(503).json({success:false,error:'Nie zapisano pamięci. Spróbuj ponownie.'});}
 });
 app.use((err,req,res,next)=>res.status(err.type==='entity.too.large'?413:400).json({success:false,error:'Nieprawidłowe żądanie JSON.'}));
 return app;
}
if(require.main===module){
 const {SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,LINGUAI_BACKEND_SECRET}=process.env;
 if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY||!LINGUAI_BACKEND_SECRET){console.error('Brakuje wymaganych zmiennych środowiskowych.');process.exit(1);}
 const db=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 createApp(db,LINGUAI_BACKEND_SECRET).listen(process.env.PORT||3000,()=>console.log('LinguAI Memory API 2.2 ready'));
}
module.exports={createApp,validate};
