/** Pure helpers over the criteria tree + concept cards for the /concepts and /review pages. */
import type { ConceptCard } from '@/types';
import { CRITERIA, LEAVES, SUBS, topicMatches, topicName } from '@/data/criteria';

export interface TopicNode {
  id: string;
  name: string;
}

export interface CardCount {
  total: number;
  /** cards graded at least once (have a CStat) */
  studied: number;
}

export interface CardGroup extends TopicNode {
  cards: ConceptCard[];
}

/** 'S.M.U.L' → ['S', 'S.M', 'S.M.U', 'S.M.U.L'] */
export function topicAncestors(id: string): string[] {
  const parts = id.split('.');
  return parts.map((_, i) => parts.slice(0, i + 1).join('.'));
}

/** 1 = 과목, 2 = 주요항목, 3 = 세부항목, 4 = 세세항목 */
export function topicDepth(id: string): number {
  return id.split('.').length;
}

const LEVEL_LABELS: readonly string[] = ['과목', '주요항목', '세부항목', '세세항목'];

export function levelLabel(id: string): string {
  return LEVEL_LABELS[topicDepth(id) - 1] ?? '';
}

const CHILDREN = new Map<string, readonly TopicNode[]>();
for (const s of CRITERIA) {
  CHILDREN.set(String(s.id), s.majors.map(m => ({ id: m.id, name: m.name })));
  for (const m of s.majors) {
    CHILDREN.set(m.id, m.subs.map(u => ({ id: u.id, name: u.name })));
    for (const u of m.subs) CHILDREN.set(u.id, u.leaves.map(l => ({ id: l.id, name: l.name })));
  }
}

/** Direct children in the criteria tree; [] for a 세세항목 or an unknown id. */
export function topicChildren(id: string): readonly TopicNode[] {
  return CHILDREN.get(id) ?? [];
}

/** Own-key check, so ids like 'toString' never read Object.prototype. */
export function hasStat(cstats: Readonly<Record<string, unknown>>, cardId: string): boolean {
  return Object.prototype.hasOwnProperty.call(cstats, cardId);
}

export function statOf<T>(stats: Readonly<Record<string, T>>, id: string): T | undefined {
  return hasStat(stats, id) ? stats[id] : undefined;
}

/** Used when the cards could not be loaded: no card chips instead of a loading state. */
export const NO_COUNTS: ReadonlyMap<string, CardCount> = new Map();

/** Card totals for every node a card falls under (과목 … 세세항목). */
export function countCardsByNode(
  cards: readonly Pick<ConceptCard, 'id' | 'topic'>[],
  cstats: Readonly<Record<string, unknown>>,
): Map<string, CardCount> {
  const counts = new Map<string, CardCount>();
  for (const card of cards) {
    const studied = hasStat(cstats, card.id) ? 1 : 0;
    for (const key of topicAncestors(card.topic)) {
      const prev = counts.get(key) ?? { total: 0, studied: 0 };
      counts.set(key, { total: prev.total + 1, studied: prev.studied + studied });
    }
  }
  return counts;
}

export function countStudied(cards: readonly Pick<ConceptCard, 'id'>[], cstats: Readonly<Record<string, unknown>>): number {
  return cards.filter(c => hasStat(cstats, c.id)).length;
}

/** Cards under `topic`, grouped by 세세항목 in criteria order (unknown topics last); data order within a group. */
export function groupCardsByLeaf(cards: readonly ConceptCard[], topic: string): CardGroup[] {
  const byTopic = new Map<string, ConceptCard[]>();
  for (const card of cards) {
    if (!topicMatches(card.topic, topic)) continue;
    const list = byTopic.get(card.topic);
    if (list) list.push(card);
    else byTopic.set(card.topic, [card]);
  }
  const known: CardGroup[] = LEAVES.filter(l => byTopic.has(l.id)).map(l => ({
    id: l.id,
    name: l.name,
    cards: byTopic.get(l.id) ?? [],
  }));
  const knownIds = new Set(known.map(g => g.id));
  const unknown: CardGroup[] = Array.from(byTopic.entries())
    .filter(([id]) => !knownIds.has(id))
    .map(([id, list]) => ({ id, name: topicName(id), cards: list }));
  return [...known, ...unknown];
}

export interface SearchEntry {
  card: ConceptCard;
  term: string;
  summary: string;
  points: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

export function buildSearchIndex(cards: readonly ConceptCard[]): SearchEntry[] {
  return cards.map(card => ({
    card,
    term: normalize(card.term),
    summary: normalize(card.summary),
    points: (card.points ?? []).map(normalize).join('\u0001'),
  }));
}

function rankOf(entry: SearchEntry, q: string): number {
  if (entry.term === q) return 0;
  if (entry.term.includes(q)) return 1;
  if (entry.summary.includes(q)) return 2;
  return entry.points.includes(q) ? 3 : -1;
}

/** Term / summary / points search (case- and whitespace-insensitive): exact term, term, summary, points; data order within a rank. */
export function searchCards(index: readonly SearchEntry[], query: string): ConceptCard[] {
  const q = normalize(query);
  if (!q) return [];
  return index
    .map((entry, i) => ({ entry, i, rank: rankOf(entry, q) }))
    .filter(x => x.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map(x => x.entry.card);
}

/** Cards for `ids` in that order, skipping ids that have no card (e.g. removed content). */
export function cardsByIds(cards: readonly ConceptCard[], ids: readonly string[]): ConceptCard[] {
  const byId = new Map(cards.map(c => [c.id, c]));
  return ids.map(id => byId.get(id)).filter((c): c is ConceptCard => c !== undefined);
}

/** First 세부항목 (criteria order) that still has unstudied cards. */
export function nextStudyTopic(
  cards: readonly Pick<ConceptCard, 'id' | 'topic'>[],
  cstats: Readonly<Record<string, unknown>>,
): TopicNode | undefined {
  const counts = countCardsByNode(cards, cstats);
  const sub = SUBS.find(u => {
    const c = counts.get(u.id);
    return c !== undefined && c.studied < c.total;
  });
  return sub ? { id: sub.id, name: sub.name } : undefined;
}
