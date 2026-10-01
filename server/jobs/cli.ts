// Run the document clean-up by hand: `npm run cleanup:documents` (add `-- --dry-run` to preview).
import { purgeRejectedDocuments } from "./purgeRejectedDocuments";

const dryRun = process.argv.includes("--dry-run");
const result = await purgeRejectedDocuments({ dryRun });
console.log(
  `${dryRun ? "[dry run] Would delete" : "Deleted"} ${result.files} file(s) from ${result.applications} rejected application(s) (rejected before ${result.cutoff}).`,
);
process.exit(0);
