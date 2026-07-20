import { QuestionValidator, type ValidationResult } from "./QuestionValidator";
import type { QuestionPack } from "./QuestionTypes";
export interface LoadedQuestionPack { readonly pack: QuestionPack; readonly validation: ValidationResult; }
export class QuestionLoader {
  constructor(private readonly validator = new QuestionValidator()) {}
  async load(url: string): Promise<LoadedQuestionPack> {
    const response=await fetch(url,{cache:"no-store"});
    if (!response.ok) throw new Error(`Question bank failed to load (${response.status}).`);
    const data: unknown=await response.json(); const validation=this.validator.validatePack(data);
    if (!validation.valid) throw new Error(`Question bank contains ${validation.errorCount} blocking validation error(s).`);
    return { pack:data as QuestionPack, validation };
  }
}
