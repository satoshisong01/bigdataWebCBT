import type { CStat } from '@/lib/stats';
import type { Grade } from '@/lib/srs';
import type { TopicStat } from '@/lib/mastery';
import type { UseConcepts } from '../useConcepts';

/** State shared by every /concepts view (owned by ConceptsContent so grades show up across views). */
export interface ConceptsViewProps {
  concepts: UseConcepts;
  cstats: Readonly<Record<string, CStat>>;
  /** question stats for every criteria node id ('S' … 'S.M.U.L') */
  topicStats: ReadonlyMap<string, TopicStat>;
  /** day key, fixed for the visit */
  today: string;
  onGrade: (cardId: string, grade: Grade) => void;
}
