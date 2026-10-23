import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(path.join(root,'index.html'),'utf8');
const manifest=JSON.parse(readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
const worker=readFileSync(path.join(root,'sw.js'),'utf8');
const multiplayer=readFileSync(path.join(root,'src/multiplayer.ts'),'utf8');
const main=readFileSync(path.join(root,'src/main.tsx'),'utf8');

test('6.0 builds as a single self-contained HTML document',()=>{
  const viteConfig=readFileSync(path.join(root,'vite.config.ts'),'utf8');
  const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
  assert.equal(pkg.version,'6.0.0');
  assert.match(viteConfig,/single-html-bundle/);
  assert.match(viteConfig,/__PEN_GAME_BENCH__/);
  assert.match(viteConfig,/__PEN_GAME_BLACK_PEN__/);
  assert.match(viteConfig,/__PEN_GAME_BLUE_PEN__/);
  assert.doesNotMatch(main,/serviceWorker\\.register/);
});
test('service worker parses without syntax errors',()=>{
  assert.doesNotThrow(()=>new Script(worker,{filename:'sw.js'}));
});
test('multiplayer has timeouts and validates packets',()=>{
  assert.match(multiplayer,/20000/);
  assert.match(multiplayer,/peer\.reconnect\(\)/);
  assert.match(multiplayer,/isValidSnapshot/);
  assert.match(multiplayer,/Number\.isFinite\(dx\)/);
  assert.match(multiplayer,/resetGuestForReconnect/);
});
test('multiplayer remains available in the single-file build',()=>{
  assert.match(multiplayer,/peerjs/i);
  assert.match(multiplayer,/isValidSnapshot/);
});
