/* 寵物 2D 圖：直接沿用原型的 SVG 字串（也給成果照 canvas 用） */
export function petSVG(m, worn){
    worn = worn || {};
    let eyes;
    if(m === 'happy') eyes = '<path d="M75 101 Q82 92 89 101" fill="none" stroke="#2A2522" stroke-width="4" stroke-linecap="round"/><path d="M111 101 Q118 92 125 101" fill="none" stroke="#2A2522" stroke-width="4" stroke-linecap="round"/><ellipse cx="72" cy="114" rx="8" ry="5" fill="#E9967A" opacity=".6"/><ellipse cx="128" cy="114" rx="8" ry="5" fill="#E9967A" opacity=".6"/>';
    else if(m === 'sad') eyes = '<path d="M75 98 L89 103" stroke="#2A2522" stroke-width="4" stroke-linecap="round"/><path d="M125 98 L111 103" stroke="#2A2522" stroke-width="4" stroke-linecap="round"/><circle cx="82" cy="106" r="4" fill="#2A2522"/><circle cx="118" cy="106" r="4" fill="#2A2522"/><path d="M122 112 q4 8 0 11 q-4 -3 0 -11z" fill="#7FB8E0"/>';
    else if(m === 'alert') eyes = '<circle cx="82" cy="101" r="8" fill="#fff" stroke="#2A2522" stroke-width="3"/><circle cx="118" cy="101" r="8" fill="#fff" stroke="#2A2522" stroke-width="3"/><circle cx="82" cy="101" r="3" fill="#2A2522"/><circle cx="118" cy="101" r="3" fill="#2A2522"/><path d="M140 70 q6 10 0 14 q-6 -4 0 -14z" fill="#7FB8E0"/>';
    else if(m === 'sleep') eyes = '<path d="M75 102 Q82 107 89 102" fill="none" stroke="#2A2522" stroke-width="4" stroke-linecap="round"/><path d="M111 102 Q118 107 125 102" fill="none" stroke="#2A2522" stroke-width="4" stroke-linecap="round"/><text x="140" y="68" font-size="18" font-weight="700" fill="#9A9087" font-family="sans-serif">z</text><text x="152" y="54" font-size="13" font-weight="700" fill="#9A9087" font-family="sans-serif">z</text>';
    else eyes = '<circle cx="82" cy="101" r="5.5" fill="#2A2522"/><circle cx="118" cy="101" r="5.5" fill="#2A2522"/><circle cx="84" cy="99" r="1.8" fill="#fff"/><circle cx="120" cy="99" r="1.8" fill="#fff"/>';
    let back = '', front = '', head = '';
    if(worn.back === 'cape') back += '<path d="M52 120 Q40 175 70 178 L130 178 Q160 175 148 120 Z" fill="#5B4A9B"/><path d="M60 150 l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1z" fill="#F4D35E"/>';
    if(worn.back === 'bag') back += '<rect x="138" y="112" width="30" height="36" rx="8" fill="#C0703F"/><rect x="143" y="120" width="20" height="10" rx="3" fill="#A55B2F"/>';
    if(worn.neck === 'scarf') front += '<path d="M58 132 Q100 150 142 132 L142 144 Q100 162 58 144 Z" fill="#C2463A"/><path d="M122 146 L132 176 L118 174 L112 150 Z" fill="#A93A30"/>';
    if(worn.face === 'glasses') front += '<circle cx="82" cy="101" r="12" fill="none" stroke="#2A2522" stroke-width="2.5"/><circle cx="118" cy="101" r="12" fill="none" stroke="#2A2522" stroke-width="2.5"/><path d="M94 101 h12" stroke="#2A2522" stroke-width="2.5"/>';
    if(worn.head === 'hat') head = '<ellipse cx="100" cy="68" rx="24" ry="14" fill="#D2553F"/><path d="M100 56 l-8 -8 m8 8 l0 -11 m0 11 l8 -8" stroke="#3F8F4B" stroke-width="4" stroke-linecap="round"/>';
    if(worn.head === 'phones') head = '<path d="M46 108 Q46 52 100 50 Q154 52 154 108" fill="none" stroke="#33485A" stroke-width="7"/><rect x="36" y="96" width="18" height="30" rx="7" fill="#33485A"/><rect x="146" y="96" width="18" height="30" rx="7" fill="#33485A"/>';
    let plume = worn.head === 'hat' ? '' : '<path d="M101 72 C 97 56, 86 46, 92 33 C 103 40, 107 57, 104 72 Z" fill="#3A2A20"/>';
    return '<svg class="pet-svg mood-' + m + '" viewBox="0 0 200 200" aria-hidden="true">' +
      '<ellipse cx="100" cy="182" rx="52" ry="8" fill="rgba(0,0,0,.14)"/>' +
      '<g class="bodyg">' + back +
      '<path d="M84 168 v12 M78 180 h12 M116 168 v12 M110 180 h12" stroke="#D08A2E" stroke-width="4" stroke-linecap="round"/>' +
      '<ellipse cx="100" cy="122" rx="63" ry="54" fill="#9C6B47"/>' +
      '<ellipse cx="100" cy="140" rx="41" ry="32" fill="#E8D3B5"/>' +
      '<path d="M62 122 q6 -4 12 0 M58 138 q6 -4 12 0 M130 124 q6 -4 12 0 M132 140 q6 -4 12 0" stroke="#6E4A30" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M86 146 l4 3 M100 150 l4 3 M112 144 l4 3 M92 160 l4 3 M108 160 l4 3" stroke="#B89A76" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M66 90 Q100 76 134 90" fill="none" stroke="#F4EBDD" stroke-width="5" stroke-linecap="round"/>' +
      plume + eyes +
      '<path d="M94 110 L106 110 L100 119 Z" fill="#D9A21B"/>' + front + head +
      '</g></svg>';
}

export const IC = {
    group:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="8" r="3"/><circle cx="5" cy="10" r="2.2"/><circle cx="19" cy="10" r="2.2"/><path d="M6.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M1.8 18c.2-2 1.5-3.3 3.4-3.6M22.2 18c-.2-2-1.5-3.3-3.4-3.6"/></svg>',
    tools:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6.5a3.5 3.5 0 0 0 4.6 4.3L20 12l-8 8-2.5-2.5 8-8M4 4l6 6M3 7l4-4M10.5 13.5 5 19l-1.5-.2L3.3 17.3 3 16l5.5-5.5"/></svg>',
    home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20h-5v-5.5H9V20H4z"/></svg>',
    task:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4.5" width="14" height="16" rx="2.5"/><path d="M9 3.5h6v3H9zM9 13l2 2 4-4.5"/></svg>',
    gantt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 3v18h17"/><rect x="7" y="6" width="7" height="3" rx="1"/><rect x="10" y="11" width="8" height="3" rx="1"/><rect x="13" y="16" width="6" height="3" rx="1"/></svg>',
    gear:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    play:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
    check:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };
