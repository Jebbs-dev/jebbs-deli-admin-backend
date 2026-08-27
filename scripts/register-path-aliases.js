/**
 * Resolve TypeScript path aliases at runtime so `tsc --watch` can emit
 * `@shared/` requires and Node can load them before (or without) rewrite.
 */
const Module = require('module');
const path = require('path');

const distRoot = path.resolve(__dirname, '../dist/apps/api');

const ALIASES = [
  ['@shared/', path.join(distRoot, 'libs/shared/')],
  ['@generated/', path.join(distRoot, 'generated/')],
  ['@emails/', path.join(distRoot, 'emails/')],
  ['@api/', path.join(distRoot, 'apps/api/src/')],
];

const original = Module._resolveFilename;
Module._resolveFilename = function resolveAliased(request, parent, isMain, options) {
  for (const [prefix, target] of ALIASES) {
    if (request.startsWith(prefix)) {
      request = path.join(target, request.slice(prefix.length));
      break;
    }
  }
  return original.call(this, request, parent, isMain, options);
};
