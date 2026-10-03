import { uid, today, addDays, clock, diffDays } from './util.js';

export const STATE_VERSION = 2;
export const QUADS = { 1: ['重要且緊急', '馬上做', 'var(--q1)'], 2: ['重要不緊急', '排時間做', 'var(--q2)'], 3: ['緊急不重要', '快速處理', 'var(--q3)'], 4: ['不緊急不重要', '有空再說', 'var(--q4)'] };
export const TYPES = [['daily', '每日'], ['weekly', '每週'], ['custom', '自訂'], ['project', '專案']];
/* 鳥身、鳥窩與飾品可以各穿一件；同時穿戴時加成會疊加。 */
export const ITEMS = [
  { id: 'bird-wood', name: '原色小鶉', group: 'bird', slot: 'body', price: 0, lv: 1, bonus: '經典外觀', eff: { xp: 0, buffer: 0, coin: 0 } },
  { id: 'bird-bronze', name: '青銅小鶉', group: 'bird', slot: 'body', price: 250, lv: 3, bonus: '經驗 +5%', eff: { xp: .05, buffer: 0, coin: 0 } },
  { id: 'bird-silver', name: '白銀小鶉', group: 'bird', slot: 'body', price: 500, lv: 6, bonus: '代幣 +1', eff: { xp: 0, buffer: 0, coin: 1 } },
  { id: 'bird-gold', name: '黃金小鶉', group: 'bird', slot: 'body', price: 900, lv: 10, bonus: '經驗 +10%', eff: { xp: .1, buffer: 0, coin: 0 } },
  { id: 'nest-wood', name: '原木鳥窩', group: 'nest', slot: 'nest', price: 0, lv: 1, bonus: '經典外觀', eff: { xp: 0, buffer: 0, coin: 0 } },
  { id: 'nest-bronze', name: '青銅鳥窩', group: 'nest', slot: 'nest', price: 300, lv: 4, bonus: '拿起緩衝 +2 秒', eff: { xp: 0, buffer: 2, coin: 0 } },
  { id: 'nest-silver', name: '白銀鳥窩', group: 'nest', slot: 'nest', price: 600, lv: 7, bonus: '拿起緩衝 +4 秒', eff: { xp: 0, buffer: 4, coin: 0 } },
  { id: 'nest-gold', name: '黃金鳥窩', group: 'nest', slot: 'nest', price: 1000, lv: 12, bonus: '連續獎勵 ×1.5', eff: { xp: 0, buffer: 0, coin: 0, combo: 1.5 } },
  { id: 'scene-none', name: '無背景', group: 'scene', slot: 'scene', price: 0, lv: 1, bonus: '經典外觀', eff: { xp: 0, buffer: 0, coin: 0 } },
  { id: 'scene-leaves', name: '森林葉影', group: 'scene', slot: 'scene', price: 200, lv: 2, bonus: '拿起緩衝 +1 秒', eff: { xp: 0, buffer: 1, coin: 0 } },
  { id: 'scene-stars', name: '靜夜星空', group: 'scene', slot: 'scene', price: 400, lv: 5, bonus: '經驗 +5%', eff: { xp: .05, buffer: 0, coin: 0 } },
  { id: 'scene-gold', name: '金色光圈', group: 'scene', slot: 'scene', price: 700, lv: 8, bonus: '代幣 +1', eff: { xp: 0, buffer: 0, coin: 1 } }
];
/* 任務分類：預設幾個，使用者可以在新增／編輯任務時加自己的（存在 S.cats）。任務的 cat 是分類名稱，空字串＝未分類 */
export const DEFAULT_CATS = ['學習', '遊戲', '社團', '運動', '生活'];
export const CAT_COLORS = [['#E7F0F7', '#28598A'], ['#EFE7F7', '#633E8A'], ['#FBE6E1', '#B0392A'], ['#E3F3E1', '#2E6B34'], ['#FFF1C2', '#7A5600'], ['#E6F4F4', '#1F6A6A'], ['#F6E4EF', '#8A2E66'], ['#EEE9DA', '#5F5A46']];
const CAT_OF = { '每日喝水': '生活', '背 30 個英文單字': '學習', '整理今天的課堂筆記': '學習', '運動 30 分鐘': '運動', 'InnoServe 系統概述文件': '社團', '期中考：資料結構': '學習', '回覆社團訊息': '社團', '整理桌面檔案': '生活', '期中複習計畫': '學習', '英文單字 50 個': '學習', '作業 3：二元樹': '學習' };
/* 示範任務填上分類；子任務跟著專案走 */
function applyCats(tasks){
  tasks.forEach(t => { if(!t.parent) t.cat = CAT_OF[t.title] || ''; });
  tasks.forEach(t => { if(t.parent) t.cat = (tasks.find(x => x.id === t.parent) || {}).cat || ''; });
}
export const SLOTNAME = { body: '鳥身', nest: '鳥窩', scene: '背景' };
export const TONES = {
  '撒嬌': { idle: ['主人～今天還沒有陪我讀書耶，我等你好久了', '一顆番茄就好嘛，我會乖乖坐在旁邊', '你是不是忘記我了…我把羽毛都理好了等你'], good: ['今天好厲害！我可以再多陪你一顆嗎', '你專心的樣子好帥，我都看呆了'] },
  '毒舌': { idle: ['今天 0 顆番茄？我都快孵出下一代了你還沒開始', '滑手機很開心齁？你的任務在旁邊哭', '再拖下去，期末會自己來找你喔'], good: ['還不錯嘛，但別以為這樣就可以滑手機', '嗯，今天勉強及格，繼續'] },
  '幽默': { idle: ['本鶉宣布：今日番茄產量為 0，建議立刻橫放手機', '偵測到主人拖延指數上升 87%，請求支援', '鵪鶉氣象台：今天午後有機會出現「讀書」'], good: ['番茄豐收！本鶉決定頒給你一根羽毛', '今日專注指數破表，鶉心大悅'] }
};
export const MOODTXT = { normal: '平靜', happy: '開心', sad: '失落', alert: '驚嚇', sleep: '想睡' };
export const TAPLINES = ['啾！摸摸頭', '不要戳我肚子啦', '我在幫你看著手機喔', '今天要完成什麼？', '把我放在桌上，我會乖乖的'];
export const FRIENDS = [
  { n: '小明', st: 'focus', t: '正在專注 · 第 3 顆番茄', min: 410, c: '#2F6F5E', w: { head: 'phones' } },
  { n: '小華', st: 'rest', t: '休息中 · 今天 2 顆', min: 275, c: '#C8920F', w: { face: 'glasses' } },
  { n: '小美', st: 'idle', t: '今天還沒開始', min: 180, c: '#9A9087', w: { head: 'hat' } }
];
export const FOCUS_SECS = { '25': 1500, '50': 3000, 'demo': 10 };
export const REST_SECS = { '5': 300, '10': 600, 'demo': 5 };
export const FOCUS_LABEL = { '25': '25 分鐘', '50': '50 分鐘', 'demo': '10 秒示範' };
export const REST_LABEL = { '5': '5 分鐘', '10': '10 分鐘', 'demo': '5 秒' };
/* 新手保護：建立帳號後幾天內拿起手機只讓寵物失落、不扣經驗 */
export const NEWBIE_DAYS = 3;

