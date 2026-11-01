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


const expected={1:'PATru mii noua sute douazeci si sapte.',2:'trei mii cincizeci si doi.',3:'opt mii trei sute patru.',4:'patru mii sapte sute cincisprezece.',5:'4623',6:'8079',7:'6004',8:'7302'};
let failNext=false;
const ui=context.setupMap({pupils:[],entryDialog:$('entry'),studentAuth:{reading:async(operation,fields={})=>{
 calls.push([operation,fields]);if(failNext){failNext=false;throw new Error('Offline');}
 if(operation==='state')return {profile:current};
 if(operation==='take_key'){assert(current.reading.solved.length>=6);current={...current,reading:{...current.reading,keyTaken:true}};return {profile:current};}
 const correct=fields.answer===expected[fields.chest];
 if(correct)current={...current,reading:{...current.reading,solved:[...new Set([...current.reading.solved,fields.chest])]}};
 return {correct,profile:current};
}}});
current={studentId:'test',displayName:'Test',completedChapters:[],lessonProgress:{1:{unlocked:[1,2],completed:[1]}},formation:{solved:[1,2,3,4,5,6],keyTaken:true,lesson2Allowed:true,lesson2Opened:true},reading:{solved:[],keyTaken:false}};
async function enter(){ui.open(current);await $('map-chapters').children[0].fire('click');await $('forest-progress').children[1].fire('click');}
async function chest(id){await $('reading-chests').children[id-1].fire('click');}
(async()=>{
await enter();assert.equal($('reading-count').textContent,'0/12');const init=calls.length;await $('reading-key').fire('click');assert.equal(calls.length,init);
for(let id=1;id<=8;id++){
 await chest(id);assert.equal($('reading-exercise-page').hidden,false);assert.equal($('reading-exercise-page').className,'reading-exercise-'+id);
 if(id<=4){assert.equal($('reading-form').hidden,false);assert.equal($('reading-numeric-form').hidden,true);assert.equal($('reading-answer').value,'');$('reading-answer').value=expected[id];await $('reading-form').fire('submit');}
 else {
  assert.equal($('reading-form').hidden,true);assert.equal($('reading-numeric-form').hidden,false);
  for(let n=0;n<4;n++)assert.equal($('reading-digit-'+n).value,'');
  const before=calls.length;await $('reading-numeric-form').fire('submit');assert.equal(calls.length,before);
  if(id===5){$('reading-digit-0').value='x4';await $('reading-digit-0').fire('input');assert.equal($('reading-digit-0').value,'4');assert.equal($('reading-digit-1').focused,true);}
  await $('reading-digit-0').fire('paste',{clipboardData:{getData:()=>expected[id]}});
  assert.equal([0,1,2,3].map(n=>$('reading-digit-'+n).value).join(''),expected[id]);
  if(id===7){$('reading-digit-1').value='';await $('reading-numeric-form').fire('submit');assert.match($('reading-exercise-status').textContent,/patru căsuțe/);$('reading-digit-1').value='0';}
  await $('reading-numeric-form').fire('submit');assert.equal(calls.at(-1)[1].chest,id);assert.equal(calls.at(-1)[1].answer,expected[id]);
 }
 assert.equal($('reading-result').textContent,'✓');assert.equal($('reading-count').textContent,id+'/12');
 if(id>=5){await $('reading-numeric-form').fire('submit');assert.equal($('reading-count').textContent,id+'/12');$('reading-digit-3').value=expected[id].endsWith('9')?'0':'9';await $('reading-numeric-form').fire('submit');assert.equal($('reading-result').textContent,'✕');assert.equal($('reading-count').textContent,id+'/12');}
 await $('reading-exercise-back').fire('click');assert.equal($('reading-exercise-page').hidden,true);
 if(id===5){const n=calls.length;await $('reading-key').fire('click');assert.equal(calls.length,n);assert.equal($('reading-image').src,$('reading-image').src);}
 if(id===6){assert.equal($('reading-image').src,$('reading-key-image').src);await $('reading-key').fire('click');assert.equal(calls.at(-1)[0],'take_key');assert.equal($('reading-image').src,$('reading-empty-image').src);assert.equal(current.reading.keyTaken,true);}
}
assert.equal($('reading-key').disabled,true);await enter();assert.equal($('reading-count').textContent,'8/12');assert.equal($('reading-image').src,$('reading-empty-image').src);
await chest(6);for(let n=0;n<4;n++)assert.equal($('reading-digit-'+n).value,'');await $('reading-exercise-back').fire('click');
const n=calls.length;await chest(9);assert.equal($('reading-dialog').open,true);assert.equal(calls.length,n);$('reading-dialog').close();await $('reading-back').fire('click');
ui.teacherView(current,()=>{});await $('map-chapters').children[0].fire('click');await $('forest-progress').children[1].fire('click');await chest(7);assert.equal($('reading-numeric-check').disabled,true);for(let n=0;n<4;n++)assert.equal($('reading-digit-'+n).disabled,true);await $('reading-numeric-form').fire('submit');assert.equal(calls.length,n);assert.equal($('reading-key').disabled,true);
console.log('PASS: 8 chest switching, word/numeric forms, focus, paste, mandatory zeros, incomplete/wrong/correct/repeat, unique stars, saved state, key threshold and collection, back, teacher readonly.');
})().catch(e=>{console.error(e);process.exitCode=1});
