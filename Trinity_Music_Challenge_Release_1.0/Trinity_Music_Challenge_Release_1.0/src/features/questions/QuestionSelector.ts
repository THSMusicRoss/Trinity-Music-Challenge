import { shuffle } from "../../utils/shuffle";
import type { Difficulty, Question } from "./QuestionTypes";
export interface SelectionOptions { readonly count: number; readonly method: "balanced" | "random"; readonly usedQuestionIds?: ReadonlySet<string>; readonly random?: () => number; }
export interface SelectionResult { readonly questions: readonly Question[]; readonly requested: number; readonly available: number; readonly shortfall: number; }
const TARGET: Readonly<Record<Difficulty, number>>={easy:.30,medium:.50,challenging:.20};
export class QuestionSelector {
  select(pool: readonly Question[], options: SelectionOptions): SelectionResult {
    const used=options.usedQuestionIds ?? new Set<string>(); const eligible=pool.filter((q)=>!used.has(q.id)); const count=Math.min(Math.max(0,Math.floor(options.count)),eligible.length); const random=options.random ?? Math.random;
    const selected=options.method==="balanced" ? this.selectBalanced(eligible,count,random) : shuffle(eligible,random).slice(0,count);
    return { questions:selected, requested:options.count, available:eligible.length, shortfall:Math.max(0,options.count-selected.length) };
  }
  private selectBalanced(pool: readonly Question[], count: number, random: () => number): Question[] {
    const buckets=new Map<Difficulty,Question[]>([["easy",[]],["medium",[]],["challenging",[]]]); for (const q of pool) buckets.get(q.difficulty)?.push(q);
    const targetCounts=this.allocate(count); const selected:Question[]=[]; const leftovers:Question[]=[];
    for (const difficulty of ["easy","medium","challenging"] as const) { const mixed=shuffle(buckets.get(difficulty) ?? [],random); const take=Math.min(targetCounts[difficulty],mixed.length); selected.push(...mixed.slice(0,take)); leftovers.push(...mixed.slice(take)); }
    if (selected.length<count) selected.push(...shuffle(leftovers,random).slice(0,count-selected.length));
    return shuffle(selected,random);
  }
  private allocate(count:number):Record<Difficulty,number> {
    const raw=(Object.keys(TARGET) as Difficulty[]).map((difficulty)=>({difficulty,exact:count*TARGET[difficulty],base:Math.floor(count*TARGET[difficulty])})); let remaining=count-raw.reduce((sum,item)=>sum+item.base,0); raw.sort((a,b)=>(b.exact-b.base)-(a.exact-a.base)); for (const item of raw) { if (remaining<=0) break; item.base+=1; remaining-=1; }
    return Object.fromEntries(raw.map((item)=>[item.difficulty,item.base])) as Record<Difficulty,number>;
  }
}
