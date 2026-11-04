/*
 * Streets For All job board — embeddable widget.
 *
 * Squarespace Code Block:
 *   <div id="sfa-jobs"></div>
 *   <script src="https://jobs.streetsforall.org/embed.js" defer></script>
 *
 * Renders into #sfa-jobs and reads jobs.json from the same host as this script.
 * Typography is inherited from the host page, so it picks up the site's fonts and
 * sizes; only S4A brand colors are set here. All CSS is scoped under .sfaj.
 */
(function () {
  var script = document.currentScript;
  var base = script ? script.src.replace(/[^/]*$/, "") : "https://jobs.streetsforall.org/";

  var CSS = [
    ".sfaj{--sfaj-navy:#173861;--sfaj-blue:#245ad8;--sfaj-teal:#10b5b0;--sfaj-green:#25c764;--sfaj-orange:#f97a43;--sfaj-line:#e3e3e3;--sfaj-muted:#6b6b6b;font:inherit;color:inherit;text-align:left}",
    ".sfaj *{box-sizing:border-box}",
    ".sfaj-bar{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 12px}",
    ".sfaj input,.sfaj select{font:inherit;font-size:16px;color:#222;background:#fff;border:1.5px solid #cfcfcf;border-radius:10px;padding:10px 12px;min-height:44px;margin:0}",
    ".sfaj input{flex:1 1 260px}.sfaj select{flex:0 1 220px}",
    ".sfaj input:focus,.sfaj select:focus,.sfaj button:focus-visible,.sfaj a:focus-visible{outline:3px solid var(--sfaj-teal);outline-offset:2px}",
    ".sfaj-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}",
    ".sfaj-chip{font:inherit;font-size:15px;line-height:1.2;cursor:pointer;border:2px solid var(--sfaj-blue);background:#fff;color:var(--sfaj-blue);border-radius:10px;padding:8px 14px;transition:background .3s,color .3s}",
    ".sfaj-chip[aria-pressed=true]{background:var(--sfaj-blue);color:#fff}",
    ".sfaj-chip:hover{background:var(--sfaj-teal);border-color:var(--sfaj-teal);color:#fff}",
    ".sfaj-count{font-size:15px;color:var(--sfaj-muted);margin:0 0 10px}",
    ".sfaj-list{list-style:none;margin:0;padding:0}",
    ".sfaj-job{list-style:none;margin:0;padding:16px 0;border-top:1px solid var(--sfaj-line);display:grid;grid-template-columns:1fr auto;gap:4px 20px}",
    ".sfaj-job:last-child{border-bottom:1px solid var(--sfaj-line)}",
    ".sfaj-title{margin:0;font-size:1.15em;line-height:1.3;font-weight:700}",
    ".sfaj-title a{color:var(--sfaj-navy);text-decoration:none;border:0}",
    ".sfaj-title a:hover{color:var(--sfaj-blue);text-decoration:underline}",
    ".sfaj-org{font-weight:600;color:#333}.sfaj-dept{color:var(--sfaj-muted)}",
    ".sfaj-side{text-align:right;white-space:nowrap;font-size:15px}",
    ".sfaj-pay{font-weight:700;color:#333}",
    ".sfaj-soon{color:var(--sfaj-orange);font-weight:700}",
    ".sfaj-new{display:inline-block;vertical-align:3px;margin-left:8px;font-size:12px;font-weight:700;line-height:1;color:#fff;background:var(--sfaj-green);border-radius:6px;padding:4px 7px}",
    ".sfaj-tags{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;font-size:13px;color:var(--sfaj-muted)}",
    ".sfaj-tag{border:1px solid #d6d6d6;border-radius:6px;padding:1px 8px}",
    ".sfaj-empty{padding:28px;text-align:center;color:var(--sfaj-muted);border:2px dashed var(--sfaj-line);border-radius:10px;list-style:none}",
    ".sfaj-foot{font-size:14px;color:var(--sfaj-muted);margin-top:22px}",
    ".sfaj-foot a{color:inherit}.sfaj-down{color:#b42318!important}",
    ".sfaj-sources{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px}",
    "@media (max-width:640px){.sfaj-job{grid-template-columns:1fr}.sfaj-side{text-align:left}.sfaj select{flex:1 1 100%}}",
  ].join("");

  var CATS = [
    ["engineering", "Engineering & planning"],
    ["outreach", "Outreach & policy"],
    ["gis", "GIS & data"],
    ["pm", "Project management"],
  ];
  var LABELS = {};
  CATS.forEach(function (c) { LABELS[c[0]] = c[1]; });

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  function daysUntil(d) { return Math.round((new Date(d + "T12:00:00Z") - new Date(today + "T12:00:00Z")) / 864e5); }

  // Agency feeds often shout titles in ALL CAPS; set those in title case for reading.
  var SMALL = /^(a|an|and|as|at|by|for|in|of|on|or|the|to|with)$/i;
  var KEEP = /^(GIS|LA|LADOT|LADWP|DOT|PW|ISD|II|III|IV|VI|VII|CIP|ADA|HR|IT|UC|US|CA|TDM|ATP|DPW|CEQA|BRT|LRT|EV|I-VI|I\/II)$/;
  function title(s) {
    if (s !== s.toUpperCase()) return s;
    return s.toLowerCase().replace(/[A-Za-z][A-Za-z'\/-]*/g, function (w, i) {
      var up = w.toUpperCase();
      if (KEEP.test(up)) return up;
      if (i > 0 && SMALL.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
  }

  function salary(s) {
    if (!s || (!s.min && !s.max)) return "";
    var iv = s.interval || "";
    var yearly = !/hour|month|week|day/.test(iv);
    function f(n) {
      return yearly && n >= 1000 ? "$" + Math.round(n / 1000) + "K"
        : "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
    }
    var r = s.min && s.max && s.min !== s.max ? f(s.min) + "–" + f(s.max) : f(s.min || s.max);
    return r + (/hour/.test(iv) ? "/hr" : /month/.test(iv) ? "/mo" : "");
  }
  function annual(s) {
    if (!s) return 0;
    var v = s.max || s.min || 0;
    return /hour/.test(s.interval || "") ? v * 2080 : /month/.test(s.interval || "") ? v * 12 : v;
  }
  function closing(c) {
    if (!c) return { text: "", soon: false };
    if (c === "continuous") return { text: "Open until filled", soon: false };
    var n = daysUntil(c);
    if (n <= 0) return { text: "Closes today", soon: true };
    if (n === 1) return { text: "Closes tomorrow", soon: true };
    if (n <= 7) return { text: "Closes in " + n + " days", soon: true };
    return { text: "Closes " + new Date(c + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), soon: false };
  }

  function mount(root) {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    root.classList.add("sfaj");
    root.innerHTML =
      '<div class="sfaj-bar">' +
      '<input type="search" placeholder="Search titles, departments, agencies" aria-label="Search jobs" autocomplete="off">' +
      '<select aria-label="Agency"><option value="">All agencies</option></select>' +
      '<select aria-label="Sort"><option value="new">Newest first</option><option value="closing">Closing soonest</option><option value="salary">Highest salary</option></select>' +
      "</div>" +
      '<div class="sfaj-chips" role="group" aria-label="Job type">' +
      CATS.map(function (c) { return '<button type="button" class="sfaj-chip" data-cat="' + c[0] + '" aria-pressed="false">' + c[1] + "</button>"; }).join("") +
      "</div>" +
      '<p class="sfaj-count" aria-live="polite">Loading jobs…</p>' +
      '<ul class="sfaj-list"></ul>' +
      '<div class="sfaj-foot"></div>';

    var q = root.querySelector("input"), sels = root.querySelectorAll("select"), agencySel = sels[0], sortSel = sels[1];
    var list = root.querySelector(".sfaj-list"), count = root.querySelector(".sfaj-count"), foot = root.querySelector(".sfaj-foot");
    var state = { q: "", agency: "", cats: {}, sort: "new" }, DATA = { jobs: [], agencies: [] }, names = {};

    function anyCat() { for (var k in state.cats) if (state.cats[k]) return true; return false; }
    function render() {
      var term = state.q.toLowerCase().trim();
      var jobs = DATA.jobs.filter(function (j) {
        return (!state.agency || j.agency === state.agency) &&
          (!anyCat() || j.categories.some(function (c) { return state.cats[c]; })) &&
          (!term || (j.title + " " + (j.department || "") + " " + (names[j.agency] || "")).toLowerCase().indexOf(term) >= 0);
      });
      if (state.sort === "closing") {
        var key = function (j) { return !j.closes || j.closes === "continuous" ? "9999" : j.closes; };
        jobs = jobs.slice().sort(function (a, b) { return key(a).localeCompare(key(b)); });
      } else if (state.sort === "salary") {
        jobs = jobs.slice().sort(function (a, b) { return annual(b.salary) - annual(a.salary); });
      }
      count.textContent = jobs.length + " open job" + (jobs.length === 1 ? "" : "s");
      list.innerHTML = jobs.length ? jobs.map(function (j) {
        var c = closing(j.closes), isNew = j.firstSeen && daysUntil(j.firstSeen) >= -6;
        return '<li class="sfaj-job"><div>' +
          '<h3 class="sfaj-title"><a href="' + esc(j.url) + '" target="_blank" rel="noopener">' + esc(title(j.title)) + "</a>" + (isNew ? '<span class="sfaj-new">New</span>' : "") + "</h3>" +
          '<div><span class="sfaj-org">' + esc(names[j.agency] || j.agency) + "</span>" + (j.department ? ' <span class="sfaj-dept">' + esc(title(j.department)) + "</span>" : "") + "</div>" +
          '</div><div class="sfaj-side"><div class="sfaj-pay">' + esc(salary(j.salary)) + '</div><div class="' + (c.soon ? "sfaj-soon" : "") + '">' + esc(c.text) + "</div></div>" +
          '<div class="sfaj-tags">' + j.categories.map(function (k) { return '<span class="sfaj-tag">' + esc(LABELS[k] || k) + "</span>"; }).join("") +
          (j.jobType ? "<span>" + esc(j.jobType) + "</span>" : "") + "</div></li>";
      }).join("") : '<li class="sfaj-empty">No open jobs match these filters.<br><br><button type="button" class="sfaj-chip sfaj-reset">Clear filters</button></li>';
      var reset = root.querySelector(".sfaj-reset");
      if (reset) reset.onclick = function () {
        state.q = ""; state.agency = ""; state.cats = {}; q.value = ""; agencySel.value = ""; syncChips(); render();
      };
    }
    function syncChips() {
      root.querySelectorAll(".sfaj-chips .sfaj-chip").forEach(function (b) { b.setAttribute("aria-pressed", !!state.cats[b.getAttribute("data-cat")]); });
    }

    root.querySelector(".sfaj-chips").addEventListener("click", function (e) {
      var b = e.target.closest(".sfaj-chip"); if (!b) return;
      var k = b.getAttribute("data-cat"); state.cats[k] = !state.cats[k]; syncChips(); render();
    });
    q.addEventListener("input", function () { state.q = q.value; render(); });
    agencySel.addEventListener("change", function () { state.agency = agencySel.value; render(); });
    sortSel.addEventListener("change", function () { state.sort = sortSel.value; render(); });

    fetch(base + "jobs.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        DATA = d;
        DATA.agencies.forEach(function (a) { names[a.id] = a.short || a.name; });
        var counts = {};
        DATA.jobs.forEach(function (j) { counts[j.agency] = (counts[j.agency] || 0) + 1; });
        agencySel.innerHTML += DATA.agencies.slice()
          .sort(function (a, b) { return (a.short || a.name).localeCompare(b.short || b.name); })
          .map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.short || a.name) + " (" + (counts[a.id] || 0) + ")</option>"; }).join("");
        var down = {};
        (DATA.sources || []).forEach(function (s) { if (!s.ok) down[s.id] = true; });
        var when = DATA.updated ? new Date(DATA.updated).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Los_Angeles" }) : "";
        foot.innerHTML = "<p>Listings come from each agency's official job site and link there to apply. Civil service jobs usually require an exam, so read the bulletin and apply before the filing deadline." +
          (when ? " Updated " + esc(when) + "." : "") + "</p>" +
          '<div class="sfaj-sources">' + DATA.agencies.map(function (a) {
            return '<a href="' + esc(a.careersUrl || "#") + '" target="_blank" rel="noopener"' +
              (down[a.id] ? ' class="sfaj-down" title="Not refreshed today; showing its last known listings."' : "") + ">" + esc(a.name) + "</a>";
          }).join("") + "</div>";
        render();
      })
      .catch(function () { count.textContent = "The job list didn't load. Refresh the page to try again."; });
  }

  function start() {
    var root = document.getElementById("sfa-jobs");
    if (!root) {
      root = document.createElement("div");
      root.id = "sfa-jobs";
      if (script && script.parentNode) script.parentNode.insertBefore(root, script);
      else document.body.appendChild(root);
    }
    if (!root.classList.contains("sfaj")) mount(root);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
