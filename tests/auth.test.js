const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test("single-owner authentication protects app APIs and supports setup, login and logout", async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wellbeing-auth-"));
  const port = await freePort();
  const origin = "http://127.0.0.1:" + port;
  const child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_PATH: path.join(root, "data"),
      VAULT_PATH: path.join(root, "vault"),
      WELLBEING_SETUP_KEY: "test-only-bootstrap-key-which-is-long-enough",
      SESSION_COOKIE_SECURE: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk.toString(); });
  child.stderr.on("data", chunk => { output += chunk.toString(); });
  t.after(async () => {
    child.kill("SIGTERM");
    await new Promise(resolve => child.once("exit", resolve));
    fs.rmSync(root, { recursive: true, force: true });
  });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(origin + "/api/health");
      if (response.ok) { ready = true; break; }
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, "server should start; output: " + output);

  const blocked = await fetch(origin + "/api/v2/entries");
  assert.equal(blocked.status, 401);

  const setup = await fetch(origin + "/auth/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      setupKey: "test-only-bootstrap-key-which-is-long-enough",
      username: "owner",
      password: "a-very-long-test-password"
    })
  });
  assert.equal(setup.status, 200);

  const repeatSetup = await fetch(origin + "/auth/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      setupKey: "test-only-bootstrap-key-which-is-long-enough",
      username: "second",
      password: "another-long-password"
    })
  });
  assert.equal(repeatSetup.status, 409);

  const login = await fetch(origin + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ username: "owner", password: "a-very-long-test-password" })
  });
  assert.equal(login.status, 200);
  const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
  assert.match(cookie, /^wellbeing_session=/);

  const allowed = await fetch(origin + "/api/v2/entries", { headers: { Cookie: cookie } });
  assert.equal(allowed.status, 200);

  const logout = await fetch(origin + "/auth/logout", {
    method: "POST",
    headers: { Origin: origin, Cookie: cookie }
  });
  assert.equal(logout.status, 200);

  const blockedAgain = await fetch(origin + "/api/v2/entries", { headers: { Cookie: cookie } });
  assert.equal(blockedAgain.status, 401);
});
