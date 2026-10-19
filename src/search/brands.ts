import { compact } from './normalize';

/**
 * Built-in dictionary of common stores (Israel-first, plus global brands).
 *
 * Used to:
 *  - match Hebrew and English spellings of the same store in search
 *  - canonicalize store keys (so "זארה" and "ZARA" share places cache & cooldowns)
 *  - detect the store from a gift-card link domain
 *  - give tiles a recognizable brand color
 *
 * Users are never limited to this list; unknown stores work through the
 * phonetic / fuzzy matcher.
 */
export type StoreCategory =
  | 'fashion'
  | 'groceries'
  | 'pharmacy'
  | 'electronics'
  | 'home'
  | 'books'
  | 'sports'
  | 'food'
  | 'toys'
  | 'beauty'
  | 'department'
  | 'entertainment'
  | 'travel'
  | 'gift_platform'
  | 'other';

export const STORE_CATEGORIES: StoreCategory[] = [
  'fashion',
  'groceries',
  'pharmacy',
  'electronics',
  'home',
  'books',
  'sports',
  'food',
  'toys',
  'beauty',
  'department',
  'entertainment',
  'travel',
  'gift_platform',
  'other',
];

export interface Brand {
  id: string;
  /** Display name (English). */
  name: string;
  /** Hebrew display name. */
  nameHe?: string;
  aliases: string[];
  category: StoreCategory;
  domains?: string[];
  color: string;
  /** True for multi-store gift card platforms (BuyMe, Tav Zahav, ...). */
  platform?: boolean;
}

