import React from 'react';
import { getScoreColorClasses, scoreToGrade } from '../types/audit';

interface ScoreGaugeProps {
  score: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const { grade, label } = scoreToGrade(clamped);
  const colors = getScoreColorClasses(clamped);

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-36 w-36 shrink-0" role="img" aria-label={`Overall Health Score ${clamped} out of 100, Grade ${grade}`}>
        <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="12"
            className="stroke-slate-200 dark:stroke-slate-800"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            stroke={colors.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`font-mono text-3xl font-extrabold tabular-nums leading-none ${colors.text}`}>
            {clamped}
          </span>
          <span className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">of 100</span>
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">
            Grade {grade}
          </span>
          <span className={`text-sm font-semibold ${colors.text}`}>{label}</span>
        </div>
        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Equal-weighted composite of SEO, Content, Keyword Alignment, Technical Health, and AI-Search Readiness.
        </p>
      </div>
    </div>
  );
};
