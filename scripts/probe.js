// Check candidate NEOGOV slugs (and SmartRecruiters company ids) before adding an agency.
// Usage: node scripts/probe.js slug1 slug2 ... [sr:CompanyId ...]
// Prints the feed's channel title and item count, or the error, for each.

import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  removeNSPrefix: true,
  isArray: (n) => n === "item",
  processEntities: { maxTotalExpansions: 1_000_000, maxExpansionDepth: 10, maxExpandedLength: 50_000_000 },
});
const UA = "StreetsForAll-JobBoard/1.0 (+https://jobs.streetsforall.org)";

async function probe(arg) {
  try {
    if (arg.startsWith("sr:")) {
      const id = arg.slice(3);
      const r = await fetch(`https://api.smartrecruiters.com/v1/companies/${id}/postings?limit=100`, { headers: { "User-Agent": UA } });
      const j = await r.json();
      return `${arg.padEnd(34)} HTTP ${r.status}  total=${j.totalFound ?? "?"}  e.g. ${(j.content || []).slice(0, 3).map((p) => p.name).join(" | ")}`;
    }
    const r = await fetch(`https://www.governmentjobs.com/SearchEngine/JobsFeed?agency=${arg}`, { headers: { "User-Agent": UA } });
    const xml = await r.text();
    const ch = parser.parse(xml)?.rss?.channel;
    const items = ch?.item || [];
    return `${arg.padEnd(34)} HTTP ${r.status}  "${ch?.title ?? "(no channel)"}"  items=${items.length}  e.g. ${items.slice(0, 3).map((i) => i.title).join(" | ")}`;
  } catch (e) {
    return `${arg.padEnd(34)} ERROR ${e.message}`;
  }
}

const out = await Promise.all(process.argv.slice(2).map(probe));
console.log(out.join("\n"));
