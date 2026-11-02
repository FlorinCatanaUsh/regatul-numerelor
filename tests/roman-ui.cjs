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



let profile={studentId:'test',displayName:'QA',completedChapters:[],lessonProgress:{1:{unlocked:[1,6],completed:[],manualAccess:{6:true}}},formation:{solved:[]},reading:{solved:[]}};
let fail=false,pending=null;
const ui=context.setupMap({pupils:[],entryDialog:$('entry'),studentAuth:{roman:async(action,fields)=>{calls.push({action,...fields});if(pending)return await pending;if(fail)throw Error('Offline');if(action==='answer'){const correct=Number(fields.answer)===3;if(correct)profile.lessonProgress[1].romanSolved=[1];return {correct,profile:structuredClone(profile)};}return {profile:structuredClone(profile)};}}});
async function open(){ui.open(profile);await $('map-chapters').children[0].fire('click');await $('forest-progress').children[5].fire('click');await $('roman-chests').children[0].fire('click');}
(async()=>{
 await open();assert.equal($('roman-exercise-page').hidden,false);assert.equal($('rounding-panel').hidden,true);assert.equal($('roman-answer').disabled,false);
 const before=calls.length;await $('roman-check').fire('click');assert.equal(calls.length,before);
 $('roman-answer').value='2';await $('roman-check').fire('click');assert.equal($('roman-answer').className,'incorrect');assert.equal($('roman-count').textContent,'0/12');
 $('roman-answer').value='3';await $('roman-check').fire('click');assert.equal($('roman-answer').className,'correct');assert.equal($('roman-count').textContent,'1/12');assert.equal(calls.at(-1).chest,1);
 await $('roman-check').fire('click');assert.equal($('roman-count').textContent,'1/12');
 await $('roman-exercise-back').fire('click');assert.equal($('roman-exercise-page').hidden,true);assert.equal($('roman-chests').children[0].focused,true);await $('roman-chests').children[0].fire('click');assert.equal($('roman-answer').value,'');
 fail=true;$('roman-answer').value='3';await $('roman-check').fire('click');assert.match($('roman-exercise-status').textContent,/Offline/);assert.equal($('roman-check').disabled,false);fail=false;
 let resolve;pending=new Promise(r=>resolve=r);const inflight=$('roman-check').fire('click');await $('roman-exercise-back').fire('click');resolve({correct:true,profile:structuredClone(profile)});await inflight;pending=null;assert.equal($('roman-exercise-page').hidden,true);
 await $('roman-chests').children[1].fire('click');assert.equal($('roman-dialog').open,true);await $('roman-dialog-return').fire('click');
 const count=calls.length;ui.teacherView(profile,()=>{});await $('map-chapters').children[0].fire('click');await $('forest-progress').children[5].fire('click');await $('lesson-preview').fire('click');await $('roman-chests').children[0].fire('click');assert.equal($('roman-check').disabled,true);assert.equal($('roman-answer').disabled,true);assert.equal(calls.length,count);
 fail=true;await open();assert.equal($('roman-check').disabled,true);assert.match($('roman-exercise-status').textContent,/Offline/);
 console.log('PASS Roman lesson: navigation, blank/wrong/correct/repeated answers, separate progress, reset, unavailable chests, errors, stale responses, teacher read-only.');
})().catch(e=>{console.error(e);process.exitCode=1});
