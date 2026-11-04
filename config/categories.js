// Which postings belong on the board, decided from the job TITLE (titles are short and
// consistent across agencies; descriptions are boilerplate-heavy and cause false hits).
//
// A posting is kept when its title matches at least one category and no exclusion,
// unless it also matches ALWAYS_INCLUDE (a transportation-specific term), which wins
// over exclusions — e.g. a County public-health "Active Transportation Program Manager".

export const CATEGORIES = [
  {
    id: "engineering",
    label: "Engineering & Planning",
    patterns: [
      /\b(civil|transportation|traffic|structural|geotechnical|street|highway|signal|environmental)\s+engineer/i,
      /\bengineer(ing)?\s+(associate|assistant|aide|technician|intern)\b/i,
      /\b(civil|transportation|traffic) engineering\b/i,
      /\bassociate (civil )?engineer\b/i,
      /\b(senior|principal|supervising|assistant|associate|junior)?\s*(city |urban |regional |transportation |land use |environmental |service |transit )?plann(er|ing (associate|assistant|aide|intern|manager|supervisor|director))\b/i,
      /\btransportation plann/i,
      /\blandscape architect/i,
      /\barchitect(ural)? (associate|assistant|drafting)/i,
      /\bdrafting technician|civil drafting|engineering design/i,
      /\btraffic (signal|control|operations)/i,
    ],
  },
  {
    id: "outreach",
    label: "Outreach & Policy",
    patterns: [
      /\bcommunity (engagement|outreach|relations|affairs|liaison|organizer|coordinator)/i,
      /\bpublic (information|affairs|relations|outreach|engagement|participation)/i,
      /\boutreach\b/i,
      /\bcommunications? (specialist|manager|officer|coordinator|director|strategist)/i,
      /\b(legislative|government(al)?|intergovernmental) (affairs|relations|analyst|representative|advocate|liaison)/i,
      /\bpolicy (analyst|advisor|adviser|director|manager|specialist|associate)/i,
      /\b(field|council|board|senior|justice)? ?deputy\b.*\b(council|board|supervisor|district)/i,
      /\bfield deputy|council aide|district representative|constituent/i,
      /\bstakeholder/i,
    ],
  },
  {
    id: "gis",
    label: "GIS & Data",
    patterns: [
      /\bGIS\b/,
      /\bgeographic information|geospatial|cartograph|mapping/i,
      /\bdata (analyst|scientist|engineer|specialist|manager|architect)/i,
      /\b(transportation|travel demand) model/i,
      /\bmodeler\b/i,
      /\banalytics\b/i,
    ],
  },
  {
    id: "pm",
    label: "Project Management",
    patterns: [
      /\bproject (manager|management|coordinator|control|delivery|engineer)/i,
      /\bprogram (manager|management|director)\b/i,
      /\bcapital (project|program|improvement)/i,
      /\bconstruction (manager|management|inspector)/i,
      /\bgrants? (analyst|manager|administrator|coordinator|specialist|writer)/i,
      /\bscheduler\b|project control/i,
    ],
  },
];

// Transportation-specific terms: always relevant, even if an exclusion also matches.
// Also marks a posting as "core" so the site can feature it.
export const ALWAYS_INCLUDE =
  /\b(active transportation|bicycl|bike|pedestrian|complete streets?|vision zero|mobility|transit|transportation|traffic|street ?(services|design|safety)|bus (rapid|lane|priority)|first[ /-]last mile|safe routes)\b/i;

// Exclude whole job families that keyword patterns would otherwise pull in.
export const EXCLUDE = [
  /\b(police|sheriff|firefighter|fire (captain|engineer|inspector|fighter)|deputy sheriff|custody|correction|probation|detention|security officer|lifeguard)\b/i,
  /\b(nurse|nursing|physician|psychiatr|psycholog|clinical|clinician|pharmac|dental|dentist|medical|therapist|counselor|social worker|case manager|epidemiolog|health educator)\b/i,
  /\b(librar|teacher|recreation|park ranger|zoo|animal|veterinar|custodian|janitor|cook|food service)\b/i,
  /\b(software|network|systems?|database|cloud|cyber|security|solutions|application|IT|information technology|telecom|audio|electronics|mechanical|electrical|stationary|plant|power|water utility|wastewater|aircraft|airport operations)\s+(engineer|architect)/i,
  /\b(financial|emergency|disaster|workforce|benefits|succession|event|retirement|estate)\s+plann/i,
  /\bfire (protection )?engineer/i,
];

// Departments whose engineering / PM / analyst roles are relevant even when the
// title alone is generic. Matched against the posting's department field.
export const RELEVANT_DEPARTMENTS =
  /\b(transportation|LADOT|public works|street services|streetsLA|engineering|city planning|planning|regional planning|metro|transit|mobility|capital)\b/i;

// Frontline/trades roles excluded even when the title has a transportation term
// ("Transit Operator", "Traffic Officer", "Bus Mechanic") — the board is for
// professional roles that shape street design, policy and delivery.
export const HARD_EXCLUDE =
  /\b(operator|mechanic|(traffic|police|security|parking|enforcement|peace|transit security|safety) officer|driver|laborer|maintenance (worker|helper|laborer|technician)|helper|custodian|electrician|painter|welder|carpenter|cleaner|service attendant|dispatcher|controller|fare|parking enforcement|warehouse|storekeeper|crossing guard)\b/i;

// Professional nouns a "core" title needs before it is listed on the strength of its
// transportation term alone.
const PROFESSIONAL = /\b(analyst|manager|coordinator|specialist|planner|engineer|associate|director|administrator|advisor|chief|supervisor|fellow|intern|strategist|liaison|deputy|officer of)\b/i;

export function classify(job) {
  const title = (job.title || "").replace(/\s+/g, " ").trim();
  const dept = job.department || "";
  if (HARD_EXCLUDE.test(title)) return null;
  const core = ALWAYS_INCLUDE.test(title);
  const excluded = EXCLUDE.some((re) => re.test(title));
  if (excluded && !core) return null;

  const cats = CATEGORIES.filter((c) => c.patterns.some((re) => re.test(title))).map((c) => c.id);

  // Generic analyst/manager titles in a clearly relevant department (e.g. LADOT
  // "Management Analyst") are worth listing under Project Management.
  if (!cats.length && RELEVANT_DEPARTMENTS.test(dept) && /\b(analyst|manager|coordinator|specialist|administrator)\b/i.test(title)) {
    cats.push("pm");
  }
  if (!cats.length && core && PROFESSIONAL.test(title)) cats.push(/\b(analyst|manager|coordinator|administrator)\b/i.test(title) ? "pm" : "engineering");
  if (!cats.length) return null;
  return { categories: cats, core: core || RELEVANT_DEPARTMENTS.test(dept) };
}

export const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
