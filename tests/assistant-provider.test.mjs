import test from 'node:test';
import assert from 'node:assert/strict';
import {providerCopy,allProviderPolicy,CLAUDE_POLICY} from '../assets/js/assistant/provider-copy.js';
import {createWebApi} from '../assets/js/assistant/web-api.js';

test('every language identifies the selected provider and its retention policy',()=>{
  assert.deepEqual(Object.keys(CLAUDE_POLICY).sort(),['de','en','lt','pl','ru','uk']);
  for (const language of Object.keys(CLAUDE_POLICY)) {
    assert.match(providerCopy(language,'openai').consent,/OpenAI/);
    const copy=providerCopy(language,'anthropic');
    assert.match(copy.consent,/Anthropic \(Claude\)/);
    assert.match(copy.policy,/30/);
    assert.doesNotMatch(copy.policy,/OpenAI|store:false/);
    assert.match(allProviderPolicy(language),/OpenAI/);
    assert.match(allProviderPolicy(language),/Anthropic/);
    assert.throws(()=>providerCopy(language,null));
  }
});

test('metadata selects notices, rejects unknown providers, and supports old OpenAI servers',async()=>{
  for (const [metadata,expected] of [[{},'openai'],[{provider:'anthropic'},'anthropic'],[{provider:null},null]]) {
    let requests=0;
    const api=createWebApi(async ()=>{requests++;return new Response(JSON.stringify({ok:true,token:'a'.repeat(64),...metadata}),{headers:{'content-type':'application/json'}});});
    assert.equal(await api.ready(),expected);
    assert.equal(await api.ready(),expected);
    assert.equal(requests,1);
  }
  const api=createWebApi(async()=>new Response(JSON.stringify({ok:true,token:'a'.repeat(64),provider:'unknown'}),{headers:{'content-type':'application/json'}}));
  await assert.rejects(api.ready(),/provider/);
});
