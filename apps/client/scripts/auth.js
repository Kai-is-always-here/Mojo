import {API,initLang} from './common.js';
initLang();
const showMessage=(el,text,type='error')=>{el.textContent=text;el.className=`auth-message notice ${type}`};
const parseResponse=async r=>{const d=await r.json().catch(()=>({error:'Server returned an invalid response'}));if(!r.ok)throw new Error(d.error||`Request failed (${r.status})`);return d};
const form=document.querySelector('#loginForm');
if(form)form.addEventListener('submit',async e=>{e.preventDefault();const msg=document.querySelector('#msg');try{const body={email:form.email.value.trim(),password:form.password.value,role:'client'};const d=await parseResponse(await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));localStorage.setItem('bo_token',d.token);localStorage.setItem('bo_user',JSON.stringify(d.user));location.href='index.html'}catch(err){showMessage(msg,err.message,'error')}});
const rf=document.querySelector('#registerForm');
if(rf)rf.addEventListener('submit',async e=>{e.preventDefault();const msg=document.querySelector('#msg');try{const body=Object.fromEntries(new FormData(rf));if(body.password!==body.confirmPassword)throw new Error('Passwords do not match');const d=await parseResponse(await fetch(API+'/auth/register-client',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));showMessage(msg,`Registration successful. Your invitation code is ${d.inviteCode}. Save it to invite another client.`,'success');rf.reset()}catch(err){showMessage(msg,err.message,'error')}});
