// tests/visual-qa.spec.ts
import { test, expect } from "@playwright/test";

const ROUTES = [
  "/", "/learn", "/learn/physics/laws-of-motion", "/practice", "/revision",
  "/ai", "/visual-lab", "/anatomy", "/formulas", "/notes", "/planner",
  "/progress", "/profile", "/settings", "/search", "/downloads", "/competitive",
];
const WIDTHS = [360, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1600];

for (const width of WIDTHS) {
  test.describe(`@${width}px`, () => {
    test.use({ viewport: { width, height: width < 500 ? 780 : 900 } });

    for (const route of ROUTES) {
      test(`no horizontal overflow — ${route}`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState("networkidle");

        const overflow = await page.evaluate(() => {
          const bad: string[] = [];
          document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1)) {
              bad.push(`${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 40)}`);
            }
          });
          return bad.slice(0, 5);
        });
        expect(overflow, `overflowing nodes on ${route}`).toEqual([]);

        // Tap targets must be >= 44px on touch widths
        if (width < 768) {
          const small = await page.evaluate(() => {
            const bad: string[] = [];
            document.querySelectorAll<HTMLElement>("a,button,[role=button],input,select").forEach((el) => {
              const r = el.getBoundingClientRect();
              if (r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 32)) {
                bad.push(`${el.tagName.toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)}`);
              }
            });
            return bad.slice(0, 5);
          });
          expect(small, `small tap targets on ${route}`).toEqual([]);
        }

        await page.screenshot({ path: `qa/${width}${route.replace(/\//g, "_")}.png`, fullPage: true });
      });
    }
  });
}

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("no ambient layers render", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-ambient]")).toHaveCount(0);
  });
});

test("keyboard: search, nav, practice answers reachable without a mouse", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Meta+k");
  await expect(page.getByRole("dialog", { name: /search/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/practice");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(["A", "BUTTON", "INPUT"]).toContain(focused);
});

test("skip link is the first tab stop", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /skip to content/i })).toBeFocused();
});

test("headings form a single valid outline per route", async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    const levels = await page.$$eval("h1,h2,h3,h4", (els) => els.map((e) => Number(e.tagName[1])));
    expect(levels.filter((l) => l === 1).length, `h1 count on ${route}`).toBe(1);
    levels.reduce((prev, cur) => { expect(cur - prev).toBeLessThanOrEqual(1); return cur; }, levels[0]);
  }
});
