import React from 'react';
import { IC } from './lib/pet.js';
import backImg from './assets/pet-nest-back.png';
import birdImg from './assets/pet-bird.png';
import frontImg from './assets/pet-nest-front.png';
import focusImg from './assets/pet-focus-clean.png';
import birdBronze from './assets/pet-bird-bronze.png';
import birdSilver from './assets/pet-bird-silver.png';
import birdGold from './assets/pet-bird-gold.png';
import backBronze from './assets/pet-nest-back-bronze.png';
import backSilver from './assets/pet-nest-back-silver.png';
import backGold from './assets/pet-nest-back-gold.png';
import frontBronze from './assets/pet-nest-front-bronze.png';
import frontSilver from './assets/pet-nest-front-silver.png';
import frontGold from './assets/pet-nest-front-gold.png';

/* 小鶉：鳥窩後層 → 鳥身與飾品 → 鳥窩前層。 */
const BIRDS = { 'bird-bronze': birdBronze, 'bird-silver': birdSilver, 'bird-gold': birdGold };
const NESTS = {
  'nest-bronze': [backBronze, frontBronze],
  'nest-silver': [backSilver, frontSilver],
  'nest-gold': [backGold, frontGold]
};
const BG = {
  'scene-leaves': <svg className="px-bg" viewBox="0 0 302 265"><ellipse cx="151" cy="118" rx="112" ry="96" fill="#DCECCF" opacity=".8" /><g fill="#79A85B" opacity=".55"><ellipse cx="66" cy="65" rx="13" ry="25" transform="rotate(-35 66 65)"/><ellipse cx="236" cy="72" rx="12" ry="24" transform="rotate(38 236 72)"/><ellipse cx="48" cy="126" rx="10" ry="21" transform="rotate(-55 48 126)"/><ellipse cx="255" cy="130" rx="10" ry="21" transform="rotate(55 255 130)"/></g></svg>,
  'scene-stars': <svg className="px-bg" viewBox="0 0 302 265"><ellipse cx="151" cy="118" rx="112" ry="98" fill="#263A59" opacity=".92" /><g fill="#F7E7A9"><circle cx="78" cy="66" r="4"/><circle cx="113" cy="39" r="3"/><circle cx="206" cy="51" r="4"/><circle cx="239" cy="94" r="3"/><circle cx="65" cy="128" r="2.5"/><path d="M226 126l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g></svg>,
  'scene-gold': <svg className="px-bg" viewBox="0 0 302 265"><circle cx="151" cy="111" r="82" fill="#F6C64B" opacity=".3"/><circle cx="151" cy="111" r="65" fill="#FFF3B8" opacity=".45"/><g stroke="#D9A51C" strokeWidth="5" strokeLinecap="round" opacity=".45"><path d="M151 14v15M151 193v15M54 111h15M233 111h15M83 43l11 11M208 168l11 11M219 43l-11 11M94 168l-11 11"/></g></svg>
};
const ACC = {};
const MOOD = {
  sad: <path d="M167 66 q7 11 0 17 q-7 -6 0 -17z" fill="#7FB8E0" />,
  alert: <g><path d="M226 16 q9 13 0 20 q-9 -7 0 -20z" fill="#7FB8E0" /><rect x="238" y="-16" width="8" height="20" rx="3" fill="#D2553F" /><circle cx="242" cy="12" r="4.5" fill="#D2553F" /></g>,
  sleep: <g fill="#9A9087" fontFamily="sans-serif" fontWeight="700"><text x="216" y="22" fontSize="30">z</text><text x="240" y="-4" fontSize="22">z</text></g>,
};

export function Pet({ m = 'normal', worn, clean = false }){
  const on = Object.values(worn || {}).map(id => ACC[id]).filter(Boolean);
  const layer = k => on.filter(a => a[k]).map((a, i) => React.cloneElement(a[k], { key: i }));
  const body = BIRDS[worn && worn.body] || birdImg;
  const nest = NESTS[worn && worn.nest] || [backImg, frontImg];
  const bg = BG[worn && worn.scene];
  if(clean) return <span className={'px-pet mood-' + m} aria-hidden="true">{bg}<span className="px-bird"><img src={BIRDS[worn && worn.body] || focusImg} alt="" draggable="false" /><svg className="px-acc" viewBox="0 0 302 265">{layer('front')}{MOOD[m]}</svg></span></span>;
  // 三層疊起來：窩的後面（固定）→ 鵪鶉（會動，心情記號跟著鳥）→ 窩前面的樹枝（固定，鳥往下沉會被擋住）
  return <span className={'px-pet mood-' + m} aria-hidden="true">
    {bg}
    <img src={nest[0]} alt="" draggable="false" />
    <span className="px-bird">
      <svg className="px-acc" viewBox="0 0 302 265">{layer('back')}</svg>
      <img src={body} alt="" draggable="false" />
      <svg className="px-acc" viewBox="0 0 302 265">{layer('front')}{MOOD[m]}</svg>
    </span>
    <img src={nest[1]} alt="" draggable="false" />
  </span>;
}
export function Icon({ name }){
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: IC[name] }} />;
}
