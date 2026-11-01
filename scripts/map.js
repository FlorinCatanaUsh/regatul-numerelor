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
let mapProfile = null;
let teacherMapReturn=null;
function showChapter(chapter) {
 if(chapter.id===1){openForest();return;}
 const complete = mapProfile.completedChapters.includes(chapter.id);
 $('chapter-title').textContent=chapter.id+'. '+chapter.title;
 $('chapter-description').textContent=chapter.description;
 $('chapter-access').textContent=complete?'Capitol parcurs. Exersarea va rămâne disponibilă după activarea conținutului.':'Acest capitol este încă închis. Profesorul va permite accesul când va fi momentul.';
 $('chapter-dialog').showModal();$('chapter-close').focus();
}
function renderMap(profile) {
 if(!profile || typeof profile.studentId!=='string' || typeof profile.displayName!=='string')throw new Error('Missing map profile');
 mapProfile={...profile,completedChapters:[...new Set((profile.completedChapters||[]).filter(id=>Number.isInteger(id)&&id>=1&&id<=8))]};
 $('map-student').textContent=mapProfile.displayName;
 $('map-chapters').replaceChildren();$('chapter-progress').replaceChildren();
 for(const chapter of chapters){
  const done=mapProfile.completedChapters.includes(chapter.id);
  const state=done?'parcurs':chapter.id===1?'disponibil':'blocat';
  const hotspot=document.createElement('button');hotspot.type='button';hotspot.className='chapter-hotspot'+(done?' complete':'');hotspot.setAttribute('aria-label',chapter.id+'. '+chapter.title+' — '+state);
  const [left,top,width,height]=chapter.box;Object.assign(hotspot.style,{left:left+'%',top:top+'%',width:width+'%',height:height+'%'});
  const badge=document.createElement('span');badge.className='chapter-state';badge.setAttribute('aria-hidden','true');badge.textContent=done?'✓':chapter.id===1?'↪':'🔒';hotspot.append(badge);hotspot.addEventListener('click',()=>showChapter(chapter));$('map-chapters').append(hotspot);
  const tile=document.createElement('button');tile.type='button';tile.className='progress-tile'+(done?' complete':'');tile.textContent=String(chapter.id);tile.setAttribute('aria-label','Capitolul '+chapter.id+' — '+state);tile.addEventListener('click',()=>showChapter(chapter));$('chapter-progress').append(tile);
 }
 $('map-summary').textContent=mapProfile.completedChapters.length+' din 8 capitole parcurse.';
}
function openStudentMap(profile){
 teacherMapReturn=null;$('map-home').textContent='Ieșire';$('map-mode').textContent='Elev';renderMap(profile);$('map-page').hidden=false;$('forest-page').hidden=true;document.body.classList.add('viewing-map');$('map-home').focus();window.scrollTo(0,0);
}
$('map-home').addEventListener('click',async()=>{if(teacherMapReturn){const back=teacherMapReturn;teacherMapReturn=null;mapProfile=null;forestState=null;$('map-page').hidden=true;$('forest-page').hidden=true;back();return;}const button=$('map-home');button.disabled=true;try{await studentAuth.logout();}catch{studentAuth.clear();}finally{button.disabled=false;$('map-page').hidden=true;$('forest-page').hidden=true;document.body.classList.remove('viewing-map');mapProfile=null;forestState=null;$('class-entry').focus();}});
for(const id of ['chapter-close','chapter-back'])$(id).addEventListener('click',()=>$('chapter-dialog').close());
$('map-castle').addEventListener('click',()=>{$('chapter-title').textContent='Castelul Marelui Cristal';$('chapter-description').textContent='Marea provocare finală a Regatului numerelor.';$('chapter-access').textContent='Castelul rămâne închis până la parcurgerea celor opt capitole și deblocarea de către profesor. Provocarea finală nu este încă configurată.';$('chapter-dialog').showModal();});
const mapUI={open:openStudentMap,teacherView(profile,onBack){
 renderMap(profile);teacherMapReturn=onBack;$('teacher-page').hidden=true;$('map-page').hidden=false;$('forest-page').hidden=true;
 $('map-home').textContent='← Panoul profesorului';$('map-mode').textContent='Vizualizare profesor';
 $('map-summary').textContent+=' Atinge insulița 1 pentru progresul celor 6 lecții. Vizualizarea nu modifică progresul.';
 document.body.classList.add('viewing-map');$('map-home').focus();window.scrollTo(0,0);
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
function forestStatus(id){if(id===2&&!readingAvailable())return 'locked';return forestState.completed.includes(id)?'complete':forestState.unlocked.includes(id)?'available':'locked';}
function showForestLesson(lesson){
 if(lesson.id===1){openFormation();return;}
 if(lesson.id===2&&(teacherMapReturn||readingAvailable())){openReading();return;}
 const state=forestStatus(lesson.id);
 $('lesson-title').textContent=lesson.id+'. '+lesson.title;
 $('lesson-message').textContent=state==='locked'?'Lecția este încă blocată. Profesorul îți va permite accesul când va fi momentul.':state==='complete'?'Ai parcurs această lecție. Vei putea reveni pentru exersare.':'Această lecție este deblocată. O vei putea începe după adăugarea exercițiilor.';
 $('lesson-note').textContent='Exercițiile acestei lecții urmează să fie adăugate. Deschiderea acestei ferestre nu marchează lecția drept rezolvată.';
 if(lesson.id===2){$('lesson-message').textContent='Pentru lecția 2 ai nevoie de cheia câștigată în lecția 1 și de permisiunea profesorului. Apoi atinge lacătul pentru a deschide lecția.';}
 $('lesson-dialog').showModal();$('lesson-close').focus();
}
function renderForest(profile){
 const p=profile.lessonProgress?.[1]||{unlocked:[1],completed:[]};
 const valid=items=>[...new Set((Array.isArray(items)?items:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=6))];
 forestState={studentId:profile.studentId,unlocked:valid(p.unlocked),completed:valid(p.completed)};
 $('forest-student').textContent=profile.displayName;
 $('forest-lessons').replaceChildren();$('forest-progress').replaceChildren();
 for(const lesson of forestLessons){
  const state=forestStatus(lesson.id);const allowed=lesson.id===2&&mapProfile.formation?.lesson2Allowed;const label=state==='complete'?'parcursă':state==='available'?'deblocată':'blocată';
  const button=document.createElement('button');button.type='button';button.className='lesson-hotspot '+state;button.setAttribute('aria-label',lesson.id+'. '+lesson.title+' — '+label);button.setAttribute('aria-disabled','false');
  const [left,top,width,height]=lesson.box;Object.assign(button.style,{left:left+'%',top:top+'%',width:width+'%',height:height+'%'});
  if(lesson.id!==1&&(state!=='locked'||allowed))Object.assign(button.style,{backgroundImage:'url("'+$(lesson.id===2?'forest-unlocked-source':'forest-color-source').src+'")',backgroundSize:(10000/width)+'% '+(10000/height)+'%',backgroundPosition:(left/(100-width)*100)+'% '+(top/(100-height)*100)+'%',backgroundRepeat:'no-repeat'});
  const badge=document.createElement('span');badge.className='lesson-state';badge.setAttribute('aria-hidden','true');badge.textContent=state==='locked'?'🔒':state==='complete'?'✓':'↪';if(lesson.id!==2)button.append(badge);
  button.addEventListener('click',()=>showForestLesson(lesson));$('forest-lessons').append(button);
  if(lesson.id===2&&(!mapProfile.formation?.lesson2Opened||!allowed)){
   const lock=document.createElement('button');lock.type='button';lock.className='lesson-lock';lock.textContent='🔒';lock.setAttribute('aria-label','Deschide lacătul lecției 2 cu cheia luată și permisiunea profesorului');
   Object.assign(lock.style,{left:(left+width*.40)+'%',top:(top+height*.72)+'%',bottom:'auto'});lock.addEventListener('click',()=>unlockLesson2(lock));$('forest-lessons').append(lock);
  }
  const tile=document.createElement('button');tile.type='button';tile.className='progress-tile'+(state==='complete'?' complete':'');tile.textContent=String(lesson.id);tile.setAttribute('aria-label','Lecția '+lesson.id+' — '+label);tile.addEventListener('click',()=>showForestLesson(lesson));$('forest-progress').append(tile);
 }
 $('forest-summary').textContent=forestState.completed.length+' din 6 lecții parcurse — '+profile.displayName;
}
function openForest(){
 if(!mapProfile)return;
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
const readingExercises={1:{number:'4927',image:$('reading-exercise-image').src},2:{number:'3052',image:$('reading-exercise-source-2').src},3:{number:'8304',image:$('reading-exercise-source-3').src}};
function readingAvailable(){return !!(mapProfile?.formation?.lesson2Allowed&&mapProfile?.formation?.lesson2Opened);}
function renderReading(){
 const solved=[...new Set((mapProfile?.reading?.solved||[]).filter(id=>readingExercises[id]))],count=solved.length;
 $('reading-student').textContent=mapProfile.displayName+(teacherMapReturn?' — vizualizare profesor':'');
 $('reading-count').textContent=count+'/12';$('reading-bar').value=count;
 $('reading-chests').replaceChildren();
 for(let id=1;id<=12;id++){
  const button=document.createElement('button');button.type='button';button.className='reading-chest'+(solved.includes(id)?' complete':'');
  const col=(id-1)%4,row=Math.floor((id-1)/4);
  Object.assign(button.style,{left:[23,35.5,48,60][col]+'%',top:[39,56,74][row]+'%',width:'12%',height:'16%'});
  button.setAttribute('aria-label','Lecția 2, lădița '+id+(readingExercises[id]?(solved.includes(id)?' — rezolvată':' — Scrie cu litere numărul '+readingExercises[id].number):' — exercițiul urmează să fie adăugat'));
  if(solved.includes(id)){const star=document.createElement('span');star.textContent='★';button.append(star);}
  button.addEventListener('click',()=>{
   if(readingBusy)return;
   if(readingExercises[id]){openReadingChest(id);return;}
   $('reading-dialog-title').textContent='Lădița '+id+' · Citirea și scrierea numerelor naturale';
   readingReturnFocus=button;$('reading-dialog').showModal();$('reading-dialog-close').focus();
  });
  $('reading-chests').append(button);
 }
 $('reading-status').textContent=count+' din 12 steluțe. Lădițele 1, 2 și 3 sunt disponibile; celelalte exerciții urmează să fie adăugate.'+(teacherMapReturn?' Vizualizare profesor.':'');
}
async function openReading(){
 if(readingBusy||!mapProfile||(!teacherMapReturn&&!readingAvailable()))return;
 readingReady=false;renderReading();$('forest-page').hidden=true;$('reading-page').hidden=false;$('reading-back').focus();window.scrollTo(0,0);
 if(teacherMapReturn)return;
 readingBusy=true;$('reading-back').disabled=true;
 try{const r=await studentAuth.reading('state');syncProfile(r.profile);readingReady=true;renderReading();}
 catch(error){$('reading-status').textContent=error.message;}
 finally{readingBusy=false;$('reading-back').disabled=false;}
}
function openReadingChest(id){
 const exercise=readingExercises[id];if(!exercise)return;readingChest=id;
 $('reading-exercise-image').src=exercise.image;$('reading-exercise-image').alt='Scrie cu litere numărul '+exercise.number+'.';
 $('reading-answer').setAttribute('aria-label','Scrie cu litere numărul '+exercise.number);
 $('reading-exercise-page').setAttribute('aria-label','Lecția 2, lădița '+id+' — Scrie cu litere numărul '+exercise.number);
 $('reading-exercise-page').className='reading-exercise-'+id;
 if(!teacherMapReturn&&!readingReady){$('reading-status').textContent='Reintră în lecție pentru a verifica accesul și conexiunea.';return;}
 $('reading-answer').value='';$('reading-answer').disabled=!!teacherMapReturn;$('reading-check').disabled=!!teacherMapReturn;
 clearReadingFeedback();$('reading-page').hidden=true;$('reading-exercise-page').hidden=false;window.scrollTo(0,0);(teacherMapReturn?$('reading-exercise-back'):$('reading-answer')).focus();
}
function clearReadingFeedback(){
 $('reading-result').textContent='';$('reading-result').className='';$('reading-result').setAttribute('aria-label','');
 $('reading-exercise-status').textContent=teacherMapReturn?'Vizualizare profesor. Progresul elevului nu poate fi modificat.':'';
}
for(const id of ['reading-back','reading-back-sign'])$(id).addEventListener('click',()=>{if(!readingBusy)openForest();});
$('reading-key').addEventListener('click',()=>{$('reading-status').textContent='Cheia lecției 3 rămâne sub cupolă până rezolvi 6 lădițe distincte. Momentan sunt disponibile lădițele 1, 2 și 3.';});
for(const id of ['reading-dialog-close','reading-dialog-return'])$(id).addEventListener('click',()=>$('reading-dialog').close());
$('reading-dialog').addEventListener('close',()=>readingReturnFocus?.focus());
$('reading-answer').addEventListener('input',clearReadingFeedback);
$('reading-form').addEventListener('submit',async event=>{
 event.preventDefault();if(readingBusy||teacherMapReturn||!readingReady||!readingExercises[readingChest])return;
 const answer=$('reading-answer').value;
 if(!answer.trim()){$('reading-exercise-status').textContent='Scrie numărul folosind litere.';$('reading-answer').focus();return;}
 readingBusy=true;$('reading-check').disabled=true;$('reading-answer').disabled=true;$('reading-exercise-status').textContent='Se verifică…';
 try{
  const r=await studentAuth.reading('answer',{chest:readingChest,answer});syncProfile(r.profile);renderReading();
  $('reading-result').textContent=r.correct?'✓':'✕';$('reading-result').className=r.correct?'correct':'incorrect';
  $('reading-result').setAttribute('aria-label',r.correct?'Răspuns corect':'Răspuns greșit');
  $('reading-exercise-status').textContent=r.correct?'Corect! Steluța este salvată. Poți exersa din nou.':'Mai încearcă. Poți modifica răspunsul și verifica din nou.';
 }catch(error){$('reading-exercise-status').textContent=error.message;}
 finally{readingBusy=false;$('reading-check').disabled=false;$('reading-answer').disabled=false;}
});
$('reading-exercise-back').addEventListener('click',()=>{
 if(readingBusy)return;$('reading-answer').value='';clearReadingFeedback();$('reading-exercise-page').hidden=true;$('reading-page').hidden=false;renderReading();$('reading-chests').querySelector('button')?.focus();window.scrollTo(0,0);
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
 if(lockBusy)return;if(teacherMapReturn){$('forest-summary').textContent='Vizualizare profesor. Elevul trebuie să atingă lacătul din propriul cont.';return;}
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
