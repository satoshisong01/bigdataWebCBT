/**
 * The sync catalog and the generated meta index must agree with the lazy bank (spec §6 카탈로그 개수 일치).
 * A session whose data file is still empty (content pipeline pending) is reported as todo; once its
 * questions land, the same case runs for real.
 */
import { describe, it, expect } from 'vitest';
import { SESSIONS, sessionIdOf } from './catalog';
import { SESSION_IDS, loadAllQuestions, loadConcepts, loadSession } from './bank';
import { CARD_META, QUESTION_META } from './meta';
import { LEAVES, criteriaSubjectOf } from './criteria';

const LEAF_IDS = new Set(LEAVES.map(l => l.id));

const loaded = await Promise.all(SESSIONS.map(async session => ({ session, questions: await loadSession(session.id) })));

describe('catalog ↔ bank', () => {
  it('has exactly one bank loader per catalog session', () => {
    expect([...SESSION_IDS].sort()).toEqual(SESSIONS.map(s => s.id).sort());
  });

  for (const { session, questions } of loaded) {
    if (questions.length === 0) {
      it.todo(`${session.id} (${session.name}): data file is empty — catalog expects ${session.questionCount}`);
      continue;
    }
    it(`${session.id} (${session.name}): questionCount matches and every id belongs to the session`, () => {
      expect(questions).toHaveLength(session.questionCount);
      expect(questions.filter(q => q.sessionId !== session.id || sessionIdOf(q.id) !== session.id)).toEqual([]);
    });
  }
});

describe('bank questions follow the Question contract', () => {
  it('ids are unique, answers point at an option, optionNotes match options, topics are 세세항목', async () => {
    const bank = await loadAllQuestions();
    const ids = bank.map(q => q.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    const broken = bank.filter(
      q =>
        !Number.isInteger(q.answer) ||
        q.answer < 1 ||
        q.answer > q.options.length ||
        (q.optionNotes !== undefined && q.optionNotes.length !== q.options.length) ||
        (q.topics ?? []).some(t => !LEAF_IDS.has(t)),
    );
    expect(broken.map(q => q.id)).toEqual([]);
  });
});

describe('meta.ts mirrors the bank and concept cards (re-run: node scripts/build-meta.mjs)', () => {
  it('QUESTION_META has every question with its 2027 subject (first topic, else own) and topics, in bank order', async () => {
    const bank = await loadAllQuestions();
    expect(QUESTION_META).toEqual(
      bank.map(q => ({ id: q.id, sessionId: q.sessionId, subject: criteriaSubjectOf(q), topics: q.topics ?? [] })),
    );
  });

  it('CARD_META has every concept card with the same topic and importance, and card topics are 세세항목', async () => {
    const cards = await loadConcepts();
    expect(CARD_META).toEqual(cards.map(c => ({ id: c.id, topic: c.topic, importance: c.importance })));
    expect(new Set(cards.map(c => c.id)).size).toBe(cards.length);
    expect(cards.filter(c => !LEAF_IDS.has(c.topic)).map(c => c.id)).toEqual([]);
  });
});
