// Server-only code. Uses secrets supplied by Supabase, never bundled into public/.
const allowedOrigins = new Set(['null','https://florincatanaush.github.io','https://florvision.fun','https://www.florvision.fun','http://localhost:8080','http://127.0.0.1:8080']);
function response(data,status,origin) {
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(allowedOrigins.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, authorization, apikey','Access-Control-Max-Age':'600'});
 return new Response(JSON.stringify(data),{status,headers});
}
async function rpc(name,args) {
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key)throw new Error('Missing backend configuration');
 const r=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/'+name,{
  method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+key},body:JSON.stringify(args)
 });
 if(!r.ok)throw new Error('Database operation failed');
 return await r.json();
}
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')||'';
 if(origin&&!allowedOrigins.has(origin))return response({error:'Acces nepermis.'},403,origin);
 if(req.method==='OPTIONS')return response({},200,origin);
 if(req.method!=='POST')return response({error:'Metodă nepermisă.'},405,origin);
 try{
  if(Number(req.headers.get('content-length')||0)>4096)return response({error:'Cerere prea mare.'},413,origin);
  const raw=await req.text();if(raw.length>4096)return response({error:'Cerere prea mare.'},413,origin);
  let body;try{body=JSON.parse(raw);}catch{return response({error:'Cerere invalidă.'},400,origin);}
  if(body.action==='login'){
   if(typeof body.studentId!=='string'||!/^student-(0[1-9]|1[0-9]|2[01])$/.test(body.studentId)||typeof body.password!=='string'||body.password.length>128)return response({error:'Numele sau parola nu sunt corecte.'},401,origin);
   const result=await rpc('regat_login',{p_student_id:body.studentId,p_password:body.password});
   if(!result?.ok)return response({error:'Numele sau parola nu sunt corecte. După mai multe încercări, așteaptă 15 minute.'},401,origin);
   return response({token:result.token,expiresAt:result.expiresAt,profile:result.profile},200,origin);
  }
  if(body.action==='teacher_login'){
   if(typeof body.password!=='string'||body.password.length>128)return response({error:'Parola nu este corectă.'},401,origin);
   const r=await rpc('regat_teacher_login',{p_password:body.password});
   return r?.ok?response({token:r.token,expiresAt:r.expiresAt,profile:r.profile},200,origin):response({error:'Parola nu este corectă. După mai multe încercări, așteaptă 15 minute.'},401,origin);
  }
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
  if(!/^[a-f0-9]{64}$/.test(token))return response({error:'Autentifică-te pentru a continua.'},401,origin);
  if(body.action==='profile'){
   const profile=await rpc('regat_session',{p_token:token});
   return profile?response({profile},200,origin):response({error:'Sesiunea a expirat. Autentifică-te din nou.'},401,origin);
  }
  if(body.action==='logout'){await rpc('regat_logout',{p_token:token});await rpc('regat_teacher_logout',{p_token:token});return response({ok:true},200,origin);}
  if(body.action==='teacher_students'){
   const students=await rpc('regat_teacher_students',{p_token:token});
   return students===null?response({error:'Acces rezervat profesorului.'},403,origin):response({students},200,origin);
  }
  if(['addition','subtraction','carry','borrow','proof'].includes(body.action)){
   if(!['state','answer'].includes(body.operation)||body.operation==='answer'&&(!Number.isInteger(body.chest)||body.chest<1||body.chest>12||typeof body.answer!=='string'||!(body.action==='proof'?([5,6].includes(body.chest)?/^\d{1,3},\d{1,3},[+-],\d{1,3},\d{1,3},[AF]$/: [3,4,7].includes(body.chest)?/^\d{1,3}(?:,\d{1,3}){3}$/:/^\d{1,3},\d{1,3},[+-],\d{1,3},\d{1,3},[+-],\d{1,3}$/):/^\d{1,5}$/).test(body.answer.trim())))return response({error:'Scrie răspunsul în căsuță.'},400,origin);
   const r=await rpc('regat_'+body.action,{p_token:token,p_action:body.operation,p_chest:body.chest??null,p_answer:body.answer??null});
   return r?.ok?response(r,200,origin):response({error:r?.error==='unauthorized'?'Sesiunea a expirat. Autentifică-te din nou.':'Capitolul 2 nu este încă deblocat.'},r?.error==='unauthorized'?401:403,origin);
  }
  if(body.action==='roman'){
   if(!['state','answer','match','take_crystal'].includes(body.operation))return response({error:'Cerere invalidă.'},400,origin);
   if(body.operation==='answer'&&(!Number.isInteger(body.chest)||typeof body.answer!=='string'||body.answer.length>32||!/^([0-9]{1,5}|[IVXLCDMivxlcdm\s]{1,32})$/.test(body.answer.trim())))return response({error:'Scrie răspunsul în căsuță.'},400,origin);
   if(body.operation==='match'&&(!Number.isInteger(body.chest)||body.chest<5||body.chest>12||!Array.isArray(body.answer)||body.answer.length!==4||!body.answer.every(n=>Number.isInteger(n)&&n>=1&&n<=39)||new Set(body.answer).size!==4))return response({error:'Asociază toate cele patru numere.'},400,origin);
   const r=await rpc('regat_roman',{p_token:token,p_action:body.operation,p_chest:body.chest??null,p_answer:body.operation==='match'?body.answer.join(','):body.answer??null});
   const errors={unauthorized:'Sesiunea a expirat. Autentifică-te din nou.',lesson_locked:'Lecția 6 este blocată de profesor.',chest_missing:'Exercițiul acestei lădițe urmează să fie adăugat.',invalid_action:'Acțiune nepermisă.',invalid_answer:'Asociază toate cele patru numere.'};
   return r?.ok?response(r,200,origin):response({error:errors[r?.error]||'Acțiunea nu a reușit.'},r?.error==='unauthorized'?401:403,origin);
  }
  if(body.action==='rounding'){
   if(!['state','answer','take_key'].includes(body.operation)||body.operation==='answer'&&(!Number.isInteger(body.chest)||typeof body.answer!=='string'||!/^\d{1,5}$/.test(body.answer.trim())))return response({error:'Scrie un număr în căsuță.'},400,origin);
   const r=await rpc('regat_rounding',{p_token:token,p_action:body.operation,p_chest:body.chest??null,p_answer:body.answer??null});
   const errors={unauthorized:'Sesiunea a expirat. Autentifică-te din nou.',lesson_locked:'Lecția 5 este blocată de profesor.',chest_missing:'Exercițiul acestei lădițe urmează să fie adăugat.'};
   return r?.ok?response(r,200,origin):response({error:errors[r?.error]||'Acțiunea nu a reușit.'},r?.error==='unauthorized'?401:403,origin);
  }
  if(body.action==='ordering'){
   if(!['state','answer','take_key'].includes(body.operation)||body.operation==='answer'&&(!Number.isInteger(body.chest)||!Array.isArray(body.answer)||body.answer.length!==4||!body.answer.every(n=>Number.isInteger(n)&&n>=0&&n<=10000)))return response({error:'Așază cele patru numere în căsuțe.'},400,origin);
   const r=await rpc('regat_ordering',{p_token:token,p_action:body.operation,p_chest:body.chest??null,p_answer:body.operation==='answer'?body.answer.join(','):null});
   const errors={six_stars:'Obține 6 steluțe pentru a elibera cheia lecției 5.',unauthorized:'Sesiunea a expirat. Autentifică-te din nou.',lesson_locked:'Lecția 4 este blocată de profesor.',chest_missing:'Exercițiul acestei lădițe urmează să fie adăugat.'};
   return r?.ok?response(r,200,origin):response({error:errors[r?.error]||'Acțiunea nu a reușit.'},r?.error==='unauthorized'?401:403,origin);
  }
  if(body.action==='comparison'){
   if(!['state','answer','take_key','open_lock'].includes(body.operation)||body.operation==='answer'&&(!Number.isInteger(body.chest)||typeof body.answer!=='string'||!['<','>','='].includes(body.answer)))return response({error:'Alege unul dintre semnele <, > sau =.'},400,origin);
   const r=await rpc('regat_comparison',{p_token:token,p_action:body.operation,p_chest:body.chest??null,p_answer:body.answer??null});
   const errors={six_stars:'Obține 6 steluțe pentru a elibera cheia lecției 4.',unauthorized:'Sesiunea a expirat. Autentifică-te din nou.',lesson_locked:'Lecția 3 este blocată de profesor.',chest_missing:'Exercițiul acestei lădițe urmează să fie adăugat.'};
   return r?.ok?response(r,200,origin):response({error:errors[r?.error]||'Acțiunea nu a reușit.'},r?.error==='unauthorized'?401:403,origin);
  }
  if(body.action==='reading'){
   if(!['state','answer','take_key'].includes(body.operation)||body.operation==='answer'&&(!Number.isInteger(body.chest)||typeof body.answer!=='string'||body.answer.length>500))return response({error:'Cerere invalidă.'},400,origin);
   const r=await rpc('regat_reading',{p_token:token,p_action:body.operation,p_chest:body.chest??null,p_answer:body.answer??null});
   const errors={six_stars:'Obține 6 steluțe pentru a elibera cheia lecției 3.',unauthorized:'Sesiunea a expirat. Autentifică-te din nou.',lesson_locked:'Lecția 2 este blocată. Ai nevoie de cheie și permisiunea profesorului.',chest_missing:'Exercițiul acestei lădițe nu este încă disponibil.'};
   return r?.ok?response(r,200,origin):response({error:errors[r?.error]||'Acțiunea nu a reușit.'},r?.error==='unauthorized'?401:403,origin);
  }
  if(body.action==='formation'){
   if(!['exercises','answer','take_key','open_lesson2'].includes(body.operation)||body.operation==='answer'&&(!Number.isInteger(body.chest)||body.chest<1||body.chest>12||typeof body.answer!=='string'||body.answer.length>5))return response({error:'Cerere invalidă.'},400,origin);
   const r=await rpc('regat_formation',{p_token:token,p_action:body.operation,p_chest:body.chest??null,p_answer:body.answer??null});
   const messages={lesson_locked:'Lecția 1 este blocată de profesor.',unauthorized:'Sesiunea a expirat. Autentifică-te din nou.',six_stars:'Obține 6 steluțe pentru a elibera cheia.',key_missing:'Revino la lecția 1 și ia cheia de pe masă.',teacher_permission:'Profesorul nu a permis încă accesul la lecția 2.',chest_missing:'Lădița nu există.'};
   return r?.ok?response(r,200,origin):response({error:messages[r?.error]||'Acțiunea nu a reușit.'},r?.error==='unauthorized'?401:403,origin);
  }
  if(body.action==='teacher_lesson_access'){
   if(typeof body.studentId!=='string'||!Number.isInteger(body.lesson)||body.lesson<1||body.lesson>6||typeof body.allowed!=='boolean')return response({error:'Cerere invalidă.'},400,origin);
   const r=await rpc('regat_teacher_lesson_access',{p_token:token,p_student_id:body.studentId,p_lesson:body.lesson,p_allowed:body.allowed});
   return r?.ok?response(r,200,origin):response({error:r?.error==='unauthorized'?'Acces rezervat profesorului.':'Accesul lecției nu a fost modificat.'},r?.error==='unauthorized'?403:400,origin);
  }
  if(body.action==='teacher_lesson2'){
   if(typeof body.studentId!=='string'||typeof body.allowed!=='boolean')return response({error:'Cerere invalidă.'},400,origin);
   const r=await rpc('regat_teacher_lesson2',{p_token:token,p_student_id:body.studentId,p_allowed:body.allowed});
   return r?.ok?response(r,200,origin):response({error:'Acces rezervat profesorului.'},403,origin);
  }
  if(body.action==='teacher_password'){
   if(typeof body.studentId!=='string'||typeof body.password!=='string'||body.password.length<4||body.password.length>128||!(body.currentPassword==null||typeof body.currentPassword==='string'))return response({error:'Verifică numele și noua parolă.'},400,origin);
   const r=await rpc('regat_teacher_password',{p_token:token,p_student_id:body.studentId,p_password:body.password,p_current_password:body.currentPassword??null});
   if(r?.ok)return response({ok:true},200,origin);
   const errors={unauthorized:'Acces rezervat profesorului.',password_length:'Parola elevului trebuie să aibă între 4 și 128 de caractere.',teacher_length:'Parola profesorului trebuie să aibă minimum 12 caractere.',current_password:'Parola ta actuală nu este corectă.',student_missing:'Elevul nu a fost găsit.'};
   return response({error:errors[r?.error]||'Parola nu a fost schimbată.'},r?.error==='unauthorized'?403:400,origin);
  }
  return response({error:'Operațiune necunoscută.'},400,origin);
 }catch{return response({error:'Autentificarea nu este disponibilă momentan. Încearcă din nou.'},503,origin);}
});
