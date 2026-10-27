'use client';

import type { Chart, ChartConfiguration } from 'chart.js';
import { useEffect, useRef, useState } from 'react';
import { useReport } from '../ReportContext';
import { NA } from './primitives';

export type ThemeKey = 'light' | 'dark';

export function chartPalette(theme: string) {
  const dark = theme === 'dark';
  return {
    s1: dark ? '#3987e5' : '#2a78d6',
    s2: dark ? '#d95926' : '#eb6834',
    s3: dark ? '#199e70' : '#1baf7a',
    accent: dark ? '#3987e5' : '#2a78d6',
    neutral: dark ? '#8f8e86' : '#8a8983',
    text: dark ? '#f0efec' : '#0b0b0b',
    text2: dark ? '#c3c2b7' : '#52514e',
    border: dark ? '#33322f' : '#e2e1dc',
    surface: dark ? '#1a1a19' : '#fcfcfb',
    bg: dark ? '#111110' : '#f5f5f3',
    good: dark ? '#5fd38a' : '#0a7d36',
    bad: dark ? '#ff8a8a' : '#b4232a',
  };
}

export function ChartBox({
  config,
  variant,
  themeKey,
}: {
  config: ChartConfiguration;
  variant?: 'tall' | 'short';
  themeKey: string;
}) {
  const { t } = useReport();
  const ref = useRef<HTMLCanvasElement>(null);
  const cfgRef = useRef(config);
  cfgRef.current = config;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let chart: Chart | null = null;
    let cancelled = false;

    (async () => {
      try {
        const mod = await import('chart.js/auto');
        if (cancelled || !ref.current) return;
        const Ctor = mod.default;
        const p = chartPalette(themeKey);
        Ctor.defaults.font.family = getComputedStyle(document.body).fontFamily;
        Ctor.defaults.font.size = 11.5;
        Ctor.defaults.color = p.text2;
        Ctor.defaults.borderColor = p.border;
        Ctor.defaults.plugins.tooltip.backgroundColor = p.text;
        Ctor.defaults.plugins.tooltip.titleColor = p.bg;
        Ctor.defaults.plugins.tooltip.bodyColor = p.bg;
        Ctor.defaults.plugins.tooltip.padding = 9;
        Ctor.defaults.plugins.tooltip.cornerRadius = 8;
        Ctor.defaults.plugins.legend.labels.boxWidth = 10;
        Ctor.defaults.plugins.legend.labels.boxHeight = 10;
        Ctor.defaults.maintainAspectRatio = false;
        chart = new Ctor(ref.current, cfgRef.current);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      chart?.destroy();
    };
  }, [themeKey]);

  if (failed) return <NA text={t.ui.misc.chartError} />;

  return (
    <div className={`chart-box${variant ? ' ' + variant : ''}`}>
      <canvas ref={ref} role="img" />
    </div>
  );
}
