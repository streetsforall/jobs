// Oracle Cloud HCM "Candidate Experience" career sites (used by Long Beach Transit).
// The public career site is backed by an anonymous REST finder; this is the same call
// the site's own job list makes.

import { fetchText, toISODate } from "../util.js";

export async function fetchOracleHcm(agency) {
  const out = [];
  for (let offset = 0; offset < 500; offset += 25) {
    const finder = `findReqs;siteNumber=${agency.siteNumber},limit=25,offset=${offset},sortBy=POSTING_DATES_DESC`;
    const url = `${agency.host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList&finder=${encodeURIComponent(finder)}`;
    const body = JSON.parse(await fetchText(url, { headers: { Accept: "application/json" } }));
    const page = body?.items?.[0];
    const reqs = page?.requisitionList || [];
    for (const r of reqs) {
      out.push({
        id: `${agency.id}:${r.Id}`,
        agency: agency.id,
        title: r.Title || "",
        department: r.Organization || r.JobFamily || "",
        location: r.PrimaryLocation || "",
        jobType: r.JobSchedule || r.WorkerType || "",
        salary: null,
        posted: toISODate(r.PostedDate),
        closes: r.PostingEndDate ? toISODate(r.PostingEndDate) : null,
        url: `${agency.host}/hcmUI/CandidateExperience/en/sites/${agency.siteNumber}/job/${r.Id}`,
        summary: (r.ShortDescriptionStr || "").slice(0, 400),
        internalOnly: false,
      });
    }
    if (reqs.length < 25 || out.length >= (page?.TotalJobsCount ?? Infinity)) break;
  }
  return out;
}
