// Turns a monitor result into one GitHub issue per incident and closes it on
// recovery, so the owner gets one notification when a problem is confirmed
// and one when it is over, never a stream of identical messages.
//
//   GITHUB_TOKEN=… GITHUB_REPOSITORY=owner/repo node scripts/monitor/report.mjs
//
// Exit code 1 only when a NEW incident was opened: that single failed run is
// what GitHub e-mails about. Ongoing incidents and recoveries exit 0.

import { readFile } from 'node:fs/promises';

const result = JSON.parse(await readFile('monitor-result.json', 'utf8'));
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const runURL = process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';
if (!repository || !token) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');

const LABEL = 'monitoring';
const TITLES = { health: 'Мониторинг: сбой на сайте прихода', release: 'Мониторинг: выпуск .net не виден на сайте', links: 'Мониторинг: битые ссылки или ресурсы' };
const title = TITLES[result.mode] || TITLES.health;
const owner = repository.split('/')[0];

async function api(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', ...(init.headers || {}) },
    body: init.body ? JSON.stringify(init.body) : undefined
  });
  if (!response.ok) throw new Error(`GitHub API ${init.method || 'GET'} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

const vilnius = iso => new Intl.DateTimeFormat('ru-LT', { timeZone: 'Europe/Vilnius', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
const signature = result.failures.map(item => item.id).sort().join('|');
const list = result.failures.map(item => `- \`${item.id}\` — ${item.detail}`).join('\n');
const footer = `\n\n${result.notes.map(note => `_${note}_`).join('\n')}\n\nЗапуск: ${runURL}\n<!-- signature:${signature} -->`;

const issues = await api(`/repos/${repository}/issues?state=open&labels=${LABEL}&per_page=20`);
const open = issues.find(issue => issue.title === title);

if (result.failures.length === 0) {
  if (open) {
    await api(`/repos/${repository}/issues/${open.number}/comments`, { method: 'POST', body: { body: `✅ Восстановлено: все проверки прошли ${vilnius(result.checkedAt)} (время Вильнюса).${runURL ? `\n\nЗапуск: ${runURL}` : ''}` } });
    await api(`/repos/${repository}/issues/${open.number}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed' } });
    console.log(`Recovered: closed issue #${open.number}`);
  } else console.log('All checks passed; nothing to report.');
  process.exit(0);
}

const body = `Подтверждённый сбой ${vilnius(result.checkedAt)} (время Вильнюса), после повторной попытки.\n\n${list}${footer}\n\nЧто делать: см. MAINTENANCE.md, раздел «Если пришла тревога». Issue закроется автоматически, когда проверки снова пройдут.`;
if (!open) {
  const issue = await api(`/repos/${repository}/issues`, { method: 'POST', body: { title, body, labels: [LABEL], assignees: [owner] } });
  console.log(`Opened issue #${issue.number}`);
  process.exit(1);
}
const previous = (open.body?.match(/<!-- signature:([^>]*) -->/) || [])[1] ?? '';
if (previous === signature) {
  console.log(`Incident unchanged; issue #${open.number} stays open without a new comment.`);
  process.exit(0);
}
await api(`/repos/${repository}/issues/${open.number}`, { method: 'PATCH', body: { body } });
await api(`/repos/${repository}/issues/${open.number}/comments`, { method: 'POST', body: { body: `Состав сбоя изменился ${vilnius(result.checkedAt)}:\n\n${list}` } });
console.log(`Updated issue #${open.number}`);
