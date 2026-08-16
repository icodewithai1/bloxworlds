/* BloxWorlds build script
 * Obfuscates src/*.js -> js/*.js for GitHub Pages deployment.
 * Run:  node tools/build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Ob = require('javascript-obfuscator');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'js');

const OPTS = {
  compact: true,
  simplify: true,
  selfDefending: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  stringArray: true,
  stringArrayThreshold: 1,
  stringArrayEncoding: ['rc4'],
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 5,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersType: 'function',
  stringArrayIndexShift: true,
  splitStrings: true,
  splitStringsChunkLength: 6,
  transformObjectKeys: true,
  numbersToExpressions: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  unicodeEscapeSequence: false,
  disableConsoleOutput: false,
  debugProtection: false
};

fs.mkdirSync(OUT, { recursive: true });

for (const file of fs.readdirSync(SRC)) {
  if (!file.endsWith('.js')) continue;
  const code = fs.readFileSync(path.join(SRC, file), 'utf8');
  const t0 = Date.now();
  const result = Ob.obfuscate(code, { ...OPTS, seed: Math.floor(Math.random() * 1e9) });
  fs.writeFileSync(path.join(OUT, file), result.getObfuscatedCode());
  const inKb = (code.length / 1024).toFixed(1);
  const outKb = (result.getObfuscatedCode().length / 1024).toFixed(1);
  console.log(`obfuscated ${file}: ${inKb} KB -> ${outKb} KB (${Date.now() - t0} ms)`);
}
console.log('done. deploy the repo (js/ folder is what pages serves).');
