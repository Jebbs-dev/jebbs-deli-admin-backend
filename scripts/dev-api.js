/**
 * Dev runner: tsc --watch + alias rewrite + node --watch on the API entry.
 */
const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'dist/apps/api/main.js');

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
}

function rewrite() {
  require('./rewrite-dist-aliases.js');
}

// Initial build
const build = run('pnpm', ['exec', 'tsc', '-p', 'apps/api/tsconfig.app.json'], {
  stdio: 'inherit',
});

build.on('exit', (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }
  rewrite();

  const tsc = run('pnpm', [
    'exec',
    'tsc',
    '-p',
    'apps/api/tsconfig.app.json',
    '--watch',
    '--preserveWatchOutput',
  ]);

  // Rewrite aliases whenever tsc finishes a watch rebuild.
  // Hook by wrapping: poll is fragile; instead rewrite on each SIGUSR isn't available.
  // Use a small debounce on dist file mtime via fs.watch.
  const fs = require('fs');
  let timer = null;
  const distDir = path.join(root, 'dist/apps/api');
  try {
    fs.watch(distDir, { recursive: true }, (_event, filename) => {
      if (!filename || !String(filename).endsWith('.js')) return;
      if (String(filename) === 'main.js') return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          rewrite();
        } catch (err) {
          console.error(err);
        }
      }, 300);
    });
  } catch {
    // recursive watch unsupported on some platforms; periodic rewrite fallback
    setInterval(() => {
      try {
        rewrite();
      } catch {
        /* ignore */
      }
    }, 2000);
  }

  const node = run('node', [
    '--watch',
    '-r',
    path.join(root, 'scripts/register-path-aliases.js'),
    entry,
  ]);

  const shutdown = () => {
    tsc.kill('SIGTERM');
    node.kill('SIGTERM');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
});
