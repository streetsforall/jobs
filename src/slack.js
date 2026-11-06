// Daily #jobs post. One message per day, only when there are new postings.
// Posts as the existing Streets For All Slack bot (SLACK_BOT_TOKEN, the same app
// agenda-watch uses) into SLACK_JOBS_CHANNEL_ID. Invite the bot to #jobs first.

import { CATEGORY_LABELS, CATEGORIES } from "../config/categories.js";
import { REGIONS } from "../config/agencies.js";

const SITE = process.env.SITE_URL || "https://www.streetsforall.org/jobs";
// Per region, so a busy day in one region never crowds the other out of the post.
const MAX_PER_REGION = 20;

const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function formatSalary(s) {
  if (!s || (!s.min && !s.max)) return "";
  const iv = s.interval || "";
  const yearly = !/hour|month|week|day/.test(iv);
  const fmt = (n) => (yearly && n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`);
  const range = s.min && s.max && s.min !== s.max ? `${fmt(s.min)}–${fmt(s.max)}` : fmt(s.min || s.max);
  return /hour/.test(s.interval || "") ? `${range}/hr` : /month/.test(s.interval || "") ? `${range}/mo` : range;
}

function formatClose(c) {
  if (!c) return "";
  if (c === "continuous") return "open until filled";
  const d = new Date(`${c}T12:00:00Z`);
  return `closes ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

export function buildMessage(newJobs, agencies) {
  const byId = Object.fromEntries(agencies.map((a) => [a.id, a]));
  const n = newJobs.length;
  const blocks = [
    { type: "header", text: { type: "plain_text", text: `🚲 ${n} new public-sector job${n === 1 ? "" : "s"} today` } },
    { type: "context", elements: [{ type: "mrkdwn", text: `Planning, engineering, outreach, GIS and project roles at California agencies. Full board: <${SITE}|streetsforall.org/jobs>` }] },
  ];
  for (const region of REGIONS) {
    const inRegion = newJobs.filter((j) => (byId[j.agency]?.region || "socal") === region.id);
    if (!inRegion.length) continue;
    let listed = 0;
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `*${region.name}* (${inRegion.length}) · <${SITE}?region=${region.id}|see all>` } });
    for (const cat of CATEGORIES) {
      const jobs = inRegion.filter((j) => j.categories[0] === cat.id);
      if (!jobs.length || listed >= MAX_PER_REGION) continue;
      const lines = [];
      for (const j of jobs) {
        if (listed >= MAX_PER_REGION) break;
        const a = byId[j.agency];
        const meta = [a?.short || a?.name || j.agency, formatSalary(j.salary), formatClose(j.closes)].filter(Boolean).join(" · ");
        lines.push(`• <${j.url}|${esc(j.title)}> — ${esc(meta)}`);
        listed++;
      }
      // Section text caps at 3000 chars; split long categories across sections.
      let chunk = `_${CATEGORY_LABELS[cat.id]}_`;
      for (const line of lines) {
        if (chunk.length + line.length + 1 > 2900) {
          blocks.push({ type: "section", text: { type: "mrkdwn", text: chunk } });
          chunk = "";
        }
        chunk += `\n${line}`;
      }
      blocks.push({ type: "section", text: { type: "mrkdwn", text: chunk } });
    }
    if (inRegion.length > listed) {
      blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `+${inRegion.length - listed} more in ${region.name} on <${SITE}?region=${region.id}|the job board>` }] });
    }
  }
  return { text: `${n} new public-sector job${n === 1 ? "" : "s"} today — ${SITE}`, blocks: blocks.slice(0, 50), unfurl_links: false, unfurl_media: false };
}

export async function postToSlack(message) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_JOBS_CHANNEL_ID;
  if (!token || !channel) throw new Error("SLACK_BOT_TOKEN / SLACK_JOBS_CHANNEL_ID not set");
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ channel, ...message }),
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`Slack chat.postMessage failed: ${body.error}`);
  return body.ts;
}
