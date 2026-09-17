import { readFile, writeFile, mkdir } from 'node:fs/promises';

const login = 'brittytino';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'brittytino-profile' };
if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
async function api(path, body) {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status} for ${path}`);
  const data = await response.json();
  if (data.errors) throw new Error('GitHub GraphQL query failed');
  return data;
}
const escape = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;').replace(/[\r\n]+/g, ' ').replace(/([\[\]*_`])/g, '\\$1');
const repos = [];
for (let page = 1; ; page++) {
  const batch = await api(`users/${login}/repos?type=owner&per_page=100&page=${page}`);
  repos.push(...batch);
  if (batch.length < 100) break;
}
const originals = repos.filter(r => !r.private && !r.fork && !r.archived && r.name !== login);
originals.sort((a,b) => b.stargazers_count-a.stargazers_count || Date.parse(b.pushed_at)-Date.parse(a.pushed_at) || a.name.localeCompare(b.name));
const query = `query($login:String!){user(login:$login){contributionsCollection{totalCommitContributions totalPullRequestContributions totalIssueContributions totalPullRequestReviewContributions contributionCalendar{totalContributions weeks{contributionDays{date weekday contributionCount contributionLevel}}}}}}`;
const result = await api('graphql', { query, variables: { login } });
const c = result.data.user.contributionsCollection;
const calendar = c.contributionCalendar;
const prs = await api(`search/issues?q=${encodeURIComponent(`is:pr is:public author:${login}`)}&sort=updated&order=desc&per_page=5`);
if (prs.incomplete_results) throw new Error('Incomplete PR search; retaining previous profile');
const colors = { NONE:'#23283a', FIRST_QUARTILE:'#44572d', SECOND_QUARTILE:'#668f35', THIRD_QUARTILE:'#91bf43', FOURTH_QUARTILE:'#bef264' };
const squares = calendar.weeks.flatMap((w,x) => w.contributionDays.map(d => `<rect x="${24+x*17}" y="${68+d.weekday*17}" width="13" height="13" rx="3" fill="${colors[d.contributionLevel] || colors.NONE}"><title>${d.date}: ${d.contributionCount} contributions</title></rect>`)).join('');
const width = Math.max(760, calendar.weeks.length*17+48);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="224" viewBox="0 0 ${width} 224" role="img" aria-label="GitHub contributions over the last year"><rect width="100%" height="100%" rx="16" fill="#101320"/><text x="24" y="36" fill="#bef264" font-family="monospace" font-size="18">THE COMMIT GARDEN / ${calendar.totalContributions} contributions</text>${squares}<text x="24" y="206" fill="#b8b4cc" font-family="monospace" font-size="12">Last year · GitHub contribution calendar · brighter = more activity</text></svg>\n`;
const languages = new Map();
for (const r of originals) if (r.language) languages.set(r.language, (languages.get(r.language)||0)+1);
const live = [
  `Updated **${new Date().toISOString().slice(0,10)} UTC** · refreshed daily by my profile bot.`,
  '',
  '| Last-year contributions | Commits | Pull requests | Issues | PR reviews |',
  '| ---: | ---: | ---: | ---: | ---: |',
  `| ${calendar.totalContributions} | ${c.totalCommitContributions} | ${c.totalPullRequestContributions} | ${c.totalIssueContributions} | ${c.totalPullRequestReviewContributions} |`,
  '',
  '![Contribution garden](assets/contributions.svg)',
  '',
  '#### ⭐ Top repositories',
  'Public, original, non-archived projects; ranked by stars, then latest push.',
  '',
  '| Project | What it does | Language | Stars |',
  '| :--- | :--- | :--- | ---: |',
  ...originals.slice(0,5).map(r => `| [${escape(r.name)}](${r.html_url}) | ${escape(r.description || 'An experiment from the workbench.')} | ${escape(r.language || '—')} | ${r.stargazers_count} |`),
  '',
  `**Languages across original repos:** ${[...languages].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([l,n])=>`${escape(l)} (${n})`).join(' · ') || 'No language data yet'}. Counts are repositories, not proficiency.`,
  '',
  '#### 🔀 Recent public pull requests',
  ...prs.items.map(p => `- [${escape(p.title)}](${p.html_url}) — ${escape(p.repository_url.split('/').slice(-2).join('/'))} · ${p.pull_request?.merged_at ? 'merged' : p.state}`),
  ...(prs.items.length ? [] : ['No public pull requests found yet.']),
  '',
  '<sub>Contribution counts follow GitHub’s calendar rules and the workflow token’s visibility; they are not a count of every commit ever made. PRs above are the most recently updated public PRs.</sub>'
].join('\n');
const path = 'README.md';
const readme = await readFile(path, 'utf8');
const start = '<!-- LIVE:START -->', end = '<!-- LIVE:END -->';
if (readme.split(start).length !== 2 || readme.split(end).length !== 2 || readme.indexOf(start) > readme.indexOf(end)) throw new Error('Expected one ordered LIVE marker pair');
const updated = readme.slice(0,readme.indexOf(start)+start.length) + '\n' + live + '\n' + readme.slice(readme.indexOf(end));
// Fetch everything successfully before writing; failed API calls retain the last good output.
await mkdir('assets', {recursive:true});
await writeFile('assets/contributions.svg', svg);
await writeFile(path, updated);
console.log('Profile refreshed successfully');
