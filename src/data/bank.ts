import type { Question, ConceptCard } from '@/types';
import { sessionIdOf } from './catalog';

/**
 * Lazy question bank. Each session is its own chunk, so the home page and
 * single-session exams never download the full bank.
 */
type SessionModule = { questions: Question[] };

const LOADERS: Readonly<Record<string, () => Promise<SessionModule>>> = {
  '1': () => import('./sessions/1'),
  '2': () => import('./sessions/2'),
  '3': () => import('./sessions/3'),
  '4': () => import('./sessions/4'),
  '5': () => import('./sessions/5'),
  '6': () => import('./sessions/6'),
  '7': () => import('./sessions/7'),
  '8': () => import('./sessions/8'),
  '9': () => import('./sessions/9'),
  '10': () => import('./sessions/10'),
  '11': () => import('./sessions/11'),
  t1: () => import('./sessions/t1'),
  t2: () => import('./sessions/t2'),
  t3: () => import('./sessions/t3'),
};

export const SESSION_IDS: readonly string[] = Object.keys(LOADERS);

const sessionCache = new Map<string, Promise<Question[]>>();

export function loadSession(id: string): Promise<Question[]> {
  const loader = LOADERS[id];
  if (!loader) return Promise.resolve([]);
  const cached = sessionCache.get(id);
  if (cached) return cached;
  const p = loader()
    .then(m => m.questions)
    .catch((err: unknown) => {
      sessionCache.delete(id); // allow retry (e.g. chunk failed offline)
      throw err;
    });
  sessionCache.set(id, p);
  return p;
}

export async function loadAllQuestions(): Promise<Question[]> {
  const lists = await Promise.all(SESSION_IDS.map(loadSession));
  return lists.flat();
}

/** Loads only the sessions the ids belong to; result keeps the order of `ids`. */
export async function loadQuestionsByIds(ids: readonly string[]): Promise<Question[]> {
  const sessionIds = Array.from(new Set(ids.map(sessionIdOf)));
  const lists = await Promise.all(sessionIds.map(loadSession));
  const byId = new Map(lists.flat().map(q => [q.id, q]));
  return ids.map(id => byId.get(id)).filter((q): q is Question => q !== undefined);
}

let conceptsPromise: Promise<readonly ConceptCard[]> | null = null;

export function loadConcepts(): Promise<readonly ConceptCard[]> {
  if (!conceptsPromise) {
    conceptsPromise = import('./concepts')
      .then(m => m.CONCEPTS)
      .catch((err: unknown) => {
        conceptsPromise = null;
        throw err;
      });
  }
  return conceptsPromise;
}
