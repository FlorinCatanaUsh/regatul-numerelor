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




const profile={
 studentId:'test',displayName:'Test pupil',completedChapters:[],
 formation:{solved:[1,2,3,4,5,6],keyTaken:true,lesson2Allowed:false,lesson2Opened:false},
 reading:{solved:[1],keyTaken:true},
 lessonProgress:{1:{completed:[1],manualAccess:{1:false,3:false,4:false,5:false,6:false},comparisonKeyTaken:true,orderingKeyTaken:true,roundingKeyTaken:true}}
};
const ui=context.setupMap({pupils:[],entryDialog:$('entry'),studentAuth:{
 formation:async operation=>{
  if(operation==='open_lesson2')return {profile:{...profile,formation:{...profile.formation,lesson2Opened:true}}};
  return {profile};
 },
 reading:async()=>({profile})
}});
async function enterForest(current){
 ui.open(current);
 await $('map-chapters').children[0].fire('click');
}
(async()=>{
 await enterForest(profile);
 assert.match($('forest-progress').children[0].attributes['aria-label'],/parcursă/);
 for(const tile of $('forest-progress').children.slice(2))assert.match(tile.attributes['aria-label'],/deblocată/);
 assert.match($('forest-progress').children[1].attributes['aria-label'],/blocată/);
 await $('forest-lessons').children.find(button=>button.className==='lesson-lock').fire('click');
 assert.match($('forest-progress').children[1].attributes['aria-label'],/deblocată/);
 assert.equal($('forest-lessons').children.some(button=>button.className==='lesson-lock'),false);

 await enterForest({...profile,formation:{...profile.formation,keyTaken:false},reading:{keyTaken:false},lessonProgress:{1:{manualAccess:{2:true,3:true,4:true,5:true,6:true},unlocked:[1,2,3,4,5,6]}}});
 for(const tile of $('forest-progress').children.slice(1))assert.match(tile.attributes['aria-label'],/blocată/);
 await $('forest-progress').children[2].fire('click');
 assert.match($('lesson-message').textContent,/cheia din lecția precedentă/);
 assert.equal($('lesson-preview').hidden,true);
 await $('lesson-close').fire('click');

 ui.teacherView(profile,()=>{});
 await $('map-chapters').children[0].fire('click');
 await $('forest-progress').children[1].fire('click');
 assert.equal($('lesson-preview').hidden,false);
 assert.equal(elements.has('lesson-access-controls'),false);
 await $('lesson-preview').fire('click');
 assert.equal($('reading-page').hidden,false);
 assert.equal($('reading-count').textContent,'1/12');
 console.log('PASS: keys gate access, former approvals are ignored, saved stars appear in teacher preview.');
})().catch(error=>{console.error(error);process.exitCode=1});
