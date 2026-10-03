import React, { useState } from 'react';
import { useApp } from '../ui.jsx';
import { Pet } from '../Pet.jsx';
import { ITEMS, SLOTNAME } from '../lib/data.js';
import { eff } from '../lib/logic.js';

export default function Equip(){
  const { S, update, toast } = useApp();
  const e = eff(S);
  const worn = Object.keys(S.equip.worn).map(s => { const it = ITEMS.find(i => i.id === S.equip.worn[s]); return it ? <span key={s} className="slot">{SLOTNAME[s]}：{it.name}</span> : null; }).filter(Boolean);
  function buy(it){
    if(S.user.coins < it.price) return;
    update(S => { S.user.coins -= it.price; S.equip.owned.push(it.id); S.equip.worn[it.slot] = it.id; });
    toast('買到「' + it.name + '」並穿上了');
  }
  function wear(it){ update(S => { if(S.equip.worn[it.slot] === it.id) delete S.equip.worn[it.slot]; else S.equip.worn[it.slot] = it.id; }); }
  const groups = [['bird', '小鶉外觀'], ['nest', '鳥窩'], ['scene', '背景']];
  const [folded, setFolded] = useState({ bird: true, nest: true, scene: true });
  return <div className="sec">
    <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 110, height: 110, flex: 'none' }}><Pet m="happy" worn={S.equip.worn} /></div>
      <div style={{ display: 'grid', gap: 6 }}>
        <b className="kai" style={{ fontSize: 19 }}>{S.pet.name}的衣櫃</b>
        <div className="slots">{worn.length ? worn : <span className="muted">還沒穿任何裝備</span>}</div>
        <div className="muted">目前加成：經驗 +{Math.round(e.xp * 100)}%、緩衝 +{e.buffer} 秒、代幣 +{e.coin}{e.combo > 1 ? '、Combo ×' + e.combo : ''}</div>
      </div>
    </div>
    {groups.map(([group, title]) => <section className="equip-group" key={group}><button className="equip-fold" onClick={() => setFolded(x => ({ ...x, [group]: !x[group] }))} aria-expanded={!folded[group]}><span>{folded[group] ? '▸' : '▾'}</span>{title}<small>{ITEMS.filter(it => it.group === group).length} 件</small></button>{!folded[group] && <div className="wardrobe">{ITEMS.filter(it => it.group === group).map(it => {
      const own = it.price === 0 || S.equip.owned.includes(it.id), on = S.equip.worn[it.slot] === it.id, lock = S.user.level < it.lv;
      return <div key={it.id} className={'item' + (on ? ' worn' : '')}>
        <div className="ic"><Pet worn={{ [it.slot]: it.id }} /></div>
        <b>{it.name}</b><small>{it.bonus}</small><span className="muted" style={{ fontSize: 11 }}>{SLOTNAME[it.slot]}</span>
        {own ? <button className={'btn ' + (on ? 'ghost' : 'g')} onClick={() => wear(it)}>{on ? '脫下' : '穿上'}</button>
          : lock ? <span className="lock">Lv {it.lv} 解鎖</span>
          : <button className="btn" disabled={S.user.coins < it.price} onClick={() => buy(it)}>{it.price} 代幣購買</button>}
      </div>;
    })}</div>}</section>)}
  </div>;
}
