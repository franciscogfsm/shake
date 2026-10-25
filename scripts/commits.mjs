// Snapshot the git history for the "Built in 24h" slide (run before each deploy: npm run commits).
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const log = execSync('git log --reverse --pretty=format:%H%x09%aI%x09%an%x09%s', { encoding: "utf8" }).trim().split("\n");
const commits = log.map((l) => { const [hash, at, author, subject] = l.split("\t"); return { hash: hash.slice(0, 7), at, author, subject }; });
writeFileSync(new URL("../src/data/commits.json", import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), commits }, null, 1));
console.log(`${commits.length} commits`);
