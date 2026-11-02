const fs=require('fs'),vm=require('vm'),assert=require('assert');
class Element{
 constructor(id=''){this.id=id;this.hidden=true;this.children=[];this.style={setProperty(k,v){this[k]=v;}};this.events={};this.attributes={};this.src='assets/'+id+'.webp';this.classList={add(){},remove(){}};}
 addEventListener(type,fn){(this.events[type]??=[]).push(fn)}
 async fire(type,event={}){for(const fn of this.events[type]||[])await fn({preventDefault(){},...event})}
 setAttribute(k,v){this.attributes[k]=v} append(...els){this.children.push(...els)} replaceChildren(...els){this.children=els} querySelector(){return this.children[0]||new Element()} focus(){this.focused=true;} select(){} showModal(){this.open=true} close(){this.open=false;this.fire('close')}
}
const html=fs.readFileSync(require('path').join(__dirname,'../index.html'),'utf8'),elements=new Map();for(const m of html.matchAll(/id="([^"]+)"/g)){assert(!elements.has(m[1]),'duplicate id '+m[1]);elements.set(m[1],new Element(m[1]));}
const $=id=>{assert(elements.has(id),'Missing id '+id);return elements.get(id)};
let calls=[];let current;const context={document:{getElementById:$,createElement:()=>new Element(),createElementNS:()=>new Element(),body:new Element()},window:{scrollTo(){}},setTimeout,console};vm.createContext(context);
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../scripts/map.js'),'utf8').replace('export function','function'),context);



let profile={studentId:'test',displayName:'QA',completedChapters:[],lessonProgress:{1:{unlocked:[1,6],completed:[],manualAccess:{6:true},romanSolved:[1,2,3,4]}},formation:{solved:[]},reading:{solved:[]}};
let fail=false,pending=null;
const expected={5:[6,12,24,31],6:[4,19,27,35],7:[9,16,29,38],8:[14,22,34,39],9:[7,18,26,39],10:[4,13,29,35],11:[9,21,32,37],12:[14,23,28,36]},choices={5:[24,9,31,6,12],6:[27,35,14,19,4],7:[16,29,38,9,26],8:[39,24,14,34,22],9:[26,7,34,39,18],10:[35,19,4,29,13],11:[32,9,37,24,21],12:[28,36,14,33,23]};
const ui=context.setupMap({pupils:[],entryDialog:$('entry'),studentAuth:{roman:async(action,fields)=>{calls.push({action,...fields});if(pending)return await pending;if(fail)throw Error('Offline');if(action==='match'){const matches=fields.answer.map((v,i)=>v===expected[fields.chest][i]),correct=matches.every(Boolean);if(correct)profile.lessonProgress[1].romanSolved=[...new Set([...profile.lessonProgress[1].romanSolved,fields.chest])];return {correct,matches,profile:structuredClone(profile)};}return {profile:structuredClone(profile)};}}});
async function start(){ui.open(profile);await $('map-chapters').children[0].fire('click');await $('forest-progress').children[5].fire('click');}
async function pair(i,j){await $('roman-match-romans').children[i].fire('click');await $('roman-match-arabic').children[j].fire('click');}
(async()=>{
 await start();
 for(let chest=5;chest<=12;chest++){
  await $('roman-chests').children[chest-1].fire('click');assert.equal($('roman-match-page').hidden,false);assert.equal($('roman-match-romans').children.length,4);assert.equal($('roman-match-arabic').children.length,5);assert.equal($('roman-match-check').disabled,false);assert.equal($('roman-exercise-page').hidden,true);
  if(chest>=9){assert.equal($('roman-match-romans').children[0].children[0].textContent,expected[chest][0]);assert.match($('roman-match-arabic').children[0].children[0].textContent,/^[IVX]+$/);assert.match($('roman-match-status').textContent,/număr arab, apoi numărul roman/);}
  let n=calls.length;await $('roman-match-check').fire('click');assert.equal(calls.length,n);await $('roman-match-arabic').children[0].fire('click');assert.equal($('roman-match-lines').children.length,0);
  await pair(0,0);await pair(1,0);assert.equal($('roman-match-lines').children.length,1);await $('roman-match-undo').fire('click');assert.match($('roman-match-romans').children[0].attributes['aria-label'],/asociat/);assert.match($('roman-match-romans').children[1].attributes['aria-label'],/fără/);await $('roman-match-reset').fire('click');assert.equal($('roman-match-lines').children.length,0);
  for(let i=0;i<4;i++)await pair(i,choices[chest].indexOf(expected[chest][i]));assert.equal($('roman-match-lines').children.length,4);
  const extra=choices[chest].findIndex(v=>!expected[chest].includes(v));await pair(0,extra);await $('roman-match-check').fire('click');assert.equal(calls.at(-1).action,'match');assert.match($('roman-match-romans').children[0].className,/incorrect/);assert.equal($('roman-count').textContent,(chest-1)+'/12');
  await pair(0,choices[chest].indexOf(expected[chest][0]));await $('roman-match-check').fire('click');assert.match($('roman-match-romans').children[0].className,/correct/);assert.equal($('roman-count').textContent,chest+'/12');await $('roman-match-check').fire('click');assert.equal($('roman-count').textContent,chest+'/12');
  await $('roman-match-back').fire('click');assert.equal($('roman-chests').children[chest-1].focused,true);await $('roman-chests').children[chest-1].fire('click');assert.equal($('roman-match-lines').children.length,0);await $('roman-match-back').fire('click');
 }
 await $('roman-chests').children[4].fire('click');for(let i=0;i<4;i++)await pair(i,choices[5].indexOf(expected[5][i]));fail=true;await $('roman-match-check').fire('click');assert.match($('roman-match-status').textContent,/Offline/);assert.equal($('roman-match-check').disabled,false);fail=false;
 let resolve;pending=new Promise(r=>resolve=r);const inflight=$('roman-match-check').fire('click');await $('roman-match-back').fire('click');resolve({correct:true,matches:[true,true,true,true],profile:structuredClone(profile)});await inflight;pending=null;assert.equal($('roman-match-page').hidden,true);
 let count=calls.length;ui.teacherView(profile,()=>{});await $('map-chapters').children[0].fire('click');await $('forest-progress').children[5].fire('click');await $('lesson-preview').fire('click');await $('roman-chests').children[4].fire('click');assert.equal($('roman-match-check').disabled,true);assert.equal($('roman-match-romans').children[0].disabled,true);assert.equal(calls.length,count);
 fail=true;await start();await $('roman-chests').children[4].fire('click');assert.equal($('roman-match-check').disabled,true);assert.match($('roman-match-status').textContent,/Offline/);
 console.log('PASS matching 5–12: extra choices, one-to-one pairing, lines, undo/reset, wrong/correct answers, server scoring, unique stars, re-entry, stale responses, errors, teacher preview.');
})().catch(e=>{console.error(e);process.exitCode=1});
