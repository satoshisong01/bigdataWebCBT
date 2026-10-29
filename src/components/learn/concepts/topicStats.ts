import { QUESTION_META } from '@/data/meta';
import { getQStats } from '@/lib/stats';
import { leafStats, rollup, type TopicStat } from '@/lib/mastery';

/** Question stats for every criteria level keyed by node id ('S' … 'S.M.U.L'). Reads localStorage. */
export function readTopicStats(): ReadonlyMap<string, TopicStat> {
  const leaves = leafStats(QUESTION_META, getQStats());
  return new Map<string, TopicStat>([
    ...leaves,
    ...rollup(leaves, 'sub'),
    ...rollup(leaves, 'major'),
    ...rollup(leaves, 'subject'),
  ]);
}
