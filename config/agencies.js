// Every agency on the board and where its openings come from.
//
// region: "socal" | "norcal" — drives the region switch on the site and the grouping
// in the Slack post.
//
// platform:
//   neogov           NEOGOV/GovernmentJobs.com official RSS job feed (slug = the part
//                    after governmentjobs.com/careers/). Check a new slug first with the
//                    `probe` workflow — wrong slugs return an empty feed, not an error.
//   smartrecruiters  SmartRecruiters public postings API (company id)
//   calcareers       State of California CalCareers, Department of Transportation,
//                    filtered to `counties` (headless browser; see the fetcher)
//   civicplus        CivicPlus "Jobs" module RSS
//   oraclehcm        Oracle Cloud HCM Candidate Experience requisitions API
//
// Transit operators that are city departments post under their city: Big Blue Bus
// (Santa Monica), Culver CityBus (Culver City), Torrance Transit (Torrance), LADOT
// Transit (City of LA), SFMTA/Muni (San Francisco). Caltrain is administered by
// SamTrans and posts under it.
//
// A newly added agency's current openings are recorded without a Slack post on its
// first run; only postings that appear after that are announced.

export const REGIONS = [
  { id: "socal", name: "Southern California" },
  { id: "norcal", name: "Northern California" },
];

const ng = (slug) => ({ platform: "neogov", slug, careersUrl: `https://www.governmentjobs.com/careers/${slug}` });
const CALCAREERS = "https://calcareers.ca.gov/CalHRPublic/Search/JobSearchResults.aspx";

