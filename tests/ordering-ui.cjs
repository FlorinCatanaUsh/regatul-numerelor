const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Element{
 constructor(id=''){this.id=id;this.hidden=true;this.children=[];this.style={};this.events={};this.attributes={};this.src='assets/'+id+'.webp';this.classList={add(){},remove(){}};}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
 async fire(type,event={}){for(const fn of this.events[type]||[])await fn({preventDefault(){},...event})}
 setAttribute(k,v){this.attributes[k]=v} append(...els){this.children.push(...els)} replaceChildren(...els){this.children=els} querySelector(){return this.children[0]||new Element()} focus(){this.focused=true;} select(){} showModal(){this.open=true} close(){this.open=false;this.fire('close')}
}
const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8'),elements=new Map();for(const m of html.matchAll(/id="([^"]+)"/g)){assert(!elements.has(m[1]),'duplicate id '+m[1]);elements.set(m[1],new Element(m[1]));}
const $=id=>{assert(elements.has(id),'Missing id '+id);return elements.get(id)};
let calls=[];let current;const context={document:{getElementById:$,createElement:()=>new Element(),body:new Element()},window:{scrollTo(){}},setTimeout,console};vm.createContext(context);
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../scripts/map.js'),'utf8').replace('export function','function'),context);



current={studentId:'test',displayName:'Test',completedChapters:[],lessonProgress:{1:{unlocked:[1,4],completed:[],manualAccess:{4:true},orderingSolved:[]}},formation:{solved:[],keyTaken:false},reading:{solved:[],keyTaken:false}};
let fail=false,hold=false,deferred;
const ui=context.setupMap({pupils:[],entryDialog:$('entry'),studentAuth:{ordering:async(operation,fields={})=>{
 calls.push([operation,fields]);if(fail)throw Error('Offline');if(operation==='state'){if(hold)return await new Promise(resolve=>deferred=resolve);return {profile:current};}
 const correct=fields.answer.join(',')===({1:'2503,2530,3052,3205',2:'476,2034,4001,4678'}[fields.chest]);if(correct){current=structuredClone(current);current.lessonProgress[1].orderingSolved=[...new Set([...current.lessonProgress[1].orderingSolved,fields.chest])];}return {correct,profile:current};
}}});
const number=id=>$('ordering-number-'+id),slot=id=>$('ordering-slot-'+id);
async function enter(){ui.open(current);await $('map-chapters').children[0].fire('click');await $('forest-progress').children[3].fire('click');}
async function open(id=1){await $('ordering-chests').children[id-1].fire('click');}
(async()=>{
 await enter();assert.equal($('ordering-count').textContent,'0/12');await open();assert.equal($('ordering-exercise-page').hidden,false);assert.equal($('ordering-check').disabled,false);
 await slot(0).fire('click');assert.match($('ordering-exercise-status').textContent,/mai întâi/);const n=calls.length;await $('ordering-check').fire('click');assert.equal(calls.length,n);assert.match($('ordering-exercise-status').textContent,/toate cele patru/);
 for(let i=0;i<4;i++){await number(i).fire('click');await slot(i).fire('click');assert(number(i).disabled);}
 await $('ordering-check').fire('click');assert.match($('ordering-exercise-status').textContent,/Mai încearcă/);assert.equal($('ordering-count').textContent,'0/12');
 await slot(3).fire('click');await slot(0).fire('click');assert.equal(slot(0).textContent,'2 503');assert.equal(slot(3).textContent,'3 205');
 fail=true;await $('ordering-check').fire('click');assert.match($('ordering-exercise-status').textContent,/Offline/);assert.equal($('ordering-check').disabled,false);fail=false;
 await $('ordering-check').fire('click');assert.equal(calls.at(-1)[1].answer.join(','),'2503,2530,3052,3205');assert.match($('ordering-exercise-status').textContent,/Corect/);assert.equal($('ordering-count').textContent,'1/12');await $('ordering-check').fire('click');assert.equal($('ordering-count').textContent,'1/12');
 await $('ordering-exercise-back').fire('click');assert.equal($('lesson-content-page').hidden,false);assert.match($('ordering-chests').children[0].className,/complete/);await open();assert.equal(slot(0).textContent,'');assert.equal($('ordering-count').textContent,'1/12');
 await number(0).fire('click');await slot(0).fire('click');await number(1).fire('click');await slot(0).fire('click');assert.equal(slot(0).textContent,'2 530');assert.equal(number(0).disabled,false);await $('ordering-exercise-back').fire('click');
 fail=true;await open();assert.equal($('ordering-check').disabled,true);assert.match($('ordering-exercise-status').textContent,/Offline/);fail=false;await $('ordering-exercise-back').fire('click');
 hold=true;const pending=$('ordering-chests').children[0].fire('click');await Promise.resolve();await $('ordering-exercise-back').fire('click');deferred({profile:current});await pending;assert.equal($('ordering-exercise-page').hidden,true);hold=false;
 await open(2);assert.match($('ordering-exercise-image').src,/source-2/);assert.match($('ordering-exercise-image').alt,/4 678.*2 034.*476.*4 001/);assert.equal(slot(0).textContent,'');assert.match(number(2).attributes['aria-label'],/476/);
 for(let i=0;i<4;i++){await number(i).fire('click');await slot(i).fire('click');}await $('ordering-check').fire('click');assert.match($('ordering-exercise-status').textContent,/Mai încearcă/);assert.equal($('ordering-count').textContent,'1/12');
 await slot(2).fire('click');await slot(0).fire('click');await slot(3).fire('click');await slot(2).fire('click');assert.equal(slot(0).textContent,'476');assert.equal(slot(2).textContent,'4 001');assert.equal(slot(3).textContent,'4 678');
 await $('ordering-check').fire('click');assert.equal(calls.at(-1)[1].chest,2);assert.equal(calls.at(-1)[1].answer.join(','),'476,2034,4001,4678');assert.match($('ordering-exercise-status').textContent,/Corect/);assert.equal($('ordering-count').textContent,'2/12');await $('ordering-check').fire('click');assert.equal($('ordering-count').textContent,'2/12');await $('ordering-exercise-back').fire('click');assert.match($('ordering-chests').children[1].className,/complete/);assert.equal($('ordering-chests').children[1].focused,true);
 await open(1);assert.match($('ordering-exercise-image').alt,/3 205.*2 530/);assert.equal(slot(0).textContent,'');assert.equal($('ordering-count').textContent,'2/12');await $('ordering-exercise-back').fire('click');
 const before=calls.length;ui.teacherView(current,()=>{});await $('map-chapters').children[0].fire('click');await $('forest-progress').children[3].fire('click');await $('lesson-preview').fire('click');await open();assert.equal($('ordering-check').disabled,true);for(let i=0;i<4;i++){assert(number(i).disabled);assert(slot(i).disabled);}await number(0).fire('click');await $('ordering-check').fire('click');assert.equal(calls.length,before);
 console.log('PASS ordering UI: selection/move/swap/replacement, incomplete/wrong/correct/repeat, persistent unique star, back/reset, offline and stale response, teacher read-only.');
})().catch(e=>{console.error(e);process.exitCode=1});
