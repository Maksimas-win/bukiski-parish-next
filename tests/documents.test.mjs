import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeDocument,documentPath } from '../assets/js/document-data.js';

const documents=JSON.parse(await readFile(new URL('../content/source-documents.json',import.meta.url),'utf8'));
const source=documents.find(d=>d.local.endsWith('.doc'));
const content=await readFile(new URL('../'+source.local,import.meta.url));
const envelope={filename:source.local.split('/').at(-1),mime:'application/msword',bytes:source.bytes,sha256:source.sha256,base64:content.toString('base64')};

test('Document downloads reject corrupted, oversized or mislabeled bytes',async()=>{
  const badContent=Buffer.from(content);badContent[badContent.length-1]^=1;
  for(const changes of [
    {base64:badContent.toString('base64')},{base64:envelope.base64.slice(4)},
    {bytes:6*1024*1024},{bytes:source.bytes+1},{mime:'text/html'},
    {filename:'../../notes.doc'},{filename:'document.html'},
    {sha256:'0'.repeat(64)},{base64:'<script>'+envelope.base64}
  ])await assert.rejects(decodeDocument({...envelope,...changes}));
});

test('Document download paths cannot escape the language document directory',()=>{
  assert.equal(documentPath(source,'lt'),'/lt/documents/blanki-zapisok.html');
  for(const local of ['../secret.doc','assets/documents/../secret.doc','https://example.com/file.pdf','assets/documents/file.exe'])assert.throws(()=>documentPath({local},'ru'));
  assert.throws(()=>documentPath(source,'../'));
});