export const AGENCIES = [
  // ── Southern California ────────────────────────────────────────────────────
  { id: "lacity", region: "socal", name: "City of Los Angeles", short: "City of LA", ...ng("lacity") },
  { id: "lacounty", region: "socal", name: "County of Los Angeles", short: "LA County", ...ng("lacounty") },
  { id: "metro", region: "socal", name: "LA Metro", ...ng("lametro") },
  { id: "metrolink", region: "socal", name: "Metrolink (SCRRA)", short: "Metrolink", ...ng("scrra") },
  { id: "scag", region: "socal", name: "Southern California Association of Governments", short: "SCAG", ...ng("scag") },
  {
    id: "caltrans7", region: "socal", name: "Caltrans District 7 (LA & Ventura)", short: "Caltrans D7",
    platform: "calcareers", counties: ["Los Angeles County", "Ventura County"], careersUrl: CALCAREERS,
  },
  { id: "longbeach", region: "socal", name: "City of Long Beach", short: "Long Beach", ...ng("longbeach") },
  { id: "pasadena", region: "socal", name: "City of Pasadena", short: "Pasadena", ...ng("pasadena") },
  { id: "santamonica", region: "socal", name: "City of Santa Monica (incl. Big Blue Bus)", short: "Santa Monica", ...ng("santamonica") },
  { id: "glendale", region: "socal", name: "City of Glendale", short: "Glendale", ...ng("glendaleca") },
  { id: "burbank", region: "socal", name: "City of Burbank", short: "Burbank", ...ng("burbankca") },
  { id: "culvercity", region: "socal", name: "Culver City (incl. CityBus)", short: "Culver City", ...ng("culvercity") },
  { id: "weho", region: "socal", name: "City of West Hollywood", short: "West Hollywood", ...ng("weho") },
  { id: "beverlyhills", region: "socal", name: "City of Beverly Hills", short: "Beverly Hills", ...ng("beverlyhills") },
  { id: "torrance", region: "socal", name: "City of Torrance (incl. Torrance Transit)", short: "Torrance", ...ng("torranceca") },
  {
    id: "inglewood", region: "socal", name: "City of Inglewood", short: "Inglewood", platform: "civicplus",
    feedUrl: "https://www.cityofinglewood.org/RSSFeed.aspx?ModID=66&CID=All-jobs.xml",
    careersUrl: "https://www.cityofinglewood.org/Jobs.aspx",
  },
  {
    id: "lbtransit", region: "socal", name: "Long Beach Transit", platform: "oraclehcm",
    host: "https://ibcrqy.fa.ocs.oraclecloud.com", siteNumber: "CX_1",
    careersUrl: "https://ibcrqy.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs",
  },
  // Foothill Transit: emailed PDF applications, operations staff hired by contractors.

  // ── Northern California: Bay Area ──────────────────────────────────────────
  {
    id: "sf", region: "norcal", name: "City & County of San Francisco (incl. SFMTA)", short: "San Francisco",
    platform: "smartrecruiters", company: "CityAndCountyOfSanFrancisco1", careersUrl: "https://careers.sf.gov/",
  },
  { id: "oakland", region: "norcal", name: "City of Oakland", short: "Oakland", ...ng("oaklandca") },
  { id: "sanjose", region: "norcal", name: "City of San José", short: "San José", ...ng("sanjoseca") },
  { id: "santaclara", region: "norcal", name: "City of Santa Clara", short: "Santa Clara", ...ng("cityofsantaclaraca") },
  { id: "emeryville", region: "norcal", name: "City of Emeryville", short: "Emeryville", ...ng("emeryville") },
  { id: "berkeley", region: "norcal", name: "City of Berkeley", short: "Berkeley", ...ng("berkeley") },
  { id: "fremont", region: "norcal", name: "City of Fremont", short: "Fremont", ...ng("fremontca") },
  { id: "hayward", region: "norcal", name: "City of Hayward", short: "Hayward", ...ng("haywardca") },
  { id: "alameda", region: "norcal", name: "City of Alameda", short: "Alameda", ...ng("alamedaca") },
  { id: "richmond", region: "norcal", name: "City of Richmond", short: "Richmond", ...ng("richmondca") },
  { id: "concord", region: "norcal", name: "City of Concord", short: "Concord", ...ng("concord") },
  { id: "walnutcreek", region: "norcal", name: "City of Walnut Creek", short: "Walnut Creek", ...ng("walnutcreek") },
  { id: "paloalto", region: "norcal", name: "City of Palo Alto", short: "Palo Alto", ...ng("paloaltoca") },
  { id: "mountainview", region: "norcal", name: "City of Mountain View", short: "Mountain View", ...ng("mountainview") },
  { id: "sunnyvale", region: "norcal", name: "City of Sunnyvale", short: "Sunnyvale", ...ng("sunnyvale") },
  { id: "vallejo", region: "norcal", name: "City of Vallejo", short: "Vallejo", ...ng("vallejo") },
  { id: "santarosa", region: "norcal", name: "City of Santa Rosa", short: "Santa Rosa", ...ng("srcity") },
  { id: "petaluma", region: "norcal", name: "City of Petaluma", short: "Petaluma", ...ng("petaluma") },

  { id: "santaclaracounty", region: "norcal", name: "County of Santa Clara", short: "Santa Clara County", ...ng("santaclara") },
  { id: "sanmateocounty", region: "norcal", name: "County of San Mateo", short: "San Mateo County", ...ng("sanmateo") },
  { id: "contracosta", region: "norcal", name: "County of Contra Costa", short: "Contra Costa County", ...ng("contracosta") },
  { id: "marin", region: "norcal", name: "County of Marin", short: "Marin County", ...ng("marincounty") },
  { id: "sonoma", region: "norcal", name: "County of Sonoma", short: "Sonoma County", ...ng("sonoma") },
  { id: "solano", region: "norcal", name: "County of Solano", short: "Solano County", ...ng("solanocounty") },
  { id: "napa", region: "norcal", name: "County of Napa", short: "Napa County", ...ng("napacounty") },

  { id: "bart", region: "norcal", name: "BART", ...ng("bartca") },
  { id: "vta", region: "norcal", name: "VTA (Santa Clara Valley Transportation Authority)", short: "VTA", ...ng("vtasantaclara") },
  {
    id: "mtc", region: "norcal", name: "MTC / ABAG (Bay Area Metro)", short: "MTC / ABAG", platform: "oraclehcm",
    host: "https://iazcqy.fa.ocs.oraclecloud.com", siteNumber: "CX_1",
    careersUrl: "https://iazcqy.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs",
  },
  { id: "actransit", region: "norcal", name: "AC Transit", ...ng("actransit") },
  { id: "samtrans", region: "norcal", name: "SamTrans / Caltrain", ...ng("smctd") },
  { id: "goldengate", region: "norcal", name: "Golden Gate Bridge, Highway & Transportation District", short: "Golden Gate Transit", ...ng("goldengate") },

  // Not yet covered: County of Alameda (JobAps), Redwood City (CalOpps), SFCTA (no
  // applicant system; postings are pages on sfcta.org).

  {
    id: "caltrans4", region: "norcal", name: "Caltrans District 4 (Bay Area)", short: "Caltrans D4",
    platform: "calcareers", careersUrl: CALCAREERS,
    counties: ["Alameda County", "Contra Costa County", "Marin County", "Napa County", "San Francisco County", "San Mateo County", "Santa Clara County", "Solano County", "Sonoma County"],
  },

  // ── Northern California: Sacramento ────────────────────────────────────────
  {
    id: "caltranshq", region: "norcal", name: "Caltrans Headquarters (Sacramento)", short: "Caltrans HQ",
    platform: "calcareers", counties: ["Sacramento County"], careersUrl: CALCAREERS,
  },
];
