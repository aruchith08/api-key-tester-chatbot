import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const localVite = path.resolve(process.cwd(), 'node_modules/vite/bin/vite.js');
const fallbackVite = 'C:/Users/aruch/.arh_env/node_modules/vite/bin/vite.js';
const fallbackModules = 'C:/Users/aruch/.arh_env/node_modules';

const viteBin = fs.existsSync(localVite) ? localVite : fallbackVite;

const nodePaths = [
  path.resolve(process.cwd(), 'node_modules'),
  fs.existsSync(fallbackModules) ? fallbackModules : null,
  process.env.NODE_PATH
].filter(Boolean);

const child = spawn(process.execPath, [viteBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_PATH: nodePaths.join(path.delimiter)
  }
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
