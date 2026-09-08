import {API} from './common.js';
import {initLang} from '/shared/i18n/translations.js';
initLang();
const f=document.querySelector('#login');
const remember=document.querySelector('#rememberMe');
const submit=f?.querySelector('button[type="submit"]');
const savedEmail=localStorage.getItem('bo_admin_login_email');
if(savedEmail&&f?.email){f.email.value=savedEmail;if(remember)remember.checked=true}
const saveSession=(d,keep)=>{const target=keep?localStorage:sessionStorage;const other=keep?sessionStorage:localStorage;other.removeItem('bo_token');other.removeItem('bo_user');target.setItem('bo_token',d.token);target.setItem('bo_user',JSON.stringify(d.user))};
f?.addEventListener('submit',async e=>{e.preventDefault();if(submit?.disabled)return;const original=submit?.textContent||'Login Now';if(submit){submit.disabled=true;submit.textContent='Signing in…'}try{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);let r;try{r=await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.email.value.trim(),password:f.password.value,role:'admin'}),signal:controller.signal})}finally{clearTimeout(timer)}const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Login failed');if(!d.token||!d.user)throw Error('Invalid login response');saveSession(d,!!remember?.checked);if(remember?.checked)localStorage.setItem('bo_admin_login_email',f.email.value.trim());else localStorage.removeItem('bo_admin_login_email');location.href='index.html'}catch(e){const m=document.querySelector('#msg');m.textContent=e.name==='AbortError'?'Login request timed out. Please try again.':e.message||'Login failed';m.className='auth-message notice error';if(submit){submit.disabled=false;submit.textContent=original}}});
