import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args:['--no-sandbox'] });
const CO = { en:'Use at checkout', he:'הצגה בקופה' };
for (const lang of ['en','he']) {
  const c = await b.newContext({ viewport:{width:430,height:932}, deviceScaleFactor:3, isMobile:true, hasTouch:true });
  const p = await c.newPage();
  await p.goto(`http://localhost:8099/?demo=${lang}&theme=light`,{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await p.mouse.click(lang==='en'?392:38, 29); await p.waitForTimeout(1500);
  await p.screenshot({path:`raw-${lang}-settings.png`});
  await p.goBack(); await p.waitForTimeout(800);
  await p.getByText('Zara',{exact:true}).first().click(); await p.waitForTimeout(1200);
  await p.getByText(CO[lang]).first().click(); await p.waitForTimeout(2500);
  await p.screenshot({path:`raw-${lang}-checkout.png`});
  await c.close();
}
await b.close();
