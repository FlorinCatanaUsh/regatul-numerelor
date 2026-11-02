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



let profile={studentId:'test',displayName:'QA',completedChapters:[],lessonProgress:{1:{unlocked:[1,5],completed:[],manualAccess:{5:true}}},formation:{solved:[]},reading:{solved:[]}};
let fail=false,pending=null;
const ui=context.setupMap({pupils:[],entryDialog:$('entry'),studentAuth:{rounding:async(action,fields)=>{calls.push({action,...fields});if(pending)return await pending;if(fail)throw Error('Offline');if(action==='answer'){const correct=Number(fields.answer)===({1:50,2:460})[fields.chest];if(correct)profile.lessonProgress[1].roundingSolved=[...new Set([...(profile.lessonProgress[1].roundingSolved||[]),fields.chest])];return {correct,profile:structuredClone(profile)};}return {profile:structuredClone(profile)};}}});
async function open(){ui.open(profile);await $('map-chapters').children[0].fire('click');await $('forest-progress').children[4].fire('click');await $('rounding-chests').children[0].fire('click');}
(async()=>{
 await open();assert.equal($('rounding-exercise-page').hidden,false);assert.equal($('rounding-answer').disabled,false);assert.equal(calls.at(-1).action,'state');
 let count=calls.length;await $('rounding-check').fire('click');assert.equal(calls.length,count);assert.match($('rounding-exercise-status').textContent,/Scrie/);
 $('rounding-answer').value='40';await $('rounding-check').fire('click');assert.equal($('rounding-answer').className,'incorrect');assert.equal($('rounding-count').textContent,'0/12');
 $('rounding-answer').value='50';await $('rounding-check').fire('click');assert.equal($('rounding-answer').className,'correct');assert.equal($('rounding-count').textContent,'1/12');assert.equal($('rounding-key').disabled,true);
 await $('rounding-check').fire('click');assert.equal($('rounding-count').textContent,'1/12');
 fail=true;await $('rounding-check').fire('click');assert.match($('rounding-exercise-status').textContent,/Offline/);assert.equal($('rounding-check').disabled,false);fail=false;
 await $('rounding-exercise-back').fire('click');assert.equal($('rounding-exercise-page').hidden,true);assert.equal($('rounding-chests').children[0].focused,true);await $('rounding-chests').children[0].fire('click');assert.equal($('rounding-answer').value,'');
 await $('rounding-exercise-back').fire('click');await $('rounding-chests').children[1].fire('click');assert.match($('rounding-exercise-image').src,/source-2/);assert.match($('rounding-answer').attributes['aria-label'],/464/);assert.match($('rounding-exercise-page').attributes['aria-label'],/lădița 2/);
 $('rounding-answer').value='470';await $('rounding-check').fire('click');assert.equal($('rounding-answer').className,'incorrect');assert.equal($('rounding-count').textContent,'1/12');
 $('rounding-answer').value='460';await $('rounding-check').fire('click');assert.equal(calls.at(-1).chest,2);assert.equal($('rounding-answer').className,'correct');assert.equal($('rounding-count').textContent,'2/12');await $('rounding-check').fire('click');assert.equal($('rounding-count').textContent,'2/12');await $('rounding-exercise-back').fire('click');assert.equal($('rounding-chests').children[1].focused,true);await $('rounding-chests').children[0].fire('click');assert.match($('rounding-answer').attributes['aria-label'],/47 rotunjit/);assert.match($('rounding-exercise-image').src,/rounding-exercise-image/);
 let resolve;pending=new Promise(r=>resolve=r);const request=$('rounding-check');$('rounding-answer').value='50';const inflight=request.fire('click');await $('rounding-exercise-back').fire('click');resolve({correct:true,profile:structuredClone(profile)});await inflight;pending=null;assert.equal($('rounding-exercise-page').hidden,true);
 count=calls.length;ui.teacherView(profile,()=>{});await $('map-chapters').children[0].fire('click');await $('forest-progress').children[4].fire('click');await $('lesson-preview').fire('click');await $('rounding-chests').children[0].fire('click');assert.equal($('rounding-check').disabled,true);assert.equal($('rounding-answer').disabled,true);assert.equal(calls.length,count);await $('rounding-exercise-back').fire('click');await $('rounding-chests').children[1].fire('click');assert.match($('rounding-answer').attributes['aria-label'],/464/);assert.equal($('rounding-check').disabled,true);assert.equal(calls.length,count);await $('rounding-exercise-back').fire('click');await $('rounding-back-sign').fire('click');assert.equal($('forest-page').hidden,false);
 fail=true;await open();assert.equal($('rounding-check').disabled,true);assert.match($('rounding-exercise-status').textContent,/Offline/);
 console.log('PASS rounding: written answer, blank/wrong/correct/repeated answers, persisted unique star, unavailable key, back/reset, network errors, stale response and read-only teacher preview.');
})().catch(e=>{console.error(e);process.exitCode=1});
