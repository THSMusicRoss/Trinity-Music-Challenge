import fs from "node:fs";
const p=new URL("../public/data/questions.json",import.meta.url); const data=JSON.parse(fs.readFileSync(p,"utf8"));
const errors=[]; const warnings=[]; const ids=new Set(); const normalized=new Map();
for (const q of data.questions) { if(ids.has(q.id)) errors.push(`Duplicate ID ${q.id}`); ids.add(q.id); if(!/^Q\d{4}$/.test(q.id)) errors.push(`Invalid core ID ${q.id}`); if(q.type==="multiple_choice"&&!q.choices.includes(q.correctAnswer)) errors.push(`${q.id}: answer not in choices`); if(q.type==="true_false"&&JSON.stringify(q.choices)!==JSON.stringify(["True","False"])) errors.push(`${q.id}: invalid T/F choices`); if(q.type==="open_response"&&q.choices.length) errors.push(`${q.id}: open response has choices`); const key=q.question.toLowerCase().replace(/[^a-z0-9]+/g," ").trim(); normalized.set(key,[...(normalized.get(key)??[]),q.id]); }
for(const group of normalized.values()) if(group.length>1) warnings.push(`Duplicate text: ${group.join(", ")}`);
console.log(JSON.stringify({questions:data.questions.length,errors:errors.length,warnings:warnings.length,warningDetails:warnings},null,2)); if(errors.length){console.error(errors.join("\n"));process.exit(1);}
