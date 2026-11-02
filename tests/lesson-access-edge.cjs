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
 r=await handler(request({action:'comparison',operation:'take_key'}));assert.equal(r.status,200);assert.equal(calls.at(-1).args.p_action,'take_key');
 n=calls.length;r=await handler(request({action:'comparison',operation:'answer',chest:1,answer:'x'}));assert.equal(r.status,400);assert.equal(calls.length,n);
 r=await handler(request({action:'ordering',operation:'answer',chest:1,answer:[2503,2530,3052,3205]}));assert.equal(r.status,200);assert(calls.at(-1).url.endsWith('/rpc/regat_ordering'));assert.equal(calls.at(-1).args.p_answer,'2503,2530,3052,3205');
 n=calls.length;for(const answer of [[2503,2530],['2503',2530,3052,3205],[null,2530,3052,3205]]){r=await handler(request({action:'ordering',operation:'answer',chest:1,answer}));assert.equal(r.status,400);assert.equal(calls.length,n);}
 r=await handler(request({action:'ordering',operation:'take_key'}));assert.equal(r.status,200);assert.equal(calls.at(-1).args.p_action,'take_key');n=calls.length;
 r=await handler(request({action:'ordering',operation:'state'},null));assert.equal(r.status,401);assert.equal(calls.length,n);
 r=await handler(request({action:'rounding',operation:'answer',chest:1,answer:'50'}));assert.equal(r.status,200);assert(calls.at(-1).url.endsWith('/rpc/regat_rounding'));assert.equal(calls.at(-1).args.p_answer,'50');
 n=calls.length;for(const answer of ['',50,'abc','50.0','123456']){r=await handler(request({action:'rounding',operation:'answer',chest:1,answer}));assert.equal(r.status,400);assert.equal(calls.length,n);}
 r=await handler(request({action:'rounding',operation:'state'},null));assert.equal(r.status,401);assert.equal(calls.length,n);
 r=await handler(request({action:'roman',operation:'answer',chest:2,answer:'14'}));assert.equal(r.status,200);assert(calls.at(-1).url.endsWith('/rpc/regat_roman'));assert.equal(calls.at(-1).args.p_chest,2);
 r=await handler(request({action:'roman',operation:'answer',chest:3,answer:'xx iii'}));assert.equal(r.status,200);assert.equal(calls.at(-1).args.p_answer,'xx iii');n=calls.length;
 for(const answer of ['',null,23,'hello','X'.repeat(33)]){r=await handler(request({action:'roman',operation:'answer',chest:3,answer}));assert.equal(r.status,400);assert.equal(calls.length,n);}
 r=await handler(request({action:'roman',operation:'answer',chest:3,answer:'XXIII'},null));assert.equal(r.status,401);assert.equal(calls.length,n);
 r=await handler(request({action:'roman',operation:'match',chest:5,answer:[6,12,24,31]}));assert.equal(r.status,200);assert.equal(calls.at(-1).args.p_action,'match');assert.equal(calls.at(-1).args.p_answer,'6,12,24,31');n=calls.length;
 for(const answer of [[6,6,24,31],[6,12,24],['6',12,24,31],[6,12,24,40],null]){r=await handler(request({action:'roman',operation:'match',chest:5,answer}));assert.equal(r.status,400);assert.equal(calls.length,n);}
 for(const [chest,answer] of [[9,[7,18,26,39]],[10,[4,13,29,35]],[11,[9,21,32,37]],[12,[14,23,28,36]]]){r=await handler(request({action:'roman',operation:'match',chest,answer}));assert.equal(r.status,200);assert.equal(calls.at(-1).args.p_answer,answer.join(','));}n=calls.length;
 r=await handler(request({action:'roman',operation:'match',chest:4,answer:[6,12,24,31]}));assert.equal(r.status,400);assert.equal(calls.length,n);r=await handler(request({action:'roman',operation:'match',chest:5,answer:[6,12,24,31]},null));assert.equal(r.status,401);assert.equal(calls.length,n);
 for(let chest=1;chest<=12;chest++){r=await handler(request({action:'addition',operation:'answer',chest,answer:'679'}));assert.equal(r.status,200);assert.equal(calls.at(-1).args.p_chest,chest);}
 n=calls.length;for(const chest of [0,13,'1',null,1.5]){r=await handler(request({action:'addition',operation:'answer',chest,answer:'679'}));assert.equal(r.status,400);assert.equal(calls.length,n);}
 r=await handler(request({action:'addition',operation:'answer',chest:12,answer:'8887'},null));assert.equal(r.status,401);assert.equal(calls.length,n);
 console.log('PASS: lesson permission edge routing, scope and typed bounds, anonymous rejection.');
})().catch(e=>{console.error(e);process.exitCode=1});
