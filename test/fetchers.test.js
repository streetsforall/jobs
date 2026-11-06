import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fetchNeogov } from "../src/fetchers/neogov.js";
import { classify } from "../config/categories.js";
import { buildMessage, formatSalary } from "../src/slack.js";

const fixture = fs.readFileSync(new URL("./fixtures/neogov.rss", import.meta.url), "utf8");

test("parses the NEOGOV job feed", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(fixture));
  const jobs = await fetchNeogov({ id: "fx", slug: "fixture" });
  assert.equal(jobs.length, 4);
  const [eng, , gis, promo] = jobs;
  assert.equal(eng.id, "fx:100001");
  assert.equal(eng.title, "Transportation Engineering Associate");
  assert.equal(eng.department, "Transportation");
  assert.deepEqual(eng.salary, { min: 98000, max: 143500, interval: "year" });
  assert.equal(eng.posted, "2026-11-01");
  assert.equal(eng.closes, "2026-11-30"); // local deadline, not the UTC rollover
  assert.equal(eng.summary, "Designs & reviews street improvements.");
  assert.equal(gis.closes, "continuous");
  assert.equal(gis.posted, "2026-11-02");
  assert.equal(promo.internalOnly, true);

  const kept = jobs.filter((j) => !j.internalOnly && classify(j));
  assert.deepEqual(kept.map((j) => j.id), ["fx:100001", "fx:100003"]);
});

test("formats salaries for Slack and the site", () => {
  assert.equal(formatSalary({ min: 98000, max: 143500, interval: "year" }), "$98K–$144K");
  assert.equal(formatSalary({ min: 41.5, max: 55.25, interval: "hourly" }), "$41.50–$55.25/hr");
  assert.equal(formatSalary({ min: 6000, max: 8000, interval: "month" }), "$6,000–$8,000/mo");
  assert.equal(formatSalary(null), "");
});

test("Slack message groups by category and caps the list", () => {
  const jobs = Array.from({ length: 40 }, (_, i) => ({
    id: `a:${i}`, agency: "lacity", title: `Job <${i}>`, url: `https://x/${i}`,
    categories: [i % 2 ? "gis" : "engineering"], salary: null, closes: "continuous",
  }));
  jobs[1].agency = "oakland";
  const msg = buildMessage(jobs, [{ id: "lacity", short: "City of LA", region: "socal" }, { id: "oakland", short: "Oakland", region: "norcal" }]);
  const text = JSON.stringify(msg.blocks);
  assert.match(msg.blocks[0].text.text, /40 new public-sector jobs/);
  assert.match(text, /Engineering & Planning/);
  assert.match(text, /Southern California\* \(39\)/);
  assert.match(text, /Northern California\* \(1\)/);
  assert.match(text, /GIS & Data/);
  assert.match(text, /\+19 more in Southern California/);
  assert.match(text, /Job &lt;0&gt;/);
  assert.ok(msg.blocks.length <= 50);
});

test("handles feeds with thousands of escaped entities", async (t) => {
  const big = fixture.replace("Designs &amp;amp; reviews", "&lt;b&gt;x&lt;/b&gt; ".repeat(3000) + "Designs &amp;amp; reviews");
  t.mock.method(globalThis, "fetch", async () => new Response(big));
  const jobs = await fetchNeogov({ id: "fx", slug: "fixture" });
  assert.equal(jobs.length, 4);
});
