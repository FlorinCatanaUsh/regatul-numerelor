// The only public configuration is an HTTPS API URL. No passwords or server keys.
const studentAuth = (()=>{
 const endpoint='https://npjenlaisjhgyqphnjvm.supabase.co/functions/v1/student-access';
 let token=null;
 async function request(action,fields={}){
  const headers={'Content-Type':'application/json'};if(token)headers.Authorization='Bearer '+token;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
   const r=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({action,...fields}),cache:'no-store',credentials:'omit',signal:controller.signal});
   let result;try{result=await r.json();}catch{throw new Error('Serviciul de autentificare nu răspunde. Încearcă din nou.');}
   if(!r.ok)throw new Error(result.error||'Autentificarea nu a reușit.');
   return result;
  }catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw new Error('Nu mă pot conecta. Verifică internetul și încearcă din nou.');throw error;}
  finally{clearTimeout(timeout);}
 }
 return {
  async login(studentId,password){
   token=null;const r=await request('login',{studentId,password});
   if(typeof r.token!=='string'||r.profile?.studentId!==studentId||r.profile?.authenticated!==true)throw new Error('Răspuns de autentificare invalid.');
   token=r.token;return r.profile;
  },
  async profile(){return (await request('profile')).profile;},
  async teacherLogin(password){token=null;const r=await request('teacher_login',{password});if(typeof r.token!=='string'||r.profile?.role!=='teacher')throw new Error('Răspuns de autentificare invalid.');token=r.token;return r.profile;},
  async students(){return (await request('teacher_students')).students;},
  async addition(operation,fields={}){return await request('addition',{operation,...fields});},
  async carry(operation,fields={}){return await request('carry',{operation,...fields});},
  async operationOrder(operation,fields={}){return await request('operation_order',{operation,...fields});},
  async proof(operation,fields={}){return await request('proof',{operation,...fields});},
  async borrow(operation,fields={}){return await request('borrow',{operation,...fields});},
  async subtraction(operation,fields={}){return await request('subtraction',{operation,...fields});},
  async roman(operation,fields={}){return await request('roman',{operation,...fields});},
  async rounding(operation,fields={}){return await request('rounding',{operation,...fields});},
  async ordering(operation,fields={}){return await request('ordering',{operation,...fields});},
  async comparison(operation,fields={}){return await request('comparison',{operation,...fields});},
  async reading(operation,fields={}){return await request('reading',{operation,...fields});},
  async formation(operation,fields={}){return await request('formation',{operation,...fields});},
  async allowLesson(studentId,lesson,allowed){return await request('teacher_lesson_access',{studentId,lesson,allowed});},
  async allowLesson2(studentId,allowed){return await request('teacher_lesson2',{studentId,allowed});},
  async setPassword(studentId,password,currentPassword=null){return await request('teacher_password',{studentId,password,currentPassword});},
  async logout(){if(!token)return;try{await request('logout');}finally{token=null;}},
  clear(){token=null;}
 };
})();

export {studentAuth};
