// 붙여넣은 페이지 글을 번호 순서대로 찾아 문답으로 나눕니다.
function parseCatechism(raw, total = 107) {
  const text = String(raw || '').replace(/\r/g, '').replace(/[\u00a0\u3000\u2003]/g, ' ');
  const marks = [];
  let pos = 0;
  for (let n = 1; n <= total; n++) {
    const re = new RegExp(`(^|[\\s*])${n}\\s*\\.\\s+`, 'gm');
    re.lastIndex = pos;
    let m;
    while ((m = re.exec(text))) {
      const end = m.index + m[0].length;
      const q = text.indexOf('?', end);
      if (q !== -1 && q - end <= 250) {
        marks.push({ n, start: m.index, end });
        pos = end;
        break;
      }
    }
  }
  const clean = s => s.replace(/\*+/g, '').replace(/\s+/g, ' ').replace(/\.{2,}/g, '.').trim();
  const items = marks.map((mark, i) => {
    let seg = text.slice(mark.end, i + 1 < marks.length ? marks[i + 1].start : text.length);
    const cut = seg.indexOf('?');
    let answer = seg.slice(cut + 1).replace(/^[\s*]+/, '');
    if (i + 1 === marks.length) answer = answer.split('\n')[0];
    return { n: mark.n, q: clean(seg.slice(0, cut + 1)), a: clean(answer) };
  }).filter(it => it.q && it.a);
  const found = new Set(items.map(it => it.n));
  const missing = [];
  for (let n = 1; n <= total; n++) if (!found.has(n)) missing.push(n);
  return { items, missing };
}
if (typeof module !== 'undefined') module.exports = { parseCatechism };
