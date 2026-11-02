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
let teacherClassMode=false;
let activeLesson=null,lessonAccessBusy=false,onLessonAccessChanged=null;
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
 $('map-summary').textContent=teacherClassMode?'Harta clasei. Comenzile de sus se aplică tuturor elevilor.':mapProfile.completedChapters.length+' din 8 capitole parcurse.';
}
function openStudentMap(profile){
 teacherMapReturn=null;teacherClassMode=false;document.body.classList.remove('teacher-class-mode');$('teacher-workspace').hidden=true;$('comparison-exercise-page').hidden=true;comparisonRevision++;$('lesson-content-page').hidden=true;$('forest-mode').textContent='Elev';$('map-home').textContent='Ieșire';$('map-mode').textContent='Elev';renderMap(profile);$('map-page').hidden=false;$('forest-page').hidden=true;document.body.classList.add('viewing-map');$('map-home').focus();window.scrollTo(0,0);
}
$('map-home').addEventListener('click',async()=>{if(teacherMapReturn){const back=teacherMapReturn;teacherMapReturn=null;mapProfile=null;forestState=null;$('map-page').hidden=true;$('forest-page').hidden=true;back();return;}const button=$('map-home');button.disabled=true;try{await studentAuth.logout();}catch{studentAuth.clear();}finally{button.disabled=false;$('map-page').hidden=true;$('forest-page').hidden=true;document.body.classList.remove('viewing-map');mapProfile=null;forestState=null;$('class-entry').focus();}});
for(const id of ['chapter-close','chapter-back'])$(id).addEventListener('click',()=>$('chapter-dialog').close());
$('map-castle').addEventListener('click',()=>{$('chapter-title').textContent='Castelul Marelui Cristal';$('chapter-description').textContent='Marea provocare finală a Regatului numerelor.';$('chapter-access').textContent='Castelul rămâne închis până la parcurgerea celor opt capitole și deblocarea de către profesor. Provocarea finală nu este încă configurată.';$('chapter-dialog').showModal();});
const mapUI={open:openStudentMap,teacherView(profile,onBack){
 teacherClassMode=false;document.body.classList.remove('teacher-class-mode');$('forest-mode').textContent='Vizualizare profesor';renderMap(profile);teacherMapReturn=onBack;$('teacher-page').hidden=true;$('map-page').hidden=false;$('forest-page').hidden=true;
 $('map-home').textContent='← Panoul profesorului';$('map-mode').textContent='Vizualizare profesor';
 $('map-summary').textContent+=' Atinge insulița 1 pentru progresul celor 6 lecții. Vizualizarea nu modifică progresul.';
 document.body.classList.add('viewing-map');$('map-home').focus();window.scrollTo(0,0);
},classView({lesson2Allowed=false,lessonAccess={}}={},onBack){
 teacherClassMode=true;document.body.classList.add('teacher-class-mode');
 const profile={studentId:'class',displayName:'Toată clasa',completedChapters:[],lessonProgress:{1:{unlocked:[1],completed:[]}},formation:{solved:[],keyTaken:false,lesson2Allowed,lesson2Opened:false},reading:{solved:[],keyTaken:false},classAccess:lessonAccess};
 profile.lessonProgress[1].manualAccess=Object.fromEntries(Object.entries(lessonAccess).filter(([id])=>id!=='2').map(([id,s])=>[id,s.total>0&&s.allowed===s.total]));
 renderMap(profile);teacherMapReturn=onBack;$('teacher-page').hidden=true;$('map-page').hidden=false;$('forest-page').hidden=true;
 $('map-home').textContent='← Individual';$('map-mode').textContent='Toată clasa';$('forest-mode').textContent='Toată clasa';
 document.body.classList.add('viewing-map');window.scrollTo(0,0);
},updateClassPermission(allowed){
 if(!teacherClassMode||!mapProfile)return;
 mapProfile.formation.lesson2Allowed=allowed;renderMap(mapProfile);if(forestState)renderForest(mapProfile);
},setLessonAccessChangedHandler(handler){onLessonAccessChanged=handler;},updateClassPermissions(access){
 if(!teacherClassMode||!mapProfile)return;
 mapProfile.classAccess=access;mapProfile.lessonProgress[1].manualAccess=Object.fromEntries(Object.entries(access).filter(([id])=>id!=='2').map(([id,s])=>[id,s.total>0&&s.allowed===s.total]));
 if(access[2])mapProfile.formation.lesson2Allowed=access[2].total>0&&access[2].allowed===access[2].total;
 renderMap(mapProfile);if(forestState)renderForest(mapProfile);
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
function lessonPermission(profile,id){
 if(id===2)return !!profile.formation?.lesson2Allowed;
 const p=profile.lessonProgress?.[1]||{},manual=p.manualAccess?.[id];
 return typeof manual==='boolean'?manual:id===1||(p.unlocked||[]).includes(id);
}
function forestStatus(id){
 if(id===2&&!readingAvailable()||id!==2&&!lessonPermission(mapProfile,id))return 'locked';
 return forestState.completed.includes(id)?'complete':id===1||lessonPermission(mapProfile,id)?'available':'locked';
}
function lessonAccessCounts(){
 return teacherClassMode?(mapProfile.classAccess?.[activeLesson.id]||{allowed:0,total:0}):{allowed:lessonPermission(mapProfile,activeLesson.id)?1:0,total:1};
}
function renderLessonAccess(message=''){
 const teacher=!!teacherMapReturn;$('lesson-access-controls').hidden=!teacher;
 $('lesson-preview').hidden=!teacher;
 if(!teacher)return;
 const count=lessonAccessCounts();
 $('lesson-access-scope').textContent=teacherClassMode?'Comandă pentru toată clasa. Acces permis pentru '+count.allowed+' din '+count.total+' elevi.':'Comandă pentru '+mapProfile.displayName+'. Acces '+(count.allowed?'permis.':'blocat.');
 $('lesson-allow').textContent=teacherClassMode?'Permite accesul tuturor':'Permite accesul';
 $('lesson-block').textContent=teacherClassMode?'Blochează accesul tuturor':'Blochează accesul';
 $('lesson-allow').disabled=lessonAccessBusy||count.total===0||count.allowed===count.total;
 $('lesson-block').disabled=lessonAccessBusy||count.allowed===0;
 for(const id of ['lesson-close','lesson-return','lesson-preview'])$(id).disabled=lessonAccessBusy;
 $('lesson-access-status').textContent=message;
}
function showForestLesson(lesson){
 if(lessonAccessBusy)return;activeLesson=lesson;
 if(!teacherMapReturn){
  if(lesson.id===1&&forestStatus(1)!=='locked'){openFormation();return;}
  if(lesson.id===2&&readingAvailable()){openReading();return;}
  if(lesson.id>2&&forestStatus(lesson.id)!=='locked'){openLessonContent(lesson);return;}
 }
 const state=forestStatus(lesson.id);
 $('lesson-title').textContent=lesson.id+'. '+lesson.title;
 $('lesson-message').textContent=teacherMapReturn?'Gestionează accesul la această lecție.':state==='locked'?'Lecția este blocată de profesor.':state==='complete'?'Ai parcurs această lecție.':'Ai acces la această lecție.';
 $('lesson-note').textContent=lesson.id>2?'Exercițiile acestei lecții urmează să fie adăugate.':'Deschiderea lecției nu modifică progresul elevilor.';
 if(lesson.id===2)$('lesson-note').textContent='Elevul are nevoie de cheia luată din lecția 1 și de permisiunea profesorului. Apoi atinge lacătul pentru a deschide lecția.';
 renderLessonAccess();$('lesson-dialog').showModal();$('lesson-close').focus();
}
async function changeLessonAccess(allowed){
 if(!teacherMapReturn||!activeLesson||lessonAccessBusy)return;
 const lesson=activeLesson.id,target=teacherClassMode?'all':mapProfile.studentId;
 lessonAccessBusy=true;renderLessonAccess('Se salvează accesul…');
 try{
  const result=await studentAuth.allowLesson(target,lesson,allowed);
  if(onLessonAccessChanged)await onLessonAccessChanged();
  if(result.profile){renderMap(result.profile);renderForest(mapProfile);}
  else{
   mapProfile.classAccess??={};mapProfile.classAccess[lesson]={allowed:allowed?result.affected:0,total:result.affected};
   if(lesson===2)mapProfile.formation.lesson2Allowed=allowed;
   else{const p=mapProfile.lessonProgress[1];p.manualAccess??={};p.manualAccess[lesson]=allowed;p.unlocked=[...new Set((p.unlocked||[]).filter(id=>id!==lesson).concat(allowed?[lesson]:[]))];}
   renderMap(mapProfile);renderForest(mapProfile);
  }
  lessonAccessBusy=false;renderLessonAccess((allowed?'Acces permis':'Acces blocat')+(teacherClassMode?' pentru toată clasa.':' pentru '+mapProfile.displayName+'.'));
 }catch(error){lessonAccessBusy=false;renderLessonAccess(error.message);}
}
$('lesson-allow').addEventListener('click',()=>changeLessonAccess(true));
$('lesson-block').addEventListener('click',()=>changeLessonAccess(false));
$('lesson-preview').addEventListener('click',()=>{if(lessonAccessBusy||!teacherMapReturn)return;$('lesson-dialog').close();if(activeLesson.id===1)openFormation();else if(activeLesson.id===2)openReading();else openLessonContent(activeLesson);});
$('lesson-dialog').addEventListener('cancel',event=>{if(lessonAccessBusy)event.preventDefault();});
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
let orderingReturnFocus=null;
function renderOrdering(){
 $('ordering-count').textContent='0/12';$('ordering-bar').value=0;$('ordering-key').disabled=true;
 $('lesson-content-message').textContent='0 din 12 steluțe. Exercițiile de ordonare urmează să fie adăugate.'+(teacherMapReturn?' Vizualizare profesor.':'');
 $('ordering-chests').replaceChildren();
 const left=[[22.7,35.7,48,60.1],[21.5,34.4,47.4,60],[21.5,34.7,47.7,60.4]],top=[40.5,57.1,74.1];
 for(let id=1;id<=12;id++){
  const row=Math.floor((id-1)/4),col=(id-1)%4,button=document.createElement('button');button.type='button';button.className='comparison-chest';
  button.setAttribute('aria-label','Lecția 4, lădița '+id+' — exercițiul urmează să fie adăugat');
  Object.assign(button.style,{left:left[row][col]+'%',top:top[row]+'%',width:'12.9%',height:'18%'});
  button.addEventListener('click',()=>{orderingReturnFocus=button;$('ordering-dialog-title').textContent='Lădița '+id+' · Ordonarea numerelor naturale';$('ordering-dialog').showModal();$('ordering-dialog-close').focus();});
  $('ordering-chests').append(button);
 }
}
for(const id of ['ordering-dialog-close','ordering-dialog-return'])$(id).addEventListener('click',()=>$('ordering-dialog').close());
$('ordering-dialog').addEventListener('close',()=>orderingReturnFocus?.focus());
$('ordering-back-sign').addEventListener('click',()=>openForest());
function openLessonContent(lesson){
 $('lesson-dialog').close();$('forest-page').hidden=true;
 $('lesson-content-title').textContent=lesson.id+'. '+lesson.title;
 $('comparison-exercise-page').hidden=true;comparisonRevision++;comparisonBusy=false;$('comparison-panel').hidden=lesson.id!==3;if(lesson.id===3)renderComparison();$('ordering-panel').hidden=lesson.id!==4;if(lesson.id===4)renderOrdering();
 if(lesson.id!==3&&lesson.id!==4)$('lesson-content-message').textContent='Exercițiile acestei lecții urmează să fie adăugate.';
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
 comparisonRevision++;comparisonBusy=false;comparisonReady=false;$('comparison-exercise-page').hidden=true;$('lesson-content-page').hidden=false;renderComparison();$('comparison-chests').children[(activeComparisonChest||1)-1]?.focus();window.scrollTo(0,0);
});
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
 $('forest-summary').textContent=teacherClassMode?'Harta clasei. Alege o lecție pentru a vedea exercițiile.':forestState.completed.length+' din 6 lecții parcurse — '+profile.displayName;
}
function openForest(){
 if(!mapProfile)return;
 $('lesson-content-page').hidden=true;$('comparison-exercise-page').hidden=true;comparisonRevision++;
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
for(const id of ['lesson-close','lesson-return'])$(id).addEventListener('click',()=>{if(!lessonAccessBusy)$('lesson-dialog').close();});

// Lesson 2 progress is validated and stored separately by the server.
let readingBusy=false,readingReady=false,readingReturnFocus=null,readingChest=null;
const readingExercises={1:{number:'4927',image:$('reading-exercise-image').src},2:{number:'3052',image:$('reading-exercise-source-2').src},3:{number:'8304',image:$('reading-exercise-source-3').src},4:{number:'4715',image:$('reading-exercise-source-4').src},5:{mode:'digits',number:'patru mii șase sute douăzeci și trei',image:$('reading-exercise-source-5').src},6:{mode:'digits',number:'opt mii șaptezeci și nouă',image:$('reading-exercise-source-6').src},7:{mode:'digits',number:'șase mii patru',image:$('reading-exercise-source-7').src},8:{mode:'digits',number:'șapte mii trei sute doi',image:$('reading-exercise-source-8').src},9:{number:'5274',image:$('reading-exercise-source-9').src},10:{number:'9086',image:$('reading-exercise-source-10').src},11:{mode:'digits',number:'șase mii trei sute patruzeci și doi',image:$('reading-exercise-source-11').src},12:{mode:'digits',number:'opt mii cinci sute șapte',image:$('reading-exercise-source-12').src}};
const readingDomeSource=$('reading-image').src;
const readingDigits=Array.from({length:4},(_,i)=>$('reading-digit-'+i));
function readingPrompt(exercise){return 'Scrie cu '+(exercise.mode==='digits'?'cifre':'litere')+' numărul '+exercise.number;}
function readingAvailable(){return !!(mapProfile?.formation?.lesson2Allowed&&mapProfile?.formation?.lesson2Opened);}
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
 if(lockBusy)return;if(teacherMapReturn){$('forest-summary').textContent=teacherClassMode?'Pentru accesul clasei, folosește butoanele de sus. Elevii care au cheia vor putea deschide lacătul din contul lor.':'Vizualizare profesor. Elevul trebuie să atingă lacătul din propriul cont.';return;}
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
