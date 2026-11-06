export function setupMap({pupils,getSelectedId,entryDialog:dialog,studentAuth}) {
const $=id=>document.getElementById(id);
// The map consumes progress; it never awards completion from a click.
const chapters = [
 {id:1,title:'Pădurea numerelor fermecate',description:'Numerele naturale de la 0 la 10 000.',box:[4,37,23,13]},
 {id:2,title:'Valea adunării și scăderii',description:'Adunarea și scăderea numerelor naturale până la 10 000.',box:[31,37,18,13]},
 {id:3,title:'Munții înmulțirii',description:'Înmulțirea numerelor naturale.',box:[56,36,17,13]},
 {id:4,title:'Râul împărțirii',description:'Împărțirea numerelor naturale.',box:[79,26,17,11]},
 {id:5,title:'Cetatea marilor probleme',description:'Probleme cu cele patru operații.',box:[79,52,18,12]},
 {id:6,title:'Insula fracțiilor fermecate',description:'Fracții.',box:[51,62,20,12]},
 {id:7,title:'Templul formelor magice',description:'Elemente de geometrie.',box:[28,62,20,11]},
 {id:8,title:'Orașul măsurătorilor',description:'Unități de măsură.',box:[9,70,18,10]}
];
const chapterTrophies=[
 ['Cristalul pădurii','cristalul-padurii.webp'],
 ['Comoara văii','trofeu-capitol-2.webp'],
 ['Cristalul muntelui','trofeu-capitol-3.webp'],
 ['Perla râului','trofeu-capitol-4.webp'],
 ['Sigiliul cetății','trofeu-capitol-5.webp'],
 ['Medalionul fracțiilor','trofeu-capitol-6.webp'],
 ['Totemul formelor','trofeu-capitol-7.webp'],
 ['Clepsidra timpului','trofeu-capitol-8.webp']
];
let mapProfile = null;
let teacherMapReturn=null;
let teacherClassMode=false;
let activeLesson=null;
function showChapter(chapter) {
 if(chapter.id===1){openForest();return;}
 if(chapter.id===2&&(chapterRevealed(2)||teacherMapReturn)){openValley();return;}
 if(chapter.id===3&&(chapterRevealed(3)||teacherMapReturn)){openMountains();return;}
 $('chapter-back').textContent='Înapoi la hartă';
 const complete = mapProfile.completedChapters.includes(chapter.id);
 $('chapter-title').textContent=chapter.id+'. '+chapter.title;
 $('chapter-description').textContent=chapter.description;
 $('chapter-access').textContent=complete?'Capitol parcurs. Exersarea va rămâne disponibilă după activarea conținutului.':'Acest capitol este încă închis. Parcurge capitolul precedent pentru a înainta.';
 $('chapter-dialog').showModal();$('chapter-close').focus();
}
function starCount(values){return new Set((Array.isArray(values)?values:[]).filter(id=>Number.isInteger(id)&&id>=1&&id<=12)).size;}
function chapterStars(profile,id){
 const p=profile.lessonProgress?.[id]||{};
 if(id===1)return starCount(profile.formation?.solved)+starCount(profile.reading?.solved)+['comparisonSolved','orderingSolved','roundingSolved','romanSolved'].reduce((sum,key)=>sum+starCount(p[key]),0);
 return Object.values(p.solvedByLesson||{}).reduce((sum,solved)=>sum+starCount(solved),0);
}
function renderStars(){
 const total=Array.from({length:8},(_,i)=>chapterStars(mapProfile,i+1)).reduce((a,b)=>a+b,0);
 $('map-stars').textContent='STELUȚELE MELE · ★ '+total;
 $('forest-stars').textContent='STELUȚELE MELE · ★ '+chapterStars(mapProfile,1);
}
const valleyLessons=['Adunarea fără trecere peste ordin','Scăderea fără trecere peste ordin','Adunarea cu trecere peste ordin','Scăderea cu trecere peste ordin','Proba adunării și a scăderii','Ordinea efectuării operațiilor','Aflarea numărului necunoscut'];
const valleyKeyPages=['addition','subtraction','carry','borrow','proof','operation-order'];
function openValleyLesson(id){
 const open=[openAddition,openSubtraction,openCarryLesson,openBorrowLesson,openProofLesson];
 if(id<=open.length)open[id-1]();
 else openValleyPracticeLesson(id);
}
function renderValleyKey(lesson){
 const page=valleyKeyPages[lesson-1];
 const button=$(page+'-key');
 const progress=mapProfile.lessonProgress?.[2];
 const taken=progress?.keysTaken?.[lesson]===true;
 button.hidden=!taken&&starCount(progress?.solvedByLesson?.[lesson])<6;
 button.disabled=!!teacherMapReturn;
 button.className=taken?'valley-key collected':'valley-key';
 const label=taken?'Cheie colectată. Mergi la lecția '+(lesson+1):'Ia cheia lecției '+(lesson+1);
 button.setAttribute('aria-label',label);
 button.title=label;
 button.textContent=taken?'✓':'';
 $(page+'-key-status').textContent='';
}
valleyKeyPages.forEach((page,index)=>{
 const lesson=index+1;
 const button=$(page+'-key');
 button.addEventListener('click',async()=>{
  if(button.hidden||button.disabled||teacherMapReturn)return;
  const profile=mapProfile;
  const progress=profile.lessonProgress[2];
  if(progress.keysTaken?.[lesson]){openValley();openValleyLesson(lesson+1);return;}
  const status=$(page+'-key-status');
  button.disabled=true;
  try{
   await studentAuth.takeValleyKey(lesson);
   if(mapProfile?.studentId!==profile.studentId||teacherMapReturn)return;
   mapProfile.lessonProgress[2].keysTaken??={};
   mapProfile.lessonProgress[2].keysTaken[lesson]=true;
   renderValleyKey(lesson);
   status.textContent='Cheia lecției '+(lesson+1)+' a fost salvată.';
  }catch(error){
   if(mapProfile?.studentId!==profile.studentId||teacherMapReturn)return;
   status.textContent=error.message;
   button.disabled=false;
  }
 });
});
function openValley(){
 $('addition-page').hidden=true;
 $('subtraction-page').hidden=true;
 $('carry-page').hidden=true;
 $('borrow-page').hidden=true;
 $('proof-page').hidden=true;
 $('operation-order-page').hidden=true;
 $('unknown-number-page').hidden=true;
 $('map-page').hidden=true;$('forest-page').hidden=true;$('valley-page').hidden=false;
 $('valley-student').textContent=mapProfile.displayName;$('valley-stars').textContent=String(chapterStars(mapProfile,2));
 $('valley-lessons').replaceChildren();$('valley-progress').replaceChildren();
 const boxes=[[21.5,41,15,17],[43.5,43,15,17],[61.5,44,15,17],[19.5,59,15,18],[38,61,15,18],[56,63,13,18],[72,62,14,18]];
 valleyLessons.forEach((title,i)=>{const id=i+1,b=document.createElement('button');b.type='button';b.className='valley-lesson';b.setAttribute('aria-label',id+'. '+title);const [left,top,width,height]=boxes[i];Object.assign(b.style,{left:left+'%',top:top+'%',width:width+'%',height:height+'%'});const show=()=>openValleyLesson(id);b.addEventListener('click',show);$('valley-lessons').append(b);const tile=document.createElement('button');tile.type='button';tile.className='valley-tile';tile.textContent=String(id);tile.setAttribute('aria-label','Lecția '+id+' — '+title);Object.assign(tile.style,{left:(i<4?[79.5,83,86.5,90][i]:[81,84.6,88.2][i-4])+'%',top:(i<4?9.8:16)+'%',width:'3%',height:'5%'});tile.addEventListener('click',show);$('valley-progress').append(tile);});
 // The original illustration has older lettering on signs 5–7.
 for (const id of [5,6,7]) {
  const label=document.createElement('span');
  label.className='valley-updated-title valley-updated-title-'+id;
  label.setAttribute('aria-hidden','true');
  label.textContent=valleyLessons[id-1];
  $('valley-lessons').append(label);
 }
 $('valley-summary').textContent='0 din 7 lecții parcurse. '+chapterStars(mapProfile,2)+' steluțe în acest capitol. Exercițiile vor fi adăugate pe rând.';
 $('valley-back').focus();window.scrollTo(0,0);
}
const mountainLessons=[
 ['Proprietățile înmulțirii',[16.7,37.5,17.5,17]],
 ['Proba înmulțirii',[40,37.5,16,17]],
 ['Înmulțirea cu 10, 100 sau 1 000',[64,37.5,17,17]],
 ['Înmulțirea a două numere de o cifră',[17.8,54.5,17,17]],
 ['Înmulțirea unui număr de două cifre cu un număr de o cifră',[40.3,54.5,16,17]],
 ['Înmulțirea unui număr de trei cifre cu un număr de o cifră',[62.8,54.5,17.5,17]],
 ['Înmulțirea a două numere de două cifre',[31.5,71.6,17.5,18]],
 ['Înmulțirea unui număr de trei cifre cu un număr de două cifre',[54.7,71.6,17,18]]
];
function openMountains(){
 $('map-page').hidden=true;
 $('mountains-page').hidden=false;
 const stars=chapterStars(mapProfile,3);
 const completed=mapProfile.lessonProgress?.[3]?.completed||[];
 $('mountains-student').textContent=mapProfile.displayName;
 $('mountains-stars').textContent=String(stars);
 $('mountains-summary').textContent=mountainLessons.filter((_,i)=>completed.includes(i+1)).length+' din 8 lecții parcurse. '+stars+' steluțe în acest capitol.';
 $('mountains-lessons').replaceChildren();
 $('mountains-progress').replaceChildren();
 mountainLessons.forEach(([title,box],i)=>{
  const id=i+1;
  const showLesson=()=>{
   $('chapter-title').textContent=id+'. '+title;
   $('chapter-description').textContent='Capitolul III · Munții Înmulțirii';
   $('chapter-access').textContent='Exercițiile acestei lecții sunt în pregătire.';
   $('chapter-back').textContent='Înapoi la lecții';
   $('chapter-dialog').showModal();
   $('chapter-close').focus();
  };
  const sign=document.createElement('button');
  sign.type='button';
  sign.className='valley-lesson';
  sign.setAttribute('aria-label',id+'. '+title);
  const [left,top,width,height]=box;
  Object.assign(sign.style,{left:left+'%',top:top+'%',width:width+'%',height:height+'%'});
  sign.addEventListener('click',showLesson);
  $('mountains-lessons').append(sign);
  const tile=document.createElement('button');
  tile.type='button';
  tile.className='valley-tile'+(completed.includes(id)?' complete':'');
  tile.textContent=String(id);
  tile.setAttribute('aria-label','Lecția '+id+' — '+title+(completed.includes(id)?' — parcursă':''));
  Object.assign(tile.style,{left:(81.65+(i%4)*3.43)+'%',top:(i<4?8.97:15.08)+'%'});
  tile.addEventListener('click',showLesson);
  $('mountains-progress').append(tile);
 });
 $('mountains-back').focus();
 window.scrollTo(0,0);
}
for(const id of ['mountains-back','mountains-back-sign'])$(id).addEventListener('click',()=>{
 $('mountains-page').hidden=true;
 $('map-page').hidden=false;
 renderMap(mapProfile);
 $('map-chapters').children[2]?.focus();
 window.scrollTo(0,0);
});
const proofRows=[1,2].map(i=>({
 left:$('proof-left-'+i),sign:$('proof-sign-'+i),
 right:$('proof-right-'+i),result:$('proof-result-'+i)
}));
function proofNumbers({left,right,sign}){
 if(!/^\d{1,3}$/.test(left.value)||!/^\d{1,3}$/.test(right.value)||!['+','-'].includes(sign.value))return null;
 return [+left.value,sign.value,+right.value];
}
for(const row of proofRows){
 const calculate=()=>{
  if(row.result.hidden)return;
  const values=proofNumbers(row);
  row.result.textContent=values?String(values[1]==='+'?values[0]+values[2]:values[0]-values[2]):'—';
 };
 row.left.addEventListener('input',calculate);
 row.right.addEventListener('input',calculate);
 row.sign.addEventListener('change',calculate);
}
const proofExercises={1:[27,15],2:[274,158],3:[578,302],4:[578,302],5:[453,467,910],6:[453,467,920],7:[745,426,319],8:[587,428,161],9:[368,257,625],10:[486,275,751],11:[834,267,567],12:[902,458,454]};
const subtractionChests=[3,4,7,8,11,12];
const subtractionProofInputs=['proof-add-left','proof-add-right','proof-add-result'].map($);
let proofRevision=0,proofBusy=false,activeProofChest=1;
function openProofExercise(number){
 activeProofChest=number;
 const [left,right,givenResult]=proofExercises[number];
 $('proof-chest-title').textContent=number;
 $('proof-chest-title').setAttribute('aria-label','Lădița '+number);
 const subtraction=subtractionChests.includes(number);
 const hasGivenResult=givenResult!==undefined;
 const verifyGivenSum=hasGivenResult&&!subtraction;
 $('proof-row-1-label').textContent=verifyGivenSum?'Probă:':'Proba 1:';
 const checkBySubtraction=[4,8,12].includes(number);
 $('proof-fixed-sign').textContent=checkBySubtraction?'−':'+';
 $('proof-operation').textContent=left+(subtraction?' − ':' + ')+right+' =';
 $('proof-sum').setAttribute('aria-label',subtraction?'Diferența':'Suma');
 $('proof-sum').hidden=hasGivenResult;
 $('proof-given-result').hidden=!hasGivenResult;
 $('proof-given-result').textContent=givenResult??'';
 $('proof-result-1').hidden=verifyGivenSum;
 for(const id of ['proof-verdict','proof-written-result']){
  const field=$(id);
  const visible=verifyGivenSum||(hasGivenResult&&id==='proof-verdict');
  field.hidden=!visible;
  field.disabled=!visible||!!teacherMapReturn;
  field.value='';
 }
 $('proof-title').textContent=hasGivenResult&&checkBySubtraction?'Verifică prin scădere dacă exercițiul următor a fost rezolvat corect:':hasGivenResult&&subtraction?'Verifică prin adunare dacă exercițiul următor a fost rezolvat corect:':verifyGivenSum?'Verifică prin probă dacă exercițiul următor a fost rezolvat corect:':checkBySubtraction?'Rezolvă scăderea și verifică prin scădere:':subtraction?'Rezolvă scăderea și verifică prin adunare:':'Rezolvă și verifică prin cele două probe ale adunării';
 $('proof-hint').textContent=checkBySubtraction?'Indiciu: La proba prin scădere caută prima dată numărul cel mai mare!':subtraction?'Indiciu: La proba prin adunare caută întotdeauna numerele cele mai mici.':'Indiciu: Proba adunării se realizează prin scădere.';
 $('proof-row-1').hidden=subtraction;
 $('proof-row-2').hidden=subtraction||verifyGivenSum;
 $('proof-subtraction-row').hidden=!subtraction;
 for(const field of subtractionProofInputs){field.value='';field.disabled=!subtraction||!!teacherMapReturn;}
 proofRevision++;
 proofBusy=false;
 $('proof-sum').value='';
 for(const [index,row] of proofRows.entries()){
  row.left.value=row.right.value=row.sign.value='';
  row.result.textContent='—';
  row.left.disabled=row.right.disabled=row.sign.disabled=subtraction||(verifyGivenSum&&index===1)||!!teacherMapReturn;
 }
 $('proof-sum').disabled=hasGivenResult||!!teacherMapReturn;
 $('proof-check').disabled=!!teacherMapReturn;
 $('proof-status').textContent=teacherMapReturn?'Previzualizare profesor.':'';
 $('proof-dialog').showModal();
}
$('proof-close').addEventListener('click',()=>$('proof-dialog').close());
$('proof-dialog').addEventListener('close',()=>{proofRevision++;proofBusy=false;});
$('proof-form').addEventListener('submit',async event=>{
 event.preventDefault();
 if(teacherMapReturn||proofBusy)return;
 const subtraction=subtractionChests.includes(activeProofChest);
 const hasGivenResult=proofExercises[activeProofChest][2]!==undefined;
 const verifyGivenSum=hasGivenResult&&!subtraction;
 const sum=hasGivenResult?$('proof-given-result').textContent:$('proof-sum').value;
 const probes=subtraction?subtractionProofInputs.map(field=>/^\d{1,3}$/.test(field.value)?+field.value:null):proofRows.slice(0,verifyGivenSum?1:2).map(proofNumbers);
 const writtenResult=$('proof-written-result').value;
 const verdict=$('proof-verdict').value;
 const needsVerdict=hasGivenResult;
 const incompleteProof=(verifyGivenSum&&!/^\d{1,3}$/.test(writtenResult))||(needsVerdict&&!['A','F'].includes(verdict));
 if(incompleteProof||!/^\d{1,3}$/.test(sum)||probes.some(p=>p===null)){
  $('proof-status').textContent=needsVerdict?'Completează proba și alege A sau F.':subtraction?'Completează diferența și proba.':'Completează suma și cele două probe.';return;
 }
 const revision=proofRevision;
 proofBusy=$('proof-check').disabled=true;
 try{
  const answer=[+sum,...probes.flat()];
  if(verifyGivenSum)answer.push(+writtenResult);
  if(needsVerdict)answer.push(verdict);
  const r=await studentAuth.proof('answer',{chest:activeProofChest,answer:answer.join(',')});
  if(revision!==proofRevision)return;
  renderMap(r.profile);
  updateProofProgress();
  const proofFeedback=verdict==='A'?`✓ Proba confirmă rezultatul ${sum}.`:`✓ Proba este corectă. Rezultatul ${sum} este greșit.`;
  $('proof-status').textContent=r.correct?(needsVerdict?proofFeedback:'✓ Corect!'):'✗ Mai încearcă.';
 }catch(error){
  if(revision===proofRevision)$('proof-status').textContent=error.message;
 }finally{
  if(revision===proofRevision)proofBusy=$('proof-check').disabled=false;
 }
});
function updateProofProgress(){
 renderValleyKey(5);
 const solved=mapProfile.lessonProgress?.[2]?.solvedByLesson?.[5]||[];
 $('proof-count').textContent=starCount(solved)+'/12';
 for(const number of solved){
  const chest=$('proof-chests').children[number-1];
  if(!chest||chest.className!=='addition-chest')continue;
  chest.className+=' complete';
  const star=document.createElement('span');star.textContent='★';chest.append(star);
 }
}
function openProofLesson() {
 const chests = $('proof-chests');
 chests.replaceChildren();
 for (let number = 1; number <= 12; number++) {
  const chest = document.createElement('button');
  chest.type = 'button';
  chest.className = 'addition-chest';
  chest.setAttribute('aria-label', 'Lădița ' + number);
  Object.assign(chest.style, {
   left: [23, 36.3, 49.2, 61.5][(number - 1) % 4] + '%',
   top: [40.5, 57.2, 75][Math.floor((number - 1) / 4)] + '%',
   width: '12.7%',
   height: '18.5%'
  });
  chest.addEventListener('click', () => {
   if(proofExercises[number]){openProofExercise(number);return;}
   $('chapter-title').textContent = 'Lădița ' + number;
   $('chapter-description').textContent = valleyLessons[4];
   $('chapter-access').textContent = 'Exercițiul acestei lădițe este în pregătire.';
   $('chapter-dialog').showModal();
   $('chapter-close').focus();
  });
  chests.append(chest);
 }
 updateProofProgress();
 $('valley-page').hidden = true;
 $('proof-page').hidden = false;
 $('proof-student').textContent = mapProfile.displayName;
 $('proof-back').focus();
 window.scrollTo(0, 0);
}
for (const id of ['proof-back', 'proof-back-sign']) {
 $(id).addEventListener('click', () => {
  openValley();
  $('valley-lessons').children[4]?.focus();
 });
}
const operationOrderExercises={1:'575 − 311 + 211',2:'342 + 217 − 132',3:'583 − (232 + 141)',4:'687 − (499 − 312)',5:'34 + 56 + 34 − 23',6:'45 − 44 + 56 − 33',7:'44 + 35 − (22 + 10)',8:'87 − (34 + 23) + 27',9:'125 + 76 − 48 + 32',10:'310 − (84 − 29) − 46',11:'72 + 68 − (35 + 25)',12:'420 − (156 + 84) + 75'};
const operationOrderDialog=$('operation-order-dialog');
const operationOrderFields=['answer','left','sign','right','result'].map(id=>$('operation-order-'+id));
const operationOrderMiddleFields=Array.from({length:6},(_,i)=>$('operation-order-middle-'+i));
function operationOrderStartsWithFirstSum(){
 return [7,11].includes(activeOperationOrderChest)&&operationOrderMiddleFields[1].value==='-'&&operationOrderMiddleFields[3].value==='+';
}
function showOperationOrderParentheses(){
 const visible=operationOrderStartsWithFirstSum();
 $('operation-order-paren-open').hidden=!visible;
 $('operation-order-paren-close').hidden=!visible;
}
for(const index of [1,3])operationOrderMiddleFields[index].addEventListener('change',showOperationOrderParentheses);
const operationOrderCheck=$('operation-order-check');
const operationOrderStatus=$('operation-order-status');
let operationOrderRevision=0,activeOperationOrderChest=1;
function updateOperationOrderProgress(){
 renderValleyKey(6);
 const solved=mapProfile.lessonProgress?.[2]?.solvedByLesson?.[6]||[];
 $('operation-order-count').textContent=starCount(solved)+'/12';
 for(const number of solved){
  const chest=$('operation-order-chests').children[number-1];
  if(!chest||chest.className!=='addition-chest')continue;
  chest.className+=' complete';
  const star=document.createElement('span');
  star.textContent='★';
  chest.append(star);
 }
}
$('operation-order-close').addEventListener('click',()=>operationOrderDialog.close());
$('operation-order-form').addEventListener('submit',async event=>{
 event.preventDefault();
 if(teacherMapReturn||operationOrderCheck.disabled)return;
 const [total,left,sign,right,result]=operationOrderFields.map(field=>field.value);
 if(![total,left,right,result].every(value=>/^\d{1,5}$/.test(value))||!['+','-'].includes(sign))return;
 const parts=[+total,+left,sign,+right,+result];
 if(activeOperationOrderChest>=5){
  const [a,first,b,second,c,stepResult]=operationOrderMiddleFields.map(field=>field.value);
  if(![a,b,c,stepResult].every(value=>/^\d{1,5}$/.test(value))||![first,second].every(value=>['+','-'].includes(value)))return;
  parts.push(+a,first,+b,second,+c,+stepResult,Number(operationOrderStartsWithFirstSum()));
 }
 const answer=parts.join(',');
 const revision=operationOrderRevision;
 operationOrderCheck.disabled=true;
 try{
  const result=await studentAuth.operationOrder('answer',{chest:activeOperationOrderChest,answer});
  if(revision!==operationOrderRevision)return;
  renderMap(result.profile);
  updateOperationOrderProgress();
  operationOrderStatus.textContent=result.correct?'✓ Corect!':'✗ Mai încearcă.';
 }catch(error){
  if(revision===operationOrderRevision)operationOrderStatus.textContent=error.message;
 }finally{
  if(revision===operationOrderRevision)operationOrderCheck.disabled=false;
 }
});
const unknownNumberExercises={
 1:['a + 348 = 549','Scade termenul cunoscut din sumă.'],
 2:['528 + a = 758','Scade termenul cunoscut din sumă.'],
 3:['a − 463 = 578','Adună scăzătorul și diferența.'],
 4:['752 − a = 436','Scade diferența din descăzut.'],
 5:['a + 430 − 264 = 3652','Aplică mersul invers. Începe cu ultima operație.','a + 430',3652],
 6:['a + 437 + 210 = 879','Aplică mersul invers. Începe cu ultima operație.','a + 437',879],
 7:['a − 557 − 352 = 4726','Aplică mersul invers. Începe cu ultima operație.','a − 557',4726],
 8:['a − 745 + 254 = 6458','Aplică mersul invers. Începe cu ultima operație.','a − 745',6458],
 9:['a + 430 − 264 = 3652','Aplică mersul invers. Începe cu ultima operație.'],
 10:['a + 325 + 146 = 912','Aplică mersul invers. Începe cu ultima operație.'],
 11:['a − 286 − 157 = 1398','Aplică mersul invers. Începe cu ultima operație.'],
 12:['a − 518 + 236 = 1704','Aplică mersul invers. Începe cu ultima operație.']
};
const unknownNumberDialog=$('unknown-number-dialog');
const unknownNumberFields=['left','sign','right','answer'].map(id=>$('unknown-number-'+id));
const unknownNumberInverse=$('unknown-number-inverse');
const unknownNumberInverseFields=['sign','operand','result'].map(id=>$('unknown-number-inverse-'+id));
const unknownNumberFree=$('unknown-number-free');
const unknownNumberFreeFields=Array.from({length:10},(_,index)=>$('unknown-number-free-'+index));
const unknownNumberCheck=$('unknown-number-check');
const unknownNumberStatus=$('unknown-number-status');
let unknownNumberRevision=0,activeUnknownNumberChest=1;
function updateUnknownNumberProgress(){
 const solved=mapProfile.lessonProgress?.[2]?.solvedByLesson?.[7]||[];
 $('unknown-number-count').textContent=starCount(solved)+'/12';
 for(const number of solved){
  const chest=$('unknown-number-chests').children[number-1];
  if(!chest||chest.className!=='addition-chest')continue;
  chest.className+=' complete';
  const star=document.createElement('span');
  star.textContent='★';
  chest.append(star);
 }
}
function openUnknownNumberExercise(number){
 activeUnknownNumberChest=number;
 const [expression,hint,inverseLeft,inverseRight]=unknownNumberExercises[number];
 $('unknown-number-expression').textContent=expression;
 $('unknown-number-hint').textContent=hint;
 $('unknown-number-badge').textContent=number;
 $('unknown-number-badge').setAttribute('aria-label','Lădița '+number);
 unknownNumberRevision++;
 for(const field of unknownNumberFields){
  field.value='';
  field.disabled=!!teacherMapReturn;
 }
 unknownNumberFree.hidden=number<9;
 for(const field of unknownNumberFreeFields){
  field.value='';
  field.disabled=unknownNumberFree.hidden||!!teacherMapReturn;
 }
 unknownNumberInverse.hidden=inverseLeft===undefined;
 if(!unknownNumberInverse.hidden){
  $('unknown-number-inverse-equation').textContent=inverseLeft+' = '+inverseRight;
  $('unknown-number-inverse-label').textContent=inverseLeft+' =';
 }
 for(const field of unknownNumberInverseFields){
  field.value='';
  field.disabled=unknownNumberInverse.hidden||!!teacherMapReturn;
 }
 unknownNumberCheck.disabled=!!teacherMapReturn;
 unknownNumberStatus.textContent=teacherMapReturn?'Previzualizare profesor.':'';
 unknownNumberDialog.showModal();
}
$('unknown-number-close').addEventListener('click',()=>unknownNumberDialog.close());
$('unknown-number-form').addEventListener('submit',async event=>{
 event.preventDefault();
 if(teacherMapReturn||unknownNumberCheck.disabled)return;
 const [left,sign,right,value]=unknownNumberFields.map(field=>field.value);
 if(![left,right,value].every(part=>/^\d{1,5}$/.test(part))||!['+','-'].includes(sign))return;
 const parts=[+left,sign,+right,+value];
 if(!unknownNumberInverse.hidden){
  const [inverseSign,operand,intermediate]=unknownNumberInverseFields.map(field=>field.value);
  if(!['+','-'].includes(inverseSign)||![operand,intermediate].every(part=>/^\d{1,5}$/.test(part)))return;
  parts.unshift(inverseSign,+operand,+intermediate);
 }
 if(!unknownNumberFree.hidden){
  const freeParts=unknownNumberFreeFields.map(field=>field.value);
  if(!freeParts.every((part,index)=>index%2===0?['+','-','='].includes(part):/^\d{1,5}$/.test(part)))return;
  parts.unshift(...freeParts.map((part,index)=>index%2===0?part:+part));
 }
 const revision=unknownNumberRevision;
 unknownNumberCheck.disabled=true;
 try{
  const answer=parts.join(',');
  const result=await studentAuth.unknownNumber('answer',{chest:activeUnknownNumberChest,answer});
  if(revision!==unknownNumberRevision)return;
  renderMap(result.profile);
  updateUnknownNumberProgress();
  unknownNumberStatus.textContent=result.correct?'✓ Corect!':'✗ Mai încearcă.';
 }catch(error){
  if(revision===unknownNumberRevision)unknownNumberStatus.textContent=error.message;
 }finally{
  if(revision===unknownNumberRevision)unknownNumberCheck.disabled=false;
 }
});
function openValleyPracticeLesson(lesson){
 const operationOrder=lesson===6;
 const prefix=operationOrder?'operation-order':'unknown-number';
 const chests=$(prefix+'-chests');
 chests.replaceChildren();
 for(let number=1;number<=12;number++){
  const chest=document.createElement('button');
  chest.type='button';
  chest.className='addition-chest';
  chest.setAttribute('aria-label','Lădița '+number);
  Object.assign(chest.style,{
   left:[23,36.3,49.2,61.5][(number-1)%4]+'%',
   top:[40.5,57.2,75][Math.floor((number-1)/4)]+'%',
   width:'12.7%',
   height:'18.5%'
  });
  chest.addEventListener('click',()=>{
   if(!operationOrder&&unknownNumberExercises[number]){openUnknownNumberExercise(number);return;}
   if(operationOrder&&operationOrderExercises[number]){
    operationOrderRevision++;
    activeOperationOrderChest=number;
    const expression=operationOrderExercises[number];
    $('operation-order-expression').textContent=expression+' =';
    $('operation-order-hint').textContent=[7,11].includes(number)?'Poți începe cu prima adunare sau cu adunarea din paranteză.':expression.includes('(')
     ?'Calculează mai întâi operația din paranteză.'
     :'Efectuează adunarea și scăderea în ordinea în care apar, de la stânga la dreapta.';
    $('operation-order-number').textContent=number;
    $('operation-order-number').setAttribute('aria-label','Lădița '+number);
    for(const field of operationOrderFields){
     field.value='';
     field.disabled=!!teacherMapReturn;
    }
    const hasMiddleStep=number>=5;
    $('operation-order-middle').hidden=!hasMiddleStep;
    for(const field of operationOrderMiddleFields){
     field.value='';
     field.disabled=!hasMiddleStep||!!teacherMapReturn;
    }
    showOperationOrderParentheses();
    operationOrderCheck.disabled=!!teacherMapReturn;
    operationOrderStatus.textContent=teacherMapReturn?'Previzualizare profesor.':'';
    operationOrderDialog.showModal();
    return;
   }
   $('chapter-title').textContent='Lădița '+number;
   $('chapter-description').textContent=valleyLessons[lesson-1];
   $('chapter-access').textContent='Exercițiul acestei lădițe este în pregătire.';
   $('chapter-dialog').showModal();
   $('chapter-close').focus();
  });
  chests.append(chest);
 }
 $('valley-page').hidden=true;
 $(prefix+'-page').hidden=false;
 if(operationOrder)updateOperationOrderProgress();
 else updateUnknownNumberProgress();
 $(prefix+'-student').textContent=mapProfile.displayName;
 $(prefix+'-back').focus();
 window.scrollTo(0,0);
}
for(const [prefix,index] of [['operation-order',5],['unknown-number',6]]){
 for(const suffix of ['-back','-back-sign']){
  $(prefix+suffix).addEventListener('click',()=>{
   openValley();
   $('valley-lessons').children[index]?.focus();
  });
 }
}
const carryExercises = [[116, 224], [254, 390], [701, 754], [299, 398], [1979, 701], [2484, 762], [7382, 678], [5668, 438], [9179, 5441], [8686, 9652], [6322, 3929], [7503, 4497]];
function openCarryLesson() {
 renderValleyKey(3);
 const solved = mapProfile.lessonProgress?.[2]?.solvedByLesson?.[3] || [];
 $('carry-count').textContent = starCount(solved) + '/12';
 const chests = $('carry-chests');
 chests.replaceChildren();
 for (let number = 1; number <= 12; number++) {
  const chest = document.createElement('button');
  chest.type = 'button';
  chest.className = 'addition-chest';
  Object.assign(chest.style, {
   left: [23, 36.3, 49.2, 61.5][(number - 1) % 4] + '%',
   top: [40.5, 57.2, 75][Math.floor((number - 1) / 4)] + '%',
   width: '12.7%',
   height: '18.5%'
  });
  if (solved.includes(number)) {
   chest.className += ' complete';
   const star = document.createElement('span');
   star.textContent = '★';
   chest.append(star);
  }
  const [top, bottom] = carryExercises[number - 1];
  chest.setAttribute('aria-label', 'Lădița ' + number + ' — ' + top + ' plus ' + bottom);
  chest.addEventListener('click', () => openAdditionExercise(number, 'carry'));
  chests.append(chest);
 }
 $('valley-page').hidden = true;
 $('carry-page').hidden = false;
 $('carry-student').textContent = mapProfile.displayName;
 $('carry-back').focus();
 window.scrollTo(0, 0);
}
for (const id of ['carry-back', 'carry-back-sign']) {
 $(id).addEventListener('click', () => {
  openValley();
  $('valley-lessons').children[2]?.focus();
 });
}
const borrowExercises = [[742, 318], [725, 361], [1345, 612], [732, 458], [5342, 617], [5318, 472], [5321, 674], [6412, 785], [15332, 6247], [15428, 6893], [15362, 6847], [15321, 6874]];
function openBorrowLesson() {
 renderValleyKey(4);
 const solved = mapProfile.lessonProgress?.[2]?.solvedByLesson?.[4] || [];
 $('borrow-count').textContent = starCount(solved) + '/12';
 const chests = $('borrow-chests');
 chests.replaceChildren();
 for (let number = 1; number <= 12; number++) {
  const chest = document.createElement('button');
  chest.type = 'button';
  chest.className = 'addition-chest';
  Object.assign(chest.style, {
   left: [23, 36.3, 49.2, 61.5][(number - 1) % 4] + '%',
   top: [40.5, 57.2, 75][Math.floor((number - 1) / 4)] + '%',
   width: '12.7%',
   height: '18.5%'
  });
  if (solved.includes(number)) {
   chest.className += ' complete';
   const star = document.createElement('span');
   star.textContent = '★';
   chest.append(star);
  }
  const [top, bottom] = borrowExercises[number - 1];
  chest.setAttribute('aria-label', 'Lădița ' + number + ' — ' + top + ' minus ' + bottom);
  chest.addEventListener('click', () => openAdditionExercise(number, 'borrow'));
  chests.append(chest);
 }
 $('valley-page').hidden = true;
 $('borrow-page').hidden = false;
 $('borrow-student').textContent = mapProfile.displayName;
 $('borrow-back').focus();
 window.scrollTo(0, 0);
}
for (const id of ['borrow-back', 'borrow-back-sign']) {
 $(id).addEventListener('click', () => {
  openValley();
  $('valley-lessons').children[3]?.focus();
 });
}
const subtractionExercises = [[786, 243], [958, 427], [697, 352], [864, 521], [4786, 352], [7958, 423], [8697, 542], [5864, 321], [7865, 2431], [9587, 4275], [6978, 3526], [8649, 5217]];
function openSubtraction() {
 renderValleyKey(2);
 const solved = mapProfile.lessonProgress?.[2]?.solvedByLesson?.[2] || [];
 $('subtraction-count').textContent = starCount(solved) + '/12';
 const chests = $('subtraction-chests');
 chests.replaceChildren();
 for (let number = 1; number <= 12; number++) {
  const chest = document.createElement('button');
  const row = Math.floor((number - 1) / 4);
  const column = (number - 1) % 4;
  chest.type = 'button';
  chest.className = 'addition-chest';
  Object.assign(chest.style, {
   left: [23, 36.3, 49.2, 61.5][column] + '%',
   top: [40.5, 57.2, 75][row] + '%',
   width: '12.7%',
   height: '18.5%'
  });
  if (solved.includes(number)) {
   chest.className += ' complete';
   const star = document.createElement('span');
   star.textContent = '★';
   chest.append(star);
  }
  const [top, bottom] = subtractionExercises[number - 1];
  chest.setAttribute('aria-label', 'Lădița ' + number + ' — ' + top + ' minus ' + bottom);
  chest.addEventListener('click', () => openAdditionExercise(number, 'subtraction'));
  chests.append(chest);
 }
 $('valley-page').hidden = true;
 $('subtraction-page').hidden = false;
 $('subtraction-student').textContent = mapProfile.displayName;
 $('subtraction-back').focus();
 window.scrollTo(0, 0);
}
for (const id of ['subtraction-back', 'subtraction-back-sign']) {
 $(id).addEventListener('click', () => {
  openValley();
  $('valley-lessons').children[1]?.focus();
 });
}
const additionExercises=[[537,142],[324,251],[613,284],[452,327],[2345,432],[5106,273],[6421,358],[7032,645],[2345,4123],[5214,2635],[4032,1526],[6103,2784]];
let activeAdditionChest=1;
let activeArithmeticLesson='addition';
function openAddition(){
 if(!teacherMapReturn&&!chapterRevealed(2))return;
 renderValleyKey(1);
 $('valley-page').hidden=true;$('addition-page').hidden=false;$('addition-student').textContent=mapProfile.displayName;
 const solved=mapProfile.lessonProgress?.[2]?.solvedByLesson?.[1]||[];$('addition-count').textContent=starCount(solved)+'/12';$('addition-chests').replaceChildren();
 for(let id=1;id<=12;id++){const b=document.createElement('button');b.type='button';b.className='addition-chest';const col=(id-1)%4,row=Math.floor((id-1)/4);Object.assign(b.style,{left:[23,36.3,49.2,61.5][col]+'%',top:[40.5,57.2,75][row]+'%',width:'12.7%',height:'18.5%'});if(solved.includes(id)){b.className+=' complete';const star=document.createElement('span');star.textContent='★';b.append(star);}b.setAttribute('aria-label','Lădița '+id+' — '+additionExercises[id-1].join(' plus '));b.addEventListener('click',()=>openAdditionExercise(id));$('addition-chests').append(b);}
 $('addition-status').textContent='Toate cele 12 lădițe sunt disponibile.'+(teacherMapReturn?' Vizualizare profesor.':'');$('addition-back').focus();window.scrollTo(0,0);
}
let additionReady=false,additionBusy=false,additionRevision=0;
function additionControls(){const disabled=!additionReady||additionBusy||!!teacherMapReturn;$('addition-answer').disabled=disabled;$('addition-check').disabled=disabled;}
async function openAdditionExercise(id=1, lesson='addition'){
 activeArithmeticLesson=lesson;
 activeAdditionChest=id;
 const isSubtraction=lesson==='subtraction'||lesson==='borrow';
 const exercises={addition:additionExercises,subtraction:subtractionExercises,carry:carryExercises,borrow:borrowExercises};
 const [top,bottom]=exercises[lesson][id-1];
 $('addition-top').textContent=String(top);
 $('addition-bottom').textContent=String(bottom);
 $('addition-number').textContent=String(id);
 $('arithmetic-sign').textContent=isSubtraction?'−':'+';
 $('arithmetic-art').className='addition-exercise-art'+(lesson==='addition'?'':' '+lesson+'-exercise');
 $('addition-exercise-page').setAttribute('aria-label',(isSubtraction?'Scădere':'Adunare')+' — lădița '+id);
 $('addition-answer').setAttribute('aria-label','Rezultatul operației '+top+(isSubtraction?' minus ':' plus ')+bottom);
 const revision=++additionRevision,sid=mapProfile.studentId;additionReady=false;additionBusy=false;$('addition-answer').value='';$('addition-answer').className='';$('addition-answer').setAttribute('aria-invalid','false');$(lesson+'-page').hidden=true;$('addition-exercise-page').hidden=false;additionControls();$('addition-exercise-back').focus();window.scrollTo(0,0);
 $('addition-exercise-status').textContent=teacherMapReturn?'Vizualizare profesor. Progresul nu este modificat.':'Se verifică accesul…';if(teacherMapReturn)return;
 try{const r=await studentAuth[lesson]('state');if(revision!==additionRevision||mapProfile?.studentId!==sid||$('addition-exercise-page').hidden||teacherMapReturn)return;renderMap(r.profile);additionReady=true;additionControls();$('addition-exercise-status').textContent='';$('addition-answer').focus();}catch(e){if(revision===additionRevision)$('addition-exercise-status').textContent=e.message;}
}
async function checkAddition(){
 if(!additionReady||additionBusy||teacherMapReturn)return;const answer=$('addition-answer').value.trim();if(!/^\d{1,5}$/.test(answer)){$('addition-exercise-status').textContent='Scrie rezultatul în căsuță.';return;}
 const revision=additionRevision,sid=mapProfile.studentId;additionBusy=true;additionControls();
 try{const r=await studentAuth[activeArithmeticLesson]('answer',{chest:activeAdditionChest,answer});if(revision!==additionRevision||mapProfile?.studentId!==sid||teacherMapReturn||$('addition-exercise-page').hidden)return;renderMap(r.profile);$('addition-answer').className=r.correct?'correct':'incorrect';$('addition-answer').setAttribute('aria-invalid',String(!r.correct));$('addition-exercise-status').textContent=r.correct?'Corect! Ai câștigat o steluță.':'Mai încearcă!';}catch(e){if(revision===additionRevision)$('addition-exercise-status').textContent=e.message;}finally{if(revision===additionRevision){additionBusy=false;additionControls();}}
}
$('addition-check').addEventListener('click',checkAddition);$('addition-answer').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();checkAddition();}});
$('addition-exercise-back').addEventListener('click',()=>{additionRevision++;additionReady=false;additionBusy=false;$('addition-exercise-page').hidden=true;const reopen={addition:openAddition,subtraction:openSubtraction,carry:openCarryLesson,borrow:openBorrowLesson};reopen[activeArithmeticLesson]();$(activeArithmeticLesson+'-chests').children[activeAdditionChest-1]?.focus();});
for(const id of ['addition-back','addition-back-sign'])$(id).addEventListener('click',()=>{openValley();$('valley-lessons').children[0]?.focus();});
for(const id of ['valley-back','valley-back-sign'])$(id).addEventListener('click',()=>{$('valley-page').hidden=true;$('map-page').hidden=false;renderMap(mapProfile);$('map-chapters').children[1]?.focus();window.scrollTo(0,0);});
function chapterRevealed(id){return id===1||mapProfile.completedChapters.includes(id)||mapProfile.completedChapters.includes(id-1);}
function renderMapFog(){
 $('map-fog').style.display=teacherMapReturn?'none':'';
 if(teacherMapReturn){$('map-image').alt='Regatul numerelor — harta completă, vizualizare profesor.';return;}
 // Each reveal follows the artwork's island, independent of viewport size.
 const zones=[[205,350,260,185],[655,345,230,155],[1070,330,225,170],[1445,175,235,190],[1465,485,220,185],[1010,600,245,165],[600,580,240,170],[255,625,235,165]];
 const clear=[[265,110,330,160],[835,95,310,140],[135,835,170,120]];
 zones.forEach((zone,i)=>{if(chapterRevealed(i+1))clear.push(zone);});
 if(mapProfile.completedChapters.length===8)clear.push([1450,765,260,235]);
 $('map-fog-reveals').innerHTML=clear.map(([cx,cy,rx,ry])=>`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#fog-clear)"/>`).join('');
 $('map-image').alt='Regatul numerelor: '+chapters.filter(c=>chapterRevealed(c.id)).map(c=>c.title).join(', ')+'. Celelalte ținuturi sunt acoperite de ceață.';
}
function renderMap(profile) {
 if(!profile || typeof profile.studentId!=='string' || typeof profile.displayName!=='string')throw new Error('Missing map profile');
 mapProfile={...profile,completedChapters:[...new Set((profile.completedChapters||[]).filter(id=>Number.isInteger(id)&&id>=1&&id<=8))]};
 renderMapFog();renderStars();
 $('map-student').textContent=mapProfile.displayName;
 $('map-chapters').replaceChildren();$('chapter-progress').replaceChildren();
 for(const chapter of chapters){
  const done=mapProfile.completedChapters.includes(chapter.id);
  const state=done?'parcurs':chapterRevealed(chapter.id)?'disponibil':'blocat';
  const hotspot=document.createElement('button');hotspot.type='button';hotspot.className='chapter-hotspot'+(done?' complete':'')+(chapterRevealed(chapter.id)?'':' fogged');hotspot.setAttribute('aria-label',chapter.id+'. '+chapter.title+' — '+state);
  const [left,top,width,height]=chapter.box;Object.assign(hotspot.style,{left:left+'%',top:top+'%',width:width+'%',height:height+'%'});
  const badge=document.createElement('span');badge.className='chapter-state';badge.setAttribute('aria-hidden','true');badge.textContent=done?'✓':chapterRevealed(chapter.id)?'↪':'🔒';hotspot.append(badge);hotspot.addEventListener('click',()=>showChapter(chapter));$('map-chapters').append(hotspot);
  const [trophyName,trophyFile]=chapterTrophies[chapter.id-1];
  const earned=done||(chapter.id===1&&mapProfile.lessonProgress?.[1]?.forestCrystalTaken===true);
  const tile=document.createElement('button');
  tile.type='button';
  tile.className='progress-tile'+(earned?' complete':'');
  tile.setAttribute('aria-label','Capitolul '+chapter.id+' — '+trophyName+(earned?' — trofeu câștigat':' — trofeu necâștigat'));
  tile.title=trophyName+(earned?' — câștigat':' — încă necâștigat');
  const trophy=document.createElement('img');
  trophy.src='./assets/'+trophyFile;
  trophy.alt='';
  trophy.draggable=false;
  tile.append(trophy);
  tile.addEventListener('click',()=>showChapter(chapter));
  $('chapter-progress').append(tile);
 }
 $('map-summary').textContent=teacherClassMode?'Harta clasei. Comenzile de sus se aplică tuturor elevilor.':mapProfile.completedChapters.length+' din 8 capitole parcurse.';
}
function openStudentMap(profile){
 $('mountains-page').hidden=true;
 $('subtraction-page').hidden=true;
 $('carry-page').hidden=true;
 $('borrow-page').hidden=true;
 $('proof-page').hidden=true;
 $('operation-order-page').hidden=true;
 $('unknown-number-page').hidden=true;
 $('addition-exercise-page').hidden=true;$('addition-page').hidden=true;$('valley-page').hidden=true;teacherMapReturn=null;teacherClassMode=false;document.body.classList.remove('teacher-class-mode');$('teacher-workspace').hidden=true;$('roman-match-page').hidden=true;$('roman-exercise-page').hidden=true;$('rounding-exercise-page').hidden=true;$('ordering-exercise-page').hidden=true;$('comparison-exercise-page').hidden=true;comparisonRevision++;$('lesson-content-page').hidden=true;$('forest-mode').textContent='Elev';$('map-home').textContent='Ieșire';$('map-mode').textContent='Elev';renderMap(profile);$('map-page').hidden=false;$('forest-page').hidden=true;document.body.classList.add('viewing-map');$('map-home').focus();window.scrollTo(0,0);
}
$('map-home').addEventListener('click',async()=>{if(teacherMapReturn){const back=teacherMapReturn;teacherMapReturn=null;mapProfile=null;forestState=null;$('map-page').hidden=true;$('forest-page').hidden=true;$('valley-page').hidden=true;$('subtraction-page').hidden=true;back();return;}const button=$('map-home');button.disabled=true;try{await studentAuth.logout();}catch{studentAuth.clear();}finally{button.disabled=false;$('map-page').hidden=true;$('forest-page').hidden=true;document.body.classList.remove('viewing-map');mapProfile=null;forestState=null;$('class-entry').focus();}});
for(const id of ['chapter-close','chapter-back'])$(id).addEventListener('click',()=>$('chapter-dialog').close());
$('map-castle').addEventListener('click',()=>{$('chapter-back').textContent='Înapoi la hartă';$('chapter-title').textContent='Castelul Marelui Cristal';$('chapter-description').textContent='Marea provocare finală a Regatului numerelor.';$('chapter-access').textContent='Castelul rămâne închis până la parcurgerea celor opt capitole. Provocarea finală nu este încă configurată.';$('chapter-dialog').showModal();});
const mapUI={chapterStars,open:openStudentMap,teacherView(profile,onBack){
 teacherClassMode=false;document.body.classList.remove('teacher-class-mode');$('forest-mode').textContent='Vizualizare profesor';teacherMapReturn=onBack;renderMap(profile);$('teacher-page').hidden=true;$('map-page').hidden=false;$('forest-page').hidden=true;
 $('map-home').textContent='← Panoul profesorului';$('map-mode').textContent='Vizualizare profesor';
 $('map-summary').textContent+=' Atinge insulița 1 pentru progresul celor 6 lecții. Vizualizarea nu modifică progresul.';
 document.body.classList.add('viewing-map');$('map-home').focus();window.scrollTo(0,0);
},classView(_options,onBack){
 teacherClassMode=true;document.body.classList.add('teacher-class-mode');
 const profile={studentId:'class',displayName:'Toată clasa',completedChapters:[],lessonProgress:{1:{unlocked:[1],completed:[]}},formation:{solved:[],keyTaken:false,lesson2Opened:false},reading:{solved:[],keyTaken:false}};
 teacherMapReturn=onBack;renderMap(profile);$('teacher-page').hidden=true;$('map-page').hidden=false;$('forest-page').hidden=true;
 $('map-home').textContent='← Individual';$('map-mode').textContent='Toată clasa';$('forest-mode').textContent='Toată clasa';
 document.body.classList.add('viewing-map');window.scrollTo(0,0);
}};

