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



let profile={studentId:'qa',displayName:'QA',completedChapters:[1],lessonProgress:{1:{unlocked:[1]}},formation:{solved:[]},reading:{solved:[]}};let fail=false;
const ui=context.setupMap({pupils:[],entryDialog:$('entry'),studentAuth:{addition:async(op,f)=>{calls.push([op,f]);if(fail)throw Error('Offline');if(op==='state')return {profile:structuredClone(profile)};const correct=f.answer==='679';if(correct)profile.lessonProgress[2]={solvedByLesson:{1:[1]}};return {correct,profile:structuredClone(profile)};}}});
async function open(){ui.open(profile);await $('map-chapters').children[1].fire('click');await $('valley-lessons').children[0].fire('click');await $('addition-chests').children[0].fire('click');}
(async()=>{await open();assert.equal($('addition-answer').value,'');assert.equal($('addition-check').disabled,false);let n=calls.length;await $('addition-check').fire('click');assert.equal(calls.length,n);$('addition-answer').value='678';await $('addition-check').fire('click');assert.equal($('addition-answer').className,'incorrect');assert(!profile.lessonProgress[2]);$('addition-answer').value='679';await $('addition-check').fire('click');assert.equal($('addition-answer').className,'correct');assert.match($('map-stars').textContent,/★ 1$/);await $('addition-check').fire('click');assert.match($('map-stars').textContent,/★ 1$/);await $('addition-exercise-back').fire('click');assert.equal($('addition-count').textContent,'1/12');assert.match($('addition-chests').children[0].className,/complete/);await $('addition-chests').children[0].fire('click');assert.equal($('addition-answer').value,'');fail=true;$('addition-answer').value='679';await $('addition-check').fire('click');assert.match($('addition-exercise-status').textContent,/Offline/);assert.equal($('addition-check').disabled,false);console.log('PASS addition: blank/wrong/correct/repeated, single star and totals, reopen, network error.');})().catch(e=>{console.error(e);process.exitCode=1});
