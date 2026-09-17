# Daily profile bot

Runs daily at 02:17 UTC (07:47 India time), manually from Actions → Refresh profile → Run workflow, and when its script or workflow changes on main. GitHub may delay scheduled jobs.

Uses GitHub's built-in repository-scoped token; no personal token, paid API, AI subscription, or external stats-image service is required. It reads public repository metadata, public PRs, and GitHub's contribution calendar. It writes only README.md and assets/contributions.svg, and commits as github-actions[bot]. Private repository names and content are never published.

Edit the README outside the LIVE markers freely. Those sections are preserved. Edit scripts/update-profile.mjs to adjust ranking or the generated sections. Original repositories exclude forks, archived repositories, and this profile repository. Language counts mean number of original repositories using a primary language, not lines of code or expertise.

API failures stop the job before generated files are written. Inspect failed runs in Actions; re-run after a transient failure. If repository rules prohibit direct bot pushes, adapt the workflow to use pull requests. GitHub can disable scheduled workflows after 60 days without repository activity; re-enable in Actions if necessary. The scheduled job does not guarantee execution at an exact minute.

To pause updates, disable the Refresh profile workflow in Actions. The last generated profile remains visible.
