import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { uid } from './util.js';

/* 即時專注同步：手機（或任何正在專注的裝置）每秒把專注狀態傳給後端，
   電腦版（寬版面、自己沒在專注）每 1.5 秒來讀，讀到就顯示同步畫面。 */
const DEVICE = uid() + uid(); // 這個分頁／這支 App 的代號，用來避免自己看自己
const UA = navigator.userAgent || '';
const ANDROID_MODEL = UA.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|;|\))/i);
const DEVICE_NAME = /Android/i.test(UA) ? (ANDROID_MODEL ? ANDROID_MODEL[1].trim() : 'Android 手機')
  : /Electron/i.test(UA) ? 'Windows 應用程式' : '網頁瀏覽器';

/* 專注中（F 不是 null）每秒傳一次；專注結束傳一次「結束」。離線帳號不傳。 */
export function useLiveSender(F, taskTitle, online){
  const ref = useRef({ F, taskTitle });
  const last = useRef(null);
  ref.current = { F, taskTitle };
  const on = !!F && online;
  useEffect(() => {
    if(!on) return;
    const send = () => {
      const { F: f, taskTitle: t } = ref.current; if(!f) return;
      const paused = !!(f.picked || f.overlay);
      const status = { active: true, device: DEVICE, deviceName: DEVICE_NAME, phase: f.phase, task: t, total: f.total, remain: f.remain, picks: f.picks, picked: f.picked, paused, overlay: f.overlay ? f.overlay.k : '' };
      last.current = status; api.putLive(status).catch(() => {});
    };
    send(); const id = setInterval(send, 1000);
    return () => { clearInterval(id); api.putLive({ ...(last.current || {}), active: false, device: DEVICE, deviceName: DEVICE_NAME }).catch(() => {}); };
  }, [on]);
}

/* 讀別的裝置的專注狀態；enabled 為 true 才會讀。回傳 null 或 { …狀態, remainNow() } */
export function useLiveWatch(enabled){
  const [live, setLive] = useState(null);
  useEffect(() => {
    if(!enabled){ setLive(null); return; }
    let stop = false;
    const poll = () => api.getLive().then(r => {
      if(stop) return;
      setLive(r.active && r.device !== DEVICE ? { ...r, got: Date.now() - (r.age || 0) } : null);
    }).catch(() => { if(!stop) setLive(null); });
    poll(); const id = setInterval(poll, 1500);
    return () => { stop = true; clearInterval(id); };
  }, [enabled]);
  return live;
}

/* 現在還剩幾秒：伺服器收到的剩餘秒數，再扣掉從那之後過了多久（暫停中不扣） */
export const liveRemain = live => (live.paused ? live.remain : Math.max(0, live.remain - (Date.now() - live.got) / 1000));
