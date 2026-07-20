import { CATEGORIES, DIFFICULTIES, QUESTION_STATUSES, QUESTION_TYPES, type Question, type QuestionPack } from "./QuestionTypes";

export type ValidationSeverity = "error" | "warning";
export interface ValidationIssue { readonly severity: ValidationSeverity; readonly code: string; readonly message: string; readonly questionId?: string; }
export interface ValidationResult { readonly valid: boolean; readonly issues: readonly ValidationIssue[]; readonly errorCount: number; readonly warningCount: number; }

const ID_PATTERN = /^(Q\d{4}|[A-Z0-9_-]+-\d{4})$/;
const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");

export class QuestionValidator {
  validatePack(input: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input || typeof input !== "object") return this.finish([{ severity: "error", code: "PACK_NOT_OBJECT", message: "Question pack must be an object." }]);
    const pack = input as Partial<QuestionPack>;
    if (pack.schemaVersion !== "1.0") issues.push({ severity: "error", code: "SCHEMA_VERSION", message: "Unsupported schema version." });
    if (!pack.pack || typeof pack.pack !== "object") issues.push({ severity: "error", code: "PACK_METADATA", message: "Pack metadata is missing." });
    if (!Array.isArray(pack.questions)) return this.finish([...issues, { severity: "error", code: "QUESTIONS_ARRAY", message: "Questions must be an array." }]);

    const ids = new Set<string>();
    const textGroups = new Map<string, string[]>();
    for (const unknownQuestion of pack.questions) {
      const question = unknownQuestion as Partial<Question>;
      const id = typeof question.id === "string" ? question.id : undefined;
      const add = (severity: ValidationSeverity, code: string, message: string): void => { issues.push({ severity, code, message, questionId: id }); };
      if (!id || !ID_PATTERN.test(id)) add("error", "INVALID_ID", "Question ID is missing or invalid.");
      else if (ids.has(id)) add("error", "DUPLICATE_ID", `Duplicate question ID: ${id}`); else ids.add(id);
      if (!question.packId || typeof question.packId !== "string") add("error", "PACK_ID", "packId is required.");
      if (!QUESTION_TYPES.includes(question.type as never)) add("error", "QUESTION_TYPE", "Question type is invalid.");
      if (!CATEGORIES.includes(question.category as never)) add("error", "CATEGORY", "Category is invalid.");
      if (!DIFFICULTIES.includes(question.difficulty as never)) add("error", "DIFFICULTY", "Difficulty is invalid.");
      if (!QUESTION_STATUSES.includes(question.status as never)) add("error", "STATUS", "Status is invalid.");
      if (!question.question || typeof question.question !== "string") add("error", "QUESTION_TEXT", "Question text is required.");
      if (!question.correctAnswer || typeof question.correctAnswer !== "string") add("error", "CORRECT_ANSWER", "Correct answer is required.");
      if (!question.explanation || typeof question.explanation !== "string") add("error", "EXPLANATION", "Explanation is required.");
      if (!isStringArray(question.choices)) add("error", "CHOICES", "Choices must be a string array.");
      if (!isStringArray(question.acceptedAnswers)) add("error", "ACCEPTED_ANSWERS", "acceptedAnswers must be a string array.");
      if (!isStringArray(question.tags)) add("error", "TAGS", "tags must be a string array.");
      if (question.type === "multiple_choice" && isStringArray(question.choices)) {
        if (question.choices.length < 2) add("error", "MC_CHOICE_COUNT", "Multiple-choice questions require at least two choices.");
        if (new Set(question.choices).size !== question.choices.length) add("error", "MC_DUPLICATE_CHOICES", "Choices must be unique.");
        if (typeof question.correctAnswer === "string" && !question.choices.includes(question.correctAnswer)) add("error", "MC_ANSWER_NOT_CHOICE", "Correct answer must exactly match a choice.");
      }
      if (question.type === "true_false" && isStringArray(question.choices)) {
        if (question.choices.length !== 2 || question.choices[0] !== "True" || question.choices[1] !== "False") add("error", "TF_CHOICES", "True/False choices must be exactly [True, False].");
        if (question.correctAnswer !== "True" && question.correctAnswer !== "False") add("error", "TF_ANSWER", "True/False answer must be True or False.");
      }
      if (question.type === "open_response" && isStringArray(question.choices) && question.choices.length !== 0) add("error", "OPEN_CHOICES", "Open-response choices must be empty.");
      if (typeof question.question === "string") { const key=normalize(question.question); textGroups.set(key,[...(textGroups.get(key) ?? []), id ?? "unknown"]); }
    }
    for (const group of textGroups.values()) if (group.length > 1) issues.push({ severity: "warning", code: "DUPLICATE_TEXT", message: `Identical normalized question text: ${group.join(", ")}` });
    if (pack.pack && typeof pack.pack === "object" && "questionCount" in pack.pack && pack.pack.questionCount !== pack.questions.length) issues.push({ severity: "error", code: "QUESTION_COUNT", message: "Pack questionCount does not match questions array length." });
    return this.finish(issues);
  }
  private finish(issues: ValidationIssue[]): ValidationResult {
    const errorCount=issues.filter((i)=>i.severity==="error").length; const warningCount=issues.length-errorCount;
    return { valid:errorCount===0, issues, errorCount, warningCount };
  }
}
