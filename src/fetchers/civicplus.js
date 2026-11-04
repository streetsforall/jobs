// CivicPlus "Jobs" module RSS (used by City of Inglewood). Standard RSS 2.0 items;
// CivicPlus puts the closing date and salary in the description HTML, if at all.

import { XMLParser } from "fast-xml-parser";
import { fetchText, stripHtml, toISODate } from "../util.js";

const parser = new XMLParser({
  ignoreAttributes: true,
  isArray: (n) => n === "item",
  parseTagValue: false,
  // Job feeds escape every &, < and > in their HTML descriptions, so a normal feed has
  // thousands of standard entities. Raise the total-count cap; keep the size and depth
  // caps that guard against entity-expansion attacks.
  processEntities: { maxTotalExpansions: 1_000_000, maxExpansionDepth: 10, maxExpandedLength: 50_000_000 },
});

export async function fetchCivicPlus(agency) {
  const doc = parser.parse(await fetchText(agency.feedUrl));
  const items = doc?.rss?.channel?.item || [];
  return items.map((item) => {
    const desc = stripHtml(String(item.description || ""));
    const close = desc.match(/(?:clos(?:e|es|ing)(?: date)?|deadline|final filing date)[:\s]+([A-Z][a-z]+ \d{1,2},? \d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1];
    const pay = desc.match(/\$\s?([\d,]+(?:\.\d+)?)\s*(?:-|–|to)\s*\$\s?([\d,]+(?:\.\d+)?)/);
    const num = (s) => Number(s.replace(/,/g, ""));
    const link = String(item.link || item.guid || "");
    return {
      id: `${agency.id}:${link.match(/JobID=(\d+)/i)?.[1] || link}`,
      agency: agency.id,
      title: String(item.title || "").trim(),
      department: desc.match(/Department:\s*([^.;|]+?)(?:\s{2,}|Salary|Closing|$)/i)?.[1]?.trim() || "",
      salary: pay ? { min: num(pay[1]), max: num(pay[2]), interval: num(pay[2]) < 500 ? "hour" : num(pay[2]) < 20000 ? "month" : "year" } : null,
      posted: toISODate(String(item.pubDate || "")),
      closes: /until filled|continuous/i.test(desc) ? "continuous" : close ? toISODate(new Date(close).toISOString()) : null,
      url: link,
      summary: desc.slice(0, 400),
      internalOnly: /promotional|internal only|employees only/i.test(`${item.title} ${desc.slice(0, 200)}`),
    };
  });
}
