import { spawnSync } from 'node:child_process';
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const defaultBase = repository && !repository.endsWith('.github.io') ? `/${repository}/` : '/';
const base = process.env.VITE_BASE_PATH || defaultBase;
if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('VITE_BASE_PATH deve começar e terminar com /, por exemplo /Combate-FU/.');
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', `--base=${base}`], { stdio: 'inherit', env: { ...process.env, VITE_DATA_MODE: 'local' } });
process.exit(result.status ?? 1);
