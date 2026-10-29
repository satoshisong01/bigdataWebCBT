'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import ThemeToggle from './ThemeToggle';
import UpdatesBell from './UpdatesBell';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** defaults to home */
  backHref?: string;
  right?: ReactNode;
}

/** Sticky top bar shared by the secondary pages (/concepts, /review, /drill, /plan, /settings, /guide). */
export default function PageHeader({ title, subtitle, backHref = '/', right }: PageHeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <Link
          href={backHref}
          aria-label="뒤로"
          className="-ml-3 w-10 h-10 rounded-lg inline-flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition text-sm flex-shrink-0"
        >
          &larr;
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {right}
          <UpdatesBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
