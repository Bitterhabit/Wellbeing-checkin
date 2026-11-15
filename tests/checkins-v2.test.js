const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const registerV2 = require("../checkins-v2");

async function withServer(run) {
  const vault = fs.mkdtempSync(path.join(os.tmpdir(), "wellbeing-test-"));
  const app = express();
  app.use(express.json());
  registerV2(app, vault);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  try { await run(base, vault); }
  finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(vault, { recursive: true, force: true });
  }
}

test("accepts an independent morning check-in and returns it", async () => {
  await withServer(async base => {
    const saved = await fetch(base + "/api/v2/entry", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: "2026-11-15", morning: { sleep_quality: 7, mood: 6, energy: 5, intention: "Take it steadily" } })
    });
    assert.equal(saved.status, 200);
    const loaded = await fetch(base + "/api/v2/entry/2026-11-15").then(r => r.json());
    assert.equal(loaded.morning.intention, "Take it steadily");
    assert.equal(loaded.evening, null);
  });
});

test("saves evening independently without overwriting morning", async () => {
  await withServer(async base => {
    const post = (body) => fetch(base + "/api/v2/entry", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    await post({ date: "2026-11-15", morning: { mood: 7, intention: "Get outside" } });
    await post({ date: "2026-11-15", evening: { went_well: "A good walk", difficult: "Busy day" } });
    const entry = await fetch(base + "/api/v2/entry/2026-11-15").then(r => r.json());
    assert.equal(entry.morning.intention, "Get outside");
    assert.equal(entry.evening.went_well, "A good walk");
  });
});

test("rejects impossible dates and out-of-range scores", async () => {
  await withServer(async base => {
    const post = body => fetch(base + "/api/v2/entry", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    assert.equal((await post({ date: "2026-02-31", morning: {} })).status, 400);
    assert.equal((await post({ date: "2026-11-15", morning: { mood: 11 } })).status, 400);
  });
});

test("indexes real records and builds source-linked insight summaries", async () => {
  await withServer(async base => {
    await fetch(base + "/api/v2/entry", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: "2026-11-15", morning: { mood: 7, energy: 6, sleep_quality: 8, intention: "Walk the dog" }, tags: ["outside"] })
    });
    const list = await fetch(base + "/api/v2/entries").then(r => r.json());
    assert.equal(list.total, 1);
    assert.equal(list.entries[0].id, "daily-2026-11-15");
    const insight = await fetch(base + "/api/v2/insights?period=week&date=2026-11-15").then(r => r.json());
    assert.deepEqual(insight.sourceDates, ["2026-11-15"]);
    assert.equal(insight.averages.mood, 7);
    const graph = await fetch(base + "/api/v2/brain-map").then(r => r.json());
    assert.equal(graph.nodes.length, 1);
    assert.deepEqual(graph.nodes[0].tags, ["outside"]);
  });
});


test("keeps legacy Markdown content when a new section is saved", async () => {
  await withServer(async (base, vault) => {
    const daily = path.join(vault, "Daily");
    fs.mkdirSync(daily, { recursive: true });
    fs.writeFileSync(path.join(daily, "2026-11-14.md"), [
      "---", "date: 2026-11-14", "energy: 6", "mood: 7", "motivation: 5",
      "sleep_quality: 8", "overall: 7", "food: \"\"", "exercise: \"\"",
      "water: true", "daylight: false", "movement: true", "screen_time: false",
      "sleep_routine: true", "---", "", "## Reflection", "", "A useful old note.", ""
    ].join("\n"));
    const old = await fetch(base + "/api/v2/entry/2026-11-14").then(r => r.json());
    assert.equal(old.legacy.reflection, "A useful old note.");
    await fetch(base + "/api/v2/entry", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: "2026-11-14", morning: { intention: "Keep the old note too" } })
    });
    const upgraded = await fetch(base + "/api/v2/entry/2026-11-14").then(r => r.json());
    assert.equal(upgraded.legacy.reflection, "A useful old note.");
    assert.equal(upgraded.legacy.mood, 7);
    const report = await fetch(base + "/api/v2/export/month/2026-11").then(r => r.text());
    assert.match(report, /A useful old note/);
  });
});
