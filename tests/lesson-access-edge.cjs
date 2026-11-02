const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
let handler,calls=[];
const ctx={Request,Response,Set,JSON,Number,Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://test.invalid':'test-only'},serve:fn=>handler=fn},fetch:async(url,opts)=>{calls.push({url,args:JSON.parse(opts.body)});return new Response(JSON.stringify({ok:true,affected:21,allowed:true}),{status:200})}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../backend/student-access.js'),'utf8'),ctx);
const request=(body,token='a'.repeat(64))=>new Request('https://test.invalid/functions/v1/student-access',{method:'POST',headers:{Origin:'https://florvision.fun','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
(async()=>{
 let r=await handler(request({action:'teacher_lesson_access',studentId:'all',lesson:3,allowed:true}));assert.equal(r.status,200);assert.equal((await r.json()).affected,21);assert(calls.at(-1).url.endsWith('/rpc/regat_teacher_lesson_access'));assert.deepEqual(calls.at(-1).args,{p_token:'a'.repeat(64),p_student_id:'all',p_lesson:3,p_allowed:true});
 let n=calls.length;r=await handler(request({action:'teacher_lesson_access',studentId:'all',lesson:7,allowed:true}));assert.equal(r.status,400);assert.equal(calls.length,n);
 r=await handler(request({action:'teacher_lesson_access',studentId:'all',lesson:3,allowed:true},null));assert.equal(r.status,401);assert.equal(calls.length,n);
 r=await handler(request({action:'teacher_lesson_access',studentId:'student-01',lesson:1,allowed:false}));assert.equal(r.status,200);assert.equal(calls.at(-1).args.p_student_id,'student-01');assert.equal(calls.at(-1).args.p_allowed,false);
 r=await handler(request({action:'comparison',operation:'answer',chest:1,answer:'<'}));assert.equal(r.status,200);assert(calls.at(-1).url.endsWith('/rpc/regat_comparison'));assert.equal(calls.at(-1).args.p_answer,'<');
 n=calls.length;r=await handler(request({action:'comparison',operation:'answer',chest:1,answer:'x'}));assert.equal(r.status,400);assert.equal(calls.length,n);
 console.log('PASS: lesson permission edge routing, scope and typed bounds, anonymous rejection.');
})().catch(e=>{console.error(e);process.exitCode=1});
