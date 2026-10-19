// Refreshes the store lists of the multi-store gift cards (data/store-lists/*.json) from the issuers' own sites.
//   node scripts/scrape-networks.mjs [buyme|swish]...      (default: all)
// Then run `node scripts/build-networks.mjs` to compact them into src/networks/data and
// `node scripts/build-logos.mjs` for the store logos.
//
// Every row keeps the issuer's logo URL (`logo`) so build-logos can bundle a small copy.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'data', 'store-lists');
mkdirSync(outDir, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const HEBREW = /[א-ת]/;
const UA = { 'user-agent': 'Mozilla/5.0 (Shovar list refresh)' };

const get = async (url, as = 'text') => {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return as === 'json' ? res.json() : res.text();
};

function save(id, meta, stores) {
  const seen = new Set();
  const rows = stores.filter((s) => {
    const k = s.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify({ ...meta, updated: today, count: rows.length, stores: rows }, null, 1) + '\n');
  console.log(`${id}: ${rows.length}`);
}

// --- BuyMe: every "brands" page is backed by /brands/<supplier>/options ------------------------------------
const BUYME = [
  { id: 'buyme_all', supplier: 13438757, variant: 'all', notes: 'BUYME ALL – all listed businesses (fashion, hotels, spas, restaurants, experiences...). onlineRedeem = "מימוש אונליין" badge; bookingRequired = a reservation link exists ("הזמנת מקום").' },
  { id: 'buyme_style', supplier: 7565407, variant: 'style', notes: 'BUYME STYLE – fashion and lifestyle brands.' },
  { id: 'buyme_together', supplier: 17574075, variant: 'together', notes: 'BUYME TOGETHER (חוויות משותפות) – restaurants, experiences and getaways to share.' },
  { id: 'buyme_chef', supplier: 752649, variant: 'chef', notes: 'BUYME CHEF – chef restaurants.' },
  { id: 'buyme_baby', supplier: 9018727, variant: 'baby', notes: 'BUYME BABY – birth gifts: baby and kids shops, spas, restaurants, getaways.' },
  { id: 'buyme_vacation', supplier: 17573505, variant: 'vacation', notes: 'BUYME VACATION & SPA – hotels and spas.' },
  { id: 'buyme_yng', supplier: 15579925, variant: 'yng', notes: 'BUYME YNG – gifts for teens: fashion, food, entertainment.' },
  { id: 'buyme_pets', supplier: 17574524, variant: 'pets', notes: 'BUYME PETS – pet shops, vets and services.' },
  // Sold through BuyMe, branded and spent only in the Azrieli malls.
  { id: 'azrieli', platform: 'azrieli', supplier: 398383, variant: 'azrieli', notes: 'Azrieli Malls gift card (azrielimalls.co.il/giftcard, issued by BuyMe) – shops and restaurants in the Azrieli malls.' },
];

async function buyme() {
  // The home page names the cards it promotes; flag any we do not scrape yet.
  const home = await get('https://buyme.co.il/');
  for (const m of home.matchAll(/"supplier_id":(\d+),"siteName":"(BUYME[^"]*)"/g)) {
    if (!BUYME.some((b) => b.supplier === Number(m[1]))) console.warn(`buyme: card ${JSON.parse(`"${m[2]}"`)} (${m[1]}) is not mapped — add it to BUYME and to src/networks/registry.ts`);
  }
  for (const b of BUYME) {
    const url = `https://buyme.co.il/brands/${b.supplier}/options`;
    const json = await get(url, 'json');
    if (!Array.isArray(json.brands)) continue;
    const stores = json.brands
      .map((x) => {
        const name = String(x.title ?? '').replace(/\s+/g, ' ').trim();
        const row = { brand: null, name, nameEn: HEBREW.test(name) ? null : name };
        if (x.siteSlogan) row.description = x.siteSlogan;
        if (x.online_redeem) row.onlineRedeem = true;
        if (x.reservation_url) row.bookingRequired = true;
        if (x.logo) row.logo = `https://buyme.co.il/files/${String(x.logo).split('?')[0]}`;
        return row;
      })
      .filter((s) => s.name);
    save(b.id, { platform: b.platform ?? 'buyme', variant: b.variant, source: `https://buyme.co.il/brands/${b.supplier}`, notes: b.notes }, stores);
  }
}

// --- Swish (formerly Nofshonit): the gift card pages embed their full chain list ----------------------------
const SWISH = [
  { id: 'nofshonit_swish_plus', product: 105380, variant: 'swish_plus', label: 'Swish Plus', notes: 'Swish Plus: fashion, restaurants, spas, hotels, attractions and online shops (no supermarkets).' },
  { id: 'swish_dine_wine', product: 110240, variant: 'dine_wine', label: 'Swish Dine & Wine (chef)', notes: 'Swish Dine & Wine: chef restaurants.' },
  { id: 'swish_tasty', product: 110242, variant: 'tasty', label: 'Swish Tasty', notes: 'Swish Tasty: restaurants and cafés.' },
  { id: 'swish_teacher', product: 70258, variant: 'teacher', label: 'Swish Teacher', notes: 'Swish Teacher: spas, fashion, getaways and home.' },
  { id: 'swish_birthday', product: 70259, variant: 'birthday', label: 'Swish BIRTHDAY', notes: 'Swish BIRTHDAY: spas, getaways, fashion, restaurants and wineries.' },
  { id: 'swish_baby', product: 95963, variant: 'baby', label: 'Swish Baby', notes: 'Swish Baby: spas, fashion, getaways, health and home.' },
  { id: 'swish_family', product: 105052, variant: 'family', label: 'Swish Family', notes: 'Swish Family: fashion, home, kids, restaurants and getaways.' },
  { id: 'swish_theatre', product: 139213, variant: 'theatre', label: 'Swish Theatre', notes: 'Swish Theatre: theatres, shows and cultural venues.' },
  { id: 'swish_hotels_spa', product: 157067, variant: 'hotels_spa', label: 'Swish Hotels & Spa', notes: 'Swish Hotels & Spa: hotels, spas and restaurants.' },
];

const CHAIN_RE =
  /\{\\"categoryNumber\\":(\d+),\\"storeName\\":\\"(.*?)\\",\\"chainId\\":(\d+),\\"searchKeyWords\\":(?:null|\\".*?\\"),\\"subBranchRegions\\":(?:null|\\".*?\\"),\\"logo\\":(null|\\".*?\\"),\\"alt\\":(?:null|\\".*?\\"),\\"tagName\\":(null|\\".*?\\")/g;
// The list sits inside a JS string literal (one level of escaping) that itself holds JSON (a second one).
const unesc = (s) => {
  const inner = JSON.parse(`"${s}"`);
  try {
    return JSON.parse(`"${inner}"`);
  } catch {
    return inner;
  }
};

async function swish() {
  for (const p of SWISH) {
    const html = await get(`https://swish.co.il/home/all-gifts-giftcard/product-${p.product}`);
    const stores = [];
    for (const m of html.matchAll(CHAIN_RE)) {
      if (Number(m[1]) !== p.product) continue;
      const name = unesc(m[2]).replace(/\s+/g, ' ').trim();
      if (!name) continue;
      const tag = m[5] === 'null' ? '' : unesc(m[5].slice(2, -2));
      const row = { brand: null, name, nameEn: HEBREW.test(name) ? null : name };
      if (tag) row.category = tag;
      if (m[4] !== 'null') row.logo = unesc(m[4].slice(2, -2));
      stores.push(row);
    }
    save(
      p.id,
      { platform: 'nofshonit', variant: p.variant, source: `https://swish.co.il/home/all-gifts-giftcard/product-${p.product}`, notes: `${p.notes} Names ending in "אונליין"/"online" are online stores.` },
      stores,
    );
  }
}

// --- Max: one JSON endpoint lists every card with its chains by category ------------------------------------
const MAX = {
  72065: { id: 'max_giftcard', variant: 'GiftCard max' },
  72153: { id: 'max_executive', variant: 'executive' },
  72227: { id: 'max_super_giftcard', variant: 'Super GiftCard max' },
  72221: { id: 'max_food', variant: 'Giftcard Food' },
};
// Not places you can walk into.
const MAX_SKIP = /תרומה/;
const MAX_ONLINE = /אונליין|משלוחים/;

async function max() {
  const json = await get('https://www.max.co.il/api/vgc/getCardsListShivuki', 'json');
  for (const card of json.Result.Cards) {
    const def = MAX[card.Plbin];
    if (!def) {
      console.warn(`max: new card ${card.Title} (${card.Plbin}) is not mapped — add it to MAX and to src/networks/registry.ts`);
      continue;
    }
    const byName = new Map();
    for (const group of card.Stores) {
      if (MAX_SKIP.test(group.StoresCategory)) continue;
      const online = MAX_ONLINE.test(group.StoresCategory);
      for (const st of group.Stores) {
        const nameEn = (st.Title ?? '').replace(/\s+/g, ' ').trim();
        const name = (st.ChainNameHebrew || nameEn).replace(/\s+/g, ' ').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        const prev = byName.get(key);
        if (prev) {
          // Listed both online and in stores: it is a store.
          if (!online) delete prev.onlineRedeem;
          continue;
        }
        const row = { brand: null, name, nameEn: nameEn && !HEBREW.test(nameEn) ? nameEn : null, category: group.StoresCategory };
        if (online) row.onlineRedeem = true;
        const logo = st.ChainImageNew || st.ChainImage;
        if (logo) row.logo = logo;
        byName.set(key, row);
      }
    }
    save(
      def.id,
      { platform: 'max', variant: def.variant, source: 'https://www.max.co.il/gift-card-network', notes: `${card.Title}. onlineRedeem = listed only under the online / delivery categories.` },
      [...byName.values()],
    );
  }
}

// --- Hi-Tech Zone (htzone.co.il): every voucher has a page that embeds its business list as JSON -----------
const HITECHZONE = [
  { id: 'hz_giftzone', page: 4, variant: 'giftzone', label: 'GiftZone', notes: 'GiftZone: shops, restaurants, spas and experiences.' },
  { id: 'hz_allin', page: 10, variant: 'allin', label: 'All-In Zone', notes: 'All-In Zone: brands, restaurants, spas, hotels and leisure.' },
  { id: 'hz_multizone', page: 12, variant: 'multizone', label: 'MultiZone', notes: 'MultiZone: brands, restaurants and leisure.' },
  { id: 'hz_supermultizone', page: 11, variant: 'multisuperzone', label: 'MultiSuperZone', notes: 'MultiSuperZone: supermarkets plus brands, restaurants and leisure.' },
  { id: 'hz_superzone', page: 6, variant: 'superzone', label: 'SuperZone', notes: 'SuperZone: supermarkets and brands.' },
  { id: 'hz_eatzone', page: 5, variant: 'eatzone', label: 'EatZone', notes: 'EatZone: restaurants and cafés.' },
  { id: 'hz_chefzone', page: 1, variant: 'chefzone', label: 'ChefZone', notes: 'ChefZone: chef restaurants.' },
  { id: 'hz_spazone', page: 3, variant: 'spazone', label: 'SpaZone', notes: 'SpaZone: spas.' },
  { id: 'hz_zonecard', page: 14, variant: 'zonecard', label: 'ZoneCard', notes: 'ZoneCard: brands, restaurants and spas.' },
  { id: 'hz_allstar', page: 16, variant: 'allstar', label: 'All-StarZone', notes: 'All-StarZone: restaurants.' },
  { id: 'hz_kosherzone', page: 18, variant: 'kosherzone', label: 'KosherZone', notes: 'KosherZone: kosher restaurants.' },
  { id: 'hz_truckzone', page: 17, variant: 'truckzone', label: 'TruckZone', notes: 'TruckZone: food trucks and cafés.' },
];
const HZ_ONLINE_ONLY = /באתר[^|]{0,30}בלבד|אונליין בלבד|online only/i;

async function hitechzone() {
  for (const v of HITECHZONE) {
    const html = await get(`https://www.htzone.co.il/voucher-zone/${v.page}`);
    const m = html.match(/business_arr\s*=\s*(\{.*?\});\s*<\/script>/s);
    if (!m) {
      console.warn(`hitechzone: no business list on voucher-zone/${v.page} (${v.label}) — the page layout changed`);
      continue;
    }
    const data = JSON.parse(m[1]);
    const stores = [];
    const seen = new Set();
    for (const b of data.business) {
      // One row per filter tag; keep the first of each business.
      if (!b.id || seen.has(b.id) || b.is_active !== '1') continue;
      seen.add(b.id);
      const clean = (x) => String(x ?? '').replace(/\\'/g, "'").replace(/\s+/g, ' ').trim();
      const name = clean(b.name) || clean(b.eng_name);
      if (!name) continue;
      const nameEn = clean(b.eng_name);
      const row = { brand: null, name, nameEn: nameEn && !HEBREW.test(nameEn) ? nameEn : HEBREW.test(name) ? null : name };
      if (HZ_ONLINE_ONLY.test(b.business_terms ?? '')) row.onlineRedeem = true;
      if (b.logo) row.logo = `https://www.htzone.co.il${b.logo}`;
      stores.push(row);
    }
    save(
      v.id,
      { platform: 'hitechzone', variant: v.variant, source: `https://www.htzone.co.il/voucher-zone/${v.page}`, notes: `${v.notes} onlineRedeem = terms say the shop's website only.` },
      stores,
    );
  }
}

const jobs = { buyme, swish, max, hitechzone };
const wanted = process.argv.slice(2);
for (const [name, run] of Object.entries(jobs)) if (wanted.length === 0 || wanted.includes(name)) await run();
