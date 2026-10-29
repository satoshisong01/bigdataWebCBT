'use client';

export interface Status {
  tone: 'ok' | 'error';
  text: string;
}

interface StatusMessageProps {
  status: Status | null;
}

/** Result line under a settings action (announced to screen readers). */
export default function StatusMessage({ status }: StatusMessageProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`text-xs sm:text-sm ${status ? 'mt-3' : ''} ${
        status?.tone === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'
      }`}
    >
      {status?.text}
    </p>
  );
}
