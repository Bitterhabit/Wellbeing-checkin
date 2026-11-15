const fs = require("fs");
const path = require("path");

module.exports = function registerV2(app, vaultPath) {
  const daily = path.join(vaultPath, "Daily");
  const startMarker = "<!-- wellbeing-data:v2";
  const endMarker = "wellbeing-data -->";
  const validDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    const d = new Date(value + "T00:00:00.000Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
  };
  const fileFor = date => path.join(daily, date + ".md");
  const clean = (value, max = 5000) => String(value ?? "").replace(/\r/g, "").trim().slice(0, max);

  function parseLegacy(content, date) {
    const front = (content.match(/^---\n([\s\S]*?)\n---/m) || [, ""])[1];
    const body = (content.split("---").slice(2).join("---").match(/## Reflection\s*([\s\S]*)/) || [, ""])[1].trim();
    const values = {};
    for (const line of front.split("\n")) {
      const m = line.match(/^([a-z_]+):\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"');
      else if (v === "true") v = true;
      else if (v === "false") v = false;
      else if (/^\d+$/.test(v)) v = Number(v);
      values[m[1]] = v;
    }
    values.date = values.date || date;
    values.reflection = body;
    values.habits = {
      water: !!values.water, daylight: !!values.daylight, movement: !!values.movement,
      screen_time: !!values.screen_time, sleep_routine: !!values.sleep_routine
    };
    return values;
  }

  function read(date) {
    const file = fileFor(date);
    if (!fs.existsSync(file)) return { date, morning: null, evening: null, tags: [], legacy: null, schema_version: 2 };
    const content = fs.readFileSync(file, "utf8");
    const start = content.indexOf(startMarker);
    const end = content.indexOf(endMarker, start);
    if (start >= 0 && end > start) {
      try {
        const data = JSON.parse(content.slice(start + startMarker.length, end).trim());
        return { date, morning: data.morning || null, evening: data.evening || null, tags: data.tags || [], legacy: data.legacy || null, schema_version: 2 };
      } catch (_) {}
    }
    const legacy = parseLegacy(content, date);
    return { date, morning: null, evening: null, tags: [], legacy, schema_version: 1 };
  }

  function write(entry) {
    const payload = {
      morning: entry.morning || null,
      evening: entry.evening || null,
      tags: entry.tags || [],
      legacy: entry.legacy || null
    };
    const m = payload.morning || {}, e = payload.evening || {};
    const markdown = [
      "---", "date: " + entry.date, "schema_version: 2", "---", "",
      startMarker, JSON.stringify(payload), endMarker, "",
      "# Daily check-in — " + entry.date, "",
      "## Morning", "", m.intention || "_No morning intention recorded._", "", m.notes || "",
      "", "## Evening", "",
      e.went_well ? "### What went well\n\n" + e.went_well : "_No evening reflection recorded._",
      "", e.difficult ? "### What felt difficult\n\n" + e.difficult : "",
      "", e.notes || "", ""
    ].join("\n");
    fs.mkdirSync(daily, { recursive: true });
    fs.writeFileSync(fileFor(entry.date), markdown, "utf8");
  }

  function all() {
    return fs.readdirSync(daily).filter(name => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
      .map(name => read(name.slice(0, 10))).sort((a, b) => a.date.localeCompare(b.date));
  }
  function summary(entry) {
    const preview = [
      entry.morning?.intention, entry.morning?.notes, entry.evening?.went_well,
      entry.evening?.difficult, entry.evening?.notes, entry.legacy?.reflection
    ].filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 220);
    const stat = fs.statSync(fileFor(entry.date));
    return {
      id: "daily-" + entry.date, date: entry.date, title: "Daily check-in — " + entry.date,
      type: "daily", tags: entry.tags || [],
      sections: [entry.morning ? "morning" : null, entry.evening ? "evening" : null].filter(Boolean),
      preview, updatedAt: stat.mtime.toISOString()
    };
  }
  function numeric(entry, key) {
    const old = entry.legacy || {};
    if (key === "sleep_quality") return Number(entry.morning?.sleep_quality ?? old.sleep_quality);
    if (key === "mood") return Number(entry.evening?.mood ?? entry.morning?.mood ?? old.mood);
    if (key === "energy") return Number(entry.evening?.energy ?? entry.morning?.energy ?? old.energy);
    return Number(old[key]);
  }
  function avg(entries, key) {
    const nums = entries.map(e => numeric(e, key)).filter(n => Number.isFinite(n) && n >= 1 && n <= 10);
    return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 10) / 10 : null;
  }
  function weekKey(value) {
    const d = new Date(value + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const year = d.getUTCFullYear(), first = new Date(Date.UTC(year, 0, 1));
    return year + "-W" + String(Math.ceil((((d - first) / 86400000) + 1) / 7)).padStart(2, "0");
  }
  function validateSection(value, name) {
    if (value == null) return null;
    if (typeof value !== "object" || Array.isArray(value)) throw new Error(name + " must be an object");
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (["mood", "energy", "sleep_quality"].includes(key) && item !== "" && item != null) {
        const n = Number(item);
        if (!Number.isInteger(n) || n < 1 || n > 10) throw new Error(name + "." + key + " must be 1–10");
        out[key] = n;
      } else if (typeof item === "string") out[key] = clean(item);
      else if (key === "habits" && item && typeof item === "object" && !Array.isArray(item)) {
        out.habits = Object.fromEntries(Object.entries(item).slice(0, 30).map(([k, v]) => [clean(k, 60), !!v]));
      }
    }
    return out;
  }

  app.get("/api/v2/entry/:date", (req, res) => {
    if (!validDate(req.params.date)) return res.status(400).json({ error: "Invalid date" });
    res.json(read(req.params.date));
  });
  app.post("/api/v2/entry", (req, res) => {
    const body = req.body || {};
    if (!validDate(body.date)) return res.status(400).json({ error: "Invalid date" });
    try {
      const current = read(body.date);
      const entry = {
        date: body.date,
        morning: Object.hasOwn(body, "morning") ? validateSection(body.morning, "morning") : current.morning,
        evening: Object.hasOwn(body, "evening") ? validateSection(body.evening, "evening") : current.evening,
        tags: Object.hasOwn(body, "tags")
          ? [...new Set((Array.isArray(body.tags) ? body.tags : []).map(t => clean(t, 40).replace(/[<>]/g, "")).filter(Boolean))].slice(0, 30)
          : current.tags,
        legacy: current.legacy
      };
      write(entry);
      res.json({ ok: true, date: entry.date, schema_version: 2 });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.get("/api/v2/entries", (req, res) => {
    const from = req.query.from, to = req.query.to;
    if ((from && !validDate(from)) || (to && !validDate(to))) return res.status(400).json({ error: "Invalid date range" });
    const entries = all().filter(e => (!from || e.date >= from) && (!to || e.date <= to));
    res.json({ entries: entries.map(summary), total: entries.length });
  });
  app.get("/api/v2/search", (req, res) => {
    const q = clean(req.query.q, 120).toLowerCase(), tag = clean(req.query.tag, 40).toLowerCase();
    const matches = all().filter(e => {
      const s = summary(e), text = (e.date + " " + s.preview + " " + (e.tags || []).join(" ")).toLowerCase();
      return (!q || text.includes(q)) && (!tag || (e.tags || []).some(t => t.toLowerCase() === tag));
    }).reverse();
    res.json({ entries: matches.map(summary), total: matches.length });
  });
  app.get("/api/v2/insights", (req, res) => {
    const period = req.query.period === "month" ? "month" : "week";
    const date = validDate(req.query.date) ? req.query.date : new Date().toISOString().slice(0, 10);
    let from, to, label;
    if (period === "month") {
      from = date.slice(0, 7) + "-01";
      to = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).toISOString().slice(0, 10);
      label = date.slice(0, 7);
    } else {
      const d = new Date(date + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() - (d.getUTCDay() || 7) + 1);
      from = d.toISOString().slice(0, 10);
      d.setUTCDate(d.getUTCDate() + 6);
      to = d.toISOString().slice(0, 10);
      label = weekKey(date);
    }
    const entries = all().filter(e => e.date >= from && e.date <= to);
    res.json({
      period, label, from, to, entryCount: entries.length,
      averages: { mood: avg(entries, "mood"), energy: avg(entries, "energy"), sleep_quality: avg(entries, "sleep_quality") },
      sourceDates: entries.map(e => e.date),
      note: "Averages use recorded numeric values only. They do not explain causes or make medical assessments."
    });
  });
  app.get("/api/v2/brain-map", (req, res) => {
    const entries = all(), visible = entries.slice(-400), nodes = visible.map(summary), edges = [];
    for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i], b = visible[j];
      const shared = (a.tags || []).filter(t => (b.tags || []).includes(t));
      const sameWeek = weekKey(a.date) === weekKey(b.date);
      if (sameWeek || shared.length) edges.push({
        source: "daily-" + a.date, target: "daily-" + b.date,
        type: shared.length ? "shared-tag" : "same-week", tags: shared
      });
    }
    res.json({ nodes, edges, generatedAt: new Date().toISOString(), truncated: entries.length > visible.length });
  });
};
