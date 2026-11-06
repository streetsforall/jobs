import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "../config/categories.js";

const cats = (title, department = "") => classify({ title, department })?.categories ?? null;

test("keeps the roles the board is for", () => {
  const keep = {
    "Transportation Engineer": "engineering",
    "Transportation Engineering Associate II": "engineering",
    "Civil Engineering Associate": "engineering",
    "City Planning Associate": "engineering",
    "Senior Regional Planner (Multimodal Integration)": "engineering",
    "Associate Transportation Planner": "engineering",
    "Landscape Architect": "engineering",
    "Community Engagement Specialist": "outreach",
    "Public Information Officer": "outreach",
    "Legislative Affairs Analyst": "outreach",
    "Field Deputy, Council District 4": "outreach",
    "GIS Analyst": "gis",
    "Geographic Information Systems Supervisor": "gis",
    "Transportation Modeler": "gis",
    "Senior Project Manager - Capital Projects": "pm",
    "Program Manager (Active Transportation)": "pm",
    "Capital Projects Management Associate, PW": "pm",
    "Senior GIS Analyst": "gis",
    "Survey-Mapping Technician": "gis",
    "Assistant Engineer (Transportation Engineering)": "engineering",
    "Communications Specialist I-VI (Camera Project Lead)": "outreach",
    "Deputy Executive Officer, Project Management (Construction Management)": "pm",
  };
  for (const [title, cat] of Object.entries(keep)) {
    assert.ok(cats(title)?.includes(cat), `${title} should be in ${cat}, got ${cats(title)}`);
  }
});

test("drops roles outside scope", () => {
  for (const t of [
    "Police Officer", "Firefighter", "Transit Operator", "Bus Operator (Part-Time)", "Traffic Officer",
    "Registered Nurse", "Librarian", "Software Engineer", "Network Engineer", "Financial Planning Analyst",
    "Mechanic Helper", "Senior Clerk Typist", "Deputy Sheriff", "Custodian", "Electrical Mechanic",
    "Emergency Planning Coordinator", "Fire Protection Engineer",
    "DEPUTY DISTRICT ATTORNEY I", "MENTAL HEALTH PROGRAM MANAGER II / EMERGENCY APPOINTMENTS HOMELESSNESS",
    "EQUITY IN COUNTY CONTRACTS PROGRAM MANAGER (ADMINISTRATIVE MANAGER 10, ISD)",
    "FIRE PREVENTION ENGINEERING ASSISTANT II (Fire Alarm/Sprinkler System Specialty) - FIRE EMERGENCY",
    "DATA SCIENTIST / EMERGENCY APPOINTMENT HOMELESSNESS", "SENIOR APPLICATION DEVELOPER (DATA & ANALYTICS)",
    "AIRPORT MANAGER", "Health Program Manager III, Support Services (UC)", "Senior Accountant (Capital Improvement Program)",
    "Water Resources and Planning Manager",
    "Parking & Traffic Control Officer PT/FT (PTCO) - Department of Transportation", "Surgery Scheduler - Extra Help",
    "Deputy City Attorney - Transportation Team - City Attorney's Office (8177)", "Associate Engineer (Fire Protection)",
    "As-Needed Traffic Control (Special Events)", "Radio Systems IS Project Manager I (Open)",
    "Senior Environmental Health Specialist - $15k signing bonus", "Recycling Program Specialist III",
    "Real Property Manager", "Facilities Manager (Public Works)", "Civil Engineer I / GWP - Water Engineering", "POLICY AND RESOURCES SPECIALIST (SANITATION)",
  ]) {
    assert.equal(cats(t), null, `${t} should be dropped, got ${cats(t)}`);
  }
});

test("generic manager titles in a broad Public Works department are not enough", () => {
  assert.equal(cats("Parks Manager", "Public Works"), null);
  assert.deepEqual(cats("Senior Administrative Analyst", "Planning & Development"), ["pm"]);
});

test("generic analyst titles count only in a relevant department", () => {
  assert.deepEqual(cats("Management Analyst", "Transportation"), ["pm"]);
  assert.equal(cats("Management Analyst", "Library"), null);
});

test("transportation term wins over a health-department exclusion", () => {
  assert.ok(cats("Health Program Manager - Active Transportation"));
});

test("program manager and data titles count only in relevant departments", () => {
  assert.deepEqual(cats("Program Manager", "Transportation"), ["pm"]);
  assert.equal(cats("Program Manager", "Mental Health"), null);
  assert.deepEqual(cats("Data Analyst", "Department of Transportation"), ["gis"]);
  assert.equal(cats("Senior Data Scientist", "Internal Services"), null);
});
