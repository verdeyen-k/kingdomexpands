// Pictures of the pieces, drawn as SVG (100 x 100). White pieces are cream, black pieces are dark.
(function (root) {
  'use strict';
  const COL = {
    w: { fill: '#fff4dc', line: '#3a2c22', shade: '#e6cfa3', eye: '#3a2c22' },
    b: { fill: '#3b3552', line: '#120e1f', shade: '#6a6190', eye: '#ffd84a' },
  };
  const base = (k) => `<path d="M20 92 Q20 82 50 82 Q80 82 80 92 Z" fill="${k.shade}" stroke="${k.line}" stroke-width="4" stroke-linejoin="round"/>`;

  function draw(t, c) {
    const k = COL[c], f = k.fill, l = k.line, sh = k.shade;
    const S = `stroke="${l}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
    switch (t) {
      case 'P': return base(k) +
        `<path d="M32 84 Q34 62 44 56 L56 56 Q66 62 68 84 Z" fill="${f}" ${S}/>` +
        `<circle cx="50" cy="40" r="15" fill="${f}" ${S}/>`;
      case 'R': return base(k) +
        `<path d="M30 84 L34 46 L66 46 L70 84 Z" fill="${f}" ${S}/>` +
        `<path d="M26 46 L26 22 L36 22 L36 30 L45 30 L45 22 L55 22 L55 30 L64 30 L64 22 L74 22 L74 46 Z" fill="${f}" ${S}/>` +
        `<path d="M46 62 L46 54 Q50 50 54 54 L54 62 Z" fill="${sh}" ${S}/>`;
      case 'N': return base(k) +
        `<path d="M30 84 Q30 64 40 54 Q30 52 24 46 Q22 38 30 34 L38 30 Q38 20 46 16 L50 24 Q66 24 72 44 Q76 62 70 84 Z" fill="${f}" ${S}/>` +
        `<circle cx="42" cy="36" r="3.5" fill="${k.eye}"/>` +
        `<path d="M58 28 Q68 40 66 58" fill="none" stroke="${sh}" stroke-width="5" stroke-linecap="round"/>`;
      case 'B': return base(k) +
        `<path d="M34 84 Q36 70 42 66 L58 66 Q64 70 66 84 Z" fill="${f}" ${S}/>` +
        `<path d="M50 18 Q70 34 66 54 Q62 66 50 66 Q38 66 34 54 Q30 34 50 18 Z" fill="${f}" ${S}/>` +
        `<path d="M54 34 L46 46" ${S}/>` +
        `<circle cx="50" cy="14" r="5" fill="${f}" ${S}/>`;
      case 'Q': return base(k) +
        `<path d="M30 84 L22 34 L36 54 L42 26 L50 52 L58 26 L64 54 L78 34 L70 84 Z" fill="${f}" ${S}/>` +
        [22, 42, 58, 78].map((x, i) => `<circle cx="${x}" cy="${i === 0 || i === 3 ? 30 : 22}" r="5" fill="${f}" ${S}/>`).join('') +
        `<path d="M32 72 L68 72" ${S}/>`;
      case 'K': return base(k) +
        `<path d="M30 84 L26 46 Q50 36 74 46 L70 84 Z" fill="${f}" ${S}/>` +
        `<path d="M26 46 Q30 30 42 34 Q46 24 50 30 Q54 24 58 34 Q70 30 74 46" fill="${f}" ${S}/>` +
        `<path d="M50 8 L50 26 M42 15 L58 15" ${S} stroke-width="6"/>` +
        `<path d="M32 72 L68 72" ${S}/>`;
      case 'O': // the pope looks like a cairn: a pile of stones
        return base(k) +
          `<ellipse cx="50" cy="74" rx="28" ry="9" fill="${f}" ${S}/>` +
          `<ellipse cx="48" cy="57" rx="22" ry="8" fill="${f}" ${S}/>` +
          `<ellipse cx="52" cy="41" rx="16" ry="7" fill="${f}" ${S}/>` +
          `<ellipse cx="49" cy="27" rx="10" ry="6" fill="${f}" ${S}/>` +
          `<ellipse cx="50" cy="15" rx="5" ry="4" fill="${f}" ${S}/>` +
          `<path d="M36 72 Q42 69 46 72 M56 55 Q60 52 64 55" fill="none" stroke="${sh}" stroke-width="3" stroke-linecap="round"/>`;
      case 'A': // archer witch: witch hat, cloak and a bow
        return base(k) +
          `<path d="M30 84 Q34 58 50 50 Q66 58 70 84 Z" fill="${f}" ${S}/>` +
          `<circle cx="50" cy="44" r="11" fill="${f}" ${S}/>` +
          `<path d="M26 36 Q50 28 74 36 Q50 40 26 36 Z" fill="${sh}" ${S}/>` +
          `<path d="M36 34 L54 6 Q56 18 64 34 Z" fill="${sh}" ${S}/>` +
          `<circle cx="46" cy="45" r="2.2" fill="${k.eye}"/><circle cx="54" cy="45" r="2.2" fill="${k.eye}"/>` +
          `<path d="M76 40 Q90 60 76 80" fill="none" ${S} stroke-width="5"/>` +
          `<path d="M76 40 L76 80" stroke="${l}" stroke-width="2"/>` +
          `<path d="M58 60 L88 60 M84 55 L89 60 L84 65" fill="none" ${S} stroke-width="3"/>`;
      case 'C': // crow: a sleek bird with a pointy beak
        return base(k) +
          `<path d="M28 76 Q22 54 38 42 Q44 30 56 30 Q64 30 68 38 L84 42 L68 46 Q70 60 60 70 L46 78 L22 84 Z" fill="${f}" ${S}/>` +
          `<path d="M36 58 Q48 52 58 62" fill="none" stroke="${sh}" stroke-width="4" stroke-linecap="round"/>` +
          `<circle cx="58" cy="38" r="3.5" fill="${k.eye}"/>` +
          `<path d="M44 78 L42 84 M52 76 L52 84" ${S} stroke-width="3"/>`;
      case 'V': // raven: a bigger, shaggy bird with a thick beak and a wing up
        return base(k) +
          `<path d="M24 80 Q18 56 34 42 Q40 26 56 24 Q66 24 70 32 L88 40 L70 46 Q74 66 60 74 L22 84 Z" fill="${f}" ${S}/>` +
          `<path d="M60 48 L66 56 L58 56 L62 64 L54 62" fill="none" stroke="${sh}" stroke-width="3" stroke-linejoin="round"/>` +
          `<path d="M30 50 Q40 14 56 18 Q50 30 52 50 Z" fill="${sh}" ${S}/>` +
          `<circle cx="60" cy="33" r="3.5" fill="${k.eye}"/>` +
          `<path d="M42 80 L40 86 M52 78 L52 86" ${S} stroke-width="3"/>`;
      case 'T': // thief: hood, eye mask and a sack of loot
        return base(k) +
          `<path d="M28 84 Q30 54 50 48 Q70 54 72 84 Z" fill="${f}" ${S}/>` +
          `<path d="M30 46 Q30 14 50 12 Q70 14 70 46 Q60 54 50 54 Q40 54 30 46 Z" fill="${sh}" ${S}/>` +
          `<circle cx="50" cy="36" r="13" fill="${f}" ${S}/>` +
          `<path d="M35 32 Q50 26 65 32 L65 38 Q50 34 35 38 Z" fill="${l}"/>` +
          `<circle cx="44" cy="35" r="2.2" fill="${f}"/><circle cx="56" cy="35" r="2.2" fill="${f}"/>` +
          `<path d="M66 64 Q86 58 84 78 Q80 88 68 84 Q60 74 66 64 Z" fill="${sh}" ${S}/>` +
          `<path d="M70 62 L74 56" ${S} stroke-width="3"/>`;
    }
    return '';
  }

  const cache = {};
  root.KEPieces = {
    svg(t, c) {
      const key = t + c;
      if (!cache[key]) cache[key] = `<svg viewBox="0 0 100 100" aria-hidden="true">${draw(t, c)}</svg>`;
      return cache[key];
    },
  };
})(this);
