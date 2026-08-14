import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    args[key] = value;
  }
  return args;
}

function parseViewport(value = '390x844') {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) throw new Error(`Invalid --viewport ${value}; expected WIDTHxHEIGHT`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

function safeSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

const args = parseArgs(process.argv);
if (!args.url) {
  console.error('Usage: node scripts/ux-harvest.mjs --url https://example.com [--slug example] [--viewport 390x844] [--out ux-research/captures] [--headed]');
  process.exit(1);
}

const viewport = parseViewport(args.viewport);
const slug = safeSlug(args.slug || new URL(args.url).hostname);
const outDir = path.resolve(args.out || 'ux-research/captures');
const headed = args.headed === 'true';
const capturedAt = new Date().toISOString();
const stamp = capturedAt.replace(/[:.]/g, '-');
const base = `${slug}-${viewport.width}x${viewport.height}-${stamp}`;

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: !headed });
const context = await browser.newContext({ viewport });
const page = await context.newPage();

const started = performance.now();
const response = await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
const domContentLoadedMs = performance.now() - started;

let networkIdleMs = null;
try {
  const networkIdleStarted = performance.now();
  await page.waitForLoadState('networkidle', { timeout: 10_000 });
  networkIdleMs = performance.now() - networkIdleStarted;
} catch {
  // Many modern apps intentionally keep sockets open; networkidle is optional evidence.
}

const screenshotPath = path.join(outDir, `${base}.png`);
await page.screenshot({ path: screenshotPath, fullPage: true });

const snapshot = await page.evaluate(() => {
  const px = (value) => {
    const parsed = Number.parseFloat(value || '');
    return Number.isFinite(parsed) ? parsed : null;
  };

  const describe = (el, index) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);

    return {
      index,
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role'),
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      ariaLabel: el.getAttribute('aria-label'),
      ariaExpanded: el.getAttribute('aria-expanded'),
      href: el instanceof HTMLAnchorElement ? el.href : null,
      text,
      rect: {
        x: Math.round(rect.x * 100) / 100,
        y: Math.round(rect.y * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
      },
      visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
      style: {
        display: style.display,
        position: style.position,
        fontFamily: style.fontFamily,
        fontSizePx: px(style.fontSize),
        fontWeight: style.fontWeight,
        lineHeightPx: px(style.lineHeight),
        paddingTopPx: px(style.paddingTop),
        paddingRightPx: px(style.paddingRight),
        paddingBottomPx: px(style.paddingBottom),
        paddingLeftPx: px(style.paddingLeft),
        gapPx: px(style.gap),
        borderRadius: style.borderRadius,
        opacity: style.opacity,
        zIndex: style.zIndex,
        cursor: style.cursor,
      },
    };
  };

  const interactiveSelector = [
    'button', 'a[href]', 'input', 'select', 'textarea',
    '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const interactives = Array.from(document.querySelectorAll(interactiveSelector))
    .slice(0, 1000)
    .map(describe);

  const landmarks = ['header','nav','main','aside','footer','form','section']
    .flatMap((tag) => Array.from(document.querySelectorAll(tag)).slice(0, 100).map((el, index) => ({ tag, ...describe(el, index) })));

  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
    .slice(0, 250)
    .map((el, index) => ({ level: Number(el.tagName.slice(1)), ...describe(el, index) }));

  const nav = performance.getEntriesByType('navigation')[0];

  return {
    document: {
      title: document.title,
      url: location.href,
      language: document.documentElement.lang || null,
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    },
    viewport: {
      width: innerWidth,
      height: innerHeight,
      devicePixelRatio,
      scrollX,
      scrollY,
    },
    counts: {
      interactives: interactives.length,
      headings: headings.length,
      landmarks: landmarks.length,
    },
    navigationTiming: nav ? {
      domInteractiveMs: nav.domInteractive,
      domContentLoadedMs: nav.domContentLoadedEventEnd,
      loadEventMs: nav.loadEventEnd,
      transferSize: nav.transferSize,
      encodedBodySize: nav.encodedBodySize,
      decodedBodySize: nav.decodedBodySize,
    } : null,
    interactives,
    headings,
    landmarks,
  };
});

const result = {
  schemaVersion: 1,
  capturedAt,
  requestedUrl: args.url,
  finalUrl: page.url(),
  httpStatus: response?.status() ?? null,
  viewport,
  timings: { domContentLoadedMs, networkIdleMs },
  screenshot: path.relative(process.cwd(), screenshotPath),
  snapshot,
};

const jsonPath = path.join(outDir, `${base}.json`);
await fs.writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ jsonPath, screenshotPath, httpStatus: result.httpStatus, interactives: snapshot.counts.interactives }, null, 2));
await browser.close();
