import { useCallback, useEffect, useRef, useState } from 'react';
import { FOCUS_SECS, REST_SECS } from './data.js';
import { today } from './util.js';
import { addXP, bufferSecs, dayStat, eff, findTask, isNewbie, isProject, streak } from './logic.js';

const PICK_PENALTY = 10, FAIL_AFTER = 10;

/* 番茄鐘引擎：從原型的 startFocus / tick / phaseEnd / setPicked 移植。
   F 放在 ref 裡，每 200ms 觸發一次重新繪製。 */
export function useFocus({ S, update, toast, flash }){
  const F = useRef(null), sRef = useRef(S);
  sRef.current = S;
  const [, setVer] = useState(0);
  const redraw = useCallback(() => setVer(v => v + 1), []);

  const start = useCallback(taskId => {
    const s = sRef.current, secs = FOCUS_SECS[s.settings.focus];
    F.current = { phase: 'focus', taskId: taskId || null, total: secs, remain: secs, last: Date.now(), picks: 0, pen: 0, picked: false, pickStart: 0, penalizedThisPick: false, started: Date.now(), overlay: null };
    redraw();
  }, [redraw]);

  const phaseEnd = useCallback(() => {
    const f = F.current;
    if(f.phase === 'focus'){
      const r = update(S => {
        const e = eff(S), xp = Math.round(25 * (1 + e.xp));
        let coin = 5 + e.coin, msg = null;
        const t = f.taskId ? findTask(S, f.taskId) : null, min = Math.max(1, Math.round(f.total / 60));
        if(t){ t.spentMin = (t.spentMin == null ? (t.pomo || 0) * 25 : t.spentMin) + min; t.pomo++; }
        S.sessions.push({ d: today(), min, picks: f.picks, ok: true, task: t ? t.title : null });
        if(streak(S) >= 3 && dayStat(S, today()).n === 1){ coin += 5 * e.combo; msg = 'Combo！連續 ' + streak(S) + ' 天，額外代幣 +' + 5 * e.combo; }
        msg = addXP(S, xp) || msg; S.user.coins += coin;
        return { xp, coin, msg, canProof: !!(t && t.status !== 'done' && !isProject(t)) };
      });
      if(r.msg) toast(r.msg);
      flash('happy', 6000);
      f.overlay = { k: 'result', xp: r.xp, coin: r.coin, picks: f.picks, pen: f.pen, canProof: r.canProof };
    } else {
      f.overlay = { k: 'breakEnd' };
    }
    redraw();
  }, [update, toast, flash, redraw]);

  useEffect(() => {
    const id = setInterval(() => {
      const f = F.current; if(!f) return;
      const now = Date.now(), dt = (now - f.last) / 1000; f.last = now;
      if(f.overlay && f.overlay.k !== 'warn') return;
      if(f.picked){
        const s = sRef.current, held = (now - f.pickStart) / 1000;
        if(held >= bufferSecs(s) && !f.penalizedThisPick){
          f.penalizedThisPick = true; f.picks++;
          if(isNewbie(s)) flash('sad', 6000);
          else { f.pen += PICK_PENALTY; update(S => { addXP(S, -PICK_PENALTY); }); }
        }
        if(held >= bufferSecs(s) + FAIL_AFTER){
          update(S => { S.sessions.push({ d: today(), min: Math.round((f.total - f.remain) / 60), picks: f.picks, ok: false }); });
          f.picked = false; f.overlay = { k: 'fail' }; flash('sad', 8000);
        }
        redraw(); return;
      }
      f.remain -= dt;
      if(f.remain <= 0){ f.remain = 0; phaseEnd(); return; }
      redraw();
    }, 200);
    return () => clearInterval(id);
  }, [update, flash, phaseEnd, redraw]);

  const setPicked = useCallback(on => {
    const f = F.current;
    if(!f || f.phase !== 'focus' || (f.overlay && f.overlay.k !== 'warn') || f.picked === on) return;
    if(on){ f.picked = true; f.pickStart = Date.now(); f.penalizedThisPick = false; f.overlay = { k: 'warn' }; }
    else { f.picked = false; f.overlay = null; f.last = Date.now(); if(!f.penalizedThisPick) toast('放回來了，沒有扣分'); }
    redraw();
  }, [toast, redraw]);

  const end = useCallback(() => { F.current = null; redraw(); }, [redraw]);
  const ff = useCallback(() => { const f = F.current; if(f && !f.picked && !f.overlay) f.remain = 0.05; }, []);
  const toBreak = useCallback(() => {
    const f = F.current, secs = REST_SECS[sRef.current.settings.rest];
    Object.assign(f, { phase: 'break', total: secs, remain: secs, last: Date.now(), picks: 0, pen: 0, overlay: null }); redraw();
  }, [redraw]);
  const askQuit = useCallback(() => {
    const f = F.current; if(!f) return;
    if(f.phase === 'focus' && !f.overlay){ f.overlay = { k: 'quit' }; redraw(); }
    else if(!f.overlay || f.overlay.k !== 'quit') end();
  }, [end, redraw]);
  const stay = useCallback(() => { const f = F.current; f.overlay = null; f.last = Date.now(); redraw(); }, [redraw]);
  const quitNow = useCallback(() => {
    const f = F.current;
    update(S => { S.sessions.push({ d: today(), min: Math.round((f.total - f.remain) / 60), picks: f.picks, ok: false }); });
    flash('sad', 5000); end();
  }, [update, flash, end]);

  return { F: F.current, start, setPicked, end, ff, toBreak, askQuit, stay, quitNow };
}