export function seed(){
  const t = today(), pid = uid();
  const tasks = [
    { id: uid(), title: '每日喝水', type: 'daily', q: 2, start: t, due: t, estimateMin: 5, est: 1, pomo: 0, spentMin: 0, status: 'todo', parent: null, cat: '生活', logs: [] },
    { id: uid(), title: '運動 30 分鐘', type: 'weekly', q: 2, start: t, due: addDays(t, 3), est: 1, pomo: 0, status: 'todo', parent: null },
    { id: pid, title: 'InnoServe 系統概述文件', type: 'project', q: 1, start: t, due: addDays(t, 9), est: 0, pomo: 0, status: 'todo', parent: null },
    { id: uid(), title: '讀完評分標準與範本', type: 'project', q: 1, start: t, due: addDays(t, 1), est: 1, pomo: 1, status: 'todo', parent: pid },
    { id: uid(), title: '寫前言與創意描述', type: 'project', q: 1, start: addDays(t, 1), due: addDays(t, 3), est: 2, pomo: 0, status: 'todo', parent: pid },
    { id: uid(), title: '畫系統架構圖', type: 'project', q: 2, start: addDays(t, 3), due: addDays(t, 5), est: 2, pomo: 0, status: 'todo', parent: pid },
    { id: uid(), title: '壓到 5 頁並檢查匿名', type: 'project', q: 1, start: addDays(t, 6), due: addDays(t, 8), est: 1, pomo: 0, status: 'todo', parent: pid },
    { id: uid(), title: '期中考：資料結構', type: 'custom', q: 1, start: t, due: addDays(t, 6), est: 4, pomo: 0, status: 'todo', parent: null },
    { id: uid(), title: '回覆社團訊息', type: 'custom', q: 3, start: t, due: addDays(t, 1), est: 1, pomo: 0, status: 'todo', parent: null },
    { id: uid(), title: '整理桌面檔案', type: 'custom', q: 4, start: addDays(t, 2), due: addDays(t, 10), est: 1, pomo: 0, status: 'todo', parent: null }
  ];
  applyCats(tasks);
  const past = [2, 3, 1, 0, 4, 2], sessions = [];
  past.forEach((n, i) => {
    const d = addDays(t, i - 6);
    for(let k = 0; k < n; k++) sessions.push({ d, min: 25, picks: (k + i) % 3 === 0 ? 1 : 0, ok: true, demo: true });
  });
  return {
    v: STATE_VERSION, createdOn: t,
    user: { name: '鵪鶉的窩', level: 3, xp: 140, coins: 90 },
    pet: { name: '小鶉' }, equip: { owned: ['bird-wood', 'nest-wood', 'scene-none'], worn: { body: 'bird-wood', nest: 'nest-wood', scene: 'scene-none' } },
    tasks, cats: [...DEFAULT_CATS], sessions, proofs: [], diary: {}, cheers: {},
    settings: { tone: '撒嬌', focus: '25', rest: '5', buffer: 3, ar: false }
  };
}

