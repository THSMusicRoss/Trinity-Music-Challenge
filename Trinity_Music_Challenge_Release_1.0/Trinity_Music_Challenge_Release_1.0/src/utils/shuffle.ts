export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result=[...items];
  for (let index=result.length-1; index>0; index-=1) { const swapIndex=Math.floor(random()*(index+1)); const current=result[index]; const other=result[swapIndex]; if (current===undefined || other===undefined) continue; result[index]=other; result[swapIndex]=current; }
  return result;
}
