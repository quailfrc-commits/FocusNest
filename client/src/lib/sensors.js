import { useEffect, useRef, useState } from 'react';

/* 用 DeviceOrientation 判斷手機是否「平放在桌上」（螢幕朝上或朝下）。
   實機測試時調整這裡的門檻。 */
export const FLAT_DEG = 18;     // beta、gamma 都在 ±18° 內算平放
export const HOLD_MS = 350;     // 狀態要持續這麼久才算數，避免碰到桌子就誤判

function isFlat(beta, gamma){
  const b = Math.abs(beta), g = Math.abs(gamma);
  return (b < FLAT_DEG || b > 180 - FLAT_DEG) && g < FLAT_DEG;
}

/* 回傳 { available, flat }；available 在收到第一筆有效感測資料後才會變成 true */
export function useFlatSensor(){
  const [state, setState] = useState({ available: false, flat: false });
  const pending = useRef(null), timer = useRef(null), cur = useRef(state);
  useEffect(() => {
    function onOri(e){
      if(e.beta == null || e.gamma == null) return;
      const flat = isFlat(e.beta, e.gamma);
      if(!cur.current.available){ cur.current = { available: true, flat }; setState(cur.current); return; }
      if(flat === cur.current.flat){ pending.current = null; clearTimeout(timer.current); return; }
      if(pending.current === flat) return;
      pending.current = flat; clearTimeout(timer.current);
      timer.current = setTimeout(() => { pending.current = null; cur.current = { available: true, flat }; setState(cur.current); }, HOLD_MS);
    }
    window.addEventListener('deviceorientation', onOri);
    return () => { window.removeEventListener('deviceorientation', onOri); clearTimeout(timer.current); };
  }, []);
  return state;
}

/* ---------- 橫放開始專注、拿起偵測 ---------- */
const TOUCH = new URLSearchParams(location.search).has('touch'); // 網址加 ?touch：在電腦上假裝是觸控裝置（測試用）
const isTouch = () => TOUCH || matchMedia('(pointer: coarse)').matches;
export const IS_TOUCH = isTouch();
const readLandscape = () => (screen.orientation && screen.orientation.type ? screen.orientation.type.startsWith('landscape') : matchMedia('(orientation: landscape)').matches);

/* 手機現在是不是橫向。只有觸控裝置才算（電腦視窗很寬不是「橫放」）；
   用 screen.orientation 判斷，不會被螢幕鍵盤縮小視窗誤判。 */
export function useLandscape(){
  const touch = useRef(isTouch()).current;
  const [land, setLand] = useState(() => touch && readLandscape());
  useEffect(() => {
    if(!touch) return;
    const f = () => setLand(readLandscape()), o = screen.orientation;
    if(o && o.addEventListener) o.addEventListener('change', f);
    addEventListener('orientationchange', f); addEventListener('resize', f);
    return () => { if(o && o.removeEventListener) o.removeEventListener('change', f); removeEventListener('orientationchange', f); removeEventListener('resize', f); };
  }, [touch]);
  return land;
}

/* 最新的手機姿勢放在 ref 裡（感測器一秒更新好幾十次，不能每次都重新繪製畫面） */
export function usePose(){
  const pose = useRef({ beta: null, gamma: null, t: 0 });
  useEffect(() => {
    const on = e => { if(e.beta != null && e.gamma != null) pose.current = { beta: e.beta, gamma: e.gamma, t: Date.now() }; };
    addEventListener('deviceorientation', on);
    return () => removeEventListener('deviceorientation', on);
  }, []);
  return pose;
}

/* 拿起偵測：專注開始後，等手機穩定下來（放好了）就把那個姿勢當基準；
   之後姿勢偏離基準超過 MOVE_DEG 並持續 HOLD_MS 算「拿起」，回到 RETURN_DEG 內持續 PUT_BACK_MS 算「放回」。
   平放在桌上、立在支架上都能用。實機測試時調整這些門檻。 */
export const MOVE_DEG = 22, RETURN_DEG = 12, PUT_BACK_MS = 600, SETTLE_MS = 1500, MAX_SETTLE_MS = 8000;
const angle = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const spread = (win, k) => Math.max(...win.map(p => p[k])) - Math.min(...win.map(p => p[k]));
const mean = (win, k) => win.reduce((a, p) => a + p[k], 0) / win.length;

export function usePickup(active, pose, onChange){
  const cb = useRef(onChange); cb.current = onChange;
  useEffect(() => {
    if(!active) return;
    const t0 = Date.now(); let base = null, picked = false, since = 0; const win = [];
    const id = setInterval(() => {
      const now = Date.now(), p = pose.current;
      if(p.beta == null || now - p.t > 1500) return; // 沒有感測資料
      if(!base){
        win.push(p); if(win.length > 10) win.shift();
        const still = win.length >= 10 && spread(win, 'beta') < 4 && spread(win, 'gamma') < 4;
        if((now - t0 >= SETTLE_MS && still) || now - t0 >= MAX_SETTLE_MS) base = { beta: mean(win, 'beta'), gamma: mean(win, 'gamma') };
        return;
      }
      const dev = Math.max(angle(p.beta, base.beta), angle(p.gamma, base.gamma));
      if(!picked){
        if(dev > MOVE_DEG){ since = since || now; if(now - since >= HOLD_MS){ picked = true; since = 0; cb.current(true); } } else since = 0;
      } else if(dev < RETURN_DEG){ since = since || now; if(now - since >= PUT_BACK_MS){ picked = false; since = 0; cb.current(false); } } else since = 0;
    }, 100);
    return () => clearInterval(id);
  }, [active, pose]);
}