const forestLessons=[
 {id:1,title:'Formarea numerelor naturale',box:[22,47,14.5,16]},
 {id:2,title:'Citirea și scrierea numerelor naturale',box:[43,47.5,15,17]},
 {id:3,title:'Compararea numerelor naturale',box:[60.5,48,15,17]},
 {id:4,title:'Ordonarea numerelor naturale',box:[25,65,16,17]},
 {id:5,title:'Rotunjirea numerelor naturale',box:[43.5,67,14.5,17]},
 {id:6,title:'Formarea, citirea și scrierea numerelor cu cifre romane',box:[60.5,70,15.5,16]}
];
let forestState=null;
function previousKey(profile,id){
 if(id===1)return true;
 if(id===2)return !!profile.formation?.keyTaken;
 if(id===3)return !!profile.reading?.keyTaken;
 const p=profile.lessonProgress?.[1]||{};
 return !!p[({4:'comparisonKeyTaken',5:'orderingKeyTaken',6:'roundingKeyTaken'})[id]];
}
function forestStatus(id){
 if(id===3&&mapProfile.lessonProgress?.[1]?.comparisonLockOpened===false)return 'locked';
 if(!previousKey(mapProfile,id)||id===2&&!readingAvailable())return 'locked';
 return forestState.completed.includes(id)?'complete':'available';
}
function showForestLesson(lesson){
 activeLesson=lesson;
 if(!teacherMapReturn){
  if(lesson.id===1&&forestStatus(1)!=='locked'){openFormation();return;}
  if(lesson.id===2&&readingAvailable()){openReading();return;}
  if(lesson.id>2&&forestStatus(lesson.id)!=='locked'){openLessonContent(lesson);return;}
 }
 const state=forestStatus(lesson.id);
 $('lesson-title').textContent=lesson.id+'. '+lesson.title;
 $('lesson-message').textContent=teacherMapReturn?'Previzualizare profesor.':state==='locked'?'Obține cheia din lecția precedentă pentru a deschide lecția.':state==='complete'?'Ai parcurs această lecție.':'Ai acces la această lecție.';
 $('lesson-note').textContent=!teacherMapReturn&&state==='locked'&&previousKey(mapProfile,lesson.id)?'Ai cheia. Atinge lacătul de pe hartă.':'';
 $('lesson-preview').hidden=!teacherMapReturn;
 $('lesson-dialog').showModal();$('lesson-close').focus();
}
$('lesson-preview').addEventListener('click',()=>{if(!teacherMapReturn)return;$('lesson-dialog').close();if(activeLesson.id===1)openFormation();else if(activeLesson.id===2)openReading();else openLessonContent(activeLesson);});
let comparisonReturnFocus=null,comparisonSelected=null,comparisonBusy=false,comparisonReady=false,comparisonRevision=0,activeComparisonChest=null;
const comparisonExercises={1:{left:'4 725',right:'4 752',image:$('comparison-exercise-image').src},2:{left:'6 308',right:'6 280',image:$('comparison-exercise-source-2').src},3:{left:'670',right:'4 000',image:$('comparison-exercise-source-3').src},4:{left:'2 194',right:'2 301',image:$('comparison-exercise-source-4').src},5:{left:'6 548',right:'6 548',image:$('comparison-exercise-source-5').src},6:{left:'2 300',right:'3 002',image:$('comparison-exercise-source-6').src},7:{left:'8 090',right:'8 009',image:$('comparison-exercise-source-7').src},8:{left:'9 999',right:'999',image:$('comparison-exercise-source-8').src},9:{left:'7 205',right:'7 205',image:$('comparison-exercise-source-9').src},10:{left:'5 030',right:'5 003',image:$('comparison-exercise-source-10').src},11:{left:'9 999',right:'10 000',image:$('comparison-exercise-source-11').src},12:{left:'9 080',right:'9 080',image:$('comparison-exercise-source-12').src}};
const comparisonDomeSource=$('comparison-image').src;
const comparisonChoices=[['comparison-choice-less','<'],['comparison-choice-greater','>'],['comparison-choice-equal','=']];
function renderComparison(){
 const solved=[...new Set((mapProfile?.lessonProgress?.[1]?.comparisonSolved||[]).filter(id=>comparisonExercises[id]))];
 $('comparison-count').textContent=solved.length+'/12';$('comparison-bar').value=solved.length;
 const taken=!!mapProfile?.lessonProgress?.[1]?.comparisonKeyTaken;
 $('comparison-image').src=taken?$('comparison-empty-image').src:solved.length>=6?$('comparison-key-image').src:comparisonDomeSource;
 $('comparison-image').alt='Compararea numerelor naturale: 12 lădițe. '+solved.length+' din 12 steluțe. '+(taken?'Cheia lecției 4 a fost luată.':solved.length>=6?'Cheia lecției 4 este eliberată.':'Cheia lecției 4 este sub cupolă.');
 $('comparison-key').disabled=taken||solved.length<6||!!teacherMapReturn||comparisonBusy;
 $('comparison-key').setAttribute('aria-label',taken?'Cheia lecției 4 a fost luată':solved.length>=6?'Ia cheia lecției 4':'Obține 6 steluțe pentru a elibera cheia lecției 4');
 $('lesson-content-message').textContent=solved.length+' din 12 steluțe. Toate cele 12 lădițe sunt disponibile. '+(taken?'Cheia lecției 4 a fost luată.':solved.length>=6?'Apasă cheia pentru a o lua.':'Obține 6 steluțe pentru a elibera cheia.')+(teacherMapReturn?' Vizualizare profesor.':'');
 $('comparison-chests').replaceChildren();
 const left=[[22.7,35.7,48,60.1],[21.5,34.4,47.4,60],[21.5,34.7,47.7,60.4]],top=[40.5,57.1,74.1];
 for(let id=1;id<=12;id++){
  const row=Math.floor((id-1)/4),col=(id-1)%4,button=document.createElement('button');button.type='button';button.className='comparison-chest'+(solved.includes(id)?' complete':'');
  button.setAttribute('aria-label','Lecția 3, lădița '+id+(comparisonExercises[id]?(solved.includes(id)?' — rezolvată':' — compară '+comparisonExercises[id].left+' și '+comparisonExercises[id].right):' — exercițiul urmează să fie adăugat'));
  if(solved.includes(id)){const star=document.createElement('span');star.textContent='★';button.append(star);}
  Object.assign(button.style,{left:left[row][col]+'%',top:top[row]+'%',width:'12.9%',height:'18%'});
  button.addEventListener('click',()=>{if(comparisonExercises[id])return openComparisonExercise(id);comparisonReturnFocus=button;$('comparison-dialog-title').textContent='Lădița '+id+' · Compararea numerelor naturale';$('comparison-dialog').showModal();$('comparison-dialog-close').focus();});
  $('comparison-chests').append(button);
 }
}
for(const id of ['comparison-dialog-close','comparison-dialog-return'])$(id).addEventListener('click',()=>$('comparison-dialog').close());
$('comparison-dialog').addEventListener('close',()=>comparisonReturnFocus?.focus());
$('comparison-key').addEventListener('click',async()=>{
 if(comparisonBusy||teacherMapReturn||mapProfile?.lessonProgress?.[1]?.comparisonKeyTaken||$('comparison-key').disabled)return;
 const revision=comparisonRevision,sid=mapProfile.studentId;comparisonBusy=true;renderComparison();
 try{const r=await studentAuth.comparison('take_key');if(revision!==comparisonRevision||mapProfile?.studentId!==sid||teacherMapReturn)return;applyComparisonProfile(r.profile);}
 catch(error){if(revision===comparisonRevision&&!$('lesson-content-page').hidden)$('lesson-content-message').textContent=error.message;}
 finally{if(revision===comparisonRevision){comparisonBusy=false;const button=$('comparison-key');button.disabled=!!mapProfile?.lessonProgress?.[1]?.comparisonKeyTaken||!!teacherMapReturn||(mapProfile?.lessonProgress?.[1]?.comparisonSolved||[]).length<6;}}
});
$('comparison-back-sign').addEventListener('click',()=>openForest());
const orderingDomeSource=$('ordering-image').src;
let orderingReturnFocus=null;
function renderOrdering(){
 const solved=[...new Set((mapProfile?.lessonProgress?.[1]?.orderingSolved||[]).filter(id=>orderingExercises[id]))];$('ordering-count').textContent=solved.length+'/12';$('ordering-bar').value=solved.length;const taken=!!mapProfile?.lessonProgress?.[1]?.orderingKeyTaken;
 $('ordering-image').src=taken?$('ordering-empty-image').src:solved.length>=6?$('ordering-key-image').src:orderingDomeSource;
 $('ordering-image').alt='Ordonarea numerelor naturale: 12 lădițe. '+solved.length+' din 12 steluțe. '+(taken?'Cheia lecției 5 a fost luată.':solved.length>=6?'Cheia lecției 5 este eliberată.':'Cheia lecției 5 este sub cupolă.');
 $('ordering-key').disabled=taken||solved.length<6||!!teacherMapReturn||orderingBusy;
 $('ordering-key').setAttribute('aria-label',taken?'Cheia lecției 5 a fost luată':solved.length>=6?'Ia cheia lecției 5':'Obține 6 steluțe pentru a elibera cheia lecției 5');
 $('lesson-content-message').textContent=solved.length+' din 12 steluțe. Toate cele 12 lădițe sunt disponibile. '+(taken?'Cheia lecției 5 a fost luată.':solved.length>=6?'Apasă cheia pentru a o lua.':'Obține 6 steluțe pentru a elibera cheia.')+(teacherMapReturn?' Vizualizare profesor.':'');
 $('ordering-chests').replaceChildren();
 const left=[[22.7,35.7,48,60.1],[21.5,34.4,47.4,60],[21.5,34.7,47.7,60.4]],top=[40.5,57.1,74.1];
 for(let id=1;id<=12;id++){
  const row=Math.floor((id-1)/4),col=(id-1)%4,button=document.createElement('button');button.type='button';button.className='comparison-chest'+(solved.includes(id)?' complete':'');if(solved.includes(id)){const star=document.createElement('span');star.textContent='★';button.append(star);}
  button.setAttribute('aria-label','Lecția 4, lădița '+id+(orderingExercises[id]?(solved.includes(id)?' — rezolvată':' — ordonează '+(orderingExercises[id].descending?'descrescător':'crescător')):' — exercițiul urmează să fie adăugat'));
  Object.assign(button.style,{left:left[row][col]+'%',top:top[row]+'%',width:'12.9%',height:'18%'});
  button.addEventListener('click',()=>{if(orderingExercises[id])return openOrderingExercise(id);orderingReturnFocus=button;$('ordering-dialog-title').textContent='Lădița '+id+' · Ordonarea numerelor naturale';$('ordering-dialog').showModal();$('ordering-dialog-close').focus();});
  $('ordering-chests').append(button);
 }
}
for(const id of ['ordering-dialog-close','ordering-dialog-return'])$(id).addEventListener('click',()=>$('ordering-dialog').close());
$('ordering-dialog').addEventListener('close',()=>orderingReturnFocus?.focus());
$('ordering-key').addEventListener('click',async()=>{
 if(orderingBusy||teacherMapReturn||$('ordering-key').disabled||mapProfile?.lessonProgress?.[1]?.orderingKeyTaken)return;
 const revision=comparisonRevision,sid=mapProfile.studentId;orderingBusy=true;renderOrdering();
 try{const r=await studentAuth.ordering('take_key');if(revision!==comparisonRevision||mapProfile?.studentId!==sid||teacherMapReturn)return;applyOrderingProfile(r.profile);}
 catch(error){if(revision===comparisonRevision&&!$('lesson-content-page').hidden)$('lesson-content-message').textContent=error.message;}
 finally{if(revision===comparisonRevision){orderingBusy=false;$('ordering-key').disabled=!!teacherMapReturn||!!mapProfile?.lessonProgress?.[1]?.orderingKeyTaken||(mapProfile?.lessonProgress?.[1]?.orderingSolved||[]).filter(id=>orderingExercises[id]).length<6;}}
});
$('ordering-back-sign').addEventListener('click',()=>openForest());
const orderingExercises={1:{numbers:[3205,2530,3052,2503],image:$('ordering-exercise-image').src},2:{numbers:[4678,2034,476,4001],image:$('ordering-exercise-source-2').src},3:{numbers:[391,5078,712,299],image:$('ordering-exercise-source-3').src},4:{numbers:[1001,11,9999,999],image:$('ordering-exercise-source-4').src},5:{numbers:[3205,2530,3052,2503],descending:true,image:$('ordering-exercise-source-5').src},6:{numbers:[4678,2034,476,4001],descending:true,image:$('ordering-exercise-source-6').src},7:{numbers:[391,5078,712,299],descending:true,image:$('ordering-exercise-source-7').src},8:{numbers:[1001,11,9999,999],descending:true,image:$('ordering-exercise-source-8').src},9:{numbers:[6080,680,6008,608],descending:false,image:$('ordering-exercise-source-9').src},10:{numbers:[4509,4590,4059,4905],descending:true,image:$('ordering-exercise-source-10').src},11:{numbers:[10000,9909,9990,999],descending:false,image:$('ordering-exercise-source-11').src},12:{numbers:[7070,7700,7007,707],descending:true,image:$('ordering-exercise-source-12').src}};
let orderingNumbers=orderingExercises[1].numbers,activeOrderingChest=1;
const orderingBank=[0,1,2,3].map(i=>$('ordering-number-'+i)),orderingSlots=[0,1,2,3].map(i=>$('ordering-slot-'+i));
let orderingPlaces=[null,null,null,null],orderingSelected=null,orderingBusy=false,orderingReady=false;
const orderingLabel=n=>String(n).replace(/(\d)(?=(\d{3})+$)/g,'$1 ');
function orderingMessage(text='',kind=''){$('ordering-exercise-status').textContent=text;$('ordering-exercise-status').className=kind;}
function renderOrderingMove(){
 const disabled=orderingBusy||!orderingReady||!!teacherMapReturn;
 orderingBank.forEach((button,id)=>{const used=orderingPlaces.includes(id);button.disabled=disabled||used;button.className='ordering-number'+(used?' used':'')+(orderingSelected===id&&!used?' selected':'');button.setAttribute('aria-pressed',String(orderingSelected===id));});
 orderingSlots.forEach((button,index)=>{const id=orderingPlaces[index];button.disabled=disabled;button.textContent=id===null?'':orderingLabel(orderingNumbers[id]);button.className='ordering-slot'+(id!==null&&id===orderingSelected?' selected':'');button.setAttribute('aria-pressed',String(id!==null&&id===orderingSelected));button.setAttribute('aria-label','Căsuța '+(index+1)+(id===null?', goală':', numărul '+orderingLabel(orderingNumbers[id])));});
 $('ordering-check').disabled=disabled;
}
function applyOrderingProfile(profile){if(!profile||profile.studentId!==mapProfile?.studentId)throw new Error('Profilul elevului nu corespunde.');renderMap(profile);renderForest(mapProfile);renderOrdering();}
async function openOrderingExercise(id=1){
 const exercise=orderingExercises[id];if(!exercise)return;activeOrderingChest=id;orderingNumbers=exercise.numbers;
 const direction=exercise.descending?'descrescător':'crescător';$('ordering-slots').setAttribute('aria-label','Căsuțe în ordine '+(exercise.descending?'descrescătoare':'crescătoare'));
 $('ordering-exercise-image').src=exercise.image;$('ordering-exercise-image').alt='Ordonează '+direction+' numerele '+orderingNumbers.map(orderingLabel).join(', ')+'. Atinge numărul, apoi căsuța unde vrei să ajungă.';$('ordering-exercise-page').setAttribute('aria-label','Lecția 4, lădița '+id+' — Ordonează '+direction);orderingBank.forEach((button,index)=>button.setAttribute('aria-label','Alege numărul '+orderingLabel(orderingNumbers[index])));
 const revision=++comparisonRevision,sid=mapProfile.studentId;orderingPlaces=[null,null,null,null];orderingSelected=null;orderingBusy=false;orderingReady=false;
 $('lesson-content-page').hidden=true;$('ordering-exercise-page').hidden=false;renderOrderingMove();orderingMessage(teacherMapReturn?'Vizualizare profesor. Progresul elevilor nu este modificat.':'Se verifică accesul…');$('ordering-exercise-back').focus();window.scrollTo(0,0);
 if(teacherMapReturn)return;
 try{const r=await studentAuth.ordering('state');if(revision!==comparisonRevision||$('ordering-exercise-page').hidden||mapProfile?.studentId!==sid||teacherMapReturn)return;applyOrderingProfile(r.profile);orderingReady=true;renderOrderingMove();orderingMessage();orderingBank[0].focus();}
 catch(error){if(revision===comparisonRevision&&!$('ordering-exercise-page').hidden)orderingMessage(error.message,'error');}
}
orderingBank.forEach((button,id)=>button.addEventListener('click',()=>{if(button.disabled||orderingBusy||!orderingReady||teacherMapReturn)return;orderingSelected=orderingSelected===id?null:id;renderOrderingMove();orderingMessage(orderingSelected===null?'':'Atinge căsuța în care vrei să muți '+orderingLabel(orderingNumbers[id])+'.');}));
orderingSlots.forEach((button,index)=>button.addEventListener('click',()=>{
 if(button.disabled||orderingBusy||!orderingReady||teacherMapReturn)return;
 const occupant=orderingPlaces[index];
 if(orderingSelected===null){if(occupant===null){orderingMessage('Atinge mai întâi un număr.');return;}orderingSelected=occupant;renderOrderingMove();orderingMessage('Atinge căsuța în care vrei să muți '+orderingLabel(orderingNumbers[occupant])+'.');return;}
 const old=orderingPlaces.indexOf(orderingSelected);
 if(old===index){orderingSelected=null;renderOrderingMove();orderingMessage();return;}
 if(old!==-1)orderingPlaces[old]=occupant;
 orderingPlaces[index]=orderingSelected;orderingSelected=null;renderOrderingMove();orderingMessage();
}));
$('ordering-check').addEventListener('click',async()=>{
 if(orderingBusy||!orderingReady||teacherMapReturn)return;
 if(orderingPlaces.includes(null)){orderingMessage('Așază toate cele patru numere în căsuțe.','error');return;}
 const revision=comparisonRevision,sid=mapProfile.studentId;orderingSelected=null;orderingBusy=true;renderOrderingMove();orderingMessage('Se verifică…');
 try{const r=await studentAuth.ordering('answer',{chest:activeOrderingChest,answer:orderingPlaces.map(id=>orderingNumbers[id])});if(revision!==comparisonRevision||$('ordering-exercise-page').hidden||mapProfile?.studentId!==sid||teacherMapReturn)return;applyOrderingProfile(r.profile);orderingSlots.forEach(button=>button.className='ordering-slot '+(r.correct?'correct':'incorrect'));orderingMessage(r.correct?'Corect! Steluța este salvată.':'Mai încearcă! Poți muta numerele între căsuțe.',r.correct?'success':'error');}
 catch(error){if(revision===comparisonRevision&&!$('ordering-exercise-page').hidden)orderingMessage(error.message,'error');}
 finally{if(revision===comparisonRevision){orderingBusy=false;for(const [id,button] of orderingBank.entries())button.disabled=!orderingReady||!!teacherMapReturn||orderingPlaces.includes(id);for(const button of orderingSlots)button.disabled=!orderingReady||!!teacherMapReturn;$('ordering-check').disabled=!orderingReady||!!teacherMapReturn;}}
});
$('ordering-exercise-back').addEventListener('click',()=>{comparisonRevision++;orderingBusy=false;orderingReady=false;$('roman-match-page').hidden=true;$('roman-exercise-page').hidden=true;$('rounding-exercise-page').hidden=true;$('ordering-exercise-page').hidden=true;$('lesson-content-page').hidden=false;renderOrdering();$('ordering-chests').children[activeOrderingChest-1]?.focus();window.scrollTo(0,0);});

