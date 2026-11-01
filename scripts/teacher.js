export function setupTeacher({studentAuth,mapUI}){
const $=id=>document.getElementById(id);
let passwordTarget=null;
let passwordBusy=false;
let passwordRevision=0;
let teacherRows=[],rowsReady=false,activeTab='individual',groupBusy=false,loadRevision=0;
const learningPages=['map-page','forest-page','formation-page','reading-page','reading-exercise-page','chest1-page','missing-page'];
function hideLearningPages(){for(const id of learningPages)$(id).hidden=true;}
function updateClassControls(message){
 const permitted=teacherRows.filter(row=>row.formation?.lesson2Allowed).length;
 $('teacher-class-allow').disabled=groupBusy||!rowsReady||!teacherRows.length||permitted===teacherRows.length;
 $('teacher-class-block').disabled=groupBusy||!rowsReady||permitted===0;
 for(const id of ['teacher-tab-individual','teacher-tab-class','teacher-reload','teacher-logout','teacher-own-password'])$(id).disabled=groupBusy;
 $('teacher-class-status').textContent=message??(rowsReady?permitted+' din '+teacherRows.length+' elevi au permisiune pentru lecția 2. Elevii pot intra după ce iau cheia din prima lecție.':'Reîncarcă pentru a verifica accesul clasei.');
}
function selectTab(mode){
 if(groupBusy)return;activeTab=mode;hideLearningPages();document.body.classList.remove('teacher-class-mode');
 for(const name of ['individual','class']){
  const selected=name===mode,button=$('teacher-tab-'+name);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
 }
 $('teacher-class-controls').hidden=mode!=='class';$('teacher-page').hidden=mode!=='individual';
 if(mode==='class')mapUI.classView({lesson2Allowed:rowsReady&&teacherRows.length>0&&teacherRows.every(row=>row.formation?.lesson2Allowed)},()=>selectTab('individual'));
 updateClassControls();
}
function renderTeacherStudents(){
 $('teacher-students').replaceChildren();
 for(const row of teacherRows){
  const card=document.createElement('article');card.className='teacher-student-card';
  const label=document.createElement('strong');label.textContent=row.displayName;
  const summary=document.createElement('p');const count=(row.completedChapters||[]).length;
  summary.textContent=count+' din 8 capitole · '+(row.formation?.solved||[]).length+'/12 steluțe la lecția 1'+(row.formation?.keyTaken?' · cheia luată':'');
  const view=document.createElement('button');view.type='button';view.textContent='Vezi harta și progresul';
  view.addEventListener('click',()=>mapUI.teacherView(row,()=>selectTab('individual')));
  const button=document.createElement('button');button.type='button';button.textContent='Schimbă parola';button.addEventListener('click',()=>openPasswordEditor(row.studentId,row.displayName));
  const permission=document.createElement('button');permission.type='button';let allowed=!!row.formation?.lesson2Allowed;
  permission.textContent=allowed?'Blochează lecția 2':'Permite lecția 2';
  permission.addEventListener('click',async()=>{
   if(groupBusy)return;permission.disabled=true;
   try{const r=await studentAuth.allowLesson2(row.studentId,!allowed);Object.assign(row,r.profile);allowed=!!row.formation.lesson2Allowed;permission.textContent=allowed?'Blochează lecția 2':'Permite lecția 2';$('teacher-status').textContent=(allowed?'Acces permis':'Acces blocat')+' la lecția 2 — '+row.displayName;updateClassControls();}
   catch(error){$('teacher-status').textContent=error.message;}finally{permission.disabled=false;}
  });
  card.append(label,summary,view,button,permission);$('teacher-students').append(card);
 }
}
async function loadTeacherStudents(){
 const revision=++loadRevision;rowsReady=false;updateClassControls('Se verifică accesul clasei…');$('teacher-status').textContent='Se încarcă elevii…';
 try{
  const rows=await studentAuth.students();if(revision!==loadRevision)return false;
  teacherRows=rows;rowsReady=true;renderTeacherStudents();$('teacher-status').textContent=rows.length+' de elevi';updateClassControls();
  if(activeTab==='class')mapUI.updateClassPermission(rows.length>0&&rows.every(row=>row.formation?.lesson2Allowed));return true;
 }catch(error){if(revision!==loadRevision)return false;$('teacher-status').textContent=error.message;updateClassControls(error.message);return false;}
}
async function classPermission(allowed){
 if(groupBusy||!rowsReady)return;groupBusy=true;updateClassControls('Se salvează comanda pentru toată clasa…');
 try{
  const result=await studentAuth.allowLesson2('all',allowed);
  const refreshed=await loadTeacherStudents();mapUI.updateClassPermission(allowed);
  groupBusy=false;updateClassControls((allowed?'Acces permis':'Acces blocat')+' la lecția 2 pentru toți cei '+result.affected+' elevi.'+(allowed?' Fiecare elev are nevoie și de cheia din prima lecție.':'')+(refreshed?'':' Comanda a fost salvată. Reîncarcă pentru a actualiza lista.'));
 }catch(error){groupBusy=false;updateClassControls(error.message);}
}
async function openTeacher(profile){
 if(profile.role!=='teacher')throw new Error('Acces rezervat profesorului.');
 $('teacher-workspace').hidden=false;document.body.classList.add('viewing-map');selectTab('individual');$('teacher-logout').focus();window.scrollTo(0,0);await loadTeacherStudents();
}
$('teacher-tab-individual').addEventListener('click',()=>selectTab('individual'));
$('teacher-tab-class').addEventListener('click',()=>selectTab('class'));
for(const mode of ['individual','class'])$('teacher-tab-'+mode).addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||groupBusy)return;
 event.preventDefault();const next=event.key==='Home'?'individual':event.key==='End'?'class':mode==='individual'?'class':'individual';selectTab(next);$('teacher-tab-'+next).focus();
});
$('teacher-class-allow').addEventListener('click',()=>classPermission(true));
$('teacher-class-block').addEventListener('click',()=>classPermission(false));
function openPasswordEditor(id,name){
 passwordTarget=id;passwordRevision++;const own=id==='teacher';
 $('password-editor-title').textContent=own?'Parola mea':'Parola — '+name;
 $('current-password-wrap').hidden=!own;$('current-password').required=own;
 for(const field of ['new-password','confirm-password','current-password']){$(field).value='';$(field).type='password';}
 $('new-password').minLength=own?12:4;$('editor-reveal').textContent='Arată parolele';$('password-editor-status').textContent='';
 $('password-editor-note').textContent=own?'Minimum 12 caractere. Celelalte sesiuni de profesor vor fi închise.':'Minimum 4 caractere. Progresul rămâne păstrat. Elevul se va conecta din nou cu parola nouă.';
 $('password-dialog').showModal();$(own?'current-password':'new-password').focus();
}
$('password-editor-form').addEventListener('submit',async event=>{
 event.preventDefault();if(passwordBusy)return;
 const target=passwordTarget,revision=passwordRevision,password=$('new-password').value;
 if(password!==$('confirm-password').value){$('password-editor-status').textContent='Cele două parole nu coincid.';return;}
 passwordBusy=true;$('password-editor-save').disabled=true;$('password-editor-status').textContent='Se salvează…';
 const current=$('current-password').value;
 try{
  await studentAuth.setPassword(target,password,current||null);
  if(revision===passwordRevision){
   for(const field of ['new-password','confirm-password','current-password'])$(field).value='';
   $('password-editor-status').textContent=target==='teacher'?'Parola ta a fost schimbată.':'Parola a fost schimbată. Progresul a rămas păstrat.';
  }
 }catch(error){if(revision===passwordRevision)$('password-editor-status').textContent=error.message;}
 finally{passwordBusy=false;$('password-editor-save').disabled=false;}
});
$('password-editor-close').addEventListener('click',()=>{if(!passwordBusy)$('password-dialog').close();});
$('password-dialog').addEventListener('cancel',event=>{if(passwordBusy)event.preventDefault();});
$('password-dialog').addEventListener('close',()=>{passwordRevision++;passwordTarget=null;for(const field of ['new-password','confirm-password','current-password'])$(field).value='';});
$('editor-reveal').addEventListener('click',()=>{const show=$('new-password').type==='password';for(const field of ['new-password','confirm-password','current-password'])$(field).type=show?'text':'password';$('editor-reveal').textContent=show?'Ascunde parolele':'Arată parolele';});
$('teacher-own-password').addEventListener('click',()=>{selectTab('individual');openPasswordEditor('teacher','Profesor');});
$('teacher-reload').addEventListener('click',loadTeacherStudents);
$('teacher-logout').addEventListener('click',async()=>{
 if(groupBusy)return;$('teacher-logout').disabled=true;try{await studentAuth.logout();}catch{studentAuth.clear();}finally{$('teacher-logout').disabled=false;loadRevision++;teacherRows=[];rowsReady=false;hideLearningPages();$('teacher-workspace').hidden=true;$('teacher-page').hidden=true;$('teacher-students').replaceChildren();document.body.classList.remove('viewing-map','teacher-class-mode');$('teacher-entry').focus();}
});
const teacherUI={open:openTeacher};

return teacherUI;
}
