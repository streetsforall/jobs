// Daily job-board refresh:
//   1. pull every agency's current openings
//   2. keep the ones in our categories (config/categories.js)
//   3. write site/jobs.json for jobs.streetsforall.org
//   4. post postings we haven't seen before to Slack #jobs
//
// Flags:
//   --dry-run   fetch + classify + print; write nothing, post nothing
//   --baseline  record everything currently open as already seen, no Slack post
//               (run once at launch so day one doesn't dump the whole board)
//   --only=<id> limit to one agency (debugging)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGENCIES } from "../config/agencies.js";
import { classify } from "../config/categories.js";
import { fetchNeogov } from "./fetchers/neogov.js";
import { fetchCalCareers } from "./fetchers/calcareers.js";
import { fetchCivicPlus } from "./fetchers/civicplus.js";
import { fetchOracleHcm } from "./fetchers/oraclehcm.js";
import { buildMessage, postToSlack } from "./slack.js";
import { log, warn, todayLA } from "./util.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = path.join(ROOT, "state", "seen.json");
const OUT_FILE = path.join(ROOT, "site", "jobs.json");

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const BASELINE = args.has("--baseline");
const ONLY = [...args].find((a) => a.startsWith("--only="))?.split("=")[1];

const FETCHERS = { neogov: fetchNeogov, calcareers: fetchCalCareers, civicplus: fetchCivicPlus, oraclehcm: fetchOracleHcm };

const readJSON = (f, fallback) => {
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return fallback; }
};
const writeJSON = (f, v) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(v, null, 1) + "\n");
};

async function main() {
  const today = todayLA();
  const agencies = AGENCIES.filter((a) => !a.disabled && (!ONLY || a.id === ONLY));
  const seen = readJSON(STATE_FILE, {});
  const previous = readJSON(OUT_FILE, { jobs: [] });

  const results = await Promise.allSettled(
    agencies.map(async (a) => {
      const fetcher = FETCHERS[a.platform];
      if (!fetcher) throw new Error(`no fetcher for platform ${a.platform}`);
      return fetcher(a);
    }),
  );

  const sources = [];
  let jobs = [];
  results.forEach((r, i) => {
    const a = agencies[i];
    if (r.status === "fulfilled") {
      const kept = [];
      for (const j of r.value) {
        if (j.internalOnly) continue;
        if (j.closes && j.closes !== "continuous" && j.closes < today) continue;
        const c = classify(j);
        if (!c) continue;
        kept.push({ ...j, ...c });
      }
      sources.push({ id: a.id, name: a.name, ok: true, total: r.value.length, listed: kept.length });
      log(`${a.id}: ${r.value.length} open, ${kept.length} relevant`);
      jobs.push(...kept);
    } else {
      warn(`${a.id}: ${r.reason?.message || r.reason}`);
      sources.push({ id: a.id, name: a.name, ok: false, error: String(r.reason?.message || r.reason).slice(0, 200) });
      // Keep yesterday's listings for a source that failed today, so one flaky feed
      // doesn't blank that agency on the site.
      jobs.push(...previous.jobs.filter((j) => j.agency === a.id && (!j.closes || j.closes === "continuous" || j.closes >= today)));
    }
  });

  // De-dupe (some agencies list one recruitment under several departments).
  const byId = new Map();
  for (const j of jobs) if (!byId.has(j.id)) byId.set(j.id, j);
  jobs = [...byId.values()];

  const fresh = jobs.filter((j) => !seen[j.id]);
  for (const j of jobs) {
    seen[j.id] ||= today;
    j.firstSeen = seen[j.id];
  }
  jobs.sort((a, b) => (b.firstSeen || "").localeCompare(a.firstSeen || "") || (b.posted || "").localeCompare(a.posted || ""));

  log(`\n${jobs.length} listings, ${fresh.length} new today${BASELINE ? " (baseline: not posting)" : ""}`);
  if (DRY) {
    for (const j of fresh) log(`  NEW [${j.categories.join(",")}] ${j.agency} — ${j.title}`);
    return;
  }

  const agencyNames = Object.fromEntries(AGENCIES.map((a) => [a.id, a.name]));
  writeJSON(OUT_FILE, {
    updated: new Date().toISOString(),
    agencies: AGENCIES.filter((a) => !a.disabled).map((a) => ({ id: a.id, name: a.name, short: a.short || a.name, careersUrl: a.careersUrl })),
    sources,
    jobs,
  });

  // Forget postings that closed more than 60 days ago, so state stays small but a
  // re-posted recruitment within that window isn't announced twice.
  const live = new Set(jobs.map((j) => j.id));
  const cutoff = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  for (const [id, d] of Object.entries(seen)) if (!live.has(id) && d < cutoff) delete seen[id];

  if (fresh.length && !BASELINE) {
    const ts = await postToSlack(buildMessage(fresh, agencyNames));
    log(`posted to Slack (ts ${ts})`);
  }
  // Save state only after a successful post: if Slack fails, tomorrow re-announces.
  writeJSON(STATE_FILE, seen);

  if (sources.every((s) => !s.ok)) throw new Error("every source failed");
  const failed = sources.filter((s) => !s.ok);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = sources.map((s) => `| ${s.name} | ${s.ok ? "✅" : "❌ " + s.error} | ${s.total ?? ""} | ${s.listed ?? ""} |`);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Job board refresh ${today}\n\n${jobs.length} listings, ${fresh.length} new\n\n| Source | Status | Open | Listed |\n|---|---|---|---|\n${rows.join("\n")}\n`);
  }
  if (failed.length) warn(`${failed.length} source(s) failed: ${failed.map((s) => s.id).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