/* 成果照的示意圖（群組好友和展示帳號用）：kind = 'code' 程式畫面、'note' 筆記 */
export function friendPhoto(kind){
  const svg = kind === 'code'
    ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#23272E"/><rect x="30" y="30" width="340" height="220" rx="10" fill="#1B1F24"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map(i => '<rect x="' + (50 + (i % 3) * 20) + '" y="' + (55 + i * 22) + '" width="' + (80 + (i * 37) % 160) + '" height="9" rx="4" fill="' + ['#7CC7AF', '#E5C07B', '#61AFEF', '#C678DD'][i % 4] + '"/>').join('') + '</svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#B98C5F"/><rect x="60" y="30" width="280" height="240" rx="6" fill="#FBF8F0" transform="rotate(-3 200 150)"/>' + [0, 1, 2, 3, 4, 5, 6, 7].map(i => '<path d="M90 ' + (70 + i * 24) + ' h' + (150 + (i * 31) % 80) + '" stroke="#5470A8" stroke-width="4" stroke-linecap="round" transform="rotate(-3 200 150)"/>').join('') + '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* 展示帳號（admin）的資料：高等級、很多代幣、兩週的番茄紀錄、完成的任務與成果照、日記，所有成就都達成。
   「一鍵填入展示資料」就是把狀態換成這一份。 */
export function demoState(){
  const t = today(), s = seed();
  s.user = { name: '展示帳號', level: 99, xp: 9999, coins: 999999 };
  s.equip = { owned: ITEMS.map(x => x.id), worn: { body: 'bird-wood', nest: 'nest-wood', scene: 'scene-none' } };
  s.createdOn = addDays(t, -30);
  s.settings.demoBar = true;
  // 兩週的番茄紀錄：最後一天（今天）3 顆，每天有些拿起次數 0 的
  const perDay = [2, 3, 4, 2, 3, 1, 4, 5, 3, 2, 4, 3, 4, 3];
  s.sessions = [];
  perDay.forEach((n, i) => { for(let k = 0; k < n; k++) s.sessions.push({ d: addDays(t, i - 13), min: 25, picks: (i + k) % 5 === 0 ? 1 : 0, ok: true }); });
  // 拍片基準：只保留每日喝水與 InnoServe 專案，其他任務由現場 Gemini 拆解產生。
  const proj = s.tasks.find(x => x.title.startsWith('InnoServe'));
  const water = s.tasks.find(x => x.title === '每日喝水');
  const children = s.tasks.filter(x => x.parent === proj.id);
  s.tasks = [water, proj, ...children];
  Object.assign(proj, { start: '2026-10-03', due: '2026-10-05' });
  const dates = {
    '讀完評分標準與範本': ['2026-10-03', '2026-10-03'],
    '寫前言與創意描述': ['2026-10-03', '2026-10-04'],
    '畫系統架構圖': ['2026-10-03', '2026-10-04'],
    '壓到 5 頁並檢查匿名': ['2026-10-04', '2026-10-05']
  };
  children.forEach(x => { const d = dates[x.title]; if(d) [x.start, x.due] = d; });
  const first = children[0]; Object.assign(first, { status: 'done', pomo: 1, proof: friendPhoto('note'), doneOn: t });
  water.logs = Array.from({ length: diffDays('2026-09-28', t) + 1 }, (_, i) => ({ id: 'h' + uid(), date: addDays('2026-09-28', i), img: null, when: '' }));
  s.proofs = s.tasks.filter(x => x.proof).slice(-5).map(x => ({ id: 'p' + uid(), img: x.proof, task: x.title, when: clock() }));
  const dtext = ['今天主人有好好陪我！我們一起完成了好多顆番茄，而且一次都沒有拿起手機，我好驕傲。明天也要一起加油喔，晚安。', '鵪鶉觀察日誌，今日天氣：專注晴。主人今天完成了作業，我在旁邊顧著手機，什麼事也沒發生，這樣最好。'];
  dtext.forEach((text, i) => { s.diary[addDays(t, -i - 1)] = { text, ai: false }; });
  s.cheers = { f1: true };
  applyCats(s.tasks);
  return s;
}
