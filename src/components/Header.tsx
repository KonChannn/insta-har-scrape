'use client';

import type { AccountOption } from '@/lib/core/types';
import type { Dict, Locale } from '@/lib/i18n';
import { useRef } from 'react';

export function Header({
  t,
  accounts,
  account,
  onAccount,
  ready,
  hasComments,
  locale,
  onLocale,
  onTheme,
  onNew,
  onCsvPosts,
  onCsvComments,
  onCopy,
  onPdf,
}: {
  t: Dict;
  accounts: AccountOption[];
  account: string;
  onAccount: (value: string) => void;
  ready: boolean;
  hasComments: boolean;
  locale: Locale;
  onLocale: (value: Locale) => void;
  onTheme: () => void;
  onNew: () => void;
  onCsvPosts: () => void;
  onCsvComments: () => void;
  onCopy: () => void;
  onPdf: () => void;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => menuRef.current?.removeAttribute('open');

  return (
    <header className="top no-print">
      <div className="wrap">
        <div className="brand">
          <span className="dot" aria-hidden="true" />
          {t.ui.brand}
        </div>

        {ready && accounts.length > 1 ? (
          <select
            className="btn"
            value={account}
            onChange={(e) => onAccount(e.target.value)}
            title={t.ui.pickAccount}
            aria-label={t.ui.pickAccount}
          >
            {accounts.map((a) => (
              <option key={a.username} value={a.username}>
                @{a.username} ({a.posts})
              </option>
            ))}
          </select>
        ) : null}

        {ready ? (
          <>
            <button type="button" className="btn" onClick={onNew}>
              {t.ui.newFile}
            </button>

            <div className="actions-desktop">
              <button type="button" className="btn" onClick={onCsvPosts}>
                {t.ui.csvPosts}
              </button>
              <button type="button" className="btn" onClick={onCsvComments} disabled={!hasComments}>
                {t.ui.csvComments}
              </button>
              <button type="button" className="btn" onClick={onCopy} title={t.ui.copySummary}>
                {t.ui.copySummary}
              </button>
              <button type="button" className="btn primary" onClick={onPdf}>
                {t.ui.pdf}
              </button>
            </div>

            <details className="actions-mobile" ref={menuRef}>
              <summary className="btn" aria-label={t.ui.misc.actions}>
                ⋯
              </summary>
              <div className="menu">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    closeMenu();
                    onCsvPosts();
                  }}
                >
                  {t.ui.csvPosts}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!hasComments}
                  onClick={() => {
                    closeMenu();
                    onCsvComments();
                  }}
                >
                  {t.ui.csvComments}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    closeMenu();
                    onCopy();
                  }}
                >
                  {t.ui.copySummary}
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    closeMenu();
                    onPdf();
                  }}
                >
                  {t.ui.pdf}
                </button>
              </div>
            </details>
          </>
        ) : null}

        <select
          className="btn lang-select"
          value={locale}
          onChange={(e) => onLocale(e.target.value as Locale)}
          title={t.ui.language}
          aria-label={t.ui.language}
        >
          <option value="id">ID</option>
          <option value="en">EN</option>
        </select>

        <button type="button" className="btn" onClick={onTheme} title={t.ui.theme} aria-label={t.ui.theme}>
          ◐
        </button>
      </div>
    </header>
  );
}
