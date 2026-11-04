export const log = (...a) => console.log(...a);
export const warn = (...a) => console.warn("WARN", ...a);

const UA = "StreetsForAll-JobBoard/1.0 (+https://jobs.streetsforall.org)";

export async function fetchText(url, { retries = 2, headers = {} } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "*/*", ...headers }, signal: AbortSignal.timeout(45_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

export function stripHtml(html = "") {
  return html
    .replace(/<(br|\/p|\/li|\/div)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, "–")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Accepts RFC-822 ("Fri, 12 Apr 2013 05:00:00"), ISO, "2013-04-12 15:52:34.19" and
// US "MM/DD/YYYY". Returns YYYY-MM-DD or null.
export function toISODate(s) {
  if (!s) return null;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  const d = new Date(/^\d{4}-\d\d-\d\d \d/.test(s) ? s.replace(" ", "T") : /GMT|UTC|Z|[+-]\d{4}$/.test(s) ? s : `${s} UTC`);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

export const todayLA = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
