import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
const OUT = '/home/user/Shovar/docs/store-assets';
const SHOTS = [
  { id:'1-home', src:'home', bg:['#0F9E78','#065A43'], en:['All your credits,<br>one wallet','Gift cards & store credit with balance and expiry'], he:['כל הזיכויים שלך,<br>בארנק אחד','שוברים וזיכויים עם יתרה ותוקף'] },
  { id:'2-detail', src:'detail', bg:['#0F9E78','#065A43'], en:['Balance and expiry<br>at a glance','Log usage, keep receipts, never lose track'], he:['יתרה ותוקף<br>במבט אחד','רושמים שימוש, שומרים קבלות, לא מפספסים'] },
  { id:'3-checkout', src:'checkout', bg:['#1B2430','#0B0D10'], en:['Show the code<br>at checkout','Barcode, QR or big text'], he:['מציגים את הקוד<br>בקופה','ברקוד, QR או טקסט גדול'] },
  { id:'4-private', src:'dark', bg:['#1B2430','#0B0D10'], en:['Private & encrypted','No account. Codes stay on your phone'], he:['פרטי ומוצפן','בלי חשבון. הקודים נשארים בטלפון'] },
];
const SIZES = [
  { dir:'android/phone', w:1080, h:1920 },
  { dir:'ios/6.9-inch', w:1320, h:2868 },
  { dir:'ios/6.5-inch', w:1284, h:2778 },
];
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });
for (const lang of ['en','he']) for (const sz of SIZES) for (const s of SHOTS) {
  const img = 'data:image/png;base64,' + readFileSync(`raw-${lang}-${s.src}.png`).toString('base64');
  const W = sz.w, H = sz.h, pw = W*0.8, ph = pw*932/430, bz = W*0.016;
  const [t, sub] = s[lang];
  const html = `<html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;position:relative;
   background:linear-gradient(160deg,${s.bg[0]},${s.bg[1]});font-family:'DejaVu Sans','Liberation Sans',sans-serif;color:#fff" dir="${lang==='he'?'rtl':'ltr'}">
   <div style="position:absolute;top:${H*0.055}px;left:${W*0.06}px;right:${W*0.06}px;text-align:center">
     <div style="font-size:${W*0.088}px;font-weight:800;line-height:1.15">${t}</div>
     <div style="font-size:${W*0.036}px;opacity:.85;margin-top:${W*0.03}px">${sub}</div></div>
   <div style="position:absolute;left:${(W-pw)/2}px;top:${H*0.235}px;width:${pw}px;height:${ph}px;box-sizing:border-box;
     border:${bz}px solid #0b0b0d;border-radius:${W*0.105}px;overflow:hidden;box-shadow:0 ${W*0.03}px ${W*0.08}px rgba(0,0,0,.45);background:#000">
     <img src="${img}" style="width:100%;height:100%;object-fit:cover;display:block"></div></body></html>`;
  const p = await b.newPage({ viewport:{width:W,height:H} });
  await p.setContent(html); await p.waitForTimeout(150);
  mkdirSync(`${OUT}/${sz.dir}/${lang}`, { recursive:true });
  await p.screenshot({ path:`${OUT}/${sz.dir}/${lang}/${s.id}.png` });
  await p.close();
}
// Play feature graphic 1024x500
for (const lang of ['en','he']) {
  const icon = 'data:image/png;base64,' + readFileSync('/home/user/Shovar/assets/images/icon.png').toString('base64');
  const [t] = lang==='en' ? ['Shovar<br><span style="font-size:34px;font-weight:400;opacity:.9">Your store credit wallet</span>'] : ['שובר<br><span style="font-size:34px;font-weight:400;opacity:.9">ארנק הזיכויים שלך</span>'];
  const p = await b.newPage({ viewport:{width:1024,height:500} });
  await p.setContent(`<body style="margin:0;width:1024px;height:500px;background:linear-gradient(160deg,#0F9E78,#065A43);display:flex;align-items:center;justify-content:center;gap:48px;font-family:'DejaVu Sans',sans-serif;color:#fff" dir="${lang==='he'?'rtl':'ltr'}">
   <img src="${icon}" style="width:230px;height:230px;border-radius:52px;box-shadow:0 12px 40px rgba(0,0,0,.35)"><div style="font-size:88px;font-weight:800;line-height:1.1">${t}</div></body>`);
  await p.waitForTimeout(150);
  mkdirSync(`${OUT}/android/feature-graphic`, { recursive:true });
  await p.screenshot({ path:`${OUT}/android/feature-graphic/${lang}.png` });
  await p.close();
}
await b.close();
