// NEOGOV / GovernmentJobs.com agencies.
//
// Uses NEOGOV's official RSS job feed — the documented way for agencies to syndicate
// their openings to external sites (format announced in NEOGOV's Dec 2024 / Summer
// 2025 release notes): https://www.governmentjobs.com/SearchEngine/JobsFeed?agency=<slug>
// We read the feed only; we never crawl governmentjobs.com pages.
//
// The parser is tolerant of field-name drift: NEOGOV has renamed elements before
// (the pre-2025 feed lived at agency.governmentjobs.com/<slug>/default.cfm?format=xml).

import { XMLParser } from "fast-xml-parser";
import { fetchText, stripHtml, toISODate } from "../util.js";

const FEED = (slug) => `https://www.governmentjobs.com/SearchEngine/JobsFeed?agency=${encodeURIComponent(slug)}`;

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true, // joblisting:jobId -> jobId
  isArray: (name) => name === "item" || name === "category",
  textNodeName: "#text",
  parseTagValue: false,
});

const text = (v) => (v == null ? "" : typeof v === "object" ? String(v["#text"] ?? "") : String(v)).trim();

function salary(item) {
  const min = Number(String(text(item.minimumSalary)).replace(/[^0-9.]/g, ""));
  const max = Number(String(text(item.maximumSalary)).replace(/[^0-9.]/g, ""));
  const interval = text(item.salaryInterval) || "";
  if (!min && !max) return null;
  return { min: min || null, max: max || null, interval: interval.toLowerCase() || null };
}

export async function fetchNeogov(agency) {
  const xml = await fetchText(FEED(agency.slug));
  const doc = parser.parse(xml);
  const items = doc?.rss?.channel?.item || [];
  return items.map((item) => {
    const id = text(item.jobId) || text(item.guid).split(/[=/]/).filter(Boolean).pop();
    const closes = text(item.advertiseToDateTime);
    const link = text(item.link) || text(item.guid);
    return {
      id: `${agency.id}:${id}`,
      agency: agency.id,
      title: text(item.title),
      department: text(item.department),
      location: text(item.location),
      jobType: text(item.jobType),
      salary: salary(item),
      posted: toISODate(text(item.advertiseFromDateUTC) || text(item.advertiseFromDate) || text(item.pubDate)),
      closes: /continuous|until filled|open until/i.test(closes) ? "continuous" : toISODate(closes || text(item.advertiseToDateTimeUTC)),
      url: link.replace(/^http:/, "https:"),
      summary: stripHtml(text(item.description)).slice(0, 400),
      // NEOGOV marks promotional (employee-only) recruitments in the job type or title.
      internalOnly: /promotional|employees only|internal only/i.test(`${text(item.jobType)} ${text(item.title)}`),
    };
  });
}
