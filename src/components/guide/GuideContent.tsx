import type { GuideSection } from '@/data/guide';
import GuideBlockView from './GuideBlockView';

interface GuideContentProps {
  sections: readonly GuideSection[];
}

interface GuideTocProps {
  sections: readonly GuideSection[];
}

function GuideToc({ sections }: GuideTocProps) {
  return (
    <nav
      aria-label="목차"
      className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4"
    >
      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">목차</p>
      <ol className="space-y-1 text-sm">
        {sections.map((section, i) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="flex gap-2 py-0.5 text-gray-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 transition"
            >
              <span className="text-gray-400 dark:text-slate-500 tabular-nums">{i + 1}.</span>
              <span>{section.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** /guide body — renders GUIDE_SECTIONS generically: a table of contents plus one card per section. */
export default function GuideContent({ sections }: GuideContentProps) {
  if (sections.length === 0) {
    return (
      <p className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6 text-sm text-gray-500 dark:text-slate-400">
        합격 전략 내용을 준비하고 있어요.
      </p>
    );
  }
  const withToc = sections.length > 1;
  return (
    <div className={withToc ? 'lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8 lg:items-start' : ''}>
      {withToc && (
        <div className="mb-4 lg:mb-0 lg:sticky lg:top-20">
          <GuideToc sections={sections} />
        </div>
      )}
      <div className="space-y-4 sm:space-y-6 min-w-0">
        {sections.map(section => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="scroll-mt-20 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 sm:p-6"
          >
            <h2
              id={`${section.id}-title`}
              className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4"
            >
              {section.title}
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {section.blocks.map((block, i) => (
                <GuideBlockView key={i} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
