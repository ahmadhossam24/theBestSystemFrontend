// Copies ../app/lib/org next to the tests (so Node can load it as ES modules) and runs both suites.
import { cpSync, rmSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(here, "org");
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(path.join(here, "..", "app", "lib", "org"), dest, { recursive: true });

let failed = false;
for (const f of ["perm.test.mjs", "service.test.mjs"]) {
  console.log(`\n=== ${f}`);
  const r = spawnSync(process.execPath, [path.join(here, f)], { stdio: "inherit", cwd: here });
  if (r.status !== 0) failed = true;
}
rmSync(dest, { recursive: true, force: true });
console.log(failed ? "\nSOME TESTS FAILED" : "\nALL TESTS PASSED");
process.exit(failed ? 1 : 0);
