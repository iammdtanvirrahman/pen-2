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

test('PWA manifest and icon are wired to the app',()=>{
  assert.equal(manifest.start_url,'./');
  assert.equal(manifest.scope,'./');
  assert.equal(manifest.display,'standalone');
  assert.ok(manifest.icons.some(icon=>icon.src==='./icon.svg'));
  assert.match(html,/rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html,/rel="icon" type="image\/svg\+xml" href="\.\/icon\.svg"/);
  assert.match(main,/serviceWorker\.register\('\.\/sw\.js'\)/);
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
test('offline shell calls out the first online visit requirement',()=>{
  assert.match(worker,/Open Pen Game once online/);
  assert.match(worker,/peerjs/i);
});
