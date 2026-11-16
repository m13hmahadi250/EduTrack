import React from 'react';
import { AlertTriangle, RefreshCw, Home, Mail, ShieldCheck, WifiOff } from 'lucide-react';
import {
  classifyError,
  generateIncidentId,
  isChunkOrModuleLoadError,
  reportProductionError,
  type ErrorCategory,
} from '../lib/errorMonitoring';
import { performBoundedChunkRecovery } from '../utils/lazyWithRetry';

export type ErrorBoundaryLevel = 'app' | 'route' | 'dashboard' | 'widget';

export interface AppErrorBoundaryProps {
  children: React.ReactNode;
  level?: ErrorBoundaryLevel;
  sectionName?: string;
  resetKey?: string | number;
  onReset?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  incidentId: string;
  logged: boolean;
  loggingPending: boolean;
  category: ErrorCategory;
  isChunkError: boolean;
  retryCount: number;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
    incidentId: '',
    logged: false,
    loggingPending: false,
    category: 'RUNTIME_ERROR',
    isChunkError: false,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    const isChunk = isChunkOrModuleLoadError(error);
    const category = classifyError(error, isChunk ? 'CHUNK_LOAD_ERROR' : 'REACT_RENDER_ERROR');
    return {
      hasError: true,
      error,
      incidentId: generateIncidentId(),
      logged: false,
      loggingPending: true,
      category,
      isChunkError: isChunk,
    };
  }

  public componentDidUpdate(prevProps: AppErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({
        hasError: false,
        error: null,
        logged: false,
        loggingPending: false,
      });
    }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const level = this.props.level || 'app';
    const section = this.props.sectionName || level;

    console.error(`[EduTrack ErrorBoundary:${section}] Caught error:`, error, errorInfo);

    // If this is a post-deployment chunk load error, attempt bounded single-session recovery first
    if (isChunkOrModuleLoadError(error)) {
      void performBoundedChunkRecovery();
    }

    void reportProductionError(error, {
      category: isChunkOrModuleLoadError(error) ? 'CHUNK_LOAD_ERROR' : 'REACT_RENDER_ERROR',
      componentStack: errorInfo?.componentStack || undefined,
      section,
    }).then((result) => {
      this.setState({
        incidentId: result.incidentId || this.state.incidentId,
        logged: result.logged,
        loggingPending: false,
        category: result.category,
        isChunkError: result.isChunkError,
      });
    });
  }

  private handleRetry = (): void => {
    if (this.state.isChunkError) {
      // For chunk errors, force a fresh navigation with cache-busting query param
      const url = new URL(window.location.href);
      url.searchParams.set('_r', Date.now().toString(36));
      window.location.replace(url.toString());
      return;
    }

    this.setState(
      (prev) => ({
        hasError: false,
        error: null,
        logged: false,
        loggingPending: false,
        retryCount: prev.retryCount + 1,
      }),
      () => {
        if (this.props.onReset) {
          this.props.onReset();
        }
      }
    );
  };

  private handleReturnHome = (): void => {
    this.setState({
      hasError: false,
      error: null,
      logged: false,
      loggingPending: false,
    });
    if (typeof window !== 'undefined') {
      window.location.assign('/');
    }
  };

  public render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const level = this.props.level || 'app';
    const { incidentId, logged, loggingPending, isChunkError, category } = this.state;
    const isNetworkOrChunk = isChunkError || category === 'NETWORK_ERROR';

    // Contained recovery card for isolated widgets / dashboard sections
    if (level === 'widget' || level === 'dashboard') {
      return (
        <div
          role="alert"
          className="w-full rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-slate-900/90 p-6 sm:p-8 text-center my-4 shadow-sm"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            {isNetworkOrChunk ? <WifiOff className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5">
            We couldn&apos;t load this section. Please try again.
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
            {this.props.sectionName
              ? `The "${this.props.sectionName}" view encountered an unexpected issue, but the rest of your EduTrack workspace is safe.`
              : 'This section encountered a temporary issue. Your account and other dashboard tabs remain active.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 text-xs sm:text-sm transition-colors shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            {level === 'dashboard' && (
              <button
                type="button"
                onClick={this.handleReturnHome}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 text-xs sm:text-sm transition-colors"
              >
                <Home className="h-4 w-4" />
                Return to Homepage
              </button>
            )}
          </div>
          {incidentId && (
            <p className="mt-3 text-[11px] font-mono text-slate-400 dark:text-slate-500">
              Ref: {incidentId}
            </p>
          )}
        </div>
      );
    }

    // Full-page / route-level EduTrack-branded recovery UI
    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans selection:bg-indigo-500 selection:text-white"
      >
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl p-7 sm:p-9 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm">
                E
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white block leading-none">
                  EduTrack <span className="text-indigo-600 dark:text-indigo-400">Bangladesh</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Application Recovery Guard
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              {isChunkError ? 'Update Available' : 'Recovery Mode'}
            </span>
          </div>

          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 shrink-0 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center border border-rose-100 dark:border-rose-900/50">
              {isNetworkOrChunk ? <WifiOff className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1.5">
                {isChunkError
                  ? 'A New Version of EduTrack Was Deployed'
                  : 'We Ran Into an Unexpected Problem'}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {isChunkError
                  ? 'EduTrack Bangladesh was recently updated. Please click "Try Again" below to load the latest version safely.'
                  : 'This page encountered an unexpected runtime error. Your account data and session remain safe.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 p-4 mb-6 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Incident Reference:</span>
              <code className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                {incidentId || 'INC-PENDING'}
              </code>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {loggingPending
                  ? 'Recording diagnostic summary...'
                  : logged
                  ? 'Diagnostic report recorded with privacy protection.'
                  : 'Local diagnostic reference generated. Share the Reference ID above if contacting support.'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              {isChunkError ? 'Load Latest Version' : 'Try Again'}
            </button>
            <button
              type="button"
              onClick={this.handleReturnHome}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Home className="w-4 h-4" />
              Return to Homepage
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Need help resolving this issue?</span>
            <a
              href={`mailto:edutrackbangladesh@gmail.com?subject=${encodeURIComponent(
                `EduTrack Support Request (${incidentId || 'Incident'})`
              )}`}
              className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <Mail className="w-3.5 h-3.5" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }
}