$('rounding-key').addEventListener('click',async()=>{if(teacherMapReturn||roundingBusy||$('rounding-key').disabled)return;roundingBusy=true;const revision=comparisonRevision;try{const r=await studentAuth.rounding('take_key');if(revision!==comparisonRevision)return;applyRoundingProfile(r.profile);$('lesson-content-message').textContent='Ai luat cheia lecției 6!';}catch(e){if(revision===comparisonRevision)$('lesson-content-message').textContent=e.message;}finally{roundingBusy=false;if(revision===comparisonRevision)renderRounding();}});
const roundingExercises={1:{number:47,unit:'zeci',digit:'unităților',image:$('rounding-exercise-image').src},2:{number:464,unit:'zeci',digit:'unităților',image:$('rounding-exercise-source-2').src},3:{number:6446,unit:'zeci',digit:'unităților',image:$('rounding-exercise-source-3').src},4:{number:7275,unit:'zeci',digit:'unităților',image:$('rounding-exercise-source-4').src},5:{number:482,unit:'sute',digit:'zecilor',image:$('rounding-exercise-source-5').src},6:{number:524,unit:'sute',digit:'zecilor',image:$('rounding-exercise-source-6').src},7:{number:6476,unit:'sute',digit:'zecilor',image:$('rounding-exercise-source-7').src},8:{number:3752,unit:'sute',digit:'zecilor',image:$('rounding-exercise-source-8').src},9:{number:2346,unit:'mii',digit:'sutelor',image:$('rounding-exercise-source-9').src},10:{number:4782,unit:'mii',digit:'sutelor',image:$('rounding-exercise-source-10').src},11:{number:6499,unit:'mii',digit:'sutelor',image:$('rounding-exercise-source-11').src},12:{number:8500,unit:'mii',digit:'sutelor',image:$('rounding-exercise-source-12').src}};
let roundingReturnFocus=null,roundingBusy=false,roundingReady=false,activeRoundingChest=1;
function renderRounding(){
 const keyReady=(mapProfile?.lessonProgress?.[1]?.roundingSolved||[]).length>=6,taken=!!mapProfile?.lessonProgress?.[1]?.roundingKeyTaken;
 $('rounding-key').disabled=!keyReady||taken||!!teacherMapReturn||roundingBusy;
 $('rounding-key').className=taken?'rounding-key-collected':keyReady?'rounding-key-ready':'';
 $('rounding-key').setAttribute('aria-label',taken?'Cheia lecției 6 a fost luată':keyReady?'Ia cheia lecției 6':'Obține 6 steluțe pentru cheia lecției 6');
 $('rounding-key').title=taken?'Cheie luată':keyReady?'Ia cheia lecției 6':'Obține 6 steluțe';
 const solved=[...new Set((mapProfile?.lessonProgress?.[1]?.roundingSolved||[]).filter(id=>roundingExercises[id]))];
 $('rounding-count').textContent=solved.length+'/12';$('rounding-bar').value=solved.length;
 $('rounding-chests').replaceChildren();
 const left=[[22.7,35.7,48,60.1],[21.5,34.4,47.4,60],[21.5,34.7,47.7,60.4]],top=[40.5,57.1,74.1];
 for(let id=1;id<=12;id++){
  const row=Math.floor((id-1)/4),col=(id-1)%4,button=document.createElement('button');button.type='button';button.className='comparison-chest'+(solved.includes(id)?' complete':'');if(solved.includes(id)){const star=document.createElement('span');star.textContent='★';button.append(star);}
  button.setAttribute('aria-label','Lecția 5, lădița '+id+(roundingExercises[id]?' — rotunjește '+roundingExercises[id].number+' la '+roundingExercises[id].unit+(solved.includes(id)?' — rezolvată':''):' — exercițiul urmează să fie adăugat'));
  Object.assign(button.style,{left:left[row][col]+'%',top:top[row]+'%',width:'12.9%',height:'18%'});
  button.addEventListener('click',()=>{if(roundingExercises[id])return openRoundingExercise(id);roundingReturnFocus=button;$('rounding-dialog-title').textContent='Lădița '+id;$('rounding-dialog').showModal();$('rounding-dialog-close').focus();});
  $('rounding-chests').append(button);
 }
 $('lesson-content-message').textContent=solved.length+' din 12 steluțe. Toate cele 12 lădițe sunt disponibile.'+(teacherMapReturn?' Vizualizare profesor.':'');
}
for(const id of ['rounding-dialog-close','rounding-dialog-return'])$(id).addEventListener('click',()=>$('rounding-dialog').close());
$('rounding-dialog').addEventListener('close',()=>roundingReturnFocus?.focus());
$('rounding-back-sign').addEventListener('click',()=>openForest());
function roundingControls(){const disabled=roundingBusy||!roundingReady||!!teacherMapReturn;$('rounding-answer').disabled=disabled;$('rounding-check').disabled=disabled;}
function roundingMessage(message=''){ $('rounding-exercise-status').textContent=message; }
function applyRoundingProfile(profile){if(!profile||profile.studentId!==mapProfile?.studentId)throw new Error('Profilul elevului nu corespunde.');renderMap(profile);renderForest(mapProfile);renderRounding();}
async function openRoundingExercise(id=1){
 const exercise=roundingExercises[id];if(!exercise)return;activeRoundingChest=id;
 $('rounding-exercise-image').src=exercise.image;$('rounding-exercise-image').alt='Rotunjește numărul '+exercise.number+' la '+exercise.unit+'. Privește cifra '+exercise.digit+'. 0, 1, 2, 3, 4: rotunjește prin eliminare. 5, 6, 7, 8, 9: rotunjește prin adăugare.';
 $('rounding-exercise-page').setAttribute('aria-label','Lecția 5, lădița '+id+' — Rotunjește '+exercise.number+' la '+exercise.unit);$('rounding-answer').setAttribute('aria-label','Numărul '+exercise.number+' rotunjit la '+exercise.unit);
 const revision=++comparisonRevision,sid=mapProfile.studentId;roundingBusy=false;roundingReady=false;
 $('rounding-answer').value='';$('rounding-answer').className='';$('rounding-answer').setAttribute('aria-invalid','false');roundingControls();
 $('lesson-content-page').hidden=true;$('rounding-exercise-page').hidden=false;$('rounding-exercise-back').focus();window.scrollTo(0,0);
 roundingMessage(teacherMapReturn?'Vizualizare profesor. Progresul elevilor nu este modificat.':'Se verifică accesul…');
 if(teacherMapReturn)return;
 try{const r=await studentAuth.rounding('state');if(revision!==comparisonRevision||$('rounding-exercise-page').hidden||mapProfile?.studentId!==sid||teacherMapReturn)return;applyRoundingProfile(r.profile);roundingReady=true;roundingControls();roundingMessage();$('rounding-answer').focus();}
 catch(error){if(revision===comparisonRevision&&!$('rounding-exercise-page').hidden)roundingMessage(error.message);}
}
async function checkRounding(){
 if(roundingBusy||!roundingReady||teacherMapReturn)return;
 const answer=$('rounding-answer').value.trim();if(!/^\d{1,5}$/.test(answer)){roundingMessage('Scrie un număr în căsuță.');$('rounding-answer').focus();return;}
 const revision=comparisonRevision,sid=mapProfile.studentId;roundingBusy=true;roundingControls();roundingMessage('Se verifică…');
 try{const r=await studentAuth.rounding('answer',{chest:activeRoundingChest,answer});if(revision!==comparisonRevision||$('rounding-exercise-page').hidden||mapProfile?.studentId!==sid||teacherMapReturn)return;applyRoundingProfile(r.profile);$('rounding-answer').className=r.correct?'correct':'incorrect';$('rounding-answer').setAttribute('aria-invalid',String(!r.correct));roundingMessage(r.correct?'Corect! Ai câștigat steluța acestei lădițe.':'Mai încearcă!');}
 catch(error){if(revision===comparisonRevision&&!$('rounding-exercise-page').hidden)roundingMessage(error.message);}
 finally{if(revision===comparisonRevision){roundingBusy=false;roundingControls();}}
}
$('rounding-check').addEventListener('click',checkRounding);
$('rounding-answer').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();checkRounding();}});
$('rounding-answer').addEventListener('input',()=>{if(!roundingBusy){$('rounding-answer').className='';$('rounding-answer').setAttribute('aria-invalid','false');roundingMessage();}});
$('rounding-exercise-back').addEventListener('click',()=>{comparisonRevision++;roundingBusy=false;roundingReady=false;$('roman-match-page').hidden=true;$('roman-exercise-page').hidden=true;$('rounding-exercise-page').hidden=true;$('lesson-content-page').hidden=false;renderRounding();$('rounding-chests').children[activeRoundingChest-1]?.focus();window.scrollTo(0,0);});
const romanExercises={1:{number:'III',unit:'cifre arabe',hint:'Cifrele identice se adună.',image:$('roman-exercise-image').src},2:{number:'XIV',unit:'cifre arabe',hint:'I înaintea lui V se scade. În celelalte cazuri, valorile se adună.',image:$('roman-exercise-source-2').src},3:{number:'23',unit:'cifre romane',romanAnswer:true,hint:'Descompune numărul în zeci și unități. Scrie întâi zecile, apoi unitățile.',image:$('roman-exercise-source-3').src},4:{number:'19',unit:'cifre romane',romanAnswer:true,hint:'Descompune numărul în zeci și unități. I înaintea lui X se scade.',image:$('roman-exercise-source-4').src},5:{matching:true,number:'asocieri',unit:'cifre arabe'},6:{matching:true,number:'asocieri',unit:'cifre arabe'},7:{matching:true,number:'asocieri',unit:'cifre arabe'},8:{matching:true,number:'asocieri',unit:'cifre arabe'},9:{matching:true,number:'asocieri',unit:'cifre romane'},10:{matching:true,number:'asocieri',unit:'cifre romane'},11:{matching:true,number:'asocieri',unit:'cifre romane'},12:{matching:true,number:'asocieri',unit:'cifre romane'}};
let romanReturnFocus=null,romanBusy=false,romanReady=false,activeRomanChest=1;
const romanCrystalDome=$('roman-image').src;
let crystalBusy=false;
function renderRoman(){
 const count=(mapProfile?.lessonProgress?.[1]?.romanSolved||[]).filter(id=>romanExercises[id]).length,taken=!!mapProfile?.lessonProgress?.[1]?.forestCrystalTaken;
 $('roman-image').src=count>=6?$('roman-crystal-ready').src:romanCrystalDome;
 $('roman-key').disabled=count<6||taken||!!teacherMapReturn||crystalBusy;
 $('roman-key').className=count>=6&&!taken?'crystal-ready':'';
 $('roman-key').setAttribute('aria-label',taken?'Cristalul pădurii a fost câștigat':count>=6?'Ia cristalul pădurii și dezvăluie capitolul 2':'Obține 6 steluțe pentru cristalul pădurii');
 $('roman-key').title=taken?'Cristal câștigat':count>=6?'Ia cristalul pădurii':'Obține 6 steluțe';
 const solved=[...new Set((mapProfile?.lessonProgress?.[1]?.romanSolved||[]).filter(id=>romanExercises[id]))];
 $('roman-count').textContent=solved.length+'/12';$('roman-bar').value=solved.length;
 $('roman-chests').replaceChildren();
 const left=[[22.7,35.7,48,60.1],[21.5,34.4,47.4,60],[21.5,34.7,47.7,60.4]],top=[40.5,57.1,74.1];
 for(let id=1;id<=12;id++){
  const row=Math.floor((id-1)/4),col=(id-1)%4,button=document.createElement('button');button.type='button';button.className='comparison-chest'+(solved.includes(id)?' complete':'');if(solved.includes(id)){const star=document.createElement('span');star.textContent='★';button.append(star);}
  button.setAttribute('aria-label','Lecția 6, lădița '+id+(romanExercises[id]?(romanExercises[id].matching?' — asociază numerele '+(id>=9?'arabe cu numerele romane':'romane cu numerele arabe'):' — scrie '+romanExercises[id].number+' cu '+romanExercises[id].unit)+(solved.includes(id)?' — rezolvată':''):' — exercițiul urmează să fie adăugat'));
  Object.assign(button.style,{left:left[row][col]+'%',top:top[row]+'%',width:'12.9%',height:'18%'});
  button.addEventListener('click',()=>{if(romanExercises[id])return romanExercises[id].matching?openRomanMatch(id):openRomanExercise(id);romanReturnFocus=button;$('roman-dialog-title').textContent='Lădița '+id;$('roman-dialog').showModal();$('roman-dialog-close').focus();});
  $('roman-chests').append(button);
 }
 $('lesson-content-message').textContent=solved.length+' din 12 steluțe. Toate cele 12 lădițe sunt disponibile.'+(teacherMapReturn?' Vizualizare profesor.':'');
}
$('roman-key').addEventListener('click',async()=>{
 if(crystalBusy||teacherMapReturn||$('roman-key').disabled)return;
 const sid=mapProfile.studentId,revision=comparisonRevision;crystalBusy=true;renderRoman();
 try{const r=await studentAuth.roman('take_crystal');if(mapProfile?.studentId!==sid||revision!==comparisonRevision||teacherMapReturn)return;applyRomanProfile(r.profile);$('lesson-content-page').hidden=true;$('forest-page').hidden=true;$('map-page').hidden=false;$('map-summary').textContent='Ai cucerit Pădurea numerelor fermecate! Cristalul pădurii a dezvăluit Valea adunării și scăderii.';$('map-chapters').children[1]?.focus();window.scrollTo(0,0);}
 catch(e){if(revision===comparisonRevision)$('lesson-content-message').textContent=e.message;}
 finally{crystalBusy=false;renderRoman();}
});
for(const id of ['roman-dialog-close','roman-dialog-return'])$(id).addEventListener('click',()=>$('roman-dialog').close());
$('roman-dialog').addEventListener('close',()=>romanReturnFocus?.focus());
$('roman-back-sign').addEventListener('click',()=>openForest());
function romanControls(){const disabled=romanBusy||!romanReady||!!teacherMapReturn;$('roman-answer').disabled=disabled;$('roman-check').disabled=disabled;}
function romanMessage(message=''){ $('roman-exercise-status').textContent=message; }
function applyRomanProfile(profile){if(!profile||profile.studentId!==mapProfile?.studentId)throw new Error('Profilul elevului nu corespunde.');renderMap(profile);renderForest(mapProfile);renderRoman();}
async function openRomanExercise(id=1){
 const exercise=romanExercises[id];if(!exercise)return;activeRomanChest=id;
 $('roman-exercise-image').src=exercise.image;$('roman-exercise-image').alt='Scrie cu '+exercise.unit+' numărul '+exercise.number+'. Indiciu: I = 1, V = 5, X = 10. '+exercise.hint;
 $('roman-exercise-page').setAttribute('aria-label','Lecția 6, lădița '+id+' — Scrie '+exercise.number+' cu '+exercise.unit);$('roman-answer').setAttribute('aria-label','Numărul '+exercise.number+' scris cu '+exercise.unit);
 $('roman-answer').setAttribute('inputmode',exercise.romanAnswer?'text':'numeric');$('roman-answer').setAttribute('pattern',exercise.romanAnswer?'[IVXLCDMivxlcdm ]*':'[0-9]*');$('roman-answer').setAttribute('maxlength',exercise.romanAnswer?'20':'5');$('roman-answer').setAttribute('autocapitalize',exercise.romanAnswer?'characters':'off');$('roman-answer').setAttribute('spellcheck','false');$('roman-answer').style.fontSize=exercise.romanAnswer?'clamp(32px,4vw,66px)':'';
 const revision=++comparisonRevision,sid=mapProfile.studentId;romanBusy=false;romanReady=false;
 $('roman-answer').value='';$('roman-answer').className='';$('roman-answer').setAttribute('aria-invalid','false');romanControls();
 $('lesson-content-page').hidden=true;$('roman-exercise-page').hidden=false;$('roman-exercise-back').focus();window.scrollTo(0,0);
 romanMessage(teacherMapReturn?'Vizualizare profesor. Progresul elevilor nu este modificat.':'Se verifică accesul…');
 if(teacherMapReturn)return;
 try{const r=await studentAuth.roman('state');if(revision!==comparisonRevision||$('roman-exercise-page').hidden||mapProfile?.studentId!==sid||teacherMapReturn)return;applyRomanProfile(r.profile);romanReady=true;romanControls();romanMessage();$('roman-answer').focus();}
 catch(error){if(revision===comparisonRevision&&!$('roman-exercise-page').hidden)romanMessage(error.message);}
}
async function checkRoman(){
 if(romanBusy||!romanReady||teacherMapReturn)return;
 const exercise=romanExercises[activeRomanChest];const answer=exercise.romanAnswer?$('roman-answer').value.replace(/\s/g,'').toUpperCase():$('roman-answer').value.trim();
 if(!(exercise.romanAnswer?/^[IVXLCDM]{1,15}$/:/^\d{1,5}$/).test(answer)){romanMessage(exercise.romanAnswer?'Scrie răspunsul cu cifre romane.':'Scrie un număr în căsuță.');$('roman-answer').focus();return;}
 const revision=comparisonRevision,sid=mapProfile.studentId;romanBusy=true;romanControls();romanMessage('Se verifică…');
 try{const r=await studentAuth.roman('answer',{chest:activeRomanChest,answer});if(revision!==comparisonRevision||$('roman-exercise-page').hidden||mapProfile?.studentId!==sid||teacherMapReturn)return;applyRomanProfile(r.profile);$('roman-answer').className=r.correct?'correct':'incorrect';$('roman-answer').setAttribute('aria-invalid',String(!r.correct));romanMessage(r.correct?'Corect! Ai câștigat steluța acestei lădițe.':'Mai încearcă!');}
 catch(error){if(revision===comparisonRevision&&!$('roman-exercise-page').hidden)romanMessage(error.message);}
 finally{if(revision===comparisonRevision){romanBusy=false;romanControls();}}
}
$('roman-check').addEventListener('click',checkRoman);
$('roman-answer').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();checkRoman();}});
$('roman-answer').addEventListener('input',()=>{if(!romanBusy){$('roman-answer').className='';$('roman-answer').setAttribute('aria-invalid','false');romanMessage();}});
$('roman-exercise-back').addEventListener('click',()=>{comparisonRevision++;romanBusy=false;romanReady=false;$('roman-match-page').hidden=true;$('roman-exercise-page').hidden=true;$('lesson-content-page').hidden=false;renderRoman();$('roman-chests').children[activeRomanChest-1]?.focus();window.scrollTo(0,0);});
const romanMatchExercises={
 5:{roman:['VI','XII','XXIV','XXXI'],arabic:[24,9,31,6,12],image:$('roman-match-image').src,top:[25.4,38.2,51.4,64.5],ty:37.6,tw:11.2,bottom:[26.1,36.4,46.8,57.2,67.5],by:59.3,bw:8.8},
 6:{roman:['IV','XIX','XXVII','XXXV'],arabic:[27,35,14,19,4],image:$('roman-match-source-6').src,top:[24.6,37.8,51,64.2],ty:36.8,tw:11.2,bottom:[26.4,36.8,47,57.3,67.5],by:60.5,bw:8.5},
 7:{roman:['IX','XVI','XXIX','XXXVIII'],arabic:[16,29,38,9,26],image:$('roman-match-source-7').src,top:[24.6,37.9,51.1,64.3],ty:37.6,tw:11.7,bottom:[26.1,36.5,46.9,57.3,67.6],by:60.7,bw:8.9},
 8:{roman:['XIV','XXII','XXXIV','XXXIX'],arabic:[39,24,14,34,22],image:$('roman-match-source-8').src,top:[23.7,37.7,51.7,65.5],ty:38.1,tw:11.7,bottom:[26,36.5,46.9,57.4,67.8],by:61.4,bw:8.8},
 9:{reverse:true,roman:[7, 18, 26, 39],arabic:[26, 7, 34, 39, 18],labels:["XXVI", "VII", "XXXIV", "XXXIX", "XVIII"],image:$('roman-match-source-reverse').src,top:[23.7,37.7,51.7,65.5],ty:38.1,tw:11.7,bottom:[26,36.5,46.9,57.4,67.8],by:61.4,bw:8.8},
 10:{reverse:true,roman:[4, 13, 29, 35],arabic:[35, 19, 4, 29, 13],labels:["XXXV", "XIX", "IV", "XXIX", "XIII"],image:$('roman-match-source-reverse').src,top:[23.7,37.7,51.7,65.5],ty:38.1,tw:11.7,bottom:[26,36.5,46.9,57.4,67.8],by:61.4,bw:8.8},
 11:{reverse:true,roman:[9, 21, 32, 37],arabic:[32, 9, 37, 24, 21],labels:["XXXII", "IX", "XXXVII", "XXIV", "XXI"],image:$('roman-match-source-reverse').src,top:[23.7,37.7,51.7,65.5],ty:38.1,tw:11.7,bottom:[26,36.5,46.9,57.4,67.8],by:61.4,bw:8.8},
 12:{reverse:true,roman:[14, 23, 28, 36],arabic:[28, 36, 14, 33, 23],labels:["XXVIII", "XXXVI", "XIV", "XXXIII", "XXIII"],image:$('roman-match-source-reverse').src,top:[23.7,37.7,51.7,65.5],ty:38.1,tw:11.7,bottom:[26,36.5,46.9,57.4,67.8],by:61.4,bw:8.8}
};
const matchColors=['#246ba6','#9a4faa','#c2781e','#238276'];
let matchChest=5,matchPairs=[null,null,null,null],matchSelected=null,matchHistory=[],matchChecks=null,matchReady=false,matchBusy=false,matchRomanButtons=[],matchArabicButtons=[];
function matchTop(ex,i){return ex.roman[i];}
function matchBottom(ex,j){return ex.reverse?ex.labels[j]:ex.arabic[j];}
function matchInstruction(ex){return ex.reverse?'Atinge un număr arab, apoi numărul roman potrivit. Un număr roman rămâne nefolosit.':'Atinge un număr roman, apoi numărul arab potrivit. Un număr arab rămâne nefolosit.';}
function matchLabel(b,value){const label=document.createElement('strong');label.textContent=value;label.setAttribute('aria-hidden','true');b.append(label);}
function matchStatus(text){$('roman-match-status').textContent=text;}
function renderMatch(){
 const ex=romanMatchExercises[matchChest],disabled=matchBusy||!matchReady||!!teacherMapReturn;
 for(let i=0;i<4;i++){const b=matchRomanButtons[i];if(!b)continue;b.className='roman-match-choice';b.replaceChildren();if(ex.reverse)matchLabel(b,matchTop(ex,i));b.disabled=disabled;b.setAttribute('aria-pressed',String(matchSelected===i));b.setAttribute('aria-label',ex.roman[i]+(matchPairs[i]===null?' — fără asociere':' — asociat cu '+matchBottom(ex,matchPairs[i])));if(matchSelected===i)b.className+=' selected';}
 for(let j=0;j<5;j++){const b=matchArabicButtons[j];if(!b)continue;b.className='roman-match-choice';b.replaceChildren();if(ex.reverse)matchLabel(b,matchBottom(ex,j));b.disabled=disabled;b.setAttribute('aria-label','Numărul '+matchBottom(ex,j));}
 for(let i=0;i<4;i++){const j=matchPairs[i];if(j===null)continue;for(const b of [matchRomanButtons[i],matchArabicButtons[j]]){b.className+=' paired';b.style.setProperty('--pair',matchColors[i]);if(matchChecks)b.className+=matchChecks[i]?' correct':' incorrect';const tag=document.createElement('span');tag.textContent=matchChecks?(matchChecks[i]?'✓':'✕'):String(i+1);tag.setAttribute('aria-hidden','true');b.append(tag);}matchArabicButtons[j].setAttribute('aria-label',matchBottom(ex,j)+' — asociat cu '+ex.roman[i]);}
 $('roman-match-count').textContent='Asocieri: '+matchPairs.filter(j=>j!==null).length+'/4';$('roman-match-check').disabled=disabled;$('roman-match-reset').disabled=disabled||matchPairs.every(j=>j===null);$('roman-match-undo').disabled=disabled||matchHistory.length===0;
 const svg=$('roman-match-lines');svg.replaceChildren();for(let i=0;i<4;i++){const j=matchPairs[i];if(j===null)continue;const x1=(ex.top[i]+ex.tw/2)*16.72,y1=(ex.ty+11.5)*9.41,x2=(ex.bottom[j]+ex.bw/2)*16.72,y2=ex.by*9.41;const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${x1} ${y1} C ${x1} ${y1+40}, ${x2} ${y2-40}, ${x2} ${y2}`);path.setAttribute('fill','none');path.setAttribute('stroke',matchChecks?(matchChecks[i]?'#12823c':'#c12e24'):matchColors[i]);path.setAttribute('stroke-width','6');path.setAttribute('stroke-linecap','round');if(matchChecks&&!matchChecks[i])path.setAttribute('stroke-dasharray','12 8');svg.append(path);}
}
async function openRomanMatch(id){
 const ex=romanMatchExercises[id];if(!ex)return;matchChest=id;const revision=++comparisonRevision,sid=mapProfile.studentId;matchPairs=[null,null,null,null];matchSelected=null;matchHistory=[];matchChecks=null;matchReady=false;matchBusy=false;
 $('roman-match-image').src=ex.image;$('roman-match-image').alt='Asociază '+ex.roman.join(', ')+' cu '+(ex.reverse?ex.labels:ex.arabic).join(', ')+'. Un număr '+(ex.reverse?'roman':'arab')+' rămâne nefolosit.';$('roman-match-art').className='roman-match-art'+(ex.reverse?' reverse':'');$('roman-match-badge').hidden=!ex.reverse;$('roman-match-badge').textContent=({9:'IX',10:'X',11:'XI',12:'XII'})[id]||'';$('roman-match-page').setAttribute('aria-label','Lecția 6, lădița '+id+' — Unește perechile');
 $('roman-match-romans').replaceChildren();$('roman-match-arabic').replaceChildren();matchRomanButtons=[];matchArabicButtons=[];
 for(let i=0;i<4;i++){const b=document.createElement('button');b.type='button';Object.assign(b.style,{left:ex.top[i]+'%',top:ex.ty+'%',width:ex.tw+'%',height:'11.5%'});b.addEventListener('click',()=>{if(matchBusy||!matchReady||teacherMapReturn)return;matchSelected=matchSelected===i?null:i;renderMatch();matchStatus(matchSelected===null?matchInstruction(ex):'Ai ales '+ex.roman[i]+'. Atinge numărul '+(ex.reverse?'roman':'arab')+' potrivit.');});matchRomanButtons.push(b);$('roman-match-romans').append(b);}
 for(let j=0;j<5;j++){const b=document.createElement('button');b.type='button';Object.assign(b.style,{left:ex.bottom[j]+'%',top:ex.by+'%',width:ex.bw+'%',height:'11.5%'});b.addEventListener('click',()=>{if(matchBusy||!matchReady||teacherMapReturn)return;if(matchSelected===null){matchStatus('Atinge întâi un număr '+(ex.reverse?'arab':'roman')+' de pe primul rând.');return;}matchHistory.push([...matchPairs]);const i=matchSelected;if(matchPairs[i]===j)matchPairs[i]=null;else{matchPairs=matchPairs.map(v=>v===j?null:v);matchPairs[i]=j;}matchSelected=null;matchChecks=null;renderMatch();matchStatus('Asociere actualizată. Poți schimba orice pereche alegând din nou cele două numere.');});matchArabicButtons.push(b);$('roman-match-arabic').append(b);}
 $('roman-exercise-page').hidden=true;$('lesson-content-page').hidden=true;$('roman-match-page').hidden=false;renderMatch();matchStatus(teacherMapReturn?'Vizualizare profesor. Progresul elevilor nu este modificat.':'Se verifică accesul…');$('roman-match-back').focus();window.scrollTo(0,0);
 if(teacherMapReturn)return;try{const r=await studentAuth.roman('state');if(revision!==comparisonRevision||mapProfile?.studentId!==sid||$('roman-match-page').hidden||teacherMapReturn)return;applyRomanProfile(r.profile);matchReady=true;renderMatch();matchStatus(matchInstruction(ex));}catch(error){if(revision===comparisonRevision)matchStatus(error.message);}
}
$('roman-match-undo').addEventListener('click',()=>{if(matchBusy||!matchReady||teacherMapReturn||!matchHistory.length)return;matchPairs=matchHistory.pop();matchSelected=null;matchChecks=null;renderMatch();matchStatus('Ultima asociere a fost anulată.');});
$('roman-match-reset').addEventListener('click',()=>{if(matchBusy||!matchReady||teacherMapReturn)return;matchPairs=[null,null,null,null];matchSelected=null;matchHistory=[];matchChecks=null;renderMatch();matchStatus(matchInstruction(romanMatchExercises[matchChest]));});
$('roman-match-check').addEventListener('click',async()=>{
 if(matchBusy||!matchReady||teacherMapReturn)return;if(matchPairs.some(j=>j===null)){matchStatus('Asociază toate cele patru numere înainte de verificare.');return;}
 const revision=comparisonRevision,sid=mapProfile.studentId,chest=matchChest,answer=matchPairs.map(j=>romanMatchExercises[chest].arabic[j]);matchBusy=true;renderMatch();matchStatus('Se verifică…');
 try{const r=await studentAuth.roman('match',{chest,answer});if(revision!==comparisonRevision||mapProfile?.studentId!==sid||$('roman-match-page').hidden||teacherMapReturn)return;applyRomanProfile(r.profile);matchChecks=Array.isArray(r.matches)&&r.matches.length===4?r.matches:null;matchStatus(r.correct?'Corect! Toate cele patru perechi sunt potrivite. Steluța acestei lădițe este salvată.':'Mai încearcă! Corectează perechile marcate cu roșu și verifică din nou.');}catch(error){if(revision===comparisonRevision)matchStatus(error.message);}finally{if(revision===comparisonRevision){matchBusy=false;renderMatch();}}
});
$('roman-match-back').addEventListener('click',()=>{comparisonRevision++;matchBusy=false;matchReady=false;$('roman-match-page').hidden=true;$('lesson-content-page').hidden=false;renderRoman();$('roman-chests').children[matchChest-1]?.focus();window.scrollTo(0,0);});

function openLessonContent(lesson){
 $('lesson-dialog').close();$('forest-page').hidden=true;
 $('lesson-content-title').textContent=lesson.id+'. '+lesson.title;
 $('roman-match-page').hidden=true;$('roman-exercise-page').hidden=true;$('rounding-exercise-page').hidden=true;$('ordering-exercise-page').hidden=true;$('comparison-exercise-page').hidden=true;comparisonRevision++;comparisonBusy=false;orderingBusy=false;$('comparison-panel').hidden=lesson.id!==3;if(lesson.id===3)renderComparison();$('ordering-panel').hidden=lesson.id!==4;if(lesson.id===4)renderOrdering();
 $('rounding-panel').hidden=lesson.id!==5;if(lesson.id===5)renderRounding();$('roman-panel').hidden=lesson.id!==6;if(lesson.id===6)renderRoman();
 if(lesson.id!==3&&lesson.id!==4&&lesson.id!==5&&lesson.id!==6)$('lesson-content-message').textContent='Exercițiile acestei lecții urmează să fie adăugate.';
 $('lesson-content-page').hidden=false;$('lesson-content-back').focus();window.scrollTo(0,0);
}
$('lesson-content-back').addEventListener('click',()=>openForest());
function setComparisonControls(){
 const disabled=comparisonBusy||!comparisonReady||!!teacherMapReturn;
 for(const [id] of comparisonChoices)$(id).disabled=disabled;
 $('comparison-check').disabled=disabled;
}
function clearComparisonFeedback(){
 $('comparison-result').textContent='';$('comparison-result').className='';$('comparison-result').setAttribute('aria-label','');
 $('comparison-exercise-status').textContent=teacherMapReturn?'Vizualizare profesor. Progresul elevilor nu este modificat.':'';
}
function applyComparisonProfile(profile){
 if(!profile||profile.studentId!==mapProfile?.studentId)throw new Error('Profilul elevului nu corespunde.');
 renderMap(profile);renderForest(mapProfile);renderComparison();
}
async function openComparisonExercise(id){
 const exercise=comparisonExercises[id];if(!exercise)return;activeComparisonChest=id;
 $('comparison-exercise-image').src=exercise.image;$('comparison-exercise-image').alt='Compară numerele '+exercise.left+' și '+exercise.right+'. Completează căsuța cu semnul potrivit: mai mic, mai mare sau egal.';
 $('comparison-exercise-page').setAttribute('aria-label','Lecția 3, lădița '+id+' — Compară '+exercise.left+' și '+exercise.right);
 const revision=++comparisonRevision,sid=mapProfile.studentId;
 comparisonSelected=null;comparisonBusy=false;comparisonReady=false;
 $('comparison-selected').textContent='';for(const [id] of comparisonChoices){$(id).setAttribute('aria-pressed','false');}
 clearComparisonFeedback();setComparisonControls();$('lesson-content-page').hidden=true;$('comparison-exercise-page').hidden=false;window.scrollTo(0,0);$('comparison-exercise-back').focus();
 if(teacherMapReturn)return;
 $('comparison-exercise-status').textContent='Se verifică accesul…';
 try{
  const r=await studentAuth.comparison('state');if(revision!==comparisonRevision||$('comparison-exercise-page').hidden||mapProfile?.studentId!==sid||teacherMapReturn)return;
  applyComparisonProfile(r.profile);comparisonReady=true;setComparisonControls();clearComparisonFeedback();$('comparison-choice-less').focus();
 }catch(error){if(revision===comparisonRevision&&!$('comparison-exercise-page').hidden){$('comparison-exercise-status').textContent=error.message;}}
}
for(const [id,sign] of comparisonChoices)$(id).addEventListener('click',()=>{
 if(comparisonBusy||!comparisonReady||teacherMapReturn)return;
 comparisonSelected=sign;$('comparison-selected').textContent=sign;
 for(const [button,value] of comparisonChoices)$(button).setAttribute('aria-pressed',String(value===sign));clearComparisonFeedback();
});
$('comparison-check').addEventListener('click',async()=>{
 if(comparisonBusy||!comparisonReady||teacherMapReturn)return;
 if(!comparisonSelected){$('comparison-exercise-status').textContent='Alege unul dintre semnele <, > sau =.';return;}
 comparisonBusy=true;setComparisonControls();$('comparison-exercise-status').textContent='Se verifică…';const revision=comparisonRevision,sid=mapProfile.studentId;
 try{
  const r=await studentAuth.comparison('answer',{chest:activeComparisonChest,answer:comparisonSelected});
  if(revision!==comparisonRevision||$('comparison-exercise-page').hidden||mapProfile?.studentId!==sid||teacherMapReturn)return;
  applyComparisonProfile(r.profile);$('comparison-result').textContent=r.correct?'✓':'✕';$('comparison-result').className=r.correct?'correct':'incorrect';$('comparison-result').setAttribute('aria-label',r.correct?'Răspuns corect':'Răspuns greșit');
  $('comparison-exercise-status').textContent=r.correct?'Corect! Steluța este salvată. Poți exersa din nou.':'Mai încearcă. Alege alt semn și verifică din nou.';
 }catch(error){if(revision===comparisonRevision&&!$('comparison-exercise-page').hidden)$('comparison-exercise-status').textContent=error.message;}
 finally{if(revision===comparisonRevision){comparisonBusy=false;setComparisonControls();}}
});
$('comparison-exercise-back').addEventListener('click',()=>{
 comparisonRevision++;comparisonBusy=false;comparisonReady=false;$('roman-match-page').hidden=true;$('roman-exercise-page').hidden=true;$('rounding-exercise-page').hidden=true;$('ordering-exercise-page').hidden=true;$('comparison-exercise-page').hidden=true;$('lesson-content-page').hidden=false;renderComparison();$('comparison-chests').children[(activeComparisonChest||1)-1]?.focus();window.scrollTo(0,0);
});
function renderForest(profile){
 const p=profile.lessonProgress?.[1]||{unlocked:[1],completed:[]};
 const valid=items=>[...new Set((Array.isArray(items)?items:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=6))];
 forestState={studentId:profile.studentId,unlocked:valid(p.unlocked),completed:valid(p.completed)};
 $('forest-student').textContent=profile.displayName;
 $('forest-lessons').replaceChildren();$('forest-progress').replaceChildren();
 for(const lesson of forestLessons){
  const state=forestStatus(lesson.id);const label=state==='complete'?'parcursă':state==='available'?'deblocată':'blocată';
  const button=document.createElement('button');button.type='button';button.className='lesson-hotspot '+state;button.setAttribute('aria-label',lesson.id+'. '+lesson.title+' — '+label);button.setAttribute('aria-disabled','false');
  const [left,top,width,height]=lesson.box;Object.assign(button.style,{left:left+'%',top:top+'%',width:width+'%',height:height+'%'});
  if(lesson.id!==1&&previousKey(mapProfile,lesson.id))Object.assign(button.style,{backgroundImage:'url("'+$(lesson.id===2?'forest-unlocked-source':'forest-color-source').src+'")',backgroundSize:(10000/width)+'% '+(10000/height)+'%',backgroundPosition:(left/(100-width)*100)+'% '+(top/(100-height)*100)+'%',backgroundRepeat:'no-repeat'});
  const badge=document.createElement('span');badge.className='lesson-state';badge.setAttribute('aria-hidden','true');badge.textContent=state==='locked'?'🔒':state==='complete'?'✓':'↪';if(lesson.id!==2||state==='complete')button.append(badge);
  button.addEventListener('click',()=>showForestLesson(lesson));$('forest-lessons').append(button);
  if(lesson.id===3&&mapProfile.lessonProgress?.[1]?.comparisonLockOpened===false){
   const lock=document.createElement('button');lock.type='button';lock.className='lesson-lock';lock.textContent='🔒';lock.setAttribute('aria-label','Deschide lacătul lecției 3 cu cheia câștigată');
   Object.assign(lock.style,{left:(left+width*.4)+'%',top:(top+height*.72)+'%',bottom:'auto'});
   lock.addEventListener('click',async()=>{if(teacherMapReturn||lockBusy)return;lockBusy=true;lock.disabled=true;const sid=mapProfile.studentId;try{const r=await studentAuth.comparison('open_lock');if(mapProfile?.studentId!==sid||teacherMapReturn)return;renderMap(r.profile);renderForest(mapProfile);}catch(e){$('lesson-title').textContent='Lacătul lecției 3';$('lesson-message').textContent=e.message;$('lesson-dialog').showModal();}finally{lockBusy=false;lock.disabled=false;}});$('forest-lessons').append(lock);
  }
  if(lesson.id===2&&!mapProfile.formation?.lesson2Opened){
   const lock=document.createElement('button');lock.type='button';lock.className='lesson-lock';lock.textContent='🔒';lock.setAttribute('aria-label','Deschide lacătul lecției 2 cu cheia câștigată');
   Object.assign(lock.style,{left:(left+width*.40)+'%',top:(top+height*.72)+'%',bottom:'auto'});lock.addEventListener('click',()=>unlockLesson2(lock));$('forest-lessons').append(lock);
  }
  const tile=document.createElement('button');tile.type='button';tile.className='progress-tile'+(state==='complete'?' complete':'');tile.textContent=String(lesson.id);tile.setAttribute('aria-label','Lecția '+lesson.id+' — '+label);tile.addEventListener('click',()=>showForestLesson(lesson));$('forest-progress').append(tile);
 }
 $('forest-summary').textContent=teacherClassMode?'Harta clasei. Alege o lecție pentru a vedea exercițiile.':forestState.completed.length+' din 6 lecții parcurse — '+profile.displayName;
}
function openForest(){
 if(!mapProfile)return;
 $('lesson-content-page').hidden=true;$('roman-match-page').hidden=true;$('roman-exercise-page').hidden=true;$('rounding-exercise-page').hidden=true;$('ordering-exercise-page').hidden=true;$('comparison-exercise-page').hidden=true;comparisonRevision++;
 $('reading-page').hidden=true;
 $('formation-page').hidden=true;
 renderForest(mapProfile);$('map-page').hidden=true;$('forest-page').hidden=false;$('forest-back').focus();window.scrollTo(0,0);
}
function returnToMap(){
 if(lockBusy)return;
 $('forest-page').hidden=true;$('map-page').hidden=false;
 $('map-chapters').querySelector('button').focus();window.scrollTo(0,0);
}
for(const id of ['forest-back','forest-back-sign'])$(id).addEventListener('click',returnToMap);
for(const id of ['lesson-close','lesson-return'])$(id).addEventListener('click',()=>$('lesson-dialog').close());

// Lesson 2 progress is validated and stored separately by the server.
let readingBusy=false,readingReady=false,readingReturnFocus=null,readingChest=null;
const readingExercises={1:{number:'4927',image:$('reading-exercise-image').src},2:{number:'3052',image:$('reading-exercise-source-2').src},3:{number:'8304',image:$('reading-exercise-source-3').src},4:{number:'4715',image:$('reading-exercise-source-4').src},5:{mode:'digits',number:'patru mii șase sute douăzeci și trei',image:$('reading-exercise-source-5').src},6:{mode:'digits',number:'opt mii șaptezeci și nouă',image:$('reading-exercise-source-6').src},7:{mode:'digits',number:'șase mii patru',image:$('reading-exercise-source-7').src},8:{mode:'digits',number:'șapte mii trei sute doi',image:$('reading-exercise-source-8').src},9:{number:'5274',image:$('reading-exercise-source-9').src},10:{number:'9086',image:$('reading-exercise-source-10').src},11:{mode:'digits',number:'șase mii trei sute patruzeci și doi',image:$('reading-exercise-source-11').src},12:{mode:'digits',number:'opt mii cinci sute șapte',image:$('reading-exercise-source-12').src}};
const readingDomeSource=$('reading-image').src;
const readingDigits=Array.from({length:4},(_,i)=>$('reading-digit-'+i));
function readingPrompt(exercise){return 'Scrie cu '+(exercise.mode==='digits'?'cifre':'litere')+' numărul '+exercise.number;}
function readingAvailable(){return !!(mapProfile?.formation?.keyTaken&&mapProfile?.formation?.lesson2Opened);}
function renderReading(){
 const solved=[...new Set((mapProfile?.reading?.solved||[]).filter(id=>readingExercises[id]))],count=solved.length;
 $('reading-student').textContent=mapProfile.displayName+(teacherMapReturn?' — vizualizare profesor':'');
 $('reading-count').textContent=count+'/12';$('reading-bar').value=count;
 const taken=!!mapProfile.reading?.keyTaken;
 $('reading-image').src=taken?$('reading-empty-image').src:count>=6?$('reading-key-image').src:readingDomeSource;
 $('reading-image').alt='Lecția 2: '+count+' din 12 steluțe. '+(taken?'Cheia lecției 3 a fost luată.':count>=6?'Cheia lecției 3 este eliberată.':'Cheia lecției 3 este sub cupolă.');
 $('reading-key').disabled=taken||!!teacherMapReturn||readingBusy;
 $('reading-key').setAttribute('aria-label',taken?'Cheia lecției 3 a fost luată':count>=6?'Ia cheia lecției 3':'Cheia lecției 3 — obține 6 steluțe');
 $('reading-chests').replaceChildren();
 for(let id=1;id<=12;id++){
  const button=document.createElement('button');button.type='button';button.className='reading-chest'+(solved.includes(id)?' complete':'');
  const col=(id-1)%4,row=Math.floor((id-1)/4);
  Object.assign(button.style,{left:[23,35.5,48,60][col]+'%',top:[39,56,74][row]+'%',width:'12%',height:'16%'});
  button.setAttribute('aria-label','Lecția 2, lădița '+id+(readingExercises[id]?(solved.includes(id)?' — rezolvată':' — '+readingPrompt(readingExercises[id])):' — exercițiul urmează să fie adăugat'));
  if(solved.includes(id)){const star=document.createElement('span');star.textContent='★';button.append(star);}
  button.addEventListener('click',()=>{
   if(readingBusy)return;
   if(readingExercises[id]){openReadingChest(id);return;}
   $('reading-dialog-title').textContent='Lădița '+id+' · Citirea și scrierea numerelor naturale';
   readingReturnFocus=button;$('reading-dialog').showModal();$('reading-dialog-close').focus();
  });
  $('reading-chests').append(button);
 }
 $('reading-status').textContent=count+' din 12 steluțe. Toate cele 12 lădițe sunt disponibile.'+(taken?' Cheia lecției 3 a fost luată.':count>=6?' Cupola a dispărut. Apasă cheia pentru a o lua.':' Obține 6 steluțe pentru a elibera cheia.')+(teacherMapReturn?' Vizualizare profesor.':'');
}
async function openReading(){
 if(readingBusy||!mapProfile||(!teacherMapReturn&&!readingAvailable()))return;
 readingReady=false;renderReading();$('forest-page').hidden=true;$('reading-page').hidden=false;$('reading-back').focus();window.scrollTo(0,0);
 if(teacherMapReturn)return;
 readingBusy=true;$('reading-back').disabled=true;
 try{const r=await studentAuth.reading('state');syncProfile(r.profile);readingReady=true;renderReading();}
 catch(error){$('reading-status').textContent=error.message;}
 finally{readingBusy=false;$('reading-back').disabled=false;$('reading-key').disabled=!!mapProfile?.reading?.keyTaken||!!teacherMapReturn;}
}
function openReadingChest(id){
 const exercise=readingExercises[id];if(!exercise)return;readingChest=id;
 $('reading-exercise-image').src=exercise.image;$('reading-exercise-image').alt=readingPrompt(exercise)+'.';
 $('reading-answer').setAttribute('aria-label',readingPrompt(exercise));
 $('reading-exercise-page').setAttribute('aria-label','Lecția 2, lădița '+id+' — '+readingPrompt(exercise));
 $('reading-exercise-page').className='reading-exercise-'+id;
 if(!teacherMapReturn&&!readingReady){$('reading-status').textContent='Reintră în lecție pentru a verifica accesul și conexiunea.';return;}
 $('reading-answer').value='';$('reading-answer').disabled=!!teacherMapReturn;$('reading-check').disabled=!!teacherMapReturn;
 const numeric=exercise.mode==='digits';$('reading-form').hidden=numeric;$('reading-numeric-form').hidden=!numeric;
 readingDigits.forEach(input=>{input.value='';input.disabled=!!teacherMapReturn;});$('reading-numeric-check').disabled=!!teacherMapReturn;
 clearReadingFeedback();$('reading-page').hidden=true;$('reading-exercise-page').hidden=false;window.scrollTo(0,0);(teacherMapReturn?$('reading-exercise-back'):exercise.mode==='digits'?readingDigits[0]:$('reading-answer')).focus();
}
function clearReadingFeedback(){
 $('reading-result').textContent='';$('reading-result').className='';$('reading-result').setAttribute('aria-label','');
 $('reading-exercise-status').textContent=teacherMapReturn?'Vizualizare profesor. Progresul elevului nu poate fi modificat.':'';
}
for(const id of ['reading-back','reading-back-sign'])$(id).addEventListener('click',()=>{if(!readingBusy)openForest();});
$('reading-key').addEventListener('click',async()=>{
 if(readingBusy||teacherMapReturn||mapProfile?.reading?.keyTaken)return;
 const count=new Set(mapProfile?.reading?.solved||[]).size;
 if(count<6){$('reading-status').textContent='Obține 6 steluțe pentru a elibera cheia lecției 3.';return;}
 readingBusy=true;$('reading-key').disabled=true;
 try{const r=await studentAuth.reading('take_key');syncProfile(r.profile);renderReading();$('reading-status').textContent='Ai luat cheia lecției 3! Progresul este salvat.';}
 catch(error){$('reading-status').textContent=error.message;}
 finally{readingBusy=false;$('reading-key').disabled=!!mapProfile?.reading?.keyTaken;}
});
for(const id of ['reading-dialog-close','reading-dialog-return'])$(id).addEventListener('click',()=>$('reading-dialog').close());
$('reading-dialog').addEventListener('close',()=>readingReturnFocus?.focus());
$('reading-answer').addEventListener('input',clearReadingFeedback);
async function submitReadingAnswer(answer){
 if(readingBusy||teacherMapReturn||!readingReady||!readingExercises[readingChest])return;
 readingBusy=true;setReadingControls(true);$('reading-exercise-status').textContent='Se verifică…';
 try{
  const r=await studentAuth.reading('answer',{chest:readingChest,answer});syncProfile(r.profile);renderReading();
  $('reading-result').textContent=r.correct?'✓':'✕';$('reading-result').className=r.correct?'correct':'incorrect';
  $('reading-result').setAttribute('aria-label',r.correct?'Răspuns corect':'Răspuns greșit');
  $('reading-exercise-status').textContent=r.correct?'Corect! Steluța este salvată. Poți exersa din nou.':'Mai încearcă. Poți modifica răspunsul și verifica din nou.';
 }catch(error){$('reading-exercise-status').textContent=error.message;}
 finally{readingBusy=false;setReadingControls(false);}
}
function setReadingControls(disabled){$('reading-check').disabled=disabled;$('reading-answer').disabled=disabled;$('reading-numeric-check').disabled=disabled;readingDigits.forEach(input=>input.disabled=disabled);}
$('reading-form').addEventListener('submit',async event=>{
 event.preventDefault();if(readingExercises[readingChest]?.mode==='digits')return;
 if(!$('reading-answer').value.trim()){$('reading-exercise-status').textContent='Scrie numărul folosind litere.';return;}
 await submitReadingAnswer($('reading-answer').value);
});
$('reading-numeric-form').addEventListener('submit',async event=>{
 event.preventDefault();if(readingExercises[readingChest]?.mode!=='digits'||readingBusy||teacherMapReturn)return;
 if(!readingDigits.every(input=>/^[0-9]$/.test(input.value))){$('reading-exercise-status').textContent='Completează toate cele patru căsuțe, inclusiv cu 0 unde este nevoie.';return;}
 await submitReadingAnswer(readingDigits.map(input=>input.value).join(''));
});
readingDigits.forEach((input,index)=>{
 input.addEventListener('input',()=>{if(readingBusy||teacherMapReturn)return;input.value=input.value.replace(/[^0-9]/g,'').slice(-1);clearReadingFeedback();if(input.value&&index<3)readingDigits[index+1].focus();});
 input.addEventListener('paste',event=>{event.preventDefault();if(readingBusy||teacherMapReturn)return;const digits=(event.clipboardData?.getData('text')||'').replace(/[^0-9]/g,'').slice(0,4-index);if(!digits)return;for(let i=0;i<digits.length;i++)readingDigits[index+i].value=digits[i];clearReadingFeedback();readingDigits[Math.min(3,index+digits.length)].focus();});
 input.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!input.value&&index>0){event.preventDefault();readingDigits[index-1].focus();}else if(event.key==='ArrowLeft'&&index>0){event.preventDefault();readingDigits[index-1].focus();}else if(event.key==='ArrowRight'&&index<3){event.preventDefault();readingDigits[index+1].focus();}});
 input.addEventListener('focus',()=>input.select());
});
$('reading-exercise-back').addEventListener('click',()=>{
 if(readingBusy)return;$('reading-answer').value='';readingDigits.forEach(input=>input.value='');clearReadingFeedback();$('reading-exercise-page').hidden=true;$('reading-page').hidden=false;renderReading();$('reading-chests').querySelector('button')?.focus();window.scrollTo(0,0);
});

let formationQuestions=[],activeChest=null,formationBusy=false,formationRevision=0,lockBusy=false;
function formationData(){const f=mapProfile?.formation||{};return {...f,solved:[...new Set((f.solved||[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=12))]};}
function syncProfile(profile){if(!profile||profile.studentId!==mapProfile?.studentId)throw new Error('Profilul elevului nu corespunde.');renderMap(profile);renderForest(profile);renderFormation();}
function renderFormation(){
 const f=formationData(),count=f.solved.length;
 $('formation-student').textContent=mapProfile.displayName+(teacherMapReturn?' — vizualizare profesor':'');
 $('formation-image').src=f.keyTaken?$('formation-empty-image').src:count>=6?$('formation-key-image').src:formationDomeSource;
 $('formation-count').textContent=count+'/12';$('formation-bar').value=count;$('formation-key').disabled=!!f.keyTaken||!!teacherMapReturn;
 $('formation-key').setAttribute('aria-label',f.keyTaken?'Cheia lecției 2 a fost luată':count>=6?'Ia cheia lecției 2':'Cheia este sub cupolă. Obține 6 steluțe.');
 $('formation-chests').replaceChildren();
 for(let id=1;id<=12;id++){
  const b=document.createElement('button');b.type='button';const solved=f.solved.includes(id);b.className='formation-chest'+(solved?' complete':'');
  const col=(id-1)%4,row=Math.floor((id-1)/4);
  Object.assign(b.style,{left:[21,33.5,46,58.5][col]+'%',top:[37,53.2,70.7][row]+'%',width:'13%',height:'17%'});
  b.setAttribute('aria-label','Lădița '+id+(solved?' — rezolvată':' — exercițiu disponibil'));
  if(solved){const star=document.createElement('span');star.textContent='★';b.append(star);}
  b.addEventListener('click',()=>openChest(id));$('formation-chests').append(b);
 }
 $('formation-status').textContent=count+' din 12 steluțe. '+(f.keyTaken?'Cheia lecției 2 a fost luată.':count>=6?'Cupola a dispărut. Apasă cheia ca să o iei.':'Obține 6 steluțe pentru a elibera cheia.')+(teacherMapReturn?' Vizualizare profesor: progresul nu este modificat.':'');
}
const formationDomeSource=$('formation-image').src;
async function openFormation(){
 if(formationBusy)return;formationBusy=true;const revision=++formationRevision;
 $('formation-status').textContent='Se încarcă lecția…';$('forest-page').hidden=true;$('formation-page').hidden=false;renderFormation();$('formation-back').focus();window.scrollTo(0,0);
 try{if(!teacherMapReturn){const r=await studentAuth.formation('exercises');if(revision!==formationRevision)return;formationQuestions=r.exercises;syncProfile(r.profile);}}
 catch(error){$('formation-status').textContent=error.message;formationQuestions=[];}
 finally{formationBusy=false;}
}
function openChest(id){
 if(formationBusy)return;
 if(id>=1&&id<=8){openChest1(id);return;}
 if(id>=9&&id<=12)openMissingChest(id);
}
$('formation-key').addEventListener('click',async()=>{
 if(formationBusy||teacherMapReturn||formationData().keyTaken)return;
 if(formationData().solved.length<6){$('formation-status').textContent='Cheia rămâne sub cupolă până obții 6 steluțe.';return;}
 formationBusy=true;try{const r=await studentAuth.formation('take_key');syncProfile(r.profile);$('formation-status').textContent='Ai luat cheia lecției 2! Revino în pădure și atinge lacătul.';}catch(error){$('formation-status').textContent=error.message;}finally{formationBusy=false;}
});
function backToForest(){if(formationBusy)return;formationRevision++;$('formation-page').hidden=true;renderForest(mapProfile);$('forest-page').hidden=false;$('forest-back').focus();window.scrollTo(0,0);}
for(const id of ['formation-back','formation-back-sign'])$(id).addEventListener('click',backToForest);
async function unlockLesson2(button){
 if(lockBusy)return;if(teacherMapReturn){$('forest-summary').textContent='Vizualizare profesor. Elevul deschide lacătul din propriul cont cu cheia câștigată.';return;}
 lockBusy=true;button.disabled=true;
 try{const r=await studentAuth.formation('open_lesson2');button.classList.add('opening');await new Promise(resolve=>setTimeout(resolve,450));syncProfile(r.profile);$('forest-summary').textContent='Lecția 2 a fost deschisă. Lacătul a dispărut.';}
 catch(error){$('forest-summary').textContent=error.message;button.disabled=false;}
 finally{lockBusy=false;}
}
// Visual chests 1–8 share transient answer fields; only the server's solved flag persists.
const visualChestSources={1:$('chest1-image').src};
for(let id=2;id<=8;id++)visualChestSources[id]=$('chest'+id+'-source').src;
const chest1Digits=Array.from({length:4},(_,i)=>$('chest1-digit-'+i));
function clearChest1Feedback(){$('chest1-result').textContent='';$('chest1-result').className='';$('chest1-result').setAttribute('aria-label','');$('chest1-status').textContent=teacherMapReturn?'Vizualizare profesor. Progresul elevului nu poate fi modificat.':'';}
function openChest1(id=1){
 if(formationBusy||!visualChestSources[id])return;activeChest=id;$('chest1-image').src=visualChestSources[id];$('chest1-image').alt='Lădița '+id+' — Ce număr se formează?';$('chest1-page').setAttribute('aria-label','Lădița '+id+' — Ce număr se formează?');$('chest1-page').className='visual-chest-'+id;chest1Digits.forEach(input=>{input.value='';input.disabled=!!teacherMapReturn;});clearChest1Feedback();$('chest1-check').disabled=!!teacherMapReturn;
 $('missing-page').hidden=true;$('formation-page').hidden=true;$('chest1-page').hidden=false;window.scrollTo(0,0);(teacherMapReturn?$('chest1-back'):chest1Digits[0]).focus();
}
chest1Digits.forEach((input,index)=>{
 input.addEventListener('input',()=>{if(formationBusy||teacherMapReturn)return;const digits=input.value.replace(/[^0-9]/g,'');input.value=digits.slice(-1);clearChest1Feedback();if(input.value&&index<3)chest1Digits[index+1].focus();});
 input.addEventListener('paste',event=>{event.preventDefault();if(formationBusy||teacherMapReturn)return;const digits=(event.clipboardData?.getData('text')||'').replace(/[^0-9]/g,'').slice(0,4-index);if(!digits)return;for(let i=0;i<digits.length;i++)chest1Digits[index+i].value=digits[i];clearChest1Feedback();chest1Digits[Math.min(3,index+digits.length)].focus();});
 input.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!input.value&&index>0){event.preventDefault();chest1Digits[index-1].focus();}else if(event.key==='ArrowLeft'&&index>0){event.preventDefault();chest1Digits[index-1].focus();}else if(event.key==='ArrowRight'&&index<3){event.preventDefault();chest1Digits[index+1].focus();}});
 input.addEventListener('focus',()=>input.select());
});
$('chest1-form').addEventListener('submit',async event=>{
 event.preventDefault();if(formationBusy||teacherMapReturn||!Number.isInteger(activeChest)||activeChest<1||activeChest>8)return;
 const chest=activeChest;
 const answer=chest1Digits.map(input=>input.value).join('');
 if(!chest1Digits.every(input=>/^[0-9]$/.test(input.value))){$('chest1-result').textContent='✕';$('chest1-result').className='incorrect';$('chest1-result').setAttribute('aria-label','Răspuns incomplet');$('chest1-status').textContent='Completează toate cele patru căsuțe cu cifre.';return;}
 formationBusy=true;$('chest1-check').disabled=true;chest1Digits.forEach(input=>input.disabled=true);$('chest1-status').textContent='Se verifică…';
 try{const r=await studentAuth.formation('answer',{chest,answer});syncProfile(r.profile);$('chest1-result').textContent=r.correct?'✓':'✕';$('chest1-result').className=r.correct?'correct':'incorrect';$('chest1-result').setAttribute('aria-label',r.correct?'Răspuns corect':'Răspuns greșit');$('chest1-status').textContent=r.correct?'Corect! Steluța este salvată. Poți exersa din nou.':'Mai încearcă. Poți modifica cifrele și verifica din nou.';}
 catch(error){clearChest1Feedback();$('chest1-status').textContent=error.message;}
 finally{formationBusy=false;$('chest1-check').disabled=false;chest1Digits.forEach(input=>input.disabled=false);}
});
$('chest1-back').addEventListener('click',()=>{if(formationBusy)return;chest1Digits.forEach(input=>input.value='');clearChest1Feedback();$('chest1-page').hidden=true;$('formation-page').hidden=false;renderFormation();$('formation-chests').querySelector('button')?.focus();window.scrollTo(0,0);});
// Last four chests ask for the whole missing term, not its place-value digit.
const missingSources={9:$('missing-image').src};
for(let id=10;id<=12;id++)missingSources[id]=$('missing-source-'+id).src;
const missingDescriptions={9:'5000 + 200 + 30 + termen lipsă. Numărul dat: 5239.',10:'3000 + 700 + termen lipsă + 5. Numărul dat: 3745.',11:'8000 + termen lipsă + 20 + 7. Numărul dat: 8327.',12:'Termen lipsă + 500 + 10 + 2. Numărul dat: 7512.'};
function clearMissingFeedback(){$('missing-result').textContent='';$('missing-result').className='';$('missing-result').setAttribute('aria-label','');$('missing-status').textContent=teacherMapReturn?'Vizualizare profesor. Progresul elevului nu poate fi modificat.':'';}
function openMissingChest(id){
 if(formationBusy||!missingSources[id])return;activeChest=id;$('missing-page').className='missing-chest-'+id;$('missing-page').setAttribute('aria-label','Lădița '+id+' — Ce număr lipsește?');$('missing-image').src=missingSources[id];$('missing-image').alt=missingDescriptions[id];
 $('missing-answer').value='';$('missing-answer').disabled=!!teacherMapReturn;$('missing-check').disabled=!!teacherMapReturn;clearMissingFeedback();$('formation-page').hidden=true;$('chest1-page').hidden=true;$('missing-page').hidden=false;window.scrollTo(0,0);(teacherMapReturn?$('missing-back'):$('missing-answer')).focus();
}
$('missing-answer').addEventListener('input',()=>{if(formationBusy||teacherMapReturn)return;$('missing-answer').value=$('missing-answer').value.replace(/[^0-9]/g,'').slice(0,4);clearMissingFeedback();});
$('missing-answer').addEventListener('paste',event=>{event.preventDefault();if(formationBusy||teacherMapReturn)return;const digits=(event.clipboardData?.getData('text')||'').replace(/[^0-9]/g,'').slice(0,4);$('missing-answer').value=digits;clearMissingFeedback();});
$('missing-answer').addEventListener('focus',()=>$('missing-answer').select());
$('missing-form').addEventListener('submit',async event=>{
 event.preventDefault();if(formationBusy||teacherMapReturn||activeChest<9||activeChest>12)return;
 const chest=activeChest,answer=$('missing-answer').value;
 if(!/^[0-9]{1,4}$/.test(answer)){$('missing-result').textContent='✕';$('missing-result').className='incorrect';$('missing-result').setAttribute('aria-label','Răspuns incomplet');$('missing-status').textContent='Completează pergamentul lipsă cu cifre.';$('missing-answer').focus();return;}
 formationBusy=true;$('missing-check').disabled=true;$('missing-answer').disabled=true;$('missing-status').textContent='Se verifică…';
 try{const r=await studentAuth.formation('answer',{chest,answer});syncProfile(r.profile);$('missing-result').textContent=r.correct?'✓':'✕';$('missing-result').className=r.correct?'correct':'incorrect';$('missing-result').setAttribute('aria-label',r.correct?'Răspuns corect':'Răspuns greșit');$('missing-status').textContent=r.correct?'Corect! Steluța este salvată. Poți exersa din nou.':'Mai încearcă. Poți modifica răspunsul și verifica din nou.';}
 catch(error){clearMissingFeedback();$('missing-status').textContent=error.message;}
 finally{formationBusy=false;$('missing-check').disabled=false;$('missing-answer').disabled=false;}
});
$('missing-back').addEventListener('click',()=>{if(formationBusy)return;$('missing-answer').value='';clearMissingFeedback();$('missing-page').hidden=true;$('formation-page').hidden=false;renderFormation();$('formation-chests').querySelector('button')?.focus();window.scrollTo(0,0);});

return mapUI;
}
