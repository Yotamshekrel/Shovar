import { chromium } from 'playwright-core';
const T = { en:{zara:'Zara',checkout:'Use at checkout',q:'zar'}, he:{zara:'Zara',checkout:null,q:'זאר'} };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args:['--no-sandbox'] });
async function ctx(){ return b.newContext({ viewport:{width:430,height:932}, deviceScaleFactor:3, isMobile:true, hasTouch:true }); }
for (const lang of ['en','he']) {
  const c = await ctx(); const p = await c.newPage();
  await p.goto(`http://localhost:8099/?demo=${lang}&theme=light`,{waitUntil:'networkidle'});
  await p.waitForTimeout(6000);
  await p.screenshot({path:`raw-${lang}-home.png`});
  // search
  await p.getByRole('button').first().waitFor().catch(()=>{});
  await p.mouse.click(215, 265); await p.waitForTimeout(1200);
  const inp = p.locator('input').first(); await inp.fill(lang==='en'?'zar':'זאר'); await p.waitForTimeout(1200);
  await p.screenshot({path:`raw-${lang}-search.png`});
  await p.goBack(); await p.waitForTimeout(800);
  // detail
  await p.getByText('Zara',{exact:true}).first().click(); await p.waitForTimeout(1500);
  await p.screenshot({path:`raw-${lang}-detail.png`});
  // checkout: the big green button
  await p.mouse.click(215, 510); await p.waitForTimeout(2000);
  await p.screenshot({path:`raw-${lang}-checkout.png`});
  await c.close();
}
const c = await ctx(); const p = await c.newPage();
for (const lang of ['en','he']) {
  const c2 = await ctx(); const p2 = await c2.newPage();
  await p2.goto(`http://localhost:8099/?demo=${lang}&theme=dark`,{waitUntil:'networkidle'});
  await p2.waitForTimeout(6000);
  await p2.screenshot({path:`raw-${lang}-dark.png`});
  await c2.close();
}
await b.close();
