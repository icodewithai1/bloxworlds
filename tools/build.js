/* BloxWorlds build script
 * 1. esbuild bundles src/games/*.js (+ the engine) into single ES modules
 *    (three & trystero stay external — loaded from vendor/ via import map)
 * 2. javascript-obfuscator deeply obfuscates each bundle -> js/*.js
 * Run:  node tools/build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const Ob = require('javascript-obfuscator');

const ROOT = path.join(__dirname, '..');
const GAMES = path.join(ROOT, 'src', 'games');
const OUT = path.join(ROOT, 'js');

const OB_OPTS = {
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

(async () => {
  for (const file of fs.readdirSync(GAMES)) {
    if (!file.endsWith('.js')) continue;
    const entry = path.join(GAMES, file);

    const bundled = await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      format: 'esm',
      write: false,
      external: ['three', 'trystero/nostr'],
      target: 'es2020'
    });
    const code = bundled.outputFiles[0].text;

    const t0 = Date.now();
    const result = Ob.obfuscate(code, { ...OB_OPTS, seed: Math.floor(Math.random() * 1e9) });
    fs.writeFileSync(path.join(OUT, file), result.getObfuscatedCode());
    console.log(
      `built ${file}: src ${(code.length / 1024).toFixed(1)} KB -> obfuscated ${(result.getObfuscatedCode().length / 1024).toFixed(1)} KB (${Date.now() - t0} ms)`
    );
  }
  console.log('done. js/ is what the site loads.');
})().catch((e) => { console.error(e); process.exit(1); });
