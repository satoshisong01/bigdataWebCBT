/** App routes used by the learning pages (ids are criteria ids like '3.2.1'). */

export function conceptsHref(topic?: string | null): string {
  return topic ? `/concepts?topic=${encodeURIComponent(topic)}` : '/concepts';
}

export function quizHref(topic?: string | null): string {
  return topic ? `/concepts?quiz=1&topic=${encodeURIComponent(topic)}` : '/concepts?quiz=1';
}

export function topicExamHref(topic: string): string {
  return `/exam?pool=topic&topic=${encodeURIComponent(topic)}`;
}

export const REVIEW_EXAM_HREF = '/exam?pool=review';
