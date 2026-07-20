import type { Category, Difficulty, Question, QuestionType } from "./QuestionTypes";
export interface QuestionFilters { readonly categories?: readonly Category[]; readonly difficulties?: readonly Difficulty[]; readonly types?: readonly QuestionType[]; readonly packIds?: readonly string[]; readonly includeRetired?: boolean; }
export function filterQuestions(questions: readonly Question[], filters: QuestionFilters): Question[] {
  return questions.filter((q)=>
    (filters.includeRetired === true || q.status === "approved") &&
    (!filters.categories?.length || filters.categories.includes(q.category)) &&
    (!filters.difficulties?.length || filters.difficulties.includes(q.difficulty)) &&
    (!filters.types?.length || filters.types.includes(q.type)) &&
    (!filters.packIds?.length || filters.packIds.includes(q.packId))
  );
}