export const BRANDS: Brand[] = [
  // Fashion
  { id: 'zara', name: 'Zara', nameHe: 'זארה', aliases: ['זרה'], category: 'fashion', domains: ['zara.com'], color: '#111111' },
  {
    id: 'hm',
    name: 'H&M',
    nameHe: 'אייץ׳ אנד אם',
    aliases: ['hm', 'h and m', 'אייץ אנד אם', 'הנדם', 'אייץ׳ אנד אם'],
    category: 'fashion',
    domains: ['hm.com'],
    color: '#CC071E',
  },
  { id: 'castro', name: 'Castro', nameHe: 'קסטרו', aliases: [], category: 'fashion', domains: ['castro.com'], color: '#1A1A1A' },
  {
    id: 'fox',
    name: 'Fox',
    nameHe: 'פוקס',
    aliases: ['fox home', 'פוקס הום'],
    category: 'fashion',
    domains: ['fox.co.il', 'foxhome.co.il'],
    color: '#0B3C5D',
  },
  {
    id: 'golf',
    name: 'Golf',
    nameHe: 'גולף',
    aliases: ['golf & co', 'גולף אנד קו'],
    category: 'home',
    domains: ['golfco.co.il', 'golf.co.il'],
    color: '#2E4A3B',
  },
  { id: 'renuar', name: 'Renuar', nameHe: 'רנואר', aliases: [], category: 'fashion', domains: ['renuar.co.il'], color: '#3A3A3A' },
  {
    id: 'terminalx',
    name: 'Terminal X',
    nameHe: 'טרמינל איקס',
    aliases: ['terminal x', 'terminalx'],
    category: 'fashion',
    domains: ['terminalx.com'],
    color: '#000000',
  },
  { id: 'mango', name: 'Mango', nameHe: 'מנגו', aliases: [], category: 'fashion', domains: ['mango.com'], color: '#1F1F1F' },
  {
    id: 'pullbear',
    name: 'Pull&Bear',
    nameHe: 'פול אנד בר',
    aliases: ['pull and bear', 'pull bear'],
    category: 'fashion',
    domains: ['pullandbear.com'],
    color: '#2B2B2B',
  },
  { id: 'bershka', name: 'Bershka', nameHe: 'ברשקה', aliases: [], category: 'fashion', domains: ['bershka.com'], color: '#222222' },
  {
    id: 'stradivarius',
    name: 'Stradivarius',
    nameHe: 'סטרדיווריוס',
    aliases: [],
    category: 'fashion',
    domains: ['stradivarius.com'],
    color: '#5B4636',
  },
  {
    id: 'massimodutti',
    name: 'Massimo Dutti',
    nameHe: 'מאסימו דוטי',
    aliases: [],
    category: 'fashion',
    domains: ['massimodutti.com'],
    color: '#3B3024',
  },
  {
    id: 'americaneagle',
    name: 'American Eagle',
    nameHe: 'אמריקן איגל',
    aliases: ['ae'],
    category: 'fashion',
    domains: ['ae.com', 'americaneagle.co.il'],
    color: '#12294B',
  },
  {
    id: 'adidas',
    name: 'Adidas',
    nameHe: 'אדידס',
    aliases: [],
    category: 'sports',
    domains: ['adidas.co.il', 'adidas.com'],
    color: '#000000',
  },
  { id: 'nike', name: 'Nike', nameHe: 'נייקי', aliases: ['נייק'], category: 'sports', domains: ['nike.com'], color: '#111111' },
  { id: 'decathlon', name: 'Decathlon', nameHe: 'דקטלון', aliases: [], category: 'sports', domains: ['decathlon.co.il'], color: '#0082C3' },
  { id: 'intima', name: 'Intima', nameHe: 'אינטימה', aliases: [], category: 'fashion', domains: ['intima-il.co.il'], color: '#8E3A59' },
  { id: 'delta', name: 'Delta', nameHe: 'דלתא', aliases: [], category: 'fashion', domains: ['delta.co.il'], color: '#1C3F94' },
  { id: 'hoodies', name: 'Hoodies', nameHe: 'הודיס', aliases: [], category: 'fashion', domains: ['hoodies.co.il'], color: '#2C2C2C' },
  { id: 'tamnoon', name: 'Tamnoon', nameHe: 'תמנון', aliases: [], category: 'fashion', domains: ['tamnoon.com'], color: '#0F4C81' },
  { id: 'shilav', name: 'Shilav', nameHe: 'שילב', aliases: [], category: 'toys', domains: ['shilav.co.il'], color: '#E4007C' },
  {
    id: 'toysrus',
    name: 'Toys"R"Us',
    nameHe: 'טויס אר אס',
    aliases: ['toys r us', 'toysrus'],
    category: 'toys',
    domains: ['toysrus.co.il'],
    color: '#0072CE',
  },
  { id: 'kravitz', name: 'Kravitz', nameHe: 'קרביץ', aliases: [], category: 'books', domains: ['kravitz.co.il'], color: '#D7262E' },
  // Groceries & pharmacy
  {
    id: 'shufersal',
    name: 'Shufersal',
    nameHe: 'שופרסל',
    aliases: ['שופרסל דיל', 'shufersal deal'],
    category: 'groceries',
    domains: ['shufersal.co.il'],
    color: '#E30613',
  },
  {
    id: 'ramilevy',
    name: 'Rami Levy',
    nameHe: 'רמי לוי',
    aliases: [],
    category: 'groceries',
    domains: ['rami-levy.co.il'],
    color: '#E2001A',
  },
  {
    id: 'yochananof',
    name: 'Yochananof',
    nameHe: 'יוחננוף',
    aliases: [],
    category: 'groceries',
    domains: ['yochananof.co.il'],
    color: '#00843D',
  },
  {
    id: 'victory',
    name: 'Victory',
    nameHe: 'ויקטורי',
    aliases: [],
    category: 'groceries',
    domains: ['victoryonline.co.il'],
    color: '#E31E24',
  },
  { id: 'osherad', name: 'Osher Ad', nameHe: 'אושר עד', aliases: [], category: 'groceries', domains: ['osherad.co.il'], color: '#F5A800' },
  { id: 'tivtaam', name: 'Tiv Taam', nameHe: 'טיב טעם', aliases: [], category: 'groceries', domains: ['tivtaam.co.il'], color: '#C8102E' },
  {
    id: 'superpharm',
    name: 'Super-Pharm',
    nameHe: 'סופר-פארם',
    aliases: ['super pharm', 'superpharm', 'סופרפארם', 'סופר פארם'],
    category: 'pharmacy',
    domains: ['shop.super-pharm.co.il', 'super-pharm.co.il'],
    color: '#E4002B',
  },
  {
    id: 'be',
    name: 'BE Pharm',
    nameHe: 'בי פארם',
    aliases: ['be', 'בי'],
    category: 'pharmacy',
    domains: ['bestore.co.il'],
    color: '#6CC24A',
  },
  {
    id: 'goodpharm',
    name: 'Good Pharm',
    nameHe: 'גוד פארם',
    aliases: [],
    category: 'pharmacy',
    domains: ['goodpharm.co.il'],
    color: '#00A3E0',
  },
  // Home & electronics
  {
    id: 'ikea',
    name: 'IKEA',
    nameHe: 'איקאה',
    aliases: ['איקיאה'],
    category: 'home',
    domains: ['ikea.co.il', 'ikea.com'],
    color: '#0058A3',
  },
  {
    id: 'homecenter',
    name: 'Home Center',
    nameHe: 'הום סנטר',
    aliases: [],
    category: 'home',
    domains: ['homecenter.co.il'],
    color: '#E35205',
  },
  { id: 'aceisrael', name: 'ACE', nameHe: 'אייס', aliases: ['ace'], category: 'home', domains: ['ace.co.il'], color: '#D40F14' },
  {
    id: 'maxstock',
    name: 'Max Stock',
    nameHe: 'מקס סטוק',
    aliases: ['maxstock'],
    category: 'home',
    domains: ['maxstock.co.il'],
    color: '#E30613',
  },
  { id: 'ksp', name: 'KSP', nameHe: 'קיי אס פי', aliases: [], category: 'electronics', domains: ['ksp.co.il'], color: '#1D1D1B' },
  { id: 'ivory', name: 'Ivory', nameHe: 'אייבורי', aliases: [], category: 'electronics', domains: ['ivory.co.il'], color: '#004B87' },
  { id: 'bug', name: 'Bug', nameHe: 'באג', aliases: [], category: 'electronics', domains: ['bug.co.il'], color: '#E2231A' },
  {
    id: 'machsanei',
    name: 'Machsanei Hashmal',
    nameHe: 'מחסני חשמל',
    aliases: [],
    category: 'electronics',
    domains: ['payngo.co.il'],
    color: '#F7A600',
  },
  {
    id: 'idigital',
    name: 'iDigital',
    nameHe: 'איי דיגיטל',
    aliases: [],
    category: 'electronics',
    domains: ['idigital.co.il'],
    color: '#333333',
  },
  {
    id: 'apple',
    name: 'Apple',
    nameHe: 'אפל',
    aliases: ['app store', 'itunes'],
    category: 'electronics',
    domains: ['apple.com'],
    color: '#1D1D1F',
  },
  {
    id: 'googleplay',
    name: 'Google Play',
    nameHe: 'גוגל פליי',
    aliases: [],
    category: 'entertainment',
    domains: ['play.google.com'],
    color: '#01875F',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    nameHe: 'אמזון',
    aliases: [],
    category: 'department',
    domains: ['amazon.com', 'amazon.co.uk', 'amazon.de'],
    color: '#232F3E',
  },
  // Books
  {
    id: 'steimatzky',
    name: 'Steimatzky',
    nameHe: 'סטימצקי',
    aliases: [],
    category: 'books',
    domains: ['steimatzky.co.il'],
    color: '#E5007E',
  },
  {
    id: 'tzometsfarim',
    name: 'Tzomet Sfarim',
    nameHe: 'צומת ספרים',
    aliases: [],
    category: 'books',
    domains: ['booknet.co.il'],
    color: '#00558C',
  },
  // Beauty
  { id: 'sephora', name: 'Sephora', nameHe: 'ספורה', aliases: [], category: 'beauty', domains: ['sephora.com'], color: '#000000' },
  { id: 'lalin', name: 'Laline', nameHe: 'ללין', aliases: [], category: 'beauty', domains: ['laline.co.il'], color: '#9C6B98' },
  { id: 'sabon', name: 'Sabon', nameHe: 'סבון', aliases: [], category: 'beauty', domains: ['sabon.co.il'], color: '#6F5B4B' },
  // Food & entertainment
  { id: 'aroma', name: 'Aroma', nameHe: 'ארומה', aliases: [], category: 'food', domains: ['aroma.co.il'], color: '#C8102E' },
  { id: 'cafecafe', name: 'Cafe Cafe', nameHe: 'קפה קפה', aliases: [], category: 'food', domains: ['cafecafe.co.il'], color: '#6B3E26' },
  {
    id: 'mcdonalds',
    name: "McDonald's",
    nameHe: 'מקדונלדס',
    aliases: ['mcdonalds', 'מקדונלד'],
    category: 'food',
    domains: ['mcdonalds.co.il'],
    color: '#DA291C',
  },
  {
    id: 'yesplanet',
    name: 'Yes Planet',
    nameHe: 'יס פלאנט',
    aliases: ['planet', 'פלאנט'],
    category: 'entertainment',
    domains: ['yesplanet.co.il'],
    color: '#0A1E4B',
  },
  {
    id: 'cinemacity',
    name: 'Cinema City',
    nameHe: 'סינמה סיטי',
    aliases: [],
    category: 'entertainment',
    domains: ['cinema-city.co.il'],
    color: '#B8002E',
  },
  {
    id: 'hotcinema',
    name: 'Hot Cinema',
    nameHe: 'הוט סינמה',
    aliases: [],
    category: 'entertainment',
    domains: ['hotcinema.co.il'],
    color: '#E4002B',
  },
  {
    id: 'lev',
    name: 'Lev Cinema',
    nameHe: 'קולנוע לב',
    aliases: ['lev', 'לב'],
    category: 'entertainment',
    domains: ['lev.co.il'],
    color: '#8B0000',
  },
  // Other Israeli stores and services (not covered by the gift card networks)
  {
    id: 'carrefour',
    name: 'Carrefour',
    nameHe: 'קרפור',
    aliases: [],
    category: 'groceries',
    domains: ['carrefour.co.il'],
    color: '#004E9F',
  },
  {
    id: 'yenotbitan',
    name: 'Yenot Bitan',
    nameHe: 'יינות ביתן',
    aliases: ['mega', 'מגה'],
    category: 'groceries',
    domains: ['ybitan.co.il', 'mega.co.il'],
    color: '#C8102E',
  },
  {
    id: 'hazihinam',
    name: 'Hazi Hinam',
    nameHe: 'חצי חינם',
    aliases: [],
    category: 'groceries',
    domains: ['hazi-hinam.co.il'],
    color: '#D52B1E',
  },
  {
    id: 'zolstock',
    name: 'Zol Stock',
    nameHe: 'זול סטוק',
    aliases: [],
    category: 'groceries',
    domains: ['zolstock.co.il'],
    color: '#F5A800',
  },
  {
    id: 'shufersaldeal',
    name: 'Shufersal Online',
    nameHe: 'שופרסל אונליין',
    aliases: ['shufersal online', 'שופרסל דיל', 'shufersal deal'],
    category: 'groceries',
    domains: ['shufersal.co.il'],
    color: '#E30613',
  },
  {
    id: 'newpharm',
    name: 'New Pharm',
    nameHe: 'ניו פארם',
    aliases: ['newpharm'],
    category: 'pharmacy',
    domains: ['newpharm.co.il'],
    color: '#00A3E0',
  },
  {
    id: 'shekem',
    name: 'Shekem Electric',
    nameHe: 'שקם אלקטריק',
    aliases: ['shekem'],
    category: 'electronics',
    domains: ['shekem-electric.co.il'],
    color: '#E30613',
  },
  {
    id: 'electra',
    name: 'Electra',
    nameHe: 'אלקטרה',
    aliases: [],
    category: 'electronics',
    domains: ['electra-consumer.co.il'],
    color: '#0072CE',
  },
  {
    id: 'hamashbir',
    name: 'Hamashbir',
    nameHe: 'המשביר לצרכן',
    aliases: ['המשביר', 'hamashbir latzarchan'],
    category: 'department',
    domains: ['hamashbir365.co.il'],
    color: '#E31E24',
  },
  {
    id: 'tambour',
    name: 'Tambour',
    nameHe: 'תמבור',
    aliases: [],
    category: 'home',
    domains: ['tambour.co.il'],
    color: '#0072CE',
  },
  {
    id: 'officedepot',
    name: 'Office Depot',
    nameHe: 'אופיס דיפו',
    aliases: [],
    category: 'other',
    domains: ['officedepot.co.il'],
    color: '#CC071E',
  },
  {
    id: 'cofix',
    name: 'Cofix',
    nameHe: 'קופיקס',
    aliases: [],
    category: 'food',
    domains: ['cofix.co.il'],
    color: '#E4002B',
  },
  {
    id: 'landwer',
    name: 'Landwer',
    nameHe: 'לנדוור',
    aliases: ['landver'],
    category: 'food',
    domains: ['landwer.co.il'],
    color: '#7A1F2B',
  },
  {
    id: 'arcaffe',
    name: 'Arcaffe',
    nameHe: 'ארקפה',
    aliases: [],
    category: 'food',
    domains: ['arcaffe.co.il'],
    color: '#8B1A1A',
  },
  {
    id: 'greg',
    name: 'Cafe Greg',
    nameHe: 'קפה גרג',
    aliases: ['greg', 'גרג'],
    category: 'food',
    domains: ['cafegreg.co.il'],
    color: '#00843D',
  },
  {
    id: 'dominos',
    name: 'Domino’s',
    nameHe: 'דומינוס',
    aliases: ['dominos', "domino's pizza", 'דומינוס פיצה'],
    category: 'food',
    domains: ['dominos.co.il'],
    color: '#006491',
  },
  {
    id: 'pizzahut',
    name: 'Pizza Hut',
    nameHe: 'פיצה האט',
    aliases: [],
    category: 'food',
    domains: ['pizzahut.co.il'],
    color: '#EE3124',
  },
  {
    id: 'burgerking',
    name: 'Burger King',
    nameHe: 'בורגר קינג',
    aliases: [],
    category: 'food',
    domains: ['burgerking.co.il'],
    color: '#D62300',
  },
  {
    id: 'japanika',
    name: 'Japanika',
    nameHe: 'ג׳פניקה',
    aliases: ['גפניקה'],
    category: 'food',
    domains: ['japanika.net'],
    color: '#E60012',
  },
  {
    id: 'wolt',
    name: 'Wolt',
    nameHe: 'וולט',
    aliases: [],
    category: 'food',
    domains: ['wolt.com'],
    color: '#009DE0',
  },
  {
    id: 'shein',
    name: 'SHEIN',
    nameHe: 'שיין',
    aliases: [],
    category: 'fashion',
    domains: ['shein.com'],
    color: '#000000',
  },
  {
    id: 'aliexpress',
    name: 'AliExpress',
    nameHe: 'עליאקספרס',
    aliases: ['ali express'],
    category: 'other',
    domains: ['aliexpress.com'],
    color: '#E62E04',
  },
  {
    id: 'thebodyshop',
    name: 'The Body Shop',
    nameHe: 'דה בודי שופ',
    aliases: ['body shop', 'בודי שופ'],
    category: 'beauty',
    domains: ['thebodyshop.co.il'],
    color: '#00573F',
  },
  {
    id: 'cellcom',
    name: 'Cellcom',
    nameHe: 'סלקום',
    aliases: [],
    category: 'other',
    domains: ['cellcom.co.il'],
    color: '#E6007E',
  },
  {
    id: 'partner',
    name: 'Partner',
    nameHe: 'פרטנר',
    aliases: [],
    category: 'other',
    domains: ['partner.co.il'],
    color: '#00A3E0',
  },
  {
    id: 'pelephone',
    name: 'Pelephone',
    nameHe: 'פלאפון',
    aliases: [],
    category: 'other',
    domains: ['pelephone.co.il'],
    color: '#0072CE',
  },
  {
    id: 'hot',
    name: 'HOT',
    nameHe: 'הוט',
    aliases: [],
    category: 'other',
    domains: ['hot.net.il'],
    color: '#E30613',
  },
  {
    id: 'paz',
    name: 'Paz',
    nameHe: 'פז',
    aliases: ['paz yellow', 'פז ילו'],
    category: 'other',
    domains: ['paz.co.il'],
    color: '#E2231A',
  },
  {
    id: 'sonol',
    name: 'Sonol',
    nameHe: 'סונול',
    aliases: [],
    category: 'other',
    domains: ['sonol.co.il'],
    color: '#00A3E0',
  },
  {
    id: 'delek',
    name: 'Delek',
    nameHe: 'דלק',
    aliases: ['delek israel'],
    category: 'other',
    domains: ['delek.co.il'],
    color: '#E30613',
  },
  {
    id: 'ampm',
    name: 'AM:PM',
    nameHe: 'איי אם פי אם',
    aliases: ['am pm', 'ampm', 'אם פי אם'],
    category: 'groceries',
    domains: ['ampm.co.il'],
    color: '#E30613',
  },
  {
    id: 'gett',
    name: 'Gett',
    nameHe: 'גט',
    aliases: ['gett taxi', 'גט טקסי'],
    category: 'travel',
    domains: ['gett.com'],
    color: '#222222',
  },
  {
    id: 'elal',
    name: 'EL AL',
    nameHe: 'אל על',
    aliases: ['el al'],
    category: 'travel',
    domains: ['elal.com'],
    color: '#1C3F94',
  },
  {
    id: 'booking',
    name: 'Booking.com',
    nameHe: 'בוקינג',
    aliases: ['booking'],
    category: 'travel',
    domains: ['booking.com'],
    color: '#003580',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    nameHe: 'נטפליקס',
    aliases: [],
    category: 'entertainment',
    domains: ['netflix.com'],
    color: '#E50914',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    nameHe: 'ספוטיפיי',
    aliases: [],
    category: 'entertainment',
    domains: ['spotify.com'],
    color: '#1DB954',
  },
  {
    id: 'lastprice',
    name: 'Last Price',
    nameHe: 'לאסט פרייס',
    aliases: [],
    category: 'fashion',
    domains: ['lastprice.co.il'],
    color: '#E30613',
  },
  {
    id: 'tnt',
    name: 'TNT',
    nameHe: 'טי אן טי',
    aliases: ['טנ"ט'],
    category: 'fashion',
    domains: ['tnt.co.il'],
    color: '#000000',
  },
  // Gift card platforms (multi-store)
  {
    id: 'buyme',
    name: 'BuyMe',
    nameHe: 'ביימי',
    aliases: ['buy me', 'ביי מי'],
    category: 'gift_platform',
    domains: ['buyme.co.il'],
    color: '#E6007E',
    platform: true,
  },
  {
    id: 'tavzahav',
    name: 'Tav Zahav',
    nameHe: 'תו הזהב',
    aliases: ['tav hazahav', 'תו זהב'],
    category: 'gift_platform',
    domains: ['tavhazahav.shufersal.co.il', 'tavhazahav.co.il', 'tavzahav.co.il'],
    color: '#B8860B',
    platform: true,
  },
  {
    id: 'tavhamutag',
    name: 'Tav HaMutag',
    nameHe: 'תו המותג',
    aliases: [],
    category: 'gift_platform',
    domains: ['tavhamutag.co.il'],
    color: '#4B2E83',
    platform: true,
  },
  {
    id: 'dreamcard',
    name: 'Dream Card',
    nameHe: 'דרים קארד',
    aliases: ['dreamcard'],
    category: 'gift_platform',
    domains: ['dreamcard.co.il'],
    color: '#7B2CBF',
    platform: true,
  },
  {
    id: 'nofshonit',
    name: 'Swish',
    nameHe: 'סוויש',
    aliases: ['nofshonit', 'נופשונית', 'swish plus', 'סוויש פלוס'],
    category: 'gift_platform',
    domains: ['swish.co.il', 'nofshonit.co.il'],
    color: '#00A9A5',
    platform: true,
  },
  {
    id: 'max',
    name: 'Max Gift Card',
    nameHe: 'כרטיס מתנה מקס',
    aliases: ['max'],
    category: 'gift_platform',
    domains: ['max.co.il'],
    color: '#00B2A9',
    platform: true,
  },
  {
    id: 'isracard',
    name: 'Isracard Gift',
    nameHe: 'ישראכרט',
    aliases: [],
    category: 'gift_platform',
    domains: ['isracard.co.il'],
    color: '#003A70',
    platform: true,
  },
  {
    id: 'multipass',
    name: 'Multipass',
    nameHe: 'מולטיפס',
    aliases: [],
    category: 'gift_platform',
    domains: ['multipass.co.il'],
    color: '#F26522',
    platform: true,
  },
  {
    id: 'pluxee',
    name: 'Pluxee (Cibus)',
    nameHe: 'סיבוס',
    aliases: ['cibus', 'pluxee'],
    category: 'gift_platform',
    domains: ['pluxee.co.il', 'cibus.co.il'],
    color: '#221C46',
    platform: true,
  },
  {
    id: 'tenbis',
    name: '10bis',
    nameHe: 'תן ביס',
    aliases: ['ten bis'],
    category: 'gift_platform',
    domains: ['10bis.co.il'],
    color: '#FF8000',
    platform: true,
  },
  {
    id: 'giftcardcoil',
    name: 'GiftCard',
    nameHe: 'גיפטקארד',
    aliases: [],
    category: 'gift_platform',
    domains: ['giftcard.co.il'],
    color: '#5A2D82',
    platform: true,
  },
  {
    id: 'azrieli',
    name: 'Azrieli Gift Card',
    nameHe: 'גיפטקארד עזריאלי',
    aliases: ['azrieli', 'azrieli malls', 'עזריאלי', 'קניוני עזריאלי', 'גיפט קארד עזריאלי'],
    category: 'gift_platform',
    domains: ['azrielimalls.co.il'],
    color: '#E4002B',
    platform: true,
  },
  {
    id: 'hitechzone',
    name: 'Hi-Tech Zone',
    nameHe: 'הייטק זון',
    aliases: ['hitech zone', 'hitechzone', 'htzone', 'הייטקזון', 'giftzone', 'גיפטזון', 'multizone', 'allin zone', 'eatzone'],
    category: 'gift_platform',
    domains: ['htzone.co.il'],
    color: '#1B2A49',
    platform: true,
  },
];

