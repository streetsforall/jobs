// CalCareers (State of California) — used for Caltrans.
//
// CalCareers has no feed or API, and its search page builds results with client-side
// DevExpress controls and ASP.NET postbacks, so a plain HTTP fetch sees an empty page.
// We drive it with headless Chromium (Playwright) the way a person would:
//   1. open the search page
//   2. pick Department = Department of Transportation (id 141) and run the search
//   3. show 100 per page and walk the pager
// One browser session serves every Caltrans entry (District 7, District 4, HQ); each
// entry then keeps the postings in its own counties.
//
// If CalCareers changes its page, only the Caltrans entries fail; the rest of the board
// keeps working and the site marks Caltrans as not refreshed.

import { toISODate } from "../util.js";

const SEARCH = "https://calcareers.ca.gov/CalHRPublic/Search/JobSearchResults.aspx";
const CALTRANS_DEPT_ID = "141";
const MAX_PAGES = 20;

let allPostings = null; // shared promise across the Caltrans entries in one run

async function scrapeAll() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("CalCareers needs Playwright (npm i playwright && npx playwright install chromium)");
  }
  const browser = await chromium.launch();
  let page;
  try {
    return await scrapeWith(browser, (p) => (page = p));
  } catch (err) {
    if (page) {
      const info = await page.evaluate(() => ({ url: location.href, title: document.title, text: document.body?.innerText.slice(0, 600) })).catch(() => null);
      if (info) console.log(`calcareers debug: ${info.url} | ${info.title} | ${info.text.replace(/\s+/g, " ")}`);
    }
    throw err;
  } finally {
    await browser.close();
  }
}

async function scrapeWith(browser, track) {
  {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    track(page);
    page.setDefaultTimeout(60_000);
    await page.goto(SEARCH, { waitUntil: "networkidle" });

    // Department filter is a DevExpress combobox; set it through its client API.
    await page.waitForFunction(() => window.ASPx && ASPx.GetControlCollection().Get("cphMainContent_ddlDepartment"));
    await page.evaluate((id) => ASPx.GetControlCollection().Get("cphMainContent_ddlDepartment").SetValue(id), CALTRANS_DEPT_ID);
    // The Update Results button sits in a collapsible "Refine Search" panel that may be
    // hidden, so submit it from script rather than with a visible click.
    await page.evaluate(() => document.querySelector('[name="ctl00$cphMainContent$btnUpdateResults"]').click());
    await page.waitForSelector("#cphMainContent_lblTotalResultCount", { state: "attached" });

    // 100 per page.
    await page.selectOption("#cphMainContent_ddlRowCount", "100");
    await page.waitForFunction(() => document.querySelectorAll('[id^="cphMainContent_rptResults_hlViewJobPosting_"]').length > 10 ||
      Number(document.getElementById("cphMainContent_lblTotalResultCount")?.innerText) <= 10);

    const total = Number(await page.textContent("#cphMainContent_lblTotalResultCount"));
    const seen = new Map();
    for (let p = 1; p <= MAX_PAGES; p++) {
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('[id^="cphMainContent_rptResults_hlViewJobPosting_"]')].map((a) => {
          let card = a;
          while (card && !/Filing Deadline/.test(card.innerText || "")) card = card.parentElement;
          const text = card ? card.innerText : "";
          const field = (label) => (text.match(new RegExp(label + ":\\s*\\n?\\s*([^\\n]+)"))?.[1] || "").trim();
          return {
            classification: a.innerText.trim(),
            href: a.href,
            workingTitle: field("Working Title"),
            jobControl: field("Job Control"),
            salary: field("Salary Range"),
            schedule: field("Work Type/Schedule"),
            department: field("Department"),
            location: field("Location"),
            telework: field("Telework"),
            published: field("Publish Date"),
            deadline: field("Filing Deadline"),
          };
        }),
      );
      for (const r of rows) seen.set(r.jobControl || r.href, r);
      if (seen.size >= total) break;

      const next = page.locator('[id^="cphMainContent_ucRepeaterPager_rptPager_btnPagerItem_"]', { hasText: new RegExp(`^${p + 1}$`) });
      if (!(await next.count())) break;
      const firstId = rows[0]?.jobControl;
      await next.first().click();
      await page.waitForFunction(
        (prev) => {
          const a = document.getElementById("cphMainContent_rptResults_hlViewJobPosting_0");
          return a && !a.getAttribute("aria-label")?.includes(`(${prev})`);
        },
        firstId,
      );
    }
    console.log(`calcareers: ${seen.size} of ${total} Caltrans postings read`);
    if (!seen.size) throw new Error("CalCareers: search returned no Caltrans postings — the page may have changed");
    return [...seen.values()];
  }
}

function toJob(agency, r) {
  const pay = r.salary.match(/\$\s?([\d,]+(?:\.\d+)?)\s*-\s*\$\s?([\d,]+(?:\.\d+)?)/);
  const num = (s) => Number(s.replace(/,/g, ""));
  const working = r.workingTitle && r.workingTitle.toLowerCase() !== r.classification.toLowerCase() ? r.workingTitle : "";
  return {
    id: `caltrans:${r.jobControl}`,
    agency: agency.id,
    title: working || r.classification,
    // Classification is matched along with the working title, and shown as the subtitle.
    classifyText: `${r.workingTitle} ${r.classification}`,
    department: working ? r.classification : "",
    location: r.location,
    jobType: [r.schedule, r.telework && r.telework !== "Office" ? r.telework : ""].filter(Boolean).join(", "),
    salary: pay ? { min: num(pay[1]), max: num(pay[2]), interval: "month" } : null, // state pay is monthly
    posted: toISODate(r.published),
    closes: /until filled/i.test(r.deadline) ? "continuous" : toISODate(r.deadline),
    url: `https://calcareers.ca.gov/CalHrPublic/Jobs/JobPosting.aspx?JobControlId=${r.jobControl}`,
    summary: "",
    internalOnly: false,
  };
}

export async function fetchCalCareers(agency) {
  allPostings ||= scrapeAll();
  const rows = await allPostings;
  const counties = agency.counties.map((c) => c.toLowerCase());
  return rows.filter((r) => counties.includes(r.location.toLowerCase())).map((r) => toJob(agency, r));
}
