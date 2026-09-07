import {initLang,nav} from './common.js';
import {movies2026,formatGross} from '../data/movies-2026.js';
initLang();document.querySelector('#nav').innerHTML=nav('home');
document.querySelector('#movieGrid').innerHTML=movies2026.map(m=>`<article class="movie"><div class="poster poster-${(m.rank%8)+1}"><span class="rank">#${m.rank}</span><strong>${m.title}</strong><small>${m.genre}</small></div><div class="bar">2026 • WORLDWIDE</div><div class="name">${m.title}</div><div class="movie-meta">${formatGross(m.worldwide)}</div></article>`).join('');
