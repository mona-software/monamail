import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, renameSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const reference = '/Users/themon/monacloud/mcp/node_modules';
const modules = existsSync(path.join(root, 'node_modules/.bin/tsc')) ? path.join(root, 'node_modules') : reference;
const compiler = path.join(modules, '.bin/tsc');
if (!existsSync(compiler)) throw new Error('Cần tsc cục bộ hoặc MONA Cloud MCP đã có sẵn. Build không tải mạng.');
const common = ['--target', 'ES2022', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--typeRoots', path.join(modules, '@types'), '--types', 'node'];
mkdirSync(path.join(root, '.build-cjs'), { recursive: true });
copyFileSync(path.join(root, 'src/index.ts'), path.join(root, '.build-cjs/index.cts'));
try {
  for (const args of [['src/index.ts','--declaration','--outDir','dist'],['.build-cjs/index.cts','--outDir','.build-cjs/out']]) {
    const result = spawnSync(compiler, [...args,...common], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) process.exitCode = result.status ?? 1;
    if (process.exitCode) break;
  }
  if (!process.exitCode) renameSync(path.join(root, '.build-cjs/out/index.cjs'), path.join(root, 'dist/index.cjs'));
} finally { rmSync(path.join(root, '.build-cjs'), { recursive: true, force: true }); }
