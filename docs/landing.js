/* Shovar landing page — interactions. Vanilla JS, no dependencies. */
(() => {
  'use strict';

  // Store links. Set appStore to the App Store URL once the iOS app is live.
  const LINKS = {
    play: 'https://play.google.com/store/apps/details?id=com.shvar.wallet',
    appStore: null,
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  /* ───────────────────────── i18n ───────────────────────── */
  const HE = {
    'brand': 'שובר',
    'nav.how': 'איך זה עובד', 'nav.try': 'נסו בעצמכם', 'nav.features': 'יכולות', 'nav.faq': 'שאלות נפוצות', 'nav.cta': 'להורדה',
    'hero.kicker': 'כל הזיכויים במקום אחד',
    'hero.title': 'די לזרוק <span class="accent serif grad-warm">כסף לפח.</span>',
    'hero.lead': '<b>זיכויים</b>, פתקי החלפה ו<b>כרטיסי מתנה</b>, הכול בארנק אחד, פרטי ומוצפן. מצלמים את הקבלה פעם אחת, ושובר כבר יזכיר לכם לפני שהתוקף נגמר, וגם כשתעברו ליד החנות.',
    'store.playSmall': 'זמין ב־', 'store.iosSmall': 'להורדה מ־', 'store.iosSoon': 'בקרוב ב־',
    'hero.secondary': 'איך זה עובד?',
    'trust.free': 'חינם ובלי פרסומות', 'trust.account': 'בלי הרשמה', 'trust.lang': 'בעברית ובאנגלית',
    'rc.sub': 'פתק זיכוי', 'rc.amount': 'סכום', 'rc.valid': 'בתוקף עד',
    'ui.appName': 'שובר', 'ui.total': 'סה״כ זמין', 'ui.expiring': '1 פג בקרוב', 'ui.searchPh': 'יש לי זיכוי ב…',
    'ui.near': 'מה יש לידי?', 'ui.all': 'הכול', 'ui.gift': 'כרטיסי מתנה', 'ui.credits': 'זיכויים', 'ui.soon': 'פג בקרוב',
    's.castro': 'קסטרו', 's.zara': 'זארה', 's.superpharm': 'סופר-פארם',
    'ui.credit': 'זיכוי', 'ui.giftcard': 'כרטיס מתנה', 'ui.exp2027': 'בתוקף עד 12.3.2027', 'ui.exp2027b': 'בתוקף עד 3.1.2027',
    'ui.in9': 'פג בעוד 9 ימים', 'ui.works': 'למימוש ב־1,300+ חנויות',
    'toast.now': 'עכשיו', 'toast.near': 'יש לך זיכוי של ₪320 בזארה, במרחק 150 מ׳ 📍', 'chip.exp': 'פג בעוד 3 ימים',
    'problem.eyebrow': 'מכירים את זה?',
    'problem.story': 'החזרת ג׳ינס, ובקופה קיבלת זיכוי על <em>₪200</em>. הוא נדחף לארנק, נזרק למגירה. או במקרה הטוב צילמת אותו , והוא נקבר בין ארבעת אלפים תמונות אחרות. אחרי שנה הוא צץ פתאום. <strong>התוקף נגמר לפני חודשיים.</strong>',
    'problem.better': 'אפשר אחרת.',
    'how.kicker': 'איך זה עובד',
    'how.title': 'מהקבלה במגירה <span class="serif grad">לכסף בכיס.</span>',
    'how.sub': 'ארבעה שלבים.',
    'how.s1t': 'מצלמים את הקבלה', 'how.s1b': 'מצלמים את פתק הזיכוי, כרטיס המתנה או צילום מסך, ושובר שולף לבד את שם החנות, הסכום, המטבע, התאריכים והקוד.',
    'how.s2t': 'בודקים ושומרים', 'how.s2b': 'מה ששובר לא בטוח בו מסומן בצהוב. מתקנים בנגיעה ושומרים, והקוד נשמר בטלפון בהצפנה.',
    'how.s3t': 'ושוכחים מזה', 'how.s3b': 'ברצינות. שובר יזכיר לכם שבועיים ו־3 ימים לפני שהתוקף נגמר, וגם כשתהיו ליד חנות שאפשר לממש בה.',
    'how.s4t': 'מממשים 🎉', 'how.s4b': 'בקופה מציגים ברקוד, QR או את הקוד באותיות גדולות. מימשתם רק חלק? רושמים כמה, והיתרה מתעדכנת לבד.',
    'cam.title': 'סריקת קבלה', 'cam.found': 'נמצאו 4 פרטים',
    'rv.title': 'בדיקת פרטים', 'rv.store': 'חנות', 'rv.amount': 'סכום', 'rv.expiry': 'תאריך תפוגה', 'rv.check': 'כדאי לבדוק',
    'rv.code': 'קוד שובר', 'rv.save': 'שמירה',
    'lk.date': 'יום חמישי, 8 באוקטובר', 'lk.n1t': 'זארה במרחק 150 מ׳', 'lk.n1b': 'יש לך שם זיכוי של ₪320, בתוקף עוד 9 ימים.',
    'lk.ago': 'לפני שעתיים', 'lk.n2t': 'הזיכוי בקסטרו יפוג בעוד 3 ימים', 'lk.n2b': 'נשארו ₪200. כדאי לנצל לפני שייעלם.',
    'py.copy': 'הקישו על הקוד להעתקה', 'py.bar': 'ברקוד', 'py.qr': 'קוד QR', 'py.text': 'טקסט בלבד', 'py.log': 'עדכון יתרה',
    'py.left': 'היתרה בכרטיס',
    'py.hist': 'היסטוריה', 'py.h1': 'מימוש בקופה', 'py.h2': 'נוסף מצילום קבלה',
    'try.kicker': 'נסו בעצמכם',
    'try.title': 'יאללה, תחפשו. <span class="serif grad">הארנק כבר יודע.</span>',
    'try.sub': 'הקלידו שם של חנות בטלפון, בעברית או באנגלית. שגיאות כתיב? אין בעיה. שובר גם בודק אילו מכרטיסי המתנה שלכם אפשר לממש שם.',
    'try.statCards': 'כרטיסים שעובדים כאן', 'try.statTotal': 'סה״כ למימוש כאן', 'try.statSearch': 'חיפושים',
    'try.walletTitle': 'מה יש בארנק לדוגמה', 'fd.title': 'חיפוש', 'try.hint': 'טיפ: נסו לכתוב עם שגיאה. בכוונה.',
    'ft.kicker': 'כל מה שצריך, בלי מה שלא',
    'ft.title': 'אפליקציה קטנה. <span class="serif grad">עושה המון.</span>',
    'ft.scanT': 'מצלמים וזהו',
    'ft.scanB': 'שובר שולף את שם החנות, הסכום, המטבע, התאריכים והקוד מתמונה, מ־PDF או מצילום מסך, ומסמן מה כדאי לבדוק. ככה בודקים רק את מה שצריך.',
    'ft.langT': 'מבין עברית. סולח על שגיאות.', 'ft.langB': 'מחפשים בעברית או באנגלית, ואיך שבא לכם לאיית.',
    'ft.nearT': 'קופץ כשאתם בסביבה', 'ft.nearB': 'עוברים ליד חנות שיש לכם בה זיכוי? שובר שולח תזכורת. רק אם הפעלתם, בלי לרוקן את הסוללה, ואפשר להשתיק כל כרטיס בנפרד.',
    'ft.netT': 'איפה אפשר לממש את ה־BuyMe?',
    'ft.netB': 'מוסיפים כרטיס של BuyMe, תו הזהב, Max, דרים קארד או נופשונית, ושובר מראה את כל החנויות שמכבדות אותו. הן עולות גם בחיפוש.',
    'ft.expT': 'לפני שהתוקף נגמר', 'ft.expB': 'תזכורת שבועיים ו־3 ימים מראש. אפשר לשנות את זה בהגדרות.',
    'ft.exp14': 'שבועיים', 'ft.exp3': '3 ימים',
    'ft.payT': 'מוכן לקופה', 'ft.payB': 'ברקוד, QR או טקסט גדול. נגיעה בקוד מעתיקה אותו.',
    'ft.privT': 'פרטי מהיסוד',
    'ft.privB': 'בלי חשבון ובלי שרתים שלנו. הארנק נשמר רק בטלפון שלכם. קודים וסיסמאות מוצפנים ב־AES-256, המפתח שמור ב־Keychain או ב־Keystore, ואפשר לנעול את האפליקציה עם Face ID או טביעת אצבע.',
    'ft.privNoAcc': 'בלי חשבון', 'ft.privNoAds': 'בלי פרסומות', 'ft.privNoTrack': 'בלי מעקב',
    'ft.useT': 'מימשתם חלק? היתרה נשמרת', 'ft.useB': 'רושמים כמה השתמשתם, והיתרה מתעדכנת. כל ההיסטוריה נשמרת.',
    'ft.shareT': 'קיבלתם בוואטסאפ?', 'ft.shareB': 'שולחים לשובר קישור לכרטיס מתנה, צילום מסך או PDF, ישר מתפריט השיתוף.',
    'wall.eyebrow': 'נבנה בשביל בלגן כרטיסי המתנה בישראל',
    'wall.title': 'חמש חברות כרטיסים. <span class="serif grad-light">חיפוש אחד.</span>',
    'wall.sub': 'לכל כרטיס של BuyMe, תו הזהב, Max, דרים קארד ונופשונית יש רשימת חנויות משלו. שובר מכיר את כולן, אז כשמחפשים קסטרו הוא מוצא גם את ה־BuyMe שקיבלתם ליום ההולדת.',
    'wall.s1': 'חנויות ברשימות', 'wall.s2': 'סוגי כרטיסי מתנה', 'wall.s3': 'שפות מלאות', 'wall.s4': 'חשבונות שצריך לפתוח',
    'faq.kicker': 'שאלות נפוצות', 'faq.title': 'שאלות <span class="serif grad">טובות.</span>',
    'faq.sub': 'יש לכם שאלה אחרת? כתבו לנו: <a href="mailto:yotamshekrel@gmail.com">yotamshekrel@gmail.com</a>',
    'faq.q1': 'שובר עולה כסף?', 'faq.a1': 'לא. ההורדה בחינם, ואין באפליקציה פרסומות.',
    'faq.q2': 'צריך להירשם?', 'faq.a2': 'לא. אין חשבון ואין סיסמה. פותחים את האפליקציה ומוסיפים את הכרטיס הראשון.',
    'faq.q3': 'איפה נשמר המידע שלי?', 'faq.a3': 'רק בטלפון שלכם. קודים וסיסמאות מוצפנים (AES-256-GCM), והמפתח שמור ב־Keychain של iOS או ב־Keystore של אנדרואיד. אפשר גם לנעול את האפליקציה עם Face ID או טביעת אצבע. אין לנו שרתים שמחזיקים את הארנק שלכם, ואין כלי אנליטיקס.',
    'faq.q4': 'איך שובר קורא קבלות?', 'faq.a4': 'קריאה בעזרת AI היא לגמרי אופציונלית. בפעם הראשונה שובר מבקש אישור ומסביר שנשלחת רק התמונה שבחרתם, ורק כדי לשלוף ממנה את הפרטים. אפשר לכבות את זה בהגדרות ולהזין כרטיסים ידנית.',
    'faq.q5': 'שובר עוקב אחרי המיקום שלי?', 'faq.a5': 'התזכורות לפי מיקום כבויות עד שתפעילו אותן. הן עובדות עם מנגנון המיקום החסכוני של הטלפון, והמיקום המדויק שלכם לא יוצא מהמכשיר. כדי למצוא סניפים, שובר שולח רק שמות של חנויות ואזור כללי, ברדיוס של כ־10 ק״מ.',
    'faq.q6': 'אילו כרטיסי מתנה הוא מכיר?', 'faq.a6': 'כל זיכוי, פתק החלפה או שובר. בכרטיסים שאפשר לממש בכמה רשתות, שובר יודע איפה מכבדים את BuyMe (ALL, Total, Style וברנץ׳), תו הזהב, גיפטקארד של Max (כולל סופר, אקזקיוטיב ואוכל), דרים קארד ונופשונית.',
    'faq.q7': 'יש עברית?', 'faq.a7': 'ברור. כל האפליקציה בעברית ובאנגלית, מימין לשמאל כמו שצריך, והחיפוש מבין שמות של חנויות בשתי השפות.',
    'dl.title': 'הזיכוי הבא שלכם <span class="serif">כבר לא ילך לאיבוד.</span>',
    'dl.sub': 'חינם, בלי פרסומות ובלי הרשמה. ההתקנה לוקחת פחות מדקה.',
    'foot.privacy': 'מדיניות פרטיות', 'foot.support': 'תמיכה',
    'foot.legal': 'שמות החנויות, הסכומים והקודים בעמוד הזה הם לדוגמה בלבד. שובר לא קשור לאף רשת או חברת כרטיסי מתנה. נתוני מפה © OpenStreetMap contributors. © 2026 שובר.',
    'foot.mark': 'שובר',
  };
  // Hebrew "at": joined to Hebrew names (בקסטרו), with a maqaf before Latin ones (ב־FOX).
  const heIn = (s) => (/^[A-Za-z0-9]/.test(s) ? `ב־${s}` : `ב${s}`);
  // Strings built at runtime (not in the markup).
  const DYN = {
    en: {
      active: (n) => `${n} active`,
      title: 'Shovar – Store Credit Wallet',
      sumAt: (s) => `You can spend at ${s}`,
      sumFor: (q) => `Matches for “${q}”`,
      direct: (s) => `Your credit at ${s}`,
      accepted: (s) => `Gift cards accepted at ${s}`,
      named: 'Your cards',
      okAt: (s) => `Works at ${s}`,
      emptyT: 'Do I have credit at…?',
      emptyB: 'Try “castro”, “זארה” or “supr farm”.',
      noneT: (s) => `No credit at ${s}. Yet.`,
      noneB: 'Snap your next receipt from there and it will show up here.',
      nothingT: (q) => `Nothing for “${q}”`,
      nothingB: 'Check the spelling, or try a store from the demo wallet.',
      credit: 'Store credit', gift: 'Gift card',
    },
    he: {
      active: (n) => `${n} פעילים`,
      title: 'שובר – ארנק זיכויים',
      sumAt: (s) => `סה״כ למימוש ${heIn(s)}`,
      sumFor: (q) => `תוצאות עבור "${q}"`,
      direct: (s) => `הזיכויים שלכם ${heIn(s)}`,
      accepted: (s) => `כרטיסי מתנה שאפשר לממש ${heIn(s)}`,
      named: 'הכרטיסים שלכם',
      okAt: (s) => `עובד ${heIn(s)}`,
      emptyT: 'יש לי זיכוי ב…?',
      emptyB: 'נסו "castro", "זארה" או "supr farm".',
      noneT: (s) => `אין לכם זיכוי ${heIn(s)}. עדיין.`,
      noneB: 'צלמו משם את הקבלה הבאה, והיא תופיע כאן.',
      nothingT: (q) => `לא מצאנו כלום עבור "${q}"`,
      nothingB: 'בדקו את האיות, או נסו חנות מהארנק לדוגמה.',
      credit: 'זיכוי', gift: 'כרטיס מתנה',
    },
  };
  let lang = 'en';
  const T = () => DYN[lang];
  const enHTML = new Map();
  const enPH = new Map();
  const langListeners = [];

  // App Store not live yet → show a "coming soon" badge instead of a dead link.
  $$('.js-play').forEach((a) => { a.href = LINKS.play; });
  $$('.js-ios').forEach((a) => {
    if (LINKS.appStore) { a.href = LINKS.appStore; a.target = '_blank'; a.rel = 'noopener'; return; }
    a.removeAttribute('href'); a.classList.add('is-soon'); a.setAttribute('aria-disabled', 'true');
    a.classList.remove('magnetic');
    const small = $('.js-ios-small', a);
    small.textContent = 'Coming soon to the';
    small.dataset.i18n = 'store.iosSoon';
  });

  $$('[data-i18n]').forEach((el) => enHTML.set(el, el.innerHTML));
  $$('[data-i18n-ph]').forEach((el) => enPH.set(el, el.placeholder));

  function applyLang(next) {
    lang = next === 'he' ? 'he' : 'en';
    root.lang = lang;
    root.dir = lang === 'he' ? 'rtl' : 'ltr';
    for (const [el, en] of enHTML) {
      const html = lang === 'he' ? HE[el.dataset.i18n] : en;
      if (html != null) el.innerHTML = html;
    }
    for (const [el, en] of enPH) el.placeholder = lang === 'he' ? (HE[el.dataset.i18nPh] ?? en) : en;
    document.title = T().title;
    $$('[data-split]').forEach((el) => splitWords(el));
    splitStory();
    langListeners.forEach((fn) => fn());
  }
  $('#langBtn').addEventListener('click', () => {
    const next = lang === 'he' ? 'en' : 'he';
    store.set('shovar-lang', next);
    applyLang(next);
  });

  /* ───────────────────────── Split text ───────────────────────── */
  function splitWords(el) {
    let i = 0;
    const wrap = (node) => {
      const w = document.createElement('span'); w.className = 'w';
      const inner = document.createElement('span'); inner.style.setProperty('--wi', i++);
      w.appendChild(inner);
      node.replaceWith(w); inner.appendChild(node);
    };
    const walk = (parent) => {
      [...parent.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const t = document.createTextNode(p); frag.appendChild(t);
          });
          const texts = [...frag.childNodes];
          n.replaceWith(frag);
          texts.forEach((t) => { if (!/^\s+$/.test(t.textContent)) wrap(t); });
        } else if (n.nodeType === 1 && !n.classList.contains('w')) {
          // Gradient text can't be split (background-clip breaks on transformed children): move it as one unit.
          if (/\bgrad|\baccent/.test(n.className)) wrap(n); else walk(n);
        }
      });
    };
    walk(el);
  }
  function splitStory() {
    const story = $('#story');
    const walk = (parent) => {
      [...parent.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const s = document.createElement('span'); s.className = 'sw'; s.textContent = p; frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(story);
    if (story.dataset.lit) $$('.sw', story).forEach((s) => s.classList.add('lit'));
  }

  /* ───────────────────────── Reveal on scroll ───────────────────────── */
  $$('[data-reveal]').forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    el.style.setProperty('--i', Math.min(sibs.indexOf(el), 8));
  });
  const onReveal = new Map();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
      // Drop the stagger delay once in, so hover transitions stay snappy.
      setTimeout(() => { e.target.style.transitionDelay = '0s'; }, 1400);
      onReveal.get(e.target)?.();
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }) : null;
  const watch = (el, fn) => { if (fn) onReveal.set(el, fn); if (io) io.observe(el); else { el.classList.add('in'); fn?.(); } };

  /* ───────────────────────── Count-up ───────────────────────── */
  function countTo(el, from, to, dur = 1400, format = fmt) {
    if (reduce) { el.textContent = format(to); return; }
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = format(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ───────────────────────── Hero ───────────────────────── */
  const heroTotal = $('#heroTotal');
  const heroActive = $('#heroActive');
  let heroCount = 7;
  // Start the hero one card short; the scan sequence adds it.
  if (!reduce) { $('#heroVisual').classList.add('seq-ready'); heroCount = 6; heroTotal.textContent = fmt(1385); }
  langListeners.push(() => { heroActive.textContent = T().active(heroCount); });

  async function heroSequence() {
    const hv = $('#heroVisual');
    const toast = $('#heroToast');
    if (reduce) { toast.classList.add('show'); return; }
    await wait(1500);
    hv.classList.add('seq-scan');
    await wait(2700);
    const receipt = $('#heroReceipt');
    const r = receipt.getBoundingClientRect();
    const c = $('#heroCards').getBoundingClientRect();
    receipt.style.setProperty('--fx', `${c.left + c.width / 2 - (r.left + r.width / 2)}px`);
    receipt.style.setProperty('--fy', `${c.top + 30 - (r.top + r.height / 2)}px`);
    hv.classList.add('seq-fly');
    await wait(850);
    hv.classList.remove('seq-ready');
    heroCount = 7; heroActive.textContent = T().active(7);
    countTo(heroTotal, 1385, 1585, 1100);
    await wait(900);
    toast.classList.add('show');
    await wait(1800);
    // Bring a fresh receipt back to its spot, quietly.
    receipt.style.transition = 'none';
    receipt.style.opacity = '0';
    hv.classList.remove('seq-fly', 'seq-scan');
    receipt.getBoundingClientRect();
    receipt.style.transition = 'opacity 1.2s';
    receipt.style.opacity = '1';
    setTimeout(() => { receipt.style.transition = ''; receipt.style.opacity = ''; }, 1300);
  }

  // Tilt the hero composition toward the cursor.
  const tilt = $('#heroTilt');
  if (finePointer && !reduce) {
    setTimeout(() => tilt.classList.add('settled'), 1600);
    $('.hero').addEventListener('pointermove', (e) => {
      const r = tilt.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / innerWidth;
      const y = (e.clientY - (r.top + r.height / 2)) / innerHeight;
      tilt.style.setProperty('--ry', `${x * 14}deg`);
      tilt.style.setProperty('--rx', `${-y * 10}deg`);
    });
    $('.hero').addEventListener('pointerleave', () => { tilt.style.setProperty('--ry', '0deg'); tilt.style.setProperty('--rx', '0deg'); });
  }

  /* ───────────────────────── Problem: words light up ───────────────────────── */
  const story = $('#story');
  watch(story, () => {
    story.dataset.lit = '1';
    const words = $$('.sw', story);
    words.forEach((w, i) => setTimeout(() => w.classList.add('lit'), reduce ? 0 : 200 + i * 55));
  });

  /* ───────────────────────── Barcodes & QR ───────────────────────── */
  function rng(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; }
  function barcode(el, seed, n = 46) {
    const r = rng(seed);
    const parts = [];
    for (let i = 0; i < n; i++) parts.push([i % 2 === 0, 1 + Math.floor(r() * 3)]);
    const total = parts.reduce((a, p) => a + p[1], 0);
    el.innerHTML = parts.map(([bar, u]) => `<i style="width:${(u / total) * 100}%;${bar ? '' : 'background:transparent'}"></i>`).join('');
  }
  function qr(el, seed) {
    const r = rng(seed); const N = 13; let html = '';
    const finder = (rr, cc) => rr === 0 || rr === 4 || cc === 0 || cc === 4 || (rr === 2 && cc === 2);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let on;
      if (y < 5 && x < 5) on = finder(y, x);
      else if (y < 5 && x > 7) on = finder(y, x - 8);
      else if (y > 7 && x < 5) on = finder(y - 8, x);
      else if (y === 5 || x === 5 || (y < 6 && x === 7) || (x < 6 && y === 7)) on = false;
      else on = r() > 0.52;
      html += `<i${on ? '' : ' class="o"'}></i>`;
    }
    el.innerHTML = html;
  }
  barcode($('#payBarcode'), 48291);
  barcode($('#tileBarcode'), 7731, 40);
  qr($('#tileQr'), 99);

  /* ───────────────────────── How it works ───────────────────────── */
  (() => {
    const steps = $$('#steps .step');
    const screens = $$('.how-phone .scr');
    const bar = $('#howBar');
    const payBal = $('#payBal');
    const DUR = [5600, 5600, 5000, 6000];
    let cur = 0, elapsed = 0, last = 0, visible = false, hover = false, payTimer = 0;

    function go(i) {
      if (i === cur && screens[i].classList.contains('is-on')) { elapsed = 0; return; }
      steps.forEach((s, j) => {
        s.classList.toggle('is-active', j === i);
        $('.step-btn', s).setAttribute('aria-expanded', String(j === i));
      });
      screens.forEach((sc, j) => {
        sc.classList.toggle('was', j === cur && j !== i);
        sc.classList.toggle('is-on', j === i);
      });
      clearTimeout(payTimer);
      payBal.textContent = '320';
      if (i === 3) payTimer = setTimeout(() => countTo(payBal, 320, 180, 900), reduce ? 0 : 1900);
      cur = i; elapsed = 0;
    }
    steps.forEach((s, i) => $('.step-btn', s).addEventListener('click', () => { go(i); elapsed = 0; }));
    const grid = $('.how-grid');
    if (finePointer) {
      grid.addEventListener('pointerenter', () => { hover = true; });
      grid.addEventListener('pointerleave', () => { hover = false; });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.35 }).observe(grid);
    } else visible = true;

    function frame(t) {
      const dt = last ? Math.min(t - last, 100) : 0; last = t;
      if (visible && !hover && !reduce) {
        elapsed += dt;
        if (elapsed >= DUR[cur]) go((cur + 1) % steps.length);
      }
      const p = (cur + Math.min(elapsed / DUR[cur], 1)) / steps.length;
      bar.style.width = `${p * 100}%`;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ───────────────────────── Try it: search demo ───────────────────────── */
  const STORES = {
    zara: { en: 'Zara', he: 'זארה', alias: ['זרה'] },
    castro: { en: 'Castro', he: 'קסטרו', alias: ['kastro'] },
    superpharm: { en: 'Super-Pharm', he: 'סופר-פארם', alias: ['super pharm', 'סופר פארם', 'superpharm'] },
    mango: { en: 'Mango', he: 'מנגו' },
    fox: { en: 'FOX', he: 'פוקס', alias: ['פוקס הום'] },
    hm: { en: 'H&M', he: 'אייץ׳ אנד אם', alias: ['hm', 'h and m', 'אייץ אנד אם'] },
    adidas: { en: 'Adidas', he: 'אדידס' },
    nike: { en: 'Nike', he: 'נייקי', alias: ['נייק'] },
    terminalx: { en: 'Terminal X', he: 'טרמינל איקס' },
    shufersal: { en: 'Shufersal', he: 'שופרסל' },
    golf: { en: 'Golf', he: 'גולף' },
    renuar: { en: 'Renuar', he: 'רנואר' },
    homecenter: { en: 'Home Center', he: 'הום סנטר' },
    ae: { en: 'American Eagle', he: 'אמריקן איגל' },
    laline: { en: 'Laline', he: 'לאלין' },
    bepharm: { en: 'Be Pharm', he: 'בי פארם', alias: ['be'] },
    ikea: { en: 'IKEA', he: 'איקאה', alias: ['איקיאה'] },
    wolt: { en: 'Wolt', he: 'וולט' },
  };
  // Acceptance lists match the issuer data bundled with the app.
  const WALLET = [
    { id: 'zara', store: 'zara', kind: 'credit', amt: 320, a: '#26292B', b: '#0E1011', soon: true },
    { id: 'castro', store: 'castro', kind: 'credit', amt: 200, a: '#3A2F86', b: '#211A57' },
    { id: 'sp', store: 'superpharm', kind: 'gift', amt: 120, a: '#E8264A', b: '#B80C30' },
    { id: 'mango', store: 'mango', kind: 'credit', amt: 245, a: '#B7793A', b: '#7E4E1E' },
    { id: 'buyme', name: { en: 'BuyMe ALL', he: 'BuyMe ALL' }, alias: ['buyme', 'buy me', 'ביימי', 'באיימי'], kind: 'gift', amt: 250, a: '#E0398F', b: '#9C1E73', net: ['castro', 'fox', 'hm', 'mango', 'adidas', 'terminalx', 'ae', 'nike', 'laline'] },
    { id: 'tav', name: { en: 'Tav Zahav', he: 'תו הזהב' }, alias: ['tav zahav', 'תו זהב'], kind: 'gift', amt: 300, a: '#D99A1E', b: '#A86A06', net: ['castro', 'fox', 'shufersal', 'golf', 'terminalx', 'renuar', 'homecenter', 'bepharm'] },
    { id: 'dream', name: { en: 'Dream Card', he: 'דרים קארד' }, alias: ['dreamcard', 'דרים'], kind: 'gift', amt: 150, a: '#5B3FD0', b: '#35208F', net: ['fox', 'mango', 'ae', 'nike', 'laline'] },
  ];
  const cardName = (c) => (c.store ? STORES[c.store][lang] : c.name[lang]);
  const initials = (s) => s.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase();

  const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[֑-ׇ̀-ͯ]/g, '')
    .replace(/[ךםןףץ]/g, (c) => FINALS[c]).replace(/[^\p{L}\p{N}]/gu, '');
  const skeleton = (s) => s.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/c/g, 'k').replace(/w/g, 'v')
    .replace(/[aeiouy]/g, '').replace(/(.)\1+/g, '$1');
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const row = [i];
      for (let j = 1; j <= n; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row;
    }
    return prev[n];
  }
  // 0 = no match, higher = better.
  function score(q, names) {
    let best = 0;
    for (const raw of names) {
      const c = norm(raw); if (!c) continue;
      if (c === q) return 100;
      if (c.startsWith(q)) best = Math.max(best, 80 - (c.length - q.length));
      else if (q.length >= 3 && q.startsWith(c)) best = Math.max(best, 60);
      else if (q.length >= 3) {
        const latin = /^[a-z0-9]+$/.test(q) && /^[a-z0-9]+$/.test(c);
        if (latin && q.length >= 4 && skeleton(q) === skeleton(c)) best = Math.max(best, 70);
        const d = lev(q, c.slice(0, Math.max(q.length, c.length)));
        const tol = q.length >= 7 ? 2 : 1;
        if (d <= tol) best = Math.max(best, 55 - d * 5);
        else if (c.length > q.length && lev(q, c.slice(0, q.length)) <= (q.length >= 5 ? 1 : 0)) best = Math.max(best, 45);
      }
    }
    return best;
  }
  function search(raw) {
    const q = norm(raw);
    if (!q) return null;
    const stores = Object.entries(STORES)
      .map(([id, s]) => [id, score(q, [s.en, s.he, ...(s.alias || [])])])
      .filter(([, sc]) => sc > 0).sort((a, b) => b[1] - a[1]);
    const top = stores.length ? stores[0][1] : 0;
    const hitIds = stores.filter(([, sc]) => sc >= top - 15).map(([id]) => id);
    const named = WALLET.filter((c) => c.name && score(q, [c.name.en, c.name.he, ...(c.alias || [])]) > 0);
    const direct = WALLET.filter((c) => c.store && hitIds.includes(c.store));
    const accepted = WALLET.filter((c) => c.net && c.net.some((s) => hitIds.includes(s)) && !named.includes(c));
    const all = [...new Set([...direct, ...named, ...accepted])];
    return { q: raw.trim(), storeId: hitIds[0] || null, direct, named, accepted, all, total: all.reduce((a, c) => a + c.amt, 0) };
  }

  const qEl = $('#q');
  const results = $('#results');
  const clearBtn = $('#qClear');
  const statCards = $('#statCards'), statTotal = $('#statTotal'), statSearch = $('#statSearch');
  const walletList = $('#demoWallet');
  let shownTotal = 0, searches = 0, lastSig = '', settleTimer = 0, typing = null, userTouched = false;

  function renderWallet(hits) {
    walletList.classList.toggle('filtering', !!hits);
    walletList.innerHTML = WALLET.map((c) => `<li class="${hits && hits.includes(c) ? 'hit' : ''}" style="--a:${c.a};--b:${c.b}"><i></i>${cardName(c)} <b>₪${c.amt}</b></li>`).join('');
  }
  function cardHTML(c, opts = {}) {
    const name = cardName(c);
    const sub = c.kind === 'gift' ? T().gift : T().credit;
    let pill = '';
    if (opts.okAt) pill = `<span class="pill pill-ok">✓ ${T().okAt(opts.okAt)}</span>`;
    else if (c.soon) pill = `<span class="pill pill-sun">${lang === 'he' ? 'פג בעוד 9 ימים' : 'Expires in 9 days'}</span>`;
    return `<div class="wcard fd-card" style="--a:${c.a};--b:${c.b};animation-delay:${opts.delay || 0}ms">
      <div class="wc-top"><i class="wc-logo">${initials(c.store ? STORES[c.store].en : c.name.en)}</i><div><b>${name}</b><small>${sub}</small></div></div>
      <div class="wc-bot">${pill || '<span></span>'}<b class="wc-amt">₪${c.amt}</b></div></div>`;
  }
  function render(res) {
    clearBtn.hidden = !qEl.value;
    if (!res) {
      results.innerHTML = `<div class="fd-empty"><span class="big">🔎</span><b>${T().emptyT}</b><small>${T().emptyB}</small></div>`;
      renderWallet(null); setStats(0, 0); return;
    }
    const sName = res.storeId ? STORES[res.storeId][lang] : null;
    if (!res.all.length) {
      results.innerHTML = sName
        ? `<div class="fd-empty"><span class="big">🧾</span><b>${T().noneT(sName)}</b><small>${T().noneB}</small></div>`
        : `<div class="fd-empty"><span class="big">🤔</span><b>${T().nothingT(escapeHTML(res.q))}</b><small>${T().nothingB}</small></div>`;
      renderWallet([]); setStats(0, 0); return;
    }
    let html = `<div class="fd-sum"><span>${sName ? T().sumAt(sName) : T().sumFor(escapeHTML(res.q))}</span><b>₪${fmt(res.total)}</b></div>`;
    let d = 80;
    if (res.direct.length) { html += `<div class="fd-group">${T().direct(sName)}</div>`; res.direct.forEach((c) => { html += cardHTML(c, { delay: d }); d += 70; }); }
    if (res.named.length) { html += `<div class="fd-group">${T().named}</div>`; res.named.forEach((c) => { html += cardHTML(c, { delay: d }); d += 70; }); }
    if (res.accepted.length && sName) { html += `<div class="fd-group">${T().accepted(sName)}</div>`; res.accepted.forEach((c) => { html += cardHTML(c, { okAt: sName, delay: d }); d += 70; }); }
    results.innerHTML = html;
    renderWallet(res.all);
    setStats(res.all.length, res.total);
  }
  function escapeHTML(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function setStats(n, total) {
    statCards.textContent = n;
    const hot = statTotal.closest('.stat');
    hot.classList.toggle('on', total > 0);
    if (total !== shownTotal) {
      countTo(statTotal, shownTotal, total, 700);
      hot.classList.add('bump'); setTimeout(() => hot.classList.remove('bump'), 260);
      shownTotal = total;
    }
  }
  function update(celebrate = true) {
    const res = search(qEl.value);
    render(res);
    $$('#tryChips button').forEach((b) => b.classList.toggle('on', norm(b.dataset.q) === norm(qEl.value)));
    clearTimeout(settleTimer);
    if (!res) return;
    settleTimer = setTimeout(() => {
      const sig = res.all.map((c) => c.id).join(',') + '|' + norm(res.q);
      if (sig === lastSig) return;
      lastSig = sig;
      searches += 1; statSearch.textContent = searches;
      if (celebrate && res.total > 0) {
        const s = $('.fd-sum', results);
        if (s) { const r = s.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); }
      }
    }, 550);
  }
  async function typeInto(text, speed = 85) {
    const token = {}; typing = token;
    qEl.value = ''; update(false);
    for (const ch of text) {
      await wait(speed + Math.random() * 40);
      if (typing !== token) return;
      qEl.value += ch; update();
    }
    typing = null;
  }
  qEl.addEventListener('input', () => { typing = null; userTouched = true; update(); });
  clearBtn.addEventListener('click', () => { typing = null; qEl.value = ''; update(); qEl.focus({ preventScroll: true }); });
  $$('#tryChips button').forEach((b) => b.addEventListener('click', () => { userTouched = true; typeInto(b.dataset.q, 55); }));
  langListeners.push(() => update(false));
  update(false);

  watch($('.try-visual'), async () => {
    await wait(700);
    if (!userTouched && !qEl.value) typeInto('castro');
  });

  /* ───────────────────────── Confetti (₪ coins + tickets) ───────────────────────── */
  const cv = $('#confetti');
  const ctx = cv.getContext('2d');
  let parts = [], running = false, dpr = 1;
  function sizeCanvas() { dpr = Math.min(devicePixelRatio || 1, 2); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
  sizeCanvas(); addEventListener('resize', sizeCanvas);
  const COLORS = ['#0B8A64', '#2FD39C', '#FF4F72', '#FFB21E', '#6C4FD8'];
  function burst(x, y) {
    if (reduce) return;
    for (let i = 0; i < 64; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const v = 7 + Math.random() * 10;
      parts.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35,
        flip: Math.random() * 6, vf: 0.12 + Math.random() * 0.15, kind: i % 3 === 0 ? 'coin' : 'ticket',
        size: 8 + Math.random() * 8, color: COLORS[i % COLORS.length], life: 0,
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  function tick() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.y < innerHeight + 40 && p.life < 220);
    for (const p of parts) {
      p.life++; p.vy += 0.36; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.flip += p.vf;
      const sx = Math.cos(p.flip);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(sx, 1);
      ctx.globalAlpha = Math.min(1, (220 - p.life) / 40);
      if (p.kind === 'coin') {
        const r = p.size * 0.9;
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
        g.addColorStop(0, '#FFF1B8'); g.addColorStop(0.5, '#FFC93C'); g.addColorStop(1, '#F2A007');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        if (Math.abs(sx) > 0.35) { ctx.fillStyle = '#9A6200'; ctx.font = `800 ${r * 1.1}px DM Sans, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('₪', 0, r * 0.06); }
      } else {
        const w = p.size * 1.5, h = p.size;
        ctx.fillStyle = p.color; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 2); else ctx.rect(-w / 2, -h / 2, w, h);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(w * 0.12, -h / 2 + 2, 1.2, h - 4);
      }
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(tick); else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  /* ───────────────────────── Bento extras ───────────────────────── */
  $$('.tile').forEach((t) => {
    watch(t);
    if (!finePointer) return;
    t.addEventListener('pointermove', (e) => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${e.clientX - r.left}px`);
      t.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
  const MQ = [
    ['BuyMe ALL', 'Castro', 'FOX', 'H&M', 'Mango', 'Adidas', 'Terminal X', 'Nike', 'American Eagle', 'Story', 'מגה ספורט', 'Hoodies', 'Laline', 'פפאיה'],
    ['תו הזהב', 'שופרסל', 'קסטרו', 'גולף', 'רנואר', 'הום סנטר', 'בי פארם', 'פוקס', 'טרמינל איקס', 'מגה ספורט', 'הודיס'],
    ['Max GiftCard', 'FOX', 'Golf', 'Terminal X', 'Home Center', 'מגה ספורט', 'Nofshonit', 'ACE', 'Golf', 'Dream Card', 'Mango', 'Nike', 'Laline'],
  ];
  const KEYS = new Set(['BuyMe ALL', 'תו הזהב', 'Max GiftCard', 'Nofshonit', 'Dream Card']);
  ['#mq1', '#mq2', '#mq3'].forEach((sel, i) => {
    const one = MQ[i].map((s) => `<span class="${KEYS.has(s) ? 'k' : ''}">${s}</span>`).join('');
    $(sel).innerHTML = one + one;
  });
  // Encrypted code that keeps re-encrypting (a fresh nonce every time).
  const cipher = $('#cipher');
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const rand64 = (n) => Array.from({ length: n }, () => B64[Math.floor(Math.random() * 64)]).join('');
  let cipherOn = false;
  watch($('.t-priv'), () => { cipherOn = true; });
  if (!reduce) setInterval(() => {
    if (!cipherOn || document.hidden) return;
    let k = 0;
    const id = setInterval(() => { cipher.textContent = `v1:${rand64(22)}=`; if (++k > 8) clearInterval(id); }, 45);
  }, 2600);

  /* ───────────────────────── Wall (parallax gift cards) ───────────────────────── */
  const ISSUERS = {
    'BuyMe ALL': ['#E0398F', '#9C1E73'], 'BuyMe Total': ['#C23BB0', '#7A1D78'], 'Tav Zahav': ['#E3A21F', '#A86A06'],
    'Max GiftCard': ['#1F7AE0', '#0D4A99'], 'Super GiftCard': ['#13A8C9', '#0B6A85'], 'Dream Card': ['#6A4FE0', '#35208F'],
    'Nofshonit': ['#0FA37A', '#06624A'],
  };
  const PAIRS = [
    ['BuyMe ALL', 'Castro'], ['Tav Zahav', 'שופרסל'], ['Max GiftCard', 'FOX'], ['Dream Card', 'American Eagle'], ['Nofshonit', 'Terminal X'],
    ['BuyMe Total', 'Renuar'], ['Tav Zahav', 'הום סנטר'], ['BuyMe ALL', 'H&M'], ['Super GiftCard', 'Wolt'], ['Nofshonit', 'ACE'],
    ['Max GiftCard', 'גולף'], ['Dream Card', 'Laline'], ['BuyMe ALL', 'Adidas'], ['Tav Zahav', 'בי פארם'], ['BuyMe Total', 'Hoodies'],
    ['Max GiftCard', 'מגה ספורט'], ['BuyMe ALL', 'Nike'], ['Dream Card', 'Mango'], ['Nofshonit', 'פפאיה'], ['Tav Zahav', 'קסטרו'],
    ['BuyMe ALL', 'Story'], ['Super GiftCard', 'Castro'], ['Nofshonit', 'Golf'], ['Max GiftCard', 'Terminal X'],
  ];
  const AMTS = [100, 150, 200, 250, 300, 400, 500];
  const wallBg = $('#wallBg');
  const COLS = 8, PER = 7;
  let pi = 0;
  for (let c = 0; c < COLS; c++) {
    const col = document.createElement('div'); col.className = 'wall-col';
    let h = '';
    for (let k = 0; k < PER; k++) {
      const [iss, st] = PAIRS[pi++ % PAIRS.length];
      const [a, b] = ISSUERS[iss];
      h += `<div class="gc" style="--a:${a};--b:${b}"><small>${iss}</small><b>${st}</b><em>₪${AMTS[(pi * 3) % AMTS.length]}</em></div>`;
    }
    col.innerHTML = h;
    col.dataset.speed = String((c % 2 ? -1 : 1) * (120 + (c * 37) % 140));
    wallBg.appendChild(col);
  }
  const wallCols = $$('.wall-col');
  $$('.wall [data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    watch(el.closest('.ws'), () => (to === 0 ? countTo(el, 9, 0, 1600) : countTo(el, 0, to, 1800)));
  });

  /* ───────────────────────── FAQ accordion ───────────────────────── */
  const qas = $$('.qa');
  qas.forEach((d) => {
    const sum = $('summary', d), body = $('.qa-a', d);
    sum.addEventListener('click', (e) => {
      e.preventDefault();
      if (reduce) { d.open = !d.open; return; }
      if (d.open) {
        const h = body.offsetHeight;
        body.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => { d.open = false; };
      } else {
        qas.forEach((o) => { if (o !== d && o.open) $('summary', o).click(); });
        d.open = true;
        const h = body.offsetHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: `${h}px`, opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    });
  });

  /* ───────────────────────── Magnetic buttons ───────────────────────── */
  if (finePointer && !reduce) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * 0.22}px, ${y * 0.3}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ───────────────────────── Scroll: progress, nav, parallax ───────────────────────── */
  const nav = $('#nav'), progress = $('#progress');
  const navLinks = $$('.nav-links a');
  const sections = navLinks.map((a) => $(a.getAttribute('href')));
  const wall = $('.wall');
  const heroVisual = $('#heroVisual');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle('scrolled', y > 8);
    let active = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * 0.42) active = i; });
    navLinks.forEach((a, i) => a.classList.toggle('is-active', i === active));
    if (reduce) return;
    if (y < vh * 1.2) heroVisual.style.transform = `translateY(${y * 0.12}px)`;
    const r = wall.getBoundingClientRect();
    if (r.bottom > 0 && r.top < vh) {
      const p = (vh - r.top) / (vh + r.height);
      wallCols.forEach((c) => { const s = Number(c.dataset.speed); c.style.transform = `translateY(${(p - 0.5) * s * 2}px)`; });
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);

  /* ───────────────────────── Boot ───────────────────────── */
  const saved = store.get('shovar-lang');
  const prefersHe = (navigator.languages || [navigator.language]).some((l) => /^he|^iw/i.test(l || ''));
  applyLang(saved || (prefersHe ? 'he' : 'en'));
  $$('[data-reveal]').forEach((el) => { if (!el.classList.contains('tile')) watch(el); });
  onScroll();

  const start = () => {
    root.classList.add('loaded');
    $$('[data-split]').forEach((el) => el.classList.add('in'));
    watch($('#heroVisual'), heroSequence);
  };
  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, wait(900)]) : wait(0);
  fontsReady.then(() => requestAnimationFrame(start));
})();
