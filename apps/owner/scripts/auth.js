import {API} from './common.js';
import {initLang} from '../shared/i18n/translations.js';
initLang();
const f=document.querySelector('#login');
const remember=document.querySelector('#rememberMe');
const savedEmail=localStorage.getItem('bo_owner_login_email');
if(savedEmail&&f?.email){f.email.value=savedEmail;if(remember)remember.checked=true}
const saveSession=(d,keep)=>{const target=keep?localStorage:sessionStorage;const other=keep?sessionStorage:localStorage;other.removeItem('bo_token');other.removeItem('bo_user');target.setItem('bo_token',d.token);target.setItem('bo_user',JSON.stringify(d.user))};
f?.addEventListener('submit',async e=>{e.preventDefault();try{const r=await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.email.value.trim(),password:f.password.value,role:'owner'})});const d=await r.json();if(!r.ok)throw Error(d.error||'Login failed');saveSession(d,!!remember?.checked);if(remember?.checked)localStorage.setItem('bo_owner_login_email',f.email.value.trim());else localStorage.removeItem('bo_owner_login_email');location.href='index.html'}catch(x){const m=document.querySelector('#msg');m.textContent=x.message;m.className='auth-message notice error'}});
