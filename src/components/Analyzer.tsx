'use client';

import { Header } from '@/components/Header';
import { ReportContext, type HarMode } from '@/components/ReportContext';
import { Dashboard } from '@/components/report/Dashboard';
import { UploadScreen } from '@/components/UploadScreen';
import { copyText } from '@/lib/clipboard';
import { accountsIn, analyze, createStore, ingestHar, makeSnapshot } from '@/lib/core';
import type { AccountOption, Analysis, Snapshot, Store } from '@/lib/core/types';
import { isNum } from '@/lib/core/util';
import { buildCtx, dict, makeFormatters, type Locale } from '@/lib/i18n';
import { loadSnapshots, saveSnapshots, upsertSnapshot } from '@/lib/snapshots';
import { buildSummary, commentsCsv, download, postsCsv } from '@/lib/summary';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const THEME_KEY = 'igHarAnalyzer.theme';
const LOCALE_KEY = 'igHarAnalyzer.locale';
const MODE_KEY = 'igHarAnalyzer.mode';

type Phase = 'idle' | 'loading' | 'ready';

export default function Analyzer() {
  const [locale, setLocale] = useState<Locale>('id');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');
  const [mode, setMode] = useState<HarMode>('owned');

  const [phase, setPhase] = useState<Phase>('idle');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [account, setAccount] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const storeRef = useRef<Store | null>(null);
  const snapsRef = useRef<Snapshot[]>([]);
  const snapsPromise = useRef<Promise<Snapshot[]> | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const t = dict[locale];
  const f = useMemo(() => makeFormatters(locale), [locale]);

  const toast = useCallback((message: string) => {
    setToastMsg(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 2800);
  }, []);

  /* ---------------- persistence ---------------- */

  const ensureSnaps = useCallback(() => {
    if (!snapsPromise.current) {
      snapsPromise.current = loadSnapshots().then((snaps) => {
        snapsRef.current = snaps;
        return snaps;
      });
    }
    return snapsPromise.current;
  }, []);

  useEffect(() => {
    void ensureSnaps();
  }, [ensureSnaps]);

  /* ---------------- theme ---------------- */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const next: 'light' | 'dark' = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
      setResolved(next);
      if (theme === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', theme);
    };
    apply();
    const onChange = () => {
      if (theme === 'system') apply();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const toggleTheme = () => {
    const next = resolved === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  };

  /* ---------------- locale ---------------- */

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_KEY);
      if (saved === 'id' || saved === 'en') setLocale(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === 'owned' || saved === 'osint') setMode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const changeMode = (next: HarMode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  /* ---------------- analysis ---------------- */

  const ctxFor = (acct: string, loc: Locale) => {
    const store = storeRef.current;
    const prof = store?.profiles.get(acct);
    const followers = prof && isNum(prof.followers) ? prof.followers : null;
    return buildCtx(dict[loc], makeFormatters(loc), followers);
  };

  const runAnalysis = (acct: string, loc: Locale = locale) => {
    const store = storeRef.current;
    if (!store) return;

    const ctx = ctxFor(acct, loc);
    let snaps = snapsRef.current;

    // Analyze once to build a snapshot, then again so Growth includes it.
    const pre = analyze(store, acct, snaps, ctx);
    if (pre.posts.length || pre.followers != null) {
      const snap = makeSnapshot(pre);
      snaps = upsertSnapshot(snaps, snap);
      snapsRef.current = snaps;
      void saveSnapshots(snaps).then((ok) => {
        if (!ok) toast(dict[loc].ui.misc.snapshotFail);
      });
    }

    setAnalysis(analyze(store, acct, snaps, ctx));
    setPhase('ready');
    window.scrollTo(0, 0);
  };

  const updateSnaps = (next: Snapshot[]) => {
    snapsRef.current = next;
    void saveSnapshots(next).then((ok) => {
      if (!ok) toast(t.ui.misc.snapshotFail);
    });
    const store = storeRef.current;
    if (store && analysis) {
      setAnalysis(analyze(store, analysis.account, next, ctxFor(analysis.account, locale)));
    }
  };

  const handleFiles = async (files: File[]) => {
    const ok = files.filter((file) => /\.(har|json)$/i.test(file.name) || file.type.includes('json'));
    if (!ok.length) {
      toast(t.ui.misc.selectHar);
      return;
    }

    setPhase('loading');
    setLoadingMsg(t.ui.loadingN(ok.length));
    await new Promise((r) => setTimeout(r, 30));
    await ensureSnaps();

    const store = createStore();
    const errors: string[] = [];
    for (const file of ok) {
      try {
        const har = JSON.parse(await file.text());
        ingestHar(store, har, file.name);
        // Drop the parsed HAR immediately; only the derived store is kept.
      } catch (e) {
        errors.push(`${file.name}: ${(e as Error).message}`);
      }
    }
    if (errors.length) toast(errors.join(' | '));

    const accts = accountsIn(store);
    if (!accts.length) {
      toast(t.ui.noIgData);
      setPhase('idle');
      return;
    }

    storeRef.current = store;
    setAccounts(accts);
    setAccount(accts[0].username);
    try {
      runAnalysis(accts[0].username);
    } catch (e) {
      toast((e as Error).message);
      setPhase('idle');
    }
  };

  const loadDemo = async () => {
    try {
      const res = await fetch('/demo.har');
      if (!res.ok) throw new Error(`demo unavailable (${res.status})`);
      const blob = await res.blob();
      await handleFiles([new File([blob], 'demo.har', { type: 'application/json' })]);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const changeAccount = (next: string) => {
    setAccount(next);
    try {
      runAnalysis(next);
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const changeLocale = (loc: Locale) => {
    setLocale(loc);
    try {
      localStorage.setItem(LOCALE_KEY, loc);
    } catch {
      /* ignore */
    }
    const store = storeRef.current;
    if (store && analysis) {
      setAnalysis(analyze(store, analysis.account, snapsRef.current, ctxFor(analysis.account, loc)));
    }
  };

  const reset = () => {
    storeRef.current = null;
    setAnalysis(null);
    setAccounts([]);
    setAccount('');
    setPhase('idle');
    setLoadingMsg('');
    window.scrollTo(0, 0);
  };

  /* ---------------- exports ---------------- */

  const exportPosts = () => {
    if (!analysis) return;
    download(`ig-${analysis.account}-posts.csv`, postsCsv(analysis, f), 'text/csv;charset=utf-8');
  };

  const exportComments = () => {
    if (!analysis) return;
    if (!analysis.comments.length) {
      toast(t.ui.misc.commentsCsvEmpty);
      return;
    }
    download(`ig-${analysis.account}-comments.csv`, commentsCsv(analysis, f), 'text/csv;charset=utf-8');
  };

  const copySummary = async () => {
    if (!analysis) return;
    const text = buildSummary(analysis, t, f, 'plain');
    toast((await copyText(text)) ? t.ui.conclusion.copied : t.ui.conclusion.copyFail);
    document.getElementById('copyCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const printReport = () => {
    if (!analysis) return;
    const old = document.title;
    document.title = `Instagram @${analysis.account} - ${new Date().toISOString().slice(0, 10)}`;
    window.print();
    window.setTimeout(() => {
      document.title = old;
    }, 1000);
  };

  /* ---------------- render ---------------- */

  return (
    <>
      <Header
        t={t}
        accounts={accounts}
        account={account}
        onAccount={changeAccount}
        ready={phase === 'ready'}
        hasComments={!!analysis?.comments.length}
        locale={locale}
        onLocale={changeLocale}
        onTheme={toggleTheme}
        onNew={reset}
        onCsvPosts={exportPosts}
        onCsvComments={exportComments}
        onCopy={() => void copySummary()}
        onPdf={printReport}
      />

      <main className="wrap">
        <div className="warnbar no-print" role="note">
          🔒{' '}
          <span>
            <b>{t.ui.warningTitle}</b> {t.ui.warningBody}
          </span>
        </div>

        {phase === 'idle' ? (
          <UploadScreen
            t={t}
            mode={mode}
            onMode={changeMode}
            onFiles={(files) => void handleFiles(files)}
            onDemo={() => void loadDemo()}
          />
        ) : null}

        {phase === 'loading' ? <div className="loading">{loadingMsg || t.ui.processing}</div> : null}

        {phase === 'ready' && analysis ? (
          <ReportContext.Provider
            value={{
              A: analysis,
              t,
              locale,
              f,
              themeKey: resolved,
              mode,
              snaps: snapsRef.current,
              onSnapshots: updateSnaps,
              toast,
            }}
          >
            <Dashboard
              key={`${analysis.account}-${analysis.captureTs}-${locale}-${resolved}-${mode}`}
            />
          </ReportContext.Provider>
        ) : null}
      </main>

      {toastMsg ? <div className="toast">{toastMsg}</div> : null}
    </>
  );
}
