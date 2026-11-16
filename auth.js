const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(crypto.scrypt);

module.exports = function registerAuth(app, dataPath) {
  const dir = path.join(dataPath, "auth");
  const accountFile = path.join(dir, "account.json");
  const sessionsFile = path.join(dir, "sessions.json");
  const generatedKeyFile = path.join(dir, "setup.key");
  const cookieName = "wellbeing_session";
  const secureCookie = process.env.SESSION_COOKIE_SECURE !== "false";
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const attempts = new Map();

  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const readJson = (file, fallback) => {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (_) { return fallback; }
  };
  const saveJson = (file, value) => {
    const temp = file + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600 });
    fs.renameSync(temp, file);
    try { fs.chmodSync(file, 0o600); } catch (_) {}
  };

  let setupKey = process.env.WELLBEING_SETUP_KEY || "";
  if (!setupKey && !fs.existsSync(accountFile)) {
    if (fs.existsSync(generatedKeyFile)) setupKey = fs.readFileSync(generatedKeyFile, "utf8").trim();
    else {
      setupKey = crypto.randomBytes(32).toString("hex");
      fs.writeFileSync(generatedKeyFile, setupKey, { mode: 0o600 });
      console.warn("\n[wellbeing-auth] One-time account setup key (enter this on /setup): " + setupKey + "\n");
    }
  }

  let sessions = readJson(sessionsFile, {});
  const now = Date.now();
  for (const [id, session] of Object.entries(sessions)) if (!session || session.expiresAt <= now) delete sessions[id];
  saveJson(sessionsFile, sessions);

  const accountExists = () => fs.existsSync(accountFile);
  const account = () => readJson(accountFile, null);
  const hashPassword = async (password, salt) => Buffer.from(await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })).toString("hex");
  const safeEqual = (a, b) => {
    const aa = Buffer.from(String(a || ""));
    const bb = Buffer.from(String(b || ""));
    return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
  };
  const ipKey = req => req.ip || req.socket.remoteAddress || "unknown";
  function limited(req, action, max) {
    const key = action + ":" + ipKey(req), current = attempts.get(key) || { count: 0, start: Date.now() };
    if (Date.now() - current.start > 15 * 60 * 1000) { current.count = 0; current.start = Date.now(); }
    current.count++;
    attempts.set(key, current);
    return current.count > max;
  }
  function clearLimit(req, action) { attempts.delete(action + ":" + ipKey(req)); }
  function setCookie(res, token) {
    const parts = [cookieName + "=" + token, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=" + Math.floor(sessionTtl / 1000)];
    if (secureCookie) parts.push("Secure");
    res.setHeader("Set-Cookie", parts.join("; "));
  }
  function clearCookie(res) {
    const parts = [cookieName + "=", "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
    if (secureCookie) parts.push("Secure");
    res.setHeader("Set-Cookie", parts.join("; "));
  }
  function tokenFrom(req) {
    const raw = req.headers.cookie || "";
    const part = raw.split(";").map(v => v.trim()).find(v => v.startsWith(cookieName + "="));
    return part ? decodeURIComponent(part.slice(cookieName.length + 1)) : "";
  }
  function currentSession(req) {
    const token = tokenFrom(req);
    if (!token || token.length > 200) return null;
    const id = crypto.createHash("sha256").update(token).digest("hex");
    const session = sessions[id];
    if (!session || session.expiresAt <= Date.now()) {
      if (session) { delete sessions[id]; saveJson(sessionsFile, sessions); }
      return null;
    }
    return { id, session };
  }
  function originAllowed(req) {
    const origin = req.get("origin");
    if (!origin) return false;
    try {
      const host = new URL(origin).host;
      const expected = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
      return !!expected && host.toLowerCase() === expected.toLowerCase();
    } catch (_) { return false; }
  }

  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (req.path === "/sw.js") res.setHeader("Service-Worker-Allowed", "/");
    next();
  });

  app.get("/auth/status", (req, res) => {
    const active = currentSession(req);
    res.json({ authenticated: !!active, setupRequired: !accountExists() });
  });

  app.post("/auth/setup", async (req, res) => {
    if (accountExists()) return res.status(409).json({ error: "Initial setup has already been completed." });
    if (limited(req, "setup", 5)) return res.status(429).json({ error: "Too many setup attempts. Try again later." });
    if (!originAllowed(req)) return res.status(403).json({ error: "Request origin could not be verified." });
    const { setupKey: supplied, username, password } = req.body || {};
    const cleanUser = String(username || "").trim().toLowerCase();
    if (!setupKey || !safeEqual(supplied, setupKey)) return res.status(403).json({ error: "Invalid setup key." });
    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUser)) return res.status(400).json({ error: "Username must be 3–32 characters (letters, numbers, dots, underscores or hyphens)." });
    if (typeof password !== "string" || password.length < 12 || password.length > 200) return res.status(400).json({ error: "Choose a password between 12 and 200 characters." });
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = await hashPassword(password, salt);
    saveJson(accountFile, { username: cleanUser, salt, passwordHash, createdAt: new Date().toISOString() });
    setupKey = "";
    try { fs.unlinkSync(generatedKeyFile); } catch (_) {}
    clearLimit(req, "setup");
    res.json({ ok: true });
  });

  app.post("/auth/login", async (req, res) => {
    if (limited(req, "login", 10)) return res.status(429).json({ error: "Too many login attempts. Try again in 15 minutes." });
    if (!originAllowed(req)) return res.status(403).json({ error: "Request origin could not be verified." });
    const stored = account();
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!stored || !safeEqual(username, stored.username)) return res.status(401).json({ error: "Incorrect username or password." });
    const candidate = await hashPassword(password, stored.salt);
    if (!safeEqual(candidate, stored.passwordHash)) return res.status(401).json({ error: "Incorrect username or password." });
    clearLimit(req, "login");
    const old = currentSession(req);
    if (old) delete sessions[old.id];
    const token = crypto.randomBytes(32).toString("base64url");
    const id = crypto.createHash("sha256").update(token).digest("hex");
    sessions[id] = { username: stored.username, createdAt: Date.now(), expiresAt: Date.now() + sessionTtl };
    saveJson(sessionsFile, sessions);
    setCookie(res, token);
    res.json({ ok: true, username: stored.username });
  });

  app.post("/auth/logout", (req, res) => {
    if (!originAllowed(req)) return res.status(403).json({ error: "Request origin could not be verified." });
    const active = currentSession(req);
    if (active) { delete sessions[active.id]; saveJson(sessionsFile, sessions); }
    clearCookie(res);
    res.json({ ok: true });
  });

  app.get("/auth/me", (req, res) => {
    const active = currentSession(req);
    if (!active) return res.status(401).json({ error: "Authentication required." });
    res.json({ username: active.session.username });
  });

  app.use((req, res, next) => {
    const publicPaths = new Set(["/login", "/login.html", "/login.js", "/setup", "/setup.html", "/manifest.webmanifest", "/sw.js", "/api/health", "/auth/status", "/auth/login", "/auth/setup"]);
    if (publicPaths.has(req.path)) return next();
    const active = currentSession(req);
    if (!active) {
      if (req.path.startsWith("/api/") || req.path.startsWith("/auth/")) return res.status(401).json({ error: "Authentication required." });
      return res.redirect(302, accountExists() ? "/login" : "/setup");
    }
    req.auth = { username: active.session.username };
    next();
  });

  app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
  app.get("/setup", (req, res) => res.sendFile(path.join(__dirname, "public", "setup.html")));
  app.post("/auth/logout", (req, res) => res.json({ ok: true }));
};
