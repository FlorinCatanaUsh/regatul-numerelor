import { pupils } from '../data/students.js?v=roster-20';
import { studentAuth } from './auth.js?v=unknown-four';
import { setupMap } from './map.js?v=map-trophies';
import { setupTeacher } from './teacher.js?v=forest-trophy';
'use strict';

const $ = id => document.getElementById(id);
const dialog = $('entry');
let selectedId = null;
let lastStudent = null;
let entryButton = null;
const tints = ['#e0f0e7','#e3edf7','#f4e7d5','#eee6f5'];
for (const [id,name] of pupils) {
 const button = document.createElement('button');
 button.className = 'student'; button.type = 'button'; button.dataset.studentId = id;
 const avatar = document.createElement('span'); avatar.className='avatar'; avatar.setAttribute('aria-hidden','true');avatar.style.setProperty('--tint',tints[(Number(id.slice(-2))-1)%tints.length]);avatar.textContent=name[0];
 const label = document.createElement('span');label.textContent=name;
 button.append(avatar,label);button.addEventListener('click',()=>{lastStudent=button;selectStudent(id,name);});$('students').append(button);
}
function showRoster() {
 dialog.classList.remove('door-mode');dialog.classList.add('roster-mode');dialog.scrollTop=0;
 selectedId=null;$('roster-view').hidden=false;$('login-view').hidden=true;$('dialog-title').textContent='Clasa a III-a';$('password').value='';$('status').textContent='';
}
function selectStudent(id,name) {
 $('password').disabled=false;$('reveal').disabled=false;$('password').required=true;$('password').value='';
 dialog.classList.remove('roster-mode');dialog.classList.add('door-mode');dialog.scrollTop=0;
 selectedId=id;$('roster-view').hidden=true;$('login-view').hidden=false;$('back').hidden=false;
 $('dialog-title').textContent='Intrarea în regat';
 $('selected-name').textContent=name;$('selected-avatar').textContent=name[0];$('selected-avatar').classList.remove('teacher-mark');$('welcome').textContent='Bine ai venit în Regatul numerelor!';$('setup-note').textContent='Introdu parola primită de la profesor. La plecare, apasă Ieșire.';$('status').textContent='';$('login-form').querySelector('.submit').textContent='Intră în regat';$('password').focus();
}
$('class-entry').addEventListener('click',()=>{entryButton=$('class-entry');showRoster();dialog.showModal();$('students').querySelector('button').focus();});
$('teacher-entry').addEventListener('click',()=>{
 $('password').disabled=false;$('reveal').disabled=false;$('password').required=true;$('password').value='';
 dialog.classList.remove('roster-mode');dialog.classList.add('door-mode');dialog.scrollTop=0;
 entryButton=$('teacher-entry');selectedId=null;$('roster-view').hidden=true;$('login-view').hidden=false;$('back').hidden=true;$('dialog-title').textContent='Acces profesor';$('selected-name').textContent='Profesor';$('selected-avatar').textContent='⌘';$('selected-avatar').classList.add('teacher-mark');$('welcome').textContent='Panoul tău de control';$('setup-note').textContent='Introdu parola ta de profesor. Accesul elevilor nu permite schimbarea parolelor.';$('status').textContent='';$('login-form').querySelector('.submit').textContent='Intră în panou';dialog.showModal();$('password').focus();
});
$('back').addEventListener('click',()=>{showRoster();(lastStudent||$('students').querySelector('button')).focus();});
$('close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{$('password').value='';$('password').type='password';$('reveal').textContent='Arată';$('reveal').setAttribute('aria-label','Arată parola');selectedId=null;entryButton?.focus();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
$('reveal').addEventListener('click',()=>{const visible=$('password').type==='password';$('password').type=visible?'text':'password';$('reveal').textContent=visible?'Ascunde':'Arată';$('reveal').setAttribute('aria-label',visible?'Ascunde parola':'Arată parola');});
let loginAttempt=0;
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const id=selectedId,attempt=++loginAttempt,submit=$('login-form').querySelector('.submit');
 const password=$('password').value;$('password').value='';submit.disabled=true;$('status').textContent='Deschidem poarta…';
 try{
  const profile=id?await studentAuth.login(id,password):await studentAuth.teacherLogin(password);
  if(attempt!==loginAttempt||selectedId!==id||!dialog.open){await studentAuth.logout();return;}
  dialog.close();if(profile.role==='teacher')await teacherUI.open(profile);else mapUI.open(profile);
 }catch(error){if(attempt===loginAttempt&&selectedId===id){$('status').textContent=error.message;$('password').focus();}}
 finally{submit.disabled=false;}
});
const mapUI=setupMap({pupils,getSelectedId:()=>selectedId,entryDialog:dialog,studentAuth});

const teacherUI=setupTeacher({studentAuth,mapUI});

