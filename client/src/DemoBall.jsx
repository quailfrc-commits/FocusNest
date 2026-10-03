import React, { useEffect, useRef, useState } from 'react';

/* 示範用懸浮球：平常縮成一顆小球，可以拖到螢幕任何位置（位置會記住）；
   點一下展開示範按鈕（橫放／拿起／快轉／模擬推播），再點一下收起來。手機、網頁、電腦版都一樣。 */
const KEY = 'focusnest-ball', SIZE = 48, MARGIN = 8, MOVE_PX = 6;
const read = () => { try{ return JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){ return null; } };
const clamp = (p) => ({ x: Math.min(Math.max(MARGIN, p.x), Math.max(MARGIN, innerWidth - SIZE - MARGIN)), y: Math.min(Math.max(MARGIN, p.y), Math.max(MARGIN, innerHeight - SIZE - MARGIN)) });
const fallback = () => clamp({ x: innerWidth - SIZE - 14, y: innerHeight - SIZE - 96 }); // 預設在右下，避開分頁列

export default function DemoBall({ children }){
  const [pos, setPos] = useState(() => clamp(read() || fallback()));
  const [open, setOpen] = useState(false);
  const drag = useRef(null), root = useRef(null);

  useEffect(() => { const f = () => setPos(p => clamp(p)); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  // 點到球和面板以外的地方就收起來
  useEffect(() => {
    if(!open) return;
    const f = e => { if(root.current && !root.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', f); return () => document.removeEventListener('pointerdown', f);
  }, [open]);

  function down(e){ drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false }; try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(err){} }
  function move(e){
    const d = drag.current; if(!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if(!d.moved && Math.hypot(dx, dy) < MOVE_PX) return;
    d.moved = true; setPos(clamp({ x: d.ox + dx, y: d.oy + dy }));
  }
  function up(e){
    const d = drag.current; drag.current = null; if(!d) return;
    if(d.moved){ try{ localStorage.setItem(KEY, JSON.stringify(pos)); }catch(err){} }
    else setOpen(o => !o);
  }

  // 面板放在球的左邊或右邊（看哪邊有空間）、上半部或下半部對齊
  const right = pos.x + SIZE / 2 < innerWidth / 2, low = pos.y + SIZE / 2 > innerHeight / 2;
  const panel = { position: 'absolute', [right ? 'left' : 'right']: SIZE + 8, [low ? 'bottom' : 'top']: 0 };

  return <div ref={root} className="demoball" style={{ left: pos.x, top: pos.y, width: SIZE, height: SIZE }}>
    <button className={'ball' + (open ? ' on' : '')} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; }}
      aria-label="示範工具（可以拖曳）" aria-expanded={open} title="示範工具：拖曳移動，點一下展開">示範</button>
    {open && <div className="demopanel" style={panel} role="group" aria-label="示範控制">{children}</div>}
  </div>;
}
