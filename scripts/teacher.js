export function setupTeacher({studentAuth,mapUI}){
const $=id=>document.getElementById(id);
let passwordTarget=null;
let passwordBusy=false;
let passwordRevision=0;
async function loadTeacherStudents(){
 $('teacher-status').textContent='Se încarcă elevii…';$('teacher-students').replaceChildren();
 try{
  const rows=await studentAuth.students();
  for(const row of rows){
   const card=document.createElement('article');card.className='teacher-student-card';
   const label=document.createElement('strong');label.textContent=row.displayName;
   const summary=document.createElement('p');const count=(row.completedChapters||[]).length;
   summary.textContent=count+' din 8 capitole · '+(row.formation?.solved||[]).length+'/12 steluțe la lecția 1'+(row.formation?.keyTaken?' · cheia luată':'');
   const view=document.createElement('button');view.type='button';view.textContent='Vezi harta și progresul';
   view.addEventListener('click',()=>mapUI.teacherView(row,()=>{openTeacher({role:'teacher'});}));
   const button=document.createElement('button');button.type='button';button.textContent='Schimbă parola';
   button.addEventListener('click',()=>openPasswordEditor(row.studentId,row.displayName));
   const permission=document.createElement('button');permission.type='button';let allowed=!!row.formation?.lesson2Allowed;
   permission.textContent=allowed?'Blochează lecția 2':'Permite lecția 2';
   permission.addEventListener('click',async()=>{permission.disabled=true;try{const r=await studentAuth.allowLesson2(row.studentId,!allowed);Object.assign(row,r.profile);allowed=!!row.formation.lesson2Allowed;permission.textContent=allowed?'Blochează lecția 2':'Permite lecția 2';$('teacher-status').textContent=(allowed?'Acces permis':'Acces blocat')+' la lecția 2 — '+row.displayName;}catch(error){$('teacher-status').textContent=error.message;}finally{permission.disabled=false;}});
   card.append(label,summary,view,button,permission);$('teacher-students').append(card);
  }
  $('teacher-status').textContent=rows.length+' de elevi';
 }catch(error){$('teacher-status').textContent=error.message;}
}
async function openTeacher(profile){
 if(profile.role!=='teacher')throw new Error('Acces rezervat profesorului.');
 $('formation-page').hidden=true;$('map-page').hidden=true;$('forest-page').hidden=true;$('teacher-page').hidden=false;document.body.classList.add('viewing-map');$('teacher-logout').focus();window.scrollTo(0,0);await loadTeacherStudents();
}
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
$('teacher-own-password').addEventListener('click',()=>openPasswordEditor('teacher','Profesor'));
$('teacher-progress').addEventListener('click',async()=>{await loadTeacherStudents();$('teacher-students').scrollIntoView({behavior:'smooth',block:'start'});$('teacher-students').querySelector('button')?.focus();});
$('teacher-reload').addEventListener('click',loadTeacherStudents);
$('teacher-logout').addEventListener('click',async()=>{
 $('teacher-logout').disabled=true;try{await studentAuth.logout();}catch{studentAuth.clear();}finally{$('teacher-logout').disabled=false;$('teacher-page').hidden=true;$('teacher-students').replaceChildren();document.body.classList.remove('viewing-map');$('teacher-entry').focus();}
});
const teacherUI={open:openTeacher};

return teacherUI;
}
