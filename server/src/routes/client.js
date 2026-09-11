import {Router} from 'express'; import {auth,allow} from '../middleware/auth.js'; import {db,save} from '../db.js';
const r=Router();r.use(auth,allow('client'));
r.get('/dashboard',(req,res)=>{ const profile=db.clients.find(c=>c.id===req.user.id); const orders=db.orders.filter(o=>o.clientId===req.user.id); const completed=orders.filter(o=>o.status==='completed'); const commission=Number(profile?.commissionBalance||0); res.json({profile,stats:{assetBalance:10,dailyProfit:0,commission,taskCount:completed.length,totalTasks:30}}); });
r.get('/history',(req,res)=>res.json(db.orders.filter(o=>o.clientId===req.user.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))));
export default r;
