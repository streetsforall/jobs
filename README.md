# SFA Jobs — jobs.streetsforall.org

Public-sector job board for the Streets For All community. Every morning it pulls open
positions from LA-area agencies, keeps the ones in planning/engineering, outreach/policy,
GIS/data and project management, publishes them at **jobs.streetsforall.org**, and posts
anything new to **#jobs** in Slack.

## Where everything runs

| Job | Runs on | Triggered by | Code |
|---|---|---|---|
| Fetch listings, post new ones to Slack #jobs, commit `site/jobs.json` | GitHub Actions `jobs` | schedule, daily ~6:40am PT | `src/run.js` |
| Job board page | Squarespace page on streetsforall.org (Code Block) that loads `embed.js` | — | `site/embed.js` |
| `jobs.json` + `embed.js` host (jobs.streetsforall.org) | GitHub Pages (deployed by the same workflow) | each run, and pushes that change `site/` | `site/` |

Secrets and variables (names only):
- `SLACK_BOT_TOKEN` (secret) — the existing Streets For All Slack app, same one agenda-watch uses. The bot must be a member of #jobs.
- `SLACK_JOBS_CHANNEL_ID` (variable) — `C08CFG5RFQ8` (#jobs).

## The Squarespace page

The board is a normal Squarespace page (e.g. streetsforall.org/jobs) with one Code Block:

```html
<div id="sfa-jobs"></div>
<script src="https://jobs.streetsforall.org/embed.js" defer></script>
```

The widget inherits the site's fonts and uses the S4A palette; the page title and intro
are ordinary Squarespace text blocks. jobs.streetsforall.org itself redirects to that
page (`REDIRECT` in `site/index.html`); add `?preview` to see the standalone version.

## Agencies and sources

See `config/agencies.js`.

| Agency | Source |
|---|---|
| City of LA (incl. LADOT, LADWP, StreetsLA), LA County, LA Metro, Metrolink, SCAG | NEOGOV job feed |
| Long Beach, Pasadena, Santa Monica (incl. Big Blue Bus), Glendale, Burbank, Culver City (incl. CityBus), West Hollywood, Beverly Hills, Torrance (incl. Torrance Transit) | NEOGOV job feed |
| Caltrans District 7 | CalCareers search (Department of Transportation, Los Angeles County) |
| City of Inglewood | CivicPlus jobs RSS |
| Long Beach Transit | Oracle Cloud HCM careers site |

**NEOGOV** is NEOGOV's official RSS job feed (`governmentjobs.com/SearchEngine/JobsFeed?agency=<slug>`), the
syndication feed NEOGOV documents for agencies to publish openings to outside sites. The
board reads only that feed; it does not crawl governmentjobs.com pages.

**CalCareers** has no feed or API, so `src/fetchers/calcareers.js` submits the public
search form the way a browser does. It is the most fragile source; if it breaks, only
Caltrans stops refreshing.

Not covered: **Foothill Transit** takes emailed PDF applications and its operations staff
are hired by contractors, so there is nothing to pull.

A source that fails on a given day keeps its previous listings on the site and is shown in
red in the site footer; the Actions run summary lists every source's status.

## What gets listed

Decided from the job title in `config/categories.js`:
- matches a category pattern (engineering & planning, outreach & policy, GIS & data, project management), or
- is a generic analyst/manager title in a transportation, public works or planning department, or
- contains a transportation term (active transportation, bike, pedestrian, transit, mobility…) with a professional title.

Excluded: police/fire/health/library and similar job families, IT engineering, and
frontline roles such as bus operators, mechanics and traffic officers. Promotional
(current-employees-only) recruitments and closed postings are dropped.

To adjust, edit the patterns, add a case to `test/classify.test.js`, and run `npm test`.

## Running it

```
npm ci
npm test                          # classifier, feed parser, Slack message
node src/run.js --dry-run         # fetch + print new jobs, write nothing
node src/run.js --only=lacity --dry-run
node src/run.js --baseline        # mark everything open as seen, no Slack post
```

The same `baseline` and `dry_run` options are on the workflow's "Run workflow" button.

## Launch checklist

1. Create the repo `streetsforall/jobs` and push this code.
2. Settings → Pages → Source: **GitHub Actions**. Custom domain: `jobs.streetsforall.org`, enforce HTTPS.
3. DNS: add `CNAME jobs → streetsforall.github.io`.
4. Add secret `SLACK_BOT_TOKEN` and variable `SLACK_JOBS_CHANNEL_ID=C08CFG5RFQ8`; `/invite` the bot to #jobs.
5. Run the workflow with **dry_run** and check each source in the run summary.
6. Run it once with **baseline** (publishes the site, no Slack post).
7. From then on the daily schedule posts only genuinely new jobs.
