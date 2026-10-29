import Link from 'next/link';
import type { GuideBlock } from '@/data/guide';
import { hostnameOf, isAppPath, isExternalUrl } from './links';

type BlockOf<T extends GuideBlock['type']> = Extract<GuideBlock, { type: T }>;

const TEXT = 'text-sm sm:text-base leading-relaxed text-gray-700 dark:text-slate-300';

const CALLOUT: Readonly<Record<BlockOf<'callout'>['tone'], { label: string; className: string }>> = {
  info: {
    label: '참고',
    className: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200',
  },
  warn: {
    label: '주의',
    className: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200',
  },
  tip: {
    label: '팁',
    className: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/30 dark:border-green-900 dark:text-green-200',
  },
};

interface ListBlockProps {
  block: BlockOf<'list'>;
}

function ListBlock({ block }: ListBlockProps) {
  const items = block.items.map((item, i) => <li key={i}>{item}</li>);
  return block.ordered ? (
    <ol className={`${TEXT} list-decimal pl-5 space-y-1`}>{items}</ol>
  ) : (
    <ul className={`${TEXT} list-disc pl-5 space-y-1`}>{items}</ul>
  );
}

/** Scrolls sideways on narrow screens instead of squeezing the columns. */
interface TableBlockProps {
  block: BlockOf<'table'>;
}

function TableBlock({ block }: TableBlockProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-800">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead className="bg-gray-50 dark:bg-slate-800/60 text-gray-600 dark:text-slate-300">
          <tr>
            {block.head.map((cell, i) => (
              <th key={i} scope="col" className="px-3 py-2 font-bold whitespace-nowrap">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={`px-3 py-2 align-top min-w-[7rem] ${
                    c === 0 ? 'font-medium text-gray-900 dark:text-slate-100' : 'text-gray-700 dark:text-slate-300'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CalloutBlockProps {
  block: BlockOf<'callout'>;
}

function CalloutBlock({ block }: CalloutBlockProps) {
  const tone = CALLOUT[block.tone];
  return (
    <div role="note" className={`rounded-lg border p-3 sm:p-4 text-sm leading-relaxed ${tone.className}`}>
      <span className="font-bold mr-1.5">{tone.label}</span>
      {block.text}
    </div>
  );
}

const CHIP =
  'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition';

interface LinksBlockProps {
  block: BlockOf<'links'>;
}

function LinksBlock({ block }: LinksBlockProps) {
  return (
    <ul className="flex flex-wrap gap-2">
      {block.items.map((item, i) => (
        <li key={i}>
          {isAppPath(item.href) ? (
            <Link href={item.href} className={CHIP}>
              {item.label} →
            </Link>
          ) : isExternalUrl(item.href) ? (
            <a href={item.href} target="_blank" rel="noopener noreferrer" className={CHIP}>
              {item.label} ↗
            </a>
          ) : (
            <span className={`${TEXT} text-sm`}>{item.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

interface SourcesBlockProps {
  block: BlockOf<'sources'>;
}

function SourcesBlock({ block }: SourcesBlockProps) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-slate-800/40 p-3">
      <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mb-1">출처</p>
      <ul className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
        {block.items.map((item, i) => {
          const host = hostnameOf(item.url);
          return (
            <li key={i} className="break-all">
              {isExternalUrl(item.url) ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  {item.label}
                </a>
              ) : (
                item.label
              )}
              {host && <span className="text-gray-400 dark:text-slate-500"> · {host}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface GuideBlockViewProps {
  block: GuideBlock;
}

/** Renders any GuideBlock; new block types fail type-checking until they are handled here. */
export default function GuideBlockView({ block }: GuideBlockViewProps) {
  switch (block.type) {
    case 'p':
      return <p className={TEXT}>{block.text}</p>;
    case 'list':
      return <ListBlock block={block} />;
    case 'table':
      return <TableBlock block={block} />;
    case 'callout':
      return <CalloutBlock block={block} />;
    case 'links':
      return <LinksBlock block={block} />;
    case 'sources':
      return <SourcesBlock block={block} />;
    default: {
      // Compile-time exhaustiveness; at runtime an unknown block (newer content) renders nothing.
      const unhandled: never = block;
      void unhandled;
      return null;
    }
  }
}
