// scripts/audit-contrast.mjs  →  node scripts/audit-contrast.mjs
const lin = (c) => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const DARK = {
  canvas: [15, 16, 19], surface: [21, 23, 27], interactive: [34, 38, 44],
  primary: [245, 246, 248], secondary: [186, 192, 201], tertiary: [150, 158, 170],
  accent: [184, 149, 84], ok: [82, 158, 112], bad: [198, 95, 88], warn: [197, 150, 66],
};
const LIGHT = {
  canvas: [250, 249, 247], surface: [255, 255, 254], interactive: [243, 242, 239],
  primary: [24, 26, 30], secondary: [78, 84, 93], tertiary: [108, 115, 125],
  accent: [154, 122, 64], ok: [82, 158, 112], bad: [198, 95, 88], warn: [197, 150, 66],
};

const CHECKS = [
  ["body text on canvas",      "primary",   "canvas",      4.5],
  ["secondary on canvas",      "secondary", "canvas",      4.5],
  ["tertiary (labels) canvas", "tertiary",  "canvas",      3.0],
  ["secondary on surface",     "secondary", "surface",     4.5],
  ["secondary on interactive", "secondary", "interactive", 4.5],
  ["accent text on canvas",    "accent",    "canvas",      3.0],
  ["success on surface",       "ok",        "surface",     3.0],
  ["error on surface",         "bad",       "surface",     3.0],
  ["warning on surface",       "warn",      "surface",     3.0],
];

let failed = 0;
for (const [name, theme] of [["dark", DARK], ["light", LIGHT]]) {
  console.log(`\n── ${name.toUpperCase()} ──`);
  for (const [label, fg, bg, min] of CHECKS) {
    const r = ratio(theme[fg], theme[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${r.toFixed(2)}:1  (min ${min})  ${label}`);
  }
}
console.log(failed ? `\n${failed} contrast failure(s).` : "\nAll contrast checks pass.");
process.exit(failed ? 1 : 0);
