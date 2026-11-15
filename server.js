const express = require("express");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const app = express();
const PORT = process.env.PORT || 3000;
const VAULT = path.resolve(process.env.VAULT_PATH || path.join(__dirname, "data", "vault"));
const DAILY = path.join(VAULT, "Daily");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));
fs.mkdirSync(DAILY, { recursive: true });

const safeDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !Number.isNaN(Date.parse(s));
const notePath = (date) => path.join(DAILY, `${date}.md`);
const yamlBool = (v) => v ? "true" : "false";
const clean = (v) => String(v ?? "").replace(/\r/g, "").trim();

function serialize(d) {
  const habits = d.habits || {};
  return `---
date: ${d.date}
energy: ${Number(d.energy)}
mood: ${Number(d.mood)}
motivation: ${Number(d.motivation)}
sleep_quality: ${Number(d.sleep_quality)}
overall: ${Number(d.overall)}
food: "${clean(d.food).replace(/"/g, '\\"')}"
exercise: "${clean(d.exercise).replace(/"/g, '\\"')}"
water: ${yamlBool(!!habits.water)}
daylight: ${yamlBool(!!habits.daylight)}
movement: ${yamlBool(!!habits.movement)}
screen_time: ${yamlBool(!!habits.screen_time)}
sleep_routine: ${yamlBool(!!habits.sleep_routine)}
---

## Reflection

${clean(d.reflection)}
`;
}

function parseNote(content) {
  const front = (content.match(/^---\n([\s\S]*?)\n---/m) || [,""])[1];
  const body = (content.split("---").slice(2).join("---").match(/## Reflection\s*([\s\S]*)/) || [,""])[1].trim();
  const out = {};
  for (const line of front.split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"');
    else if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (/^\d+$/.test(value)) value = Number(value);
    out[m[1]] = value;
  }
  out.reflection = body;
  out.habits = {
    water: !!out.water, daylight: !!out.daylight, movement: !!out.movement,
    screen_time: !!out.screen_time, sleep_routine: !!out.sleep_routine
  };
  return out;
}

function getEntry(date) {
  const p = notePath(date);
  return fs.existsSync(p) ? parseNote(fs.readFileSync(p, "utf8")) : null;
}
function allEntries() {
  return fs.readdirSync(DAILY).filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .map(f => getEntry(f.slice(0,10))).filter(Boolean).sort((a,b) => a.date.localeCompare(b.date));
}
function average(entries, key) {
  const vals = entries.map(e => Number(e[key])).filter(Number.isFinite);
  return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0) / vals.length * 10) / 10 : null;
}
function report(title, entries, period) {
  const keys = [["energy","Energy"],["mood","Mood"],["motivation","Motivation"],["sleep_quality","Sleep quality"],["overall","Overall wellbeing"]];
  const lines = [`# ${title}`, "", `Period: ${period}`, `Entries recorded: ${entries.length}`, "", "## Average scores", ""];
  for (const [k,label] of keys) lines.push(`- ${label}: ${average(entries,k) ?? "—"}/10`);
  lines.push("", "## Daily entries", "");
  for (const e of entries) {
    lines.push(`### ${e.date}`);
    lines.push(`- Energy ${e.energy}/10 · Mood ${e.mood}/10 · Motivation ${e.motivation}/10 · Sleep ${e.sleep_quality}/10 · Overall ${e.overall}/10`);
    lines.push(`- Food: ${e.food || "Not recorded"} · Exercise: ${e.exercise || "Not recorded"}`);
    const h = e.habits || {};
    lines.push(`- Habits: water ${h.water ? "yes" : "no"}, daylight ${h.daylight ? "yes" : "no"}, movement ${h.movement ? "yes" : "no"}, screen boundaries ${h.screen_time ? "yes" : "no"}, sleep routine ${h.sleep_routine ? "yes" : "no"}`);
    if (e.reflection) lines.push("", e.reflection);
    lines.push("");
  }
  return lines.join("\n");
}

app.get("/api/entry/:date", (req,res) => {
  if (!safeDate(req.params.date)) return res.status(400).json({error:"Invalid date"});
  res.json(getEntry(req.params.date) || {});
});
app.post("/api/entry", (req,res) => {
  const d = req.body || {};
  if (!safeDate(d.date)) return res.status(400).json({error:"Invalid date"});
  for (const k of ["energy","mood","motivation","sleep_quality","overall"]) {
    if (!Number.isInteger(Number(d[k])) || Number(d[k]) < 1 || Number(d[k]) > 10) return res.status(400).json({error:`${k} must be 1–10`});
  }
  fs.writeFileSync(notePath(d.date), serialize(d), "utf8");
  res.json({ok:true, date:d.date});
});
app.get("/api/export/day/:date", (req,res) => {
  if (!safeDate(req.params.date)) return res.status(400).send("Invalid date");
  const p = notePath(req.params.date);
  if (!fs.existsSync(p)) return res.status(404).send("No entry for this date");
  res.download(p, `${req.params.date}.md`);
});
app.get("/api/export/:kind/:period", (req,res) => {
  const {kind,period} = req.params;
  let entries, title, filename;
  if (kind === "week" && /^\d{4}-W\d{2}$/.test(period)) {
    const [y,w] = period.split("-W").map(Number);
    const jan4 = new Date(Date.UTC(y,0,4));
    const day = jan4.getUTCDay() || 7;
    const start = new Date(jan4); start.setUTCDate(jan4.getUTCDate() - day + 1 + (w-1)*7);
    const end = new Date(start); end.setUTCDate(start.getUTCDate()+6);
    const from = start.toISOString().slice(0,10), to = end.toISOString().slice(0,10);
    entries = allEntries().filter(e=>e.date>=from && e.date<=to);
    title = `Weekly wellbeing report — ${period}`; filename = `${period}.md`;
  } else if (kind === "month" && /^\d{4}-\d{2}$/.test(period)) {
    entries = allEntries().filter(e=>e.date.startsWith(period));
    title = `Monthly wellbeing report — ${period}`; filename = `${period}.md`;
  } else if (kind === "year" && /^\d{4}$/.test(period)) {
    entries = allEntries().filter(e=>e.date.startsWith(period));
    title = `Yearly wellbeing report — ${period}`; filename = `${period}.md`;
  } else return res.status(400).send("Invalid report period");
  const content = report(title, entries, period);
  res.setHeader("Content-Type","text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition",`attachment; filename="${filename}"`);
  res.send(content);
});
app.get("/api/backup", (req,res) => {
  res.setHeader("Content-Type","application/zip");
  res.setHeader("Content-Disposition",'attachment; filename="wellbeing-vault.zip"');
  const archive = archiver("zip", {zlib:{level:9}});
  archive.on("error", err => res.status(500).end());
  archive.pipe(res);
  archive.directory(VAULT, false);
  archive.finalize();
});
app.get("/api/health", (_,res)=>res.json({ok:true}));
require("./checkins-v2")(app, VAULT);

app.listen(PORT, "0.0.0.0", () => console.log(`Wellbeing app listening on ${PORT}; vault: ${VAULT}`));
