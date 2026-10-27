'use client';

import type { Dict } from '@/lib/i18n';
import type { HarMode } from './ReportContext';
import { useState } from 'react';

export function UploadScreen({
  t,
  mode,
  onMode,
  onFiles,
  onDemo,
}: {
  t: Dict;
  mode: HarMode;
  onMode: (mode: HarMode) => void;
  onFiles: (files: File[]) => void;
  onDemo: () => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <>
      <div className="mode-switch" role="radiogroup" aria-label={t.ui.chooseMode}>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'owned'}
          className={`mode-opt${mode === 'owned' ? ' active' : ''}`}
          onClick={() => onMode('owned')}
        >
          <span className="mode-title">🔐 {t.ui.modeOwned}</span>
          <span className="mode-desc">{t.ui.modeOwnedDesc}</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'osint'}
          className={`mode-opt${mode === 'osint' ? ' active' : ''}`}
          onClick={() => onMode('osint')}
        >
          <span className="mode-title">🌐 {t.ui.modeOsint}</span>
          <span className="mode-desc">{t.ui.modeOsintDesc}</span>
        </button>
      </div>
      <p className="hint" style={{ textAlign: 'center', margin: '8px 0 0' }}>
        {mode === 'owned' ? t.ui.modeHintOwned : t.ui.modeHintOsint}
      </p>
      <label
        className={`drop${over ? ' over' : ''}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onFiles([...e.dataTransfer.files]);
        }}
      >
        <div className="big">📂</div>
        <h1>{t.ui.uploadTitle}</h1>
        <p>{t.ui.uploadSub}</p>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>{t.ui.uploadPrivacy}</p>
        <input
          type="file"
          accept=".har,application/json"
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            if (files.length) onFiles(files);
          }}
        />
      </label>

      <div style={{ margin: '-10px 0 26px', textAlign: 'center' }}>
        <button type="button" className="btn" onClick={onDemo}>
          {t.ui.tryDemo}
        </button>
        <p className="hint" style={{ marginTop: 6 }}>
          {t.ui.demoNote}
        </p>
      </div>

      <div className="howto">
        <h2>{t.ui.howToTitle}</h2>
        <ol>
          {t.ui.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </>
  );
}
