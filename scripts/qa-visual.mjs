// node scripts/qa-visual.mjs      (dev server must be running)
// QA_REDUCED=1 node scripts/qa-visual.mjs   → reduced-motion pass
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.QA_BASE ?? 'http://localhost:5173';
const ROUTES = [
  '/', '/welcome', '/login', '/signup', '/onboarding', '/app/dashboard', '/app/learn',
  '/app/practice', '/app/revision', '/app/formulas', '/app/flashcards', '/app/anatomy',
  '/app/planner', '/app/focus', '/app/notes', '/app/search', '/app/profile', '/app/settings',
  '/app/progress', '/app/exams',
];
const WIDTHS = [360, 390, 768, 1024, 1280, 1440];

fs.mkdirSync('qa', { recursive: true });
const browser = await chromium.launch();
const problems = [];

for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: w < 768 ? 780 : 900 },
    deviceScaleFactor: 2,
    reducedMotion: process.env.QA_REDUCED ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));

  for (const route of ROUTES) {
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(400);

      const overflow = await page.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const bad = [];
        document.querySelectorAll('*').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > docW + 1 || r.left < -1)) {
            bad.push(el.tagName + '.' + String(el.className || '').slice(0, 60));
          }
        });
        return { scrollW: document.documentElement.scrollWidth, docW, bad: bad.slice(0, 8) };
      });
      if (overflow.scrollW > overflow.docW + 1) problems.push({ route, w, type: 'overflow', ...overflow });

      if (w <= 430) {
        const small = await page.evaluate(() => {
          const out = [];
          document.querySelectorAll('a,button,[role="button"],input,select').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44)) {
              out.push(`${el.tagName} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || '').trim().slice(0, 24)}"`);
            }
          });
          return out.slice(0, 10);
        });
        if (small.length) problems.push({ route, w, type: 'tap-target', small });
      }

      await page.screenshot({
        path: `qa/${w}${route.replace(/\//g, '_') || '_root'}.png`,
        fullPage: true,
      });
    } catch (e) {
      problems.push({ route, w, type: 'load-error', message: String(e).slice(0, 200) });
    }
  }

  if (consoleErrors.length) problems.push({ w, type: 'console', consoleErrors: consoleErrors.slice(0, 10) });
  await ctx.close();
}

await browser.close();
fs.writeFileSync('qa/report.json', JSON.stringify(problems, null, 2));
console.log(`Findings: ${problems.length} — see qa/report.json`);
