'use client';

import type { DistItem } from '@/lib/core/types';
import type { ReactNode } from 'react';
import { useReport } from '../ReportContext';

/* ------------------------------------------------------------------ */
/* Rich text: only <b>/<i> are interpreted, everything else is escaped */
/* ------------------------------------------------------------------ */

export function Rich({ text }: { text: string }) {
  const parts = text.split(/(<\/?b>|<\/?i>)/g);
  const nodes: ReactNode[] = [];
  let bold = 0;
  let italic = 0;

  parts.forEach((part, i) => {
    if (part === '<b>') {
      bold++;
      return;
    }
    if (part === '</b>') {
      bold = Math.max(0, bold - 1);
      return;
    }
    if (part === '<i>') {
      italic++;
      return;
    }
    if (part === '</i>') {
      italic = Math.max(0, italic - 1);
      return;
    }
    if (!part) return;
    nodes.push(
      <span key={i} style={{ fontWeight: bold ? 700 : undefined, fontStyle: italic ? 'italic' : undefined }}>
        {part}
      </span>,
    );
  });

  return <>{nodes}</>;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Section({
  id,
  n,
  title,
  sub,
  children,
}: {
  id: string;
  n: number;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  const { mode } = useReport();
  return (
    <section className="block" id={id}>
      <h2>
        {mode === 'owned' ? <span className="num">{n}</span> : null}
        {title}
      </h2>
      {sub ? (
        <p className="sub">
          <Rich text={sub} />
        </p>
      ) : null}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="kpi">
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      {sub ? <div className="s">{sub}</div> : null}
    </div>
  );
}

export function NA({ text }: { text?: string }) {
  const { t } = useReport();
  return <span className="na">{text ?? t.ui.na}</span>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="hint">{children}</p>;
}

export function LevelBadge({ level }: { level: { key: 'low' | 'avg' | 'good' | 'great' } | null }) {
  const { t } = useReport();
  if (!level) return <span className="badge b-na">{t.ui.naShort}</span>;
  const icon = { low: '▼', avg: '●', good: '▲', great: '★' }[level.key];
  return (
    <span className={`badge b-${level.key}`}>
      {icon} {t.ui.er.level[level.key]}
    </span>
  );
}

export function SourceBadge({ src }: { src: 'ins' | 'pub' }) {
  const { t } = useReport();
  if (src === 'ins')
    return (
      <span className="badge b-great" title={t.ui.audience.sourceIns}>
        {t.ui.audience.sourceIns}
      </span>
    );
  return (
    <span className="badge b-est" title={t.ui.audience.sourcePub}>
      {t.ui.audience.sourcePub}
    </span>
  );
}

export function Card({
  title,
  src,
  children,
  className = '',
  actions,
}: {
  title: ReactNode;
  src?: 'ins' | 'pub';
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={`card ${className}`}>
      <div className="ah">
        <h3>{title}</h3>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {actions}
          {src ? <SourceBadge src={src} /> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Distributions                                                       */
/* ------------------------------------------------------------------ */

export function DistBars({
  items,
  limit = 8,
  raw = false,
  color,
  label,
}: {
  items: DistItem[] | null | undefined;
  limit?: number;
  raw?: boolean;
  color?: string;
  label?: (v: string) => string;
}) {
  const { f } = useReport();
  if (!items || !items.length) return <NA />;

  const list = [...items].sort((a, b) => b.value - a.value).slice(0, limit);
  const total = items.reduce((s, x) => s + x.value, 0) || 1;
  const max = Math.max(...list.map((x) => x.value)) || 1;

  return (
    <div className="dist">
      {list.map((x) => (
        <div className="dr" key={x.label}>
          <span className="dlab" title={x.label}>
            {label ? label(x.label) : x.label}
          </span>
          <span className="db">
            <span style={{ width: `${((x.value / max) * 100).toFixed(1)}%`, background: color || 'var(--accent)' }} />
          </span>
          <span className="dv">
            {raw ? `${f.f0(x.value)} · ` : ''}
            {f.f0((x.value / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Heatmap                                                             */
/* ------------------------------------------------------------------ */

export function HeatGrid<T>({
  cells,
  value,
  label,
  tip,
  hourSuffix = true,
}: {
  cells: T[][];
  value: (cell: T) => number | null;
  label?: (cell: T, v: number) => ReactNode;
  tip: (cell: T, v: number) => string;
  hourSuffix?: boolean;
}) {
  const { t } = useReport();
  let max = 0;
  cells.forEach((r) =>
    r.forEach((c) => {
      const v = value(c);
      if (typeof v === 'number' && isFinite(v) && v > max) max = v;
    }),
  );

  return (
    <div className="heat">
      <div />
      {Array.from({ length: 24 }, (_, i) => (
        <div className="hl" key={`h${i}`}>
          {String(i).padStart(2, '0')}
        </div>
      ))}
      {cells.map((row, di) => (
        <div key={`row${di}`} style={{ display: 'contents' }}>
          <div className="dl">{t.ui.days[di].slice(0, 3)}</div>
          {row.map((cell, hi) => {
            const raw = value(cell);
            const v = typeof raw === 'number' && isFinite(raw) ? raw : null;
            if (v == null || (v <= 0 && !label)) return <div className="c" key={`c${di}-${hi}`} />;
            const a = max ? 0.12 + 0.88 * (v / max) : 0;
            const ink = a > 0.55 ? '#fff' : 'var(--text)';
            const when = `${t.ui.days[di]} ${String(hi).padStart(2, '0')}.00–${String(hi + 1).padStart(2, '0')}.00${
              hourSuffix ? ' WIB' : ''
            }`;
            return (
              <div
                className="c has"
                key={`c${di}-${hi}`}
                title={`${when}\n${tip(cell, v)}`}
                style={{ background: `rgba(var(--heat-rgb),${a.toFixed(2)})`, color: ink }}
              >
                {label ? label(cell, v) : ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function HeatLegend({ low, high }: { low: string; high: string }) {
  const { t } = useReport();
  return (
    <div className="heat-legend">
      <span>{low}</span>
      <span className="ramp" />
      <span>{high}</span>
      <span>· {t.ui.timing.empty}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function Chip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}

export function KeyValue({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="kv">
      <span>{label}</span>
      {value}
    </div>
  );
}

export function Duration({ seconds }: { seconds: number | null | undefined }) {
  const { t, f } = useReport();
  if (typeof seconds !== 'number' || !isFinite(seconds)) return <>–</>;
  const s = Math.round(seconds);
  if (s < 90) return <>{t.ui.durations.sec(String(s))}</>;
  if (s < 5400) return <>{t.ui.durations.min(f.f0(s / 60))}</>;
  if (s < 172800) return <>{t.ui.durations.hour(f.f1(s / 3600))}</>;
  return <>{t.ui.durations.day(f.f1(s / 86400))}</>;
}
