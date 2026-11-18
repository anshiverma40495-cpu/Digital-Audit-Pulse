import React from 'react';
import { Moon, Sun } from 'lucide-react';

export type AppView = 'landing' | 'loading' | 'dashboard' | 'history';

interface HeaderProps {
  activeView: AppView;
  hasActiveReport: boolean;
  historyCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNavigate: (view: AppView) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  hasActiveReport,
  historyCount,
  darkMode,
  onToggleDarkMode,
  onNavigate,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 transition-colors hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-white dark:hover:text-indigo-400"
        >
          Digital Audit Pulse
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className={`whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 ${
              activeView === 'landing'
                ? 'text-indigo-600 underline decoration-2 underline-offset-8 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            New Audit
          </button>
          {hasActiveReport && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className={`whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 ${
                activeView === 'dashboard'
                  ? 'text-indigo-600 underline decoration-2 underline-offset-8 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Active Report
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className={`whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 ${
              activeView === 'history'
                ? 'text-indigo-600 underline decoration-2 underline-offset-8 dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Audit History{historyCount > 0 ? ` (${historyCount})` : ''}
          </button>
        </nav>

        {/* Zone 3: Primary action / theme control */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="md:hidden text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0 dark:text-slate-300"
          >
            History ({historyCount})
          </button>
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {darkMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
};
