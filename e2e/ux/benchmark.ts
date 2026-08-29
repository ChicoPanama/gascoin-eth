import { expect, type Page } from '@playwright/test';

export type JourneyMetric = {
  journey: string;
  startedAt: number;
  completedAt?: number;
  actions: number;
  screens: number;
  modals: number;
  walletPrompts: number;
  scrollPx: number;
  visualAcknowledgementMs?: number;
  notes: string[];
};

export type JourneyScoreInput = {
  actionEfficiency: number;
  perceivedSpeed: number;
  cognitiveLoad: number;
  mobileErgonomics: number;
  stateClarity: number;
  recovery: number;
  accessibility: number;
};

export function beginJourney(journey: string): JourneyMetric {
  return {
    journey,
    startedAt: performance.now(),
    actions: 0,
    screens: 1,
    modals: 0,
    walletPrompts: 0,
    scrollPx: 0,
    notes: [],
  };
}

export function action(metric: JourneyMetric, count = 1) {
  metric.actions += count;
}

export function screen(metric: JourneyMetric, count = 1) {
  metric.screens += count;
}

export function modal(metric: JourneyMetric, count = 1) {
  metric.modals += count;
}

export function walletPrompt(metric: JourneyMetric, count = 1) {
  metric.walletPrompts += count;
}

export function note(metric: JourneyMetric, value: string) {
  metric.notes.push(value);
}

export async function measureVisualAcknowledgement(
  page: Page,
  trigger: () => Promise<void>,
  acknowledged: () => Promise<boolean>,
  timeoutMs = 1500,
) {
  const start = performance.now();
  await trigger();

  await expect
    .poll(acknowledged, { timeout: timeoutMs, intervals: [16, 32, 50, 100] })
    .toBe(true);

  return performance.now() - start;
}

export function completeJourney(metric: JourneyMetric) {
  metric.completedAt = performance.now();
  return {
    ...metric,
    elapsedMs: metric.completedAt - metric.startedAt,
  };
}

export function scoreJourney(input: JourneyScoreInput) {
  const score =
    input.actionEfficiency * 0.25 +
    input.perceivedSpeed * 0.2 +
    input.cognitiveLoad * 0.15 +
    input.mobileErgonomics * 0.15 +
    input.stateClarity * 0.1 +
    input.recovery * 0.1 +
    input.accessibility * 0.05;

  return Math.round(score * 100) / 100;
}

export async function captureViewportFacts(page: Page) {
  return page.evaluate(() => ({
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    scroll: {
      x: window.scrollX,
      y: window.scrollY,
      documentHeight: document.documentElement.scrollHeight,
    },
    activeElement: document.activeElement?.getAttribute('aria-label') ||
      document.activeElement?.getAttribute('name') ||
      document.activeElement?.tagName || null,
  }));
}

export async function captureElementFacts(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return {
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute('role'),
      ariaLabel: element.getAttribute('aria-label'),
      text: element.textContent?.trim().slice(0, 200) || '',
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      padding: style.padding,
      gap: style.gap,
      borderRadius: style.borderRadius,
      opacity: style.opacity,
      position: style.position,
      zIndex: style.zIndex,
    };
  });
}
