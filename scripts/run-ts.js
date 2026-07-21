/**
 * Bootstrap TypeScript scripts under ts-node.
 * Prisma's generated client imports `.js` paths that map to `.ts` sources;
 * this shim resolves those when running via CommonJS ts-node.
 */
const Module = require('module');
const path = require('path');
const fs = require('fs');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return originalResolve.call(this, request, parent, isMain, options);
  } catch (error) {
    if (
      error?.code === 'MODULE_NOT_FOUND' &&
      typeof request === 'string' &&
      request.endsWith('.js')
    ) {
      const tsRequest = request.replace(/\.js$/, '.ts');
      try {
        return originalResolve.call(this, tsRequest, parent, isMain, options);
      } catch {
        // Fall through and try filesystem resolution.
      }

      if (parent?.filename && (request.startsWith('./') || request.startsWith('../'))) {
        const base = path.resolve(path.dirname(parent.filename), request);
        const tsPath = base.replace(/\.js$/, '.ts');
        if (fs.existsSync(tsPath)) {
          return tsPath;
        }
      }
    }
    throw error;
  }
};

require('ts-node').register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
    target: 'ES2022',
    esModuleInterop: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    strict: false,
    ignoreDeprecations: '6.0',
  },
});

const script = process.argv[2];
if (!script) {
  console.error('Usage: node scripts/run-ts.js <script.ts> [...args]');
  process.exit(1);
}

require(path.resolve(script));
