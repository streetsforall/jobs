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
  ]) {
    assert.equal(cats(t), null, `${t} should be dropped, got ${cats(t)}`);
  }
});

test("generic analyst titles count only in a relevant department", () => {
  assert.deepEqual(cats("Management Analyst", "Transportation"), ["pm"]);
  assert.equal(cats("Management Analyst", "Library"), null);
});

test("transportation term wins over a health-department exclusion", () => {
  assert.ok(cats("Health Program Manager - Active Transportation"));
});
