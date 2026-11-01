const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
class Element{
 constructor(id=''){this.id=id;this.hidden=true;this.children=[];this.style={};this.events={};this.attributes={};this.classList={add(){},remove(){}};}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn)}async fire(k,e={}){for(const fn of this.events[k]||[])await fn({preventDefault(){},...e})}
 setAttribute(k,v){this.attributes[k]=v}append(...v){this.children.push(...v)}replaceChildren(...v){this.children=v}focus(){this.focused=true}showModal(){this.open=true}close(){this.open=false}querySelector(){return this.children[0]}scrollIntoView(){}
}
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),els=new Map();for(const m of html.matchAll(/id="([^"]+)"/g)){assert(!els.has(m[1]),'duplicate '+m[1]);els.set(m[1],new Element(m[1]));}const $=id=>{assert(els.has(id),id);return els.get(id)};
const ctx={document:{getElementById:$,createElement:()=>new Element(),body:new Element()},window:{scrollTo(){}},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../scripts/teacher.js'),'utf8').replace('export function','function'),ctx);
let profiles=[{studentId:'student-01',displayName:'One',formation:{solved:[1,2,3,4,5,6],keyTaken:true,lesson2Allowed:false}},{studentId:'student-02',displayName:'Two',formation:{solved:[],keyTaken:false,lesson2Allowed:false}}],calls=[],classViews=[],permissionViews=[],fail=false,fetchFail=false,individualView;
const ui=ctx.setupTeacher({studentAuth:{students:async()=>{if(fetchFail)throw Error('Offline');return structuredClone(profiles)},allowLesson2:async(id,allowed)=>{calls.push([id,allowed]);if(fail)throw Error('Offline');profiles=profiles.map(p=>id==='all'||p.studentId===id?{...p,formation:{...p.formation,lesson2Allowed:allowed}}:p);return id==='all'?{affected:profiles.length,allowed}:{profile:structuredClone(profiles.find(p=>p.studentId===id))}},logout:async()=>{}},mapUI:{classView:(p,back)=>classViews.push([p,back]),teacherView:(p)=>individualView=p,updateClassPermission:p=>permissionViews.push(p)}});
(async()=>{
 await ui.open({role:'teacher'});assert.equal($('teacher-page').hidden,false);assert.equal($('teacher-workspace').hidden,false);assert.equal($('teacher-students').children.length,2);assert.equal($('teacher-class-controls').hidden,true);
 await $('teacher-tab-class').fire('click');assert.equal($('teacher-page').hidden,true);assert.equal($('teacher-class-controls').hidden,false);assert.equal($('teacher-tab-class').attributes['aria-selected'],'true');assert.equal(classViews.at(-1)[0].lesson2Allowed,false);assert.equal(calls.length,0);
 await $('teacher-class-allow').fire('click');assert.deepEqual(calls,[['all',true]]);assert(profiles.every(p=>p.formation.lesson2Allowed));assert.equal(profiles[1].formation.keyTaken,false);assert.equal($('teacher-class-allow').disabled,true);assert.equal($('teacher-class-block').disabled,false);assert.match($('teacher-class-status').textContent,/2 elevi/);
 await $('teacher-class-block').fire('click');assert.deepEqual(calls.at(-1),['all',false]);assert(profiles.every(p=>!p.formation.lesson2Allowed));assert.equal($('teacher-class-block').disabled,true);
 fail=true;await $('teacher-class-allow').fire('click');assert.match($('teacher-class-status').textContent,/Offline/);assert.equal($('teacher-class-allow').disabled,false);assert(profiles.every(p=>!p.formation.lesson2Allowed));fail=false;
 await $('teacher-tab-individual').fire('click');assert.equal($('teacher-page').hidden,false);assert.equal($('teacher-class-controls').hidden,true);
 await $('teacher-students').children[0].children[4].fire('click');assert.deepEqual(calls.at(-1),['student-01',true]);assert.equal(profiles[1].formation.lesson2Allowed,false);
 await $('teacher-students').children[0].children[2].fire('click');assert.equal(individualView.studentId,'student-01');
 await $('teacher-tab-individual').fire('keydown',{key:'ArrowRight'});assert.equal($('teacher-tab-class').attributes['aria-selected'],'true');assert.equal($('reading-exercise-page').hidden,true);
 fetchFail=true;await $('teacher-reload').fire('click');assert.equal($('teacher-class-allow').disabled,true);assert.equal($('teacher-class-block').disabled,true);fetchFail=false;await $('teacher-reload').fire('click');assert.equal($('teacher-class-allow').disabled,false);
 await $('teacher-logout').fire('click');assert.equal($('teacher-workspace').hidden,true);assert.equal($('teacher-page').hidden,true);
 console.log('PASS: individual/class tabs, class map without pupil selection, one bulk call, allow/block, individual isolation, key preserved, error/reload, keyboard, logout.');
})().catch(e=>{console.error(e);process.exitCode=1});
