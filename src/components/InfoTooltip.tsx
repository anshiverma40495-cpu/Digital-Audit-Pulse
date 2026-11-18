import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  label: string;
  explanation: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ label, explanation }) => {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-40 mb-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed font-normal text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {explanation}
        </span>
      )}
    </span>
  );
};
