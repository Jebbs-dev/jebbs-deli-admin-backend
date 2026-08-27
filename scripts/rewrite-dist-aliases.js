/**
 * Rewrite TypeScript path aliases in compiled JS under dist/apps/api.
 * Nest monorepo + tsc leaves @shared/@generated/@emails requires intact.
 */
const fs = require('fs');
const path = require('path');

const DIST_ROOT = path.resolve(__dirname, '../dist/apps/api');

const ALIASES = [
  { prefix: '@shared/', target: 'libs/shared/' },
  { prefix: '@generated/', target: 'generated/' },
  { prefix: '@emails/', target: 'emails/' },
  { prefix: '@api/', target: 'apps/api/src/' },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && full.endsWith('.js')) files.push(full);
  }
  return files;
}

function rewriteFile(filePath) {
  let source = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const dir = path.dirname(filePath);

  for (const { prefix, target } of ALIASES) {
    const patterns = [
      new RegExp(`require\\(["']${prefix.replace('/', '\\/')}([^"']+)["']\\)`, 'g'),
      new RegExp(`from\\s+["']${prefix.replace('/', '\\/')}([^"']+)["']`, 'g'),
    ];

    for (const pattern of patterns) {
      source = source.replace(pattern, (match, subpath) => {
        const absoluteTarget = path.join(DIST_ROOT, target, subpath);
        let relative = path.relative(dir, absoluteTarget).replace(/\\/g, '/');
        if (!relative.startsWith('.')) relative = `./${relative}`;
        changed = true;
        if (match.startsWith('require')) {
          return `require("${relative}")`;
        }
        const quote = match.includes('"') ? '"' : "'";
        return `from ${quote}${relative}${quote}`;
      });
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, source);
  }
  return changed;
}

function writeEntry() {
  const entry = path.join(DIST_ROOT, 'main.js');
  fs.writeFileSync(
    entry,
    `const Module = require("module");
const path = require("path");
const distRoot = __dirname;
const aliases = [
  ["@shared/", path.join(distRoot, "libs/shared/")],
  ["@generated/", path.join(distRoot, "generated/")],
  ["@emails/", path.join(distRoot, "emails/")],
  ["@api/", path.join(distRoot, "apps/api/src/")],
];
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  for (const [prefix, dir] of aliases) {
    if (request.startsWith(prefix)) {
      request = path.join(dir, request.slice(prefix.length));
      break;
    }
  }
  return original.call(this, request, parent, isMain, options);
};
require("./apps/api/src/main.js");
`,
  );
}

const files = walk(DIST_ROOT);
let count = 0;
for (const file of files) {
  if (rewriteFile(file)) count += 1;
}
writeEntry();
console.log(`Rewrote aliases in ${count}/${files.length} files; wrote dist/apps/api/main.js`);