let aliasIndex: Map<string, Brand> | null = null;

function getAliasIndex(): Map<string, Brand> {
  if (aliasIndex) return aliasIndex;
  aliasIndex = new Map();
  for (const b of BRANDS) {
    for (const n of [b.id, b.name, b.nameHe, ...b.aliases]) {
      if (!n) continue;
      const key = compact(n);
      if (key && !aliasIndex.has(key)) aliasIndex.set(key, b);
    }
  }
  return aliasIndex;
}

/** Exact (normalized) brand match for a store name, e.g. "זארה" → Zara. */
export function findBrand(storeName: string | null | undefined): Brand | null {
  if (!storeName) return null;
  return getAliasIndex().get(compact(storeName)) ?? null;
}

export function brandById(id: string): Brand | null {
  return BRANDS.find((b) => b.id === id) ?? null;
}

/** All names a brand is known by (for search indexing). */
export function brandNames(b: Brand): string[] {
  return [b.name, b.nameHe, ...b.aliases].filter((n): n is string => !!n);
}

/** Finds a brand by a hostname (handles subdomains, e.g. www.zara.com / m.buyme.co.il). */
export function brandForHost(hostname: string): Brand | null {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  let best: { brand: Brand; len: number } | null = null;
  for (const b of BRANDS) {
    for (const d of b.domains ?? []) {
      if (host === d || host.endsWith(`.${d}`)) {
        if (!best || d.length > best.len) best = { brand: b, len: d.length };
      }
    }
  }
  return best?.brand ?? null;
}

/**
 * Stable key used to group items of the same store (places cache, cooldowns).
 * Known brands map to their id so Hebrew/English spellings collapse together.
 */
export function storeKey(storeName: string): string {
  const brand = findBrand(storeName);
  if (brand) return `brand:${brand.id}`;
  return `name:${compact(storeName)}`;
}

export function brandColor(storeName: string): string | null {
  return findBrand(storeName)?.color ?? null;
}
