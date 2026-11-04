// CalCareers (State of California) — used for Caltrans District 7.
//
// CalCareers has no feed or API and ignores GET query parameters; its search is an
// ASP.NET WebForms page. We do what a browser does: load the search page, read the
// hidden form state (__VIEWSTATE etc.), and POST the department + county filters.
// Results link to stable JobPosting.aspx?JobControlId=N pages.
//
// This is the most fragile source on the board. If CalCareers changes its form, this
// fetcher fails on its own and the rest of the board keeps working; the site footer
// marks Caltrans as not refreshed and keeps the previous listings.

import { stripHtml, toISODate } from "../util.js";

const SEARCH = "https://calcareers.ca.gov/CalHRPublic/Search/JobSearchResults.aspx";
const UA = "StreetsForAll-JobBoard/1.0 (+https://jobs.streetsforall.org)";

function hiddenFields(html) {
  const fields = {};
  for (const m of html.matchAll(/<input[^>]+type="hidden"[^>]*>/gi)) {
    const name = m[0].match(/name="([^"]+)"/)?.[1];
    const value = m[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (name) fields[name] = value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  }
  return fields;
}

// Find a <select> whose id/name contains `key` and return [name, value] for the
// option whose text matches `label`.
function selectOption(html, key, label) {
  const sel = [...html.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)].find((m) => m[1].toLowerCase().includes(key.toLowerCase()));
  if (!sel) {
    const names = [...html.matchAll(/<select[^>]*name="([^"]+)"/gi)].map((m) => m[1]);
    throw new Error(`CalCareers: no ${key} dropdown on search page (selects: ${names.join(", ") || "none"}; page ${html.length} bytes, title "${stripHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "")}")`);
  }
  const opt = [...sel[2].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi)].find((o) => stripHtml(o[2]).toLowerCase() === label.toLowerCase());
  if (!opt) throw new Error(`CalCareers: option "${label}" not found in ${sel[1]}`);
  return [sel[1], opt[1]];
}

function cookieHeader(res) {
  return (res.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
}

function parseResults(html, agency) {
  const jobs = [];
  // Each result is a block containing a JobPosting link; slice the page at each link.
  const parts = html.split(/(?=<a[^>]+JobPosting\.aspx\?JobControlId=\d+)/i).slice(1);
  for (const part of parts) {
    const id = part.match(/JobControlId=(\d+)/i)[1];
    const block = part.slice(0, 4000);
    const title = stripHtml(block.match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] || "");
    const text = stripHtml(block);
    const pay = text.match(/\$([\d,]+(?:\.\d+)?)\s*-\s*\$([\d,]+(?:\.\d+)?)/);
    const close = text.match(/(?:Final Filing Date|Filing Deadline)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4}|Until Filled)/i)?.[1];
    const loc = text.match(/Location[:\s]*([A-Za-z .]+? County)/i)?.[1] || "";
    jobs.push({
      id: `${agency.id}:${id}`,
      agency: agency.id,
      title,
      department: "",
      location: loc,
      jobType: text.match(/(Permanent|Limited Term|Temporary Authorization|Seasonal)[^,;]*/i)?.[0]?.trim() || "",
      // CalCareers lists state pay as monthly.
      salary: pay ? { min: Number(pay[1].replace(/,/g, "")), max: Number(pay[2].replace(/,/g, "")), interval: "month" } : null,
      posted: null,
      closes: !close ? null : /until filled/i.test(close) ? "continuous" : toISODate(close),
      url: `https://calcareers.ca.gov/CalHrPublic/Jobs/JobPosting.aspx?JobControlId=${id}`,
      summary: "",
      internalOnly: false,
      _text: text,
    });
  }
  return jobs;
}

export async function fetchCalCareers(agency) {
  const first = await fetch(SEARCH, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45_000) });
  if (!first.ok) throw new Error(`CalCareers search page HTTP ${first.status}`);
  const html = await first.text();
  const cookies = cookieHeader(first);

  // CalCareers now opens straight onto a results page (newest first) with no filter
  // dropdowns. In that case read the results and filter by department + county text.
  if (!/<select[^>]*name="[^"]*Department/i.test(html)) {
    const all = parseResults(html, agency);
    const dept = /transportation/i;
    const county = new RegExp(agency.county.replace(/ County$/i, ""), "i");
    const jobs = all.filter((j) => dept.test(j._text) && county.test(j._text));
    console.log(`caltrans7: results page has ${all.length} postings, ${jobs.length} Caltrans in ${agency.county}`);
    if (!all.length || process.env.DEBUG_CALCAREERS) {
      const i = html.search(/JobControlId=/i);
      console.log(`caltrans7 sample: ${stripHtml(html.slice(Math.max(0, i - 1500), i + 2500)).slice(0, 1500)}`);
    }
    if (!all.length) throw new Error("CalCareers: no postings found on results page");
    return jobs.map(({ _text, ...j }) => j);
  }

  const form = new URLSearchParams(hiddenFields(html));
  const [deptName, deptVal] = selectOption(html, "Department", agency.department);
  const [locName, locVal] = selectOption(html, "Location", agency.county);
  form.set(deptName, deptVal);
  form.set(locName, locVal);
  // Submit via the page's search button.
  const btn = html.match(/<input[^>]+type="submit"[^>]+name="([^"]*Search[^"]*)"[^>]*value="([^"]*)"/i);
  if (btn) form.set(btn[1], btn[2]);

  const res = await fetch(SEARCH, {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies, Referer: SEARCH },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`CalCareers search POST HTTP ${res.status}`);
  const jobs = parseResults(await res.text(), agency).map(({ _text, ...j }) => j);
  if (!jobs.length) throw new Error("CalCareers returned no results — the search form may have changed");
  // District 7 covers LA + Ventura; the county filter already limits to LA County.
  return jobs;
}

export { parseResults as _parseResults };
