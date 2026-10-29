/**
 * CONTRACT — "다음 설명에 해당하는 용어는?" items generated from concept cards (pure).
 */
import type { ConceptCard } from '@/types';
import { subjectOfTopic, topicMatches } from '@/data/criteria';
import { seededRandom, shuffleWith } from './rng';
import type { Rand } from './rng';

export interface TermQuizItem {
  cardId: string;
  topic: string;
  /** the card summary with any occurrence of the term (or its parenthesised alias) masked as '○○' */
  prompt: string;
  /** 4 distinct terms (fewer only if the pool is too small) */
  options: string[];
  /** 1-based */
  answer: number;
}

export interface TermQuizFilter {
  /** topic prefix, same matching rule as questionsForTopic */
  topicPrefix?: string;
  cardIds?: readonly string[];
}

const MASK = '○○';
const OPTION_COUNT = 4;
/** 'base(alias, alias2)' — text before the first parenthesis and what is inside it. */
const PAREN = /^([^(（]*)[(（]([^)）]*)[)）]/;
const ALIAS_SEPARATORS = /[,，/·;]/;

interface PreparedCard {
  card: ConceptCard;
  term: string;
  /** normalized full term — at most one quiz item per key */
  key: string;
  /** normalized term, base and aliases — no two options may share any of these */
  keys: readonly string[];
  /** variants masked in the prompt, longest first */
  variants: readonly string[];
  sub: string;
  subject: number;
}

/** Case- and whitespace-insensitive comparison key. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

/** The term itself plus, for 'base(alias, …)', the base and every alias. */
function termParts(term: string): string[] {
  const m = PAREN.exec(term);
  const extra = m ? [m[1], ...m[2].split(ALIAS_SEPARATORS)] : [];
  return Array.from(new Set([term, ...extra].map(s => s.trim()).filter(s => s.length > 0)));
}

/** A lone non-ASCII character (e.g. one Hangul syllable) would mask unrelated words, so it is not masked. */
function isMaskable(variant: string): boolean {
  const compact = variant.replace(/\s+/g, '');
  return compact.length >= 2 || /^[A-Za-z0-9]$/.test(compact);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case- and whitespace-insensitive; ASCII word edges must sit on word boundaries ('AI' never masks 'domain'). */
function variantPattern(variant: string): RegExp {
  const chars = Array.from(variant.replace(/\s+/g, ''));
  const head = /\w/.test(chars[0]) ? '\\b' : '';
  const tail = /\w/.test(chars[chars.length - 1]) ? '\\b' : '';
  return new RegExp(head + chars.map(escapeRegExp).join('\\s*') + tail, 'gi');
}

function maskTerm(summary: string, variants: readonly string[]): string {
  const masked = variants.reduce((text, v) => text.replace(variantPattern(v), MASK), summary);
  // The term and its alias side by side ('○○(○○)') read as one blank.
  return masked.replace(/○○\s*[(（]\s*○○\s*[)）]/g, MASK);
}

/** A prompt is usable when something besides the blanks is left to read. */
function hasContent(prompt: string): boolean {
  return /[0-9A-Za-z가-힣]/.test(prompt.split(MASK).join(''));
}

function prepare(card: ConceptCard): PreparedCard | null {
  const term = card.term.trim();
  if (term.length === 0) return null;
  const parts = termParts(term);
  return {
    card,
    term,
    key: normalize(term),
    keys: Array.from(new Set(parts.map(normalize))),
    variants: parts.filter(isMaskable).sort((a, b) => normalize(b).length - normalize(a).length),
    sub: card.topic.split('.').slice(0, 3).join('.'),
    subject: subjectOfTopic(card.topic),
  };
}

/** Same 세세항목 → same 세부항목 → same subject → (only if the subject runs short) any other card. */
function distractorTiers(target: PreparedCard, pool: readonly PreparedCard[]): PreparedCard[][] {
  const others = pool.filter(p => p.card.id !== target.card.id);
  return [
    others.filter(p => p.card.topic === target.card.topic),
    others.filter(p => p.card.topic !== target.card.topic && p.sub === target.sub),
    others.filter(p => p.sub !== target.sub && p.subject === target.subject),
    others.filter(p => p.subject !== target.subject),
  ];
}

function pickDistractors(target: PreparedCard, pool: readonly PreparedCard[], rand: Rand): string[] {
  const need = OPTION_COUNT - 1;
  const used = new Set(target.keys);
  const picked: string[] = [];
  for (const tier of distractorTiers(target, pool)) {
    if (picked.length === need) break;
    for (const candidate of shuffleWith(tier, rand)) {
      if (candidate.keys.some(k => used.has(k))) continue;
      candidate.keys.forEach(k => used.add(k));
      picked.push(candidate.term);
      if (picked.length === need) break;
    }
  }
  return picked;
}

/**
 * Deterministic for `seed`. Distractors come from cards in the same 세세항목, then the same 세부항목,
 * then the same subject; never the same term (case/space-insensitive). Cards without a usable summary are skipped.
 */
export function buildTermQuiz(
  cards: readonly ConceptCard[],
  seed: number,
  count: number,
  filter?: TermQuizFilter,
): TermQuizItem[] {
  const limit = Math.floor(count) > 0 ? Math.floor(count) : 0;
  if (limit === 0) return [];
  // Distractors may come from any card; only the quizzed cards are filtered.
  const pool = cards.map(prepare).filter((p): p is PreparedCard => p !== null);
  const prefix = filter?.topicPrefix;
  const ids = filter?.cardIds ? new Set(filter.cardIds) : null;
  const eligible = pool.filter(p => (!prefix || topicMatches(p.card.topic, prefix)) && (!ids || ids.has(p.card.id)));
  const rand = seededRandom(seed);
  const items: TermQuizItem[] = [];
  const asked = new Set<string>();
  for (const p of shuffleWith(eligible, rand)) {
    if (items.length === limit) break;
    if (asked.has(p.key)) continue;
    const prompt = maskTerm((p.card.summary ?? '').trim(), p.variants);
    if (!hasContent(prompt)) continue;
    asked.add(p.key);
    const options = shuffleWith([p.term, ...pickDistractors(p, pool, rand)], rand);
    items.push({ cardId: p.card.id, topic: p.card.topic, prompt, options, answer: options.indexOf(p.term) + 1 });
  }
  return items;
}
