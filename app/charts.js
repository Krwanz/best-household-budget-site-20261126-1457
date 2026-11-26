/* Marlowe Budget — charts.
   One job: turn category totals into small inline SVG charts (donut and
   horizontal bars). No libraries, no network: pure SVG strings. */

'use strict';

/* Donut: segments drawn as stroked circle arcs. Returns an SVG string. */
function donutSVG(parts, size) {
  const total = parts.reduce(function (sum, p) { return sum + p.value; }, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  let offset = 0;
  const circles = parts.filter(function (p) { return p.value > 0; }).map(function (p) {
    const frac = total > 0 ? p.value / total : 0;
    const dash = frac * circumference;
    const gap = circumference - dash;
    const svg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="none" stroke="' + p.color + '" stroke-width="34" stroke-dasharray="' + dash.toFixed(2) + ' ' + gap.toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" />';
    offset += dash;
    return svg;
  }).join('');
  const hole = '<circle cx="' + cx + '" cy="' + cy + '" r="52" fill="#fff" />' +
    '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="15" fill="#5c6f63">Spent so far</text>' +
    '<text x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle" font-size="21" font-weight="800" fill="#1c2b22">' + money0(total) + '</text>';
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="presentation">' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" fill="none" stroke="#e7edea" stroke-width="34" />' +
    circles + hole + '</svg>';
}

/* Horizontal comparison bars: one row per category, planned vs actual. */
function planBarsHTML(rows) {
  return rows.map(function (row) {
    const pct = row.planned > 0 ? Math.min(100, Math.round((row.actual / row.planned) * 100)) : 0;
    const cls = row.actual > row.planned ? 'over' : (pct >= 85 ? 'near' : '');
    const overNote = row.actual > row.planned
      ? '<span class="over">' + money(row.actual) + ' of ' + money(row.planned) + ' — over</span>'
      : '<span>' + money(row.actual) + ' of ' + money(row.planned) + '</span>';
    return '<div class="plan-bar"><div class="bar-head"><span>' + row.name + '</span>' + overNote + '</div>' +
      '<div class="bar-track"><div class="bar-fill ' + cls + '" style="width:' + pct + '%"></div></div></div>';
  }).join('');
}
