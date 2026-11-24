import { spawnSync } from "node:child_process";

const patterns = process.argv.slice(2);
const result = spawnSync(process.execPath, ["--test", "--test-concurrency=1", ...(patterns.length ? patterns : ["tests/src/*.test.ts"])], {
  cwd: new URL("../", import.meta.url),
  env: { ...process.env, NODE_CTYPES_NO_EXTERNAL_BUFFERS: "1" },
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.signal || result.status === null) throw new Error(`Mirrored tests terminated: ${result.signal ?? "no exit status"}`);
process.exitCode = result.status;
