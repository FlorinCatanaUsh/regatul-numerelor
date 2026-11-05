export function setupTeacher({studentAuth,mapUI}){
const $=id=>document.getElementById(id);
let passwordTarget=null;
let passwordBusy=false;
let passwordRevision=0;
let teacherRows=[],rowsReady=false,activeTab='individual',groupBusy=false,loadRevision=0;
let rankingTimer, loadingStudents=false;
const chapterLabels=['I','II','III','IV','V','VI','VII','VIII'];
const learningPages=['proof-page','subtraction-page','carry-page','borrow-page','addition-exercise-page','addition-page','valley-page','mountains-page','rounding-exercise-page','ordering-exercise-page','comparison-exercise-page','lesson-content-page','map-page','forest-page','formation-page','reading-page','reading-exercise-page','chest1-page','missing-page'];
function hideLearningPages(){for(const id of learningPages)$(id).hidden=true;}
function updateClassControls(message){
 for(const id of ['teacher-tab-individual','teacher-tab-class','teacher-logout','teacher-own-password'])$(id).disabled=groupBusy;
}
function lessonAllowed(row,id){
 if(id===2)return !!row.formation?.lesson2Allowed;
 const p=row.lessonProgress?.[1]||{},manual=p.manualAccess?.[id];return typeof manual==='boolean'?manual:id===1||(p.unlocked||[]).includes(id);
}
function classPermissions(){return Object.fromEntries([1,2,3,4,5,6].map(id=>[id,{allowed:teacherRows.filter(row=>lessonAllowed(row,id)).length,total:teacherRows.length}]));}
function selectTab(mode){
 if(groupBusy)return;activeTab=mode;hideLearningPages();document.body.classList.remove('teacher-class-mode');
 for(const name of ['individual','class']){
  const selected=name===mode,button=$('teacher-tab-'+name);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
 }
 $('teacher-class-controls').hidden=mode!=='class';$('teacher-page').hidden=mode!=='individual';
 if(mode==='class')mapUI.classView({lessonAccess:classPermissions(),lesson2Allowed:rowsReady&&teacherRows.length>0&&teacherRows.every(row=>row.formation?.lesson2Allowed)},()=>selectTab('individual'));
 updateClassControls();
}
function renderTeacherStudents(){
 const list=$('teacher-students');
 const focused=document.activeElement?.dataset;
 const ranking=teacherRows.map(row=>{
  const stars=chapterLabels.map((_,index)=>mapUI.chapterStars(row,index+1));
  return {row,stars,total:stars.reduce((sum,count)=>sum+count,0)};
 }).sort((a,b)=>b.total-a.total||a.row.displayName.localeCompare(b.row.displayName,'ro')||a.row.studentId.localeCompare(b.row.studentId));
 const cards=ranking.map(({row,stars,total},index)=>{
  const card=document.createElement('article');
  card.className='teacher-student-card';
  const rank=document.createElement('span');
  rank.className='teacher-rank';
  rank.textContent=(index+1)+'.';
  const name=document.createElement('button');
  name.type='button';
  name.className='teacher-student-name';
  name.textContent=row.displayName;
  name.setAttribute('aria-label',row.displayName+' — harta și progresul');
  name.addEventListener('click',()=>mapUI.teacherView(row,()=>{
   selectTab('individual');
   name.focus();
  }));
  const summary=document.createElement('span');
  summary.className='teacher-chapter-stars';
  summary.textContent=stars.map((count,i)=>chapterLabels[i]+': ★'+count).join(', ');
  const totalLabel=document.createElement('strong');
  totalLabel.className='teacher-star-total';
  totalLabel.textContent='→ TOTAL: ★'+total;
  const password=document.createElement('button');
  password.type='button';
  password.textContent='Schimbă parola';
  password.addEventListener('click',()=>openPasswordEditor(row.studentId,row.displayName));
  for(const [action,button] of [['map',name],['password',password]]){
   button.setAttribute('data-student-id',row.studentId);
   button.setAttribute('data-student-action',action);
  }
  card.append(rank,name,summary,totalLabel,password);
  return card;
 });
 list.replaceChildren(...cards);
 if(focused?.studentId){
  const button=Array.from(list.querySelectorAll('button')).find(button=>button.dataset.studentId===focused.studentId&&button.dataset.studentAction===focused.studentAction);
  button?.focus({preventScroll:true});
 }
}
async function loadTeacherStudents({quiet=false}={}){
 if(loadingStudents||groupBusy)return false;
 const revision=++loadRevision;
 loadingStudents=true;
 if(!quiet)$('teacher-status').textContent='Se încarcă elevii…';
 try{
  const rows=await studentAuth.students();
  if(revision!==loadRevision||groupBusy||(quiet&&$('teacher-page').hidden))return false;
  const changed=!rowsReady||JSON.stringify(rows)!==JSON.stringify(teacherRows);
  if(changed){
   teacherRows=rows;
   renderTeacherStudents();
  }
  rowsReady=true;
  if(!quiet||changed)$('teacher-status').textContent=rows.length+' de elevi';
  updateClassControls();
  if(activeTab==='class')mapUI.updateClassPermissions(classPermissions());
  return true;
 }catch(error){
  if(revision===loadRevision&&!quiet)$('teacher-status').textContent=error.message;
  return false;
 }finally{
  if(revision===loadRevision)loadingStudents=false;
 }
}
function refreshRanking(){
 if(document.hidden||$('teacher-workspace').hidden||$('teacher-page').hidden||$('password-dialog').open)return;
 void loadTeacherStudents({quiet:true});
}
async function openTeacher(profile){
 if(profile.role!=='teacher')throw new Error('Acces rezervat profesorului.');
 $('teacher-workspace').hidden=false;document.body.classList.add('viewing-map');selectTab('individual');$('teacher-logout').focus();window.scrollTo(0,0);clearInterval(rankingTimer);rankingTimer=setInterval(refreshRanking,15000);await loadTeacherStudents();
}
$('teacher-tab-individual').addEventListener('click',()=>selectTab('individual'));
$('teacher-tab-class').addEventListener('click',()=>selectTab('class'));
for(const mode of ['individual','class'])$('teacher-tab-'+mode).addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||groupBusy)return;
 event.preventDefault();const next=event.key==='Home'?'individual':event.key==='End'?'class':mode==='individual'?'class':'individual';selectTab(next);$('teacher-tab-'+next).focus();
});
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
$('teacher-logout').addEventListener('click',async()=>{
 if(groupBusy)return;$('teacher-logout').disabled=true;try{await studentAuth.logout();}catch{studentAuth.clear();}finally{$('teacher-logout').disabled=false;loadRevision++;clearInterval(rankingTimer);loadingStudents=false;teacherRows=[];rowsReady=false;hideLearningPages();$('teacher-workspace').hidden=true;$('teacher-page').hidden=true;$('teacher-students').replaceChildren();document.body.classList.remove('viewing-map','teacher-class-mode');$('teacher-entry').focus();}
});
mapUI.setLessonAccessChangedHandler(loadTeacherStudents);
const teacherUI={open:openTeacher};

return teacherUI;
}
