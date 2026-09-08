import {initLang,api,guard,nav,logout} from './common.js';
import {movies2026,formatGross} from '../data/movies-2026.js';
const u=guard('client'); if(!u) throw new Error('guard'); initLang();
document.querySelector('#nav').innerHTML=nav(document.body.dataset.active||'home');
document.querySelectorAll('[data-logout]').forEach(x=>x.onclick=logout);
const movieGrid=document.querySelector('#movieGrid');
if(movieGrid){
  movieGrid.innerHTML=movies2026.map(m=>`<article class="movie" aria-label="${m.title}"><div class="poster poster-${(m.rank%8)+1}"><span class="rank">#${m.rank}</span><strong>${m.title}</strong><small>${m.genre}</small></div><div class="bar">2026 • WORLDWIDE</div><div class="name">${m.title}</div><div class="movie-meta">${formatGross(m.worldwide)}</div></article>`).join('');
}

if(document.body.dataset.page==='home'){(async()=>{try{const d=await api('/client/dashboard');document.querySelector('#name').textContent=d.profile?.name||u.name;document.querySelector('#balance').textContent=Number(d.stats.assetBalance).toFixed(2);document.querySelector('#profit').textContent=Number(d.stats.dailyProfit).toFixed(2);document.querySelector('#commission').textContent=Number(d.stats.commission).toFixed(2);document.querySelector('#tasks').textContent=`${d.stats.taskCount} / ${d.stats.totalTasks}`}catch(e){console.error(e)}})()}

if(document.body.dataset.page==='profile'){(async()=>{try{const d=await api('/client/dashboard');const p=d.profile||{};document.querySelector('#name').textContent=p.name||u.name;const code=document.querySelector('#inviteCodeValue');if(code)code.textContent=p.inviteCode||'—';const credit=document.querySelector('#creditValue');if(credit)credit.textContent=String(p.creditScore??1000);const commission=document.querySelector('#commissionValue');if(commission)commission.textContent=Number(p.commissionBalance||0).toFixed(2)}catch(e){console.error(e)}})()}
