// Every agency on the board and where its openings come from.
// platform:
//   neogov      NEOGOV/GovernmentJobs.com official RSS job feed (slug = the part after
//               governmentjobs.com/careers/)
//   calcareers  State of California CalCareers search, filtered to department + county
//   civicplus   CivicPlus "Jobs" module RSS (city websites built on CivicPlus)
//   oraclehcm   Oracle Cloud HCM Candidate Experience public requisitions API
//
// Several transit operators are city departments and post under their city:
// Big Blue Bus (Santa Monica), Culver CityBus (Culver City), Torrance Transit (Torrance),
// LADOT Transit (City of LA). LADWP also posts under City of LA ("lacity").
//
// To add an agency: append an entry, run `npm run dry-run -- --only=<id>`, check the output.

export const AGENCIES = [
  // Core
  { id: "lacity", name: "City of Los Angeles", short: "City of LA", platform: "neogov", slug: "lacity", careersUrl: "https://www.governmentjobs.com/careers/lacity" },
  { id: "lacounty", name: "County of Los Angeles", short: "LA County", platform: "neogov", slug: "lacounty", careersUrl: "https://www.governmentjobs.com/careers/lacounty" },
  { id: "metro", name: "LA Metro", platform: "neogov", slug: "lametro", careersUrl: "https://www.governmentjobs.com/careers/lametro" },
  { id: "metrolink", name: "Metrolink (SCRRA)", short: "Metrolink", platform: "neogov", slug: "scrra", careersUrl: "https://www.governmentjobs.com/careers/scrra" },
  { id: "scag", name: "Southern California Association of Governments", short: "SCAG", platform: "neogov", slug: "scag", careersUrl: "https://www.governmentjobs.com/careers/scag" },
  {
    id: "caltrans7", name: "Caltrans District 7", platform: "calcareers",
    department: "Department of Transportation", county: "Los Angeles County",
    careersUrl: "https://calcareers.ca.gov/CalHRPublic/Search/JobSearchResults.aspx",
  },

  // Surrounding cities
  { id: "longbeach", name: "City of Long Beach", short: "Long Beach", platform: "neogov", slug: "longbeach", careersUrl: "https://www.governmentjobs.com/careers/longbeach" },
  { id: "pasadena", name: "City of Pasadena", short: "Pasadena", platform: "neogov", slug: "pasadena", careersUrl: "https://www.governmentjobs.com/careers/pasadena" },
  { id: "santamonica", name: "City of Santa Monica (incl. Big Blue Bus)", short: "Santa Monica", platform: "neogov", slug: "santamonica", careersUrl: "https://www.governmentjobs.com/careers/santamonica" },
  { id: "glendale", name: "City of Glendale", short: "Glendale", platform: "neogov", slug: "glendaleca", careersUrl: "https://www.governmentjobs.com/careers/glendaleca" },
  { id: "burbank", name: "City of Burbank", short: "Burbank", platform: "neogov", slug: "burbankca", careersUrl: "https://www.governmentjobs.com/careers/burbankca" },
  { id: "culvercity", name: "Culver City (incl. CityBus)", short: "Culver City", platform: "neogov", slug: "culvercity", careersUrl: "https://www.governmentjobs.com/careers/culvercity" },
  { id: "weho", name: "City of West Hollywood", short: "West Hollywood", platform: "neogov", slug: "weho", careersUrl: "https://www.governmentjobs.com/careers/weho" },
  { id: "beverlyhills", name: "City of Beverly Hills", short: "Beverly Hills", platform: "neogov", slug: "beverlyhills", careersUrl: "https://www.governmentjobs.com/careers/beverlyhills" },
  { id: "torrance", name: "City of Torrance (incl. Torrance Transit)", short: "Torrance", platform: "neogov", slug: "torranceca", careersUrl: "https://www.governmentjobs.com/careers/torranceca" },
  {
    id: "inglewood", name: "City of Inglewood", short: "Inglewood", platform: "civicplus",
    feedUrl: "https://www.cityofinglewood.org/RSSFeed.aspx?ModID=66&CID=All-jobs.xml",
    careersUrl: "https://www.cityofinglewood.org/Jobs.aspx",
  },

  // Regional transit with its own hiring system
  {
    id: "lbtransit", name: "Long Beach Transit", platform: "oraclehcm",
    host: "https://ibcrqy.fa.ocs.oraclecloud.com", siteNumber: "CX_1",
    careersUrl: "https://ibcrqy.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs",
  },
  // Foothill Transit has no online job system (emailed PDF applications) and its
  // operations staff are hired by contractors, so it is not scraped.
];
