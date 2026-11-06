// SmartRecruiters public postings API (City & County of San Francisco, incl. SFMTA,
// Planning, Public Works). Documented, anonymous, JSON:
//   https://api.smartrecruiters.com/v1/companies/{companyId}/postings?limit=100&offset=N

import { fetchText, toISODate } from "../util.js";

export async function fetchSmartRecruiters(agency) {
  const out = [];
  for (let offset = 0; offset < 2000; offset += 100) {
    const body = JSON.parse(await fetchText(`https://api.smartrecruiters.com/v1/companies/${agency.company}/postings?limit=100&offset=${offset}`, { headers: { Accept: "application/json" } }));
    const items = body.content || [];
    for (const p of items) {
      const dept =
        p.customField?.find((f) => /department/i.test(f.fieldLabel || ""))?.valueLabel ||
        p.department?.label || "";
      out.push({
        id: `${agency.id}:${p.id}`,
        agency: agency.id,
        title: p.name || "",
        department: dept,
        location: [p.location?.city, p.location?.region].filter(Boolean).join(", "),
        jobType: p.typeOfEmployment?.label || "",
        salary: null,
        posted: toISODate(p.releasedDate),
        closes: null,
        url: `https://jobs.smartrecruiters.com/${agency.company}/${p.id}`,
        summary: "",
        internalOnly: /promotive|promotional|employees only/i.test(p.name || ""),
      });
    }
    if (items.length < 100 || out.length >= (body.totalFound ?? 0)) break;
  }
  return out;
}
