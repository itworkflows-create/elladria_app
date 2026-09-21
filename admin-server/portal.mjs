import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { promisify } from "node:util";
import {
  availableDates,
  offices,
  times,
  reasons,
  validateProfile,
} from "../mobile/src/domain.ts";
const scrypt = promisify(crypto.scrypt);
const fail = (status, message) => Object.assign(new Error(message), { status });
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const MAX = 5 * 1024 * 1024;
export function createPortal(directory, getCatalog) {
  const dataFile = path.join(directory, "customers.json"),
    uploadDir = path.join(directory, "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });
  let db = fs.existsSync(dataFile)
    ? JSON.parse(fs.readFileSync(dataFile, "utf8"))
    : {
        customers: [],
        sessions: [],
        appointments: [],
        applications: [],
        files: [],
      };
  for (const key of [
    "customers",
    "sessions",
    "appointments",
    "applications",
    "files",
  ])
    if (!Array.isArray(db[key]))
      throw new Error(
        "Invalid customer store. Restore the backup before restarting.",
      );
  function save() {
    const tmp = dataFile + ".tmp";
    if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, dataFile + ".bak");
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, dataFile);
  }
  const transaction = (action) => {
    const before = structuredClone(db);
    try {
      const result = action();
      save();
      return result;
    } catch (error) {
      db = before;
      throw error;
    }
  };
  const clean = ({ passwordHash, salt, ...profile }) => profile;
  const view = (user) => ({
    profile: clean(user),
    appointments: db.appointments.filter((item) => item.customerId === user.id),
    applications: db.applications.filter((item) => item.customerId === user.id),
    files: db.files.filter((item) => item.ownerId === user.id),
  });
  const reply = (res, status, value) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(value));
  };
  async function bytes(req, limit = MAX) {
    if (Number(req.headers["content-length"]) > limit) {
      req.resume();
      throw fail(413, "Maximum file size is 5 MB.");
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) throw fail(413, "Maximum file size is 5 MB.");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  async function json(req) {
    const raw = await bytes(req, 131072);
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw Error();
      return value;
    } catch {
      throw fail(400, "Invalid JSON.");
    }
  }
  function userFor(req) {
    const token =
      req.headers.authorization?.replace(/^Bearer /, "") ||
      /(?:^|;\s*)elladria_customer=([a-f0-9]+)/.exec(
        req.headers.cookie || "",
      )?.[1];
    const session = db.sessions.find(
      (item) => item.hash === hash(token || "") && item.expires > Date.now(),
    );
    const user =
      session && db.customers.find((item) => item.id === session.customerId);
    if (!user) throw fail(401, "Please sign in to your customer account.");
    return user;
  }
  const attempts = new Map();
  function throttle(req) {
    const key = req.socket.remoteAddress,
      now = Date.now();
    for (const [ip, v] of attempts)
      if (now - v.start > 900000) attempts.delete(ip);
    const item = attempts.get(key) || { start: now, count: 0 };
    item.count++;
    attempts.set(key, item);
    if (item.count > 30)
      throw fail(429, "Too many account attempts. Try again in 15 minutes.");
  }
  function session(user, res) {
    const token = crypto.randomBytes(32).toString("hex");
    transaction(() => {
      db.sessions = db.sessions.filter((item) => item.expires > Date.now());
      db.sessions.push({
        hash: hash(token),
        customerId: user.id,
        expires: Date.now() + 7 * 86400000,
      });
    });
    res.setHeader(
      "Set-Cookie",
      `elladria_customer=${token}; HttpOnly; SameSite=Strict; Path=/api/customer; Max-Age=604800`,
    );
    return { token, ...view(user) };
  }
  function serveFile(res, file, download = true) {
    const filePath = path.join(uploadDir, file.id);
    if (!fs.existsSync(filePath)) throw fail(404, "File is unavailable.");
    res.writeHead(200, {
      "Content-Type": file.mime,
      "Content-Length": file.size,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Content-Security-Policy": "sandbox; default-src 'none'",
    });
    fs.createReadStream(filePath).pipe(res);
  }
  async function upload(req, ownerId, kind) {
    if (!["job-image", "CV", "Document"].includes(kind))
      throw fail(400, "Choose CV or Document.");
    if (db.files.filter((item) => item.ownerId === ownerId).length >= 100)
      throw fail(400, "Upload limit reached. Remove an old file first.");
    const raw = await bytes(req);
    let mime;
    if (
      raw.length >= 8 &&
      raw.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      mime = "image/png";
    else if (
      raw.length >= 3 &&
      raw[0] === 255 &&
      raw[1] === 216 &&
      raw[2] === 255
    )
      mime = "image/jpeg";
    else if (raw.subarray(0, 5).toString() === "%PDF-")
      mime = "application/pdf";
    if (!mime || (kind === "job-image" && mime === "application/pdf"))
      throw fail(
        415,
        kind === "job-image"
          ? "Choose a PNG or JPEG image."
          : "Choose a PDF, PNG, or JPEG file.",
      );
    const declared = req.headers["content-type"]?.split(";")[0];
    if (
      declared &&
      declared !== "application/octet-stream" &&
      declared !== mime
    )
      throw fail(415, "The file content does not match its type.");
    let name;
    try {
      name = decodeURIComponent(req.headers["x-file-name"] || "upload");
    } catch {
      throw fail(400, "Invalid filename.");
    }
    name =
      path
        .basename(name.replaceAll("\\", "/"))
        .replace(/[\x00-\x1f\x7f]/g, "")
        .slice(0, 160) || "upload";
    const id = crypto.randomUUID(),
      file = {
        id,
        name,
        mime,
        size: raw.length,
        kind,
        ownerId,
        createdAt: new Date().toISOString(),
      };
    fs.writeFileSync(path.join(uploadDir, id), raw, { flag: "wx" });
    transaction(() => db.files.push(file));
    return file;
  }
  async function customer(req, res, url) {
    const origin = req.headers.origin;
    if (origin) {
      let parsed;
      try {
        parsed = new URL(origin);
      } catch {
        throw fail(403, "Untrusted origin.");
      }
      const host = (req.headers.host || "").split(":")[0];
      if (
        !["localhost", "127.0.0.1", host].includes(parsed.hostname) ||
        !["http:", "https:"].includes(parsed.protocol)
      )
        throw fail(403, "Untrusted origin.");
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-File-Name, X-File-Kind",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      });
      res.end();
      return;
    }
    if (
      req.method !== "GET" &&
      !origin &&
      !req.headers.authorization &&
      !["/api/customer/register", "/api/customer/login"].includes(url.pathname)
    )
      throw fail(403, "An authenticated request is required.");
    if (
      ["/api/customer/register", "/api/customer/login"].includes(
        url.pathname,
      ) &&
      req.method === "POST"
    ) {
      throttle(req);
      const input = await json(req);
      const email =
        typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      if (
        typeof input.password !== "string" ||
        input.password.length < 8 ||
        input.password.length > 128
      )
        throw fail(400, "Use a password between 8 and 128 characters.");
      if (url.pathname.endsWith("/register")) {
        if (
          typeof input.name !== "string" ||
          input.name.length > 120 ||
          typeof input.phone !== "string" ||
          input.phone.length > 40 ||
          email.length > 160
        )
          throw fail(400, "Invalid profile fields.");
        const errors = validateProfile(
          { name: input.name, phone: input.phone, email },
          input.password,
        );
        if (Object.keys(errors).length)
          throw fail(400, Object.values(errors)[0]);
        if (db.customers.some((item) => item.email === email))
          throw fail(
            409,
            "An account with this email already exists. Sign in instead.",
          );
        const salt = crypto.randomBytes(16).toString("hex"),
          passwordHash = (await scrypt(input.password, salt, 64)).toString(
            "hex",
          );
        if (db.customers.some((item) => item.email === email))
          throw fail(409, "An account with this email already exists.");
        const user = {
          id: crypto.randomUUID(),
          name: input.name.trim(),
          phone: input.phone.trim(),
          email,
          salt,
          passwordHash,
          createdAt: new Date().toISOString(),
          appearance: "light",
        };
        transaction(() => db.customers.push(user));
        return reply(res, 201, session(user, res));
      }
      const user = db.customers.find((item) => item.email === email);
      const computed = await scrypt(
        input.password,
        user?.salt || "invalid-account-salt",
        64,
      );
      if (
        !user ||
        !crypto.timingSafeEqual(computed, Buffer.from(user.passwordHash, "hex"))
      )
        throw fail(401, "Email or password is incorrect.");
      return reply(res, 200, session(user, res));
    }
    const user = userFor(req);
    if (url.pathname === "/api/customer/me" && req.method === "GET")
      return reply(res, 200, view(user));
    if (url.pathname === "/api/customer/preferences/appearance" && req.method === "PATCH") {
      const input = await json(req);
      if (input.theme !== "light" && input.theme !== "dark")
        throw fail(400, "Appearance must be light or dark.");
      transaction(() => { user.appearance = input.theme; });
      return reply(res, 200, view(user));
    }
    if (url.pathname === "/api/customer/logout" && req.method === "POST") {
      const token =
        req.headers.authorization?.replace(/^Bearer /, "") ||
        /(?:^|;\s*)elladria_customer=([a-f0-9]+)/.exec(
          req.headers.cookie || "",
        )?.[1];
      transaction(() => {
        db.sessions = db.sessions.filter(
          (item) => item.hash !== hash(token || ""),
        );
      });
      res.setHeader(
        "Set-Cookie",
        "elladria_customer=; HttpOnly; SameSite=Strict; Path=/api/customer; Max-Age=0",
      );
      return reply(res, 200, { ok: true });
    }
    if (
      url.pathname === "/api/customer/appointments" &&
      req.method === "POST"
    ) {
      const input = await json(req);
      if (
        !offices.some((item) => item.name === input.office) ||
        !availableDates().includes(input.date) ||
        !times.includes(input.time) ||
        !reasons.includes(input.reason) ||
        typeof input.notes !== "string" ||
        input.notes.length > 500
      )
        throw fail(
          400,
          "Choose a valid office, future weekday, time, and purpose. Notes are limited to 500 characters.",
        );
      if (
        db.appointments.some(
          (item) =>
            item.status === "Upcoming" &&
            item.date === input.date &&
            item.time === input.time &&
            (item.office === input.office || item.customerId === user.id),
        )
      )
        throw fail(409, "This time is already booked. Choose another time.");
      transaction(() =>
        db.appointments.push({
          id: crypto.randomUUID(),
          customerId: user.id,
          candidate: user.name,
          office: input.office,
          date: input.date,
          time: input.time,
          reason: input.reason,
          notes: input.notes.trim(),
          status: "Upcoming",
          createdAt: new Date().toISOString(),
        }),
      );
      return reply(res, 201, view(user));
    }
    if (
      url.pathname.startsWith("/api/customer/appointments/") &&
      req.method === "PATCH"
    ) {
      const item = db.appointments.find(
        (item) =>
          item.id === url.pathname.split("/").pop() &&
          item.customerId === user.id,
      );
      if (!item) throw fail(404, "Appointment not found.");
      if (item.status !== "Upcoming")
        throw fail(409, "This appointment is no longer upcoming.");
      transaction(() => {
        item.status = "Cancelled";
      });
      return reply(res, 200, view(user));
    }
    if (
      url.pathname === "/api/customer/applications" &&
      req.method === "POST"
    ) {
      const input = await json(req),
        job = getCatalog().jobs.find(
          (item) => item.id === input.jobId && item.status === "published",
        );
      if (!job) throw fail(404, "This job is no longer available.");
      if (
        !db.applications.some(
          (item) => item.customerId === user.id && item.jobId === job.id,
        )
      )
        transaction(() =>
          db.applications.push({
            id: crypto.randomUUID(),
            customerId: user.id,
            jobId: job.id,
            jobTitle: job.title,
            company: job.company,
            status: "Submitted",
            createdAt: new Date().toISOString(),
          }),
        );
      return reply(res, 200, view(user));
    }
    if (url.pathname === "/api/customer/files" && req.method === "POST") {
      await upload(req, user.id, req.headers["x-file-kind"] || "Document");
      return reply(res, 201, view(user));
    }
    if (url.pathname.startsWith("/api/customer/files/")) {
      const file = db.files.find(
        (item) =>
          item.id === url.pathname.split("/").pop() && item.ownerId === user.id,
      );
      if (!file) throw fail(404, "File not found.");
      if (req.method === "GET") return serveFile(res, file);
      if (req.method === "DELETE") {
        transaction(() => {
          db.files = db.files.filter((item) => item.id !== file.id);
        });
        return reply(res, 200, view(user));
      }
    }
    throw fail(404, "Customer route not found.");
  }
  async function admin(req, res, url) {
    if (url.pathname === "/api/admin/activity" && req.method === "GET")
      return reply(res, 200, {
        customers: db.customers.map(clean),
        appointments: db.appointments,
        applications: db.applications,
        files: db.files,
      });
    if (url.pathname === "/api/admin/uploads" && req.method === "POST")
      return reply(res, 201, await upload(req, "admin", "job-image"));
    if (url.pathname.startsWith("/api/admin/files/") && req.method === "GET") {
      const file = db.files.find(
        (item) => item.id === url.pathname.split("/").pop(),
      );
      if (!file) throw fail(404, "File not found.");
      return serveFile(res, file, file.kind !== "job-image");
    }
    if (
      (url.pathname.startsWith("/api/admin/appointments/") ||
        url.pathname.startsWith("/api/admin/applications/")) &&
      req.method === "PATCH"
    ) {
      const key = url.pathname.includes("/appointments/")
          ? "appointments"
          : "applications",
        item = db[key].find(
          (item) => item.id === url.pathname.split("/").pop(),
        );
      if (!item) throw fail(404, "Record not found.");
      const input = await json(req);
      if (input.previousStatus !== item.status)
        throw fail(409, "This record changed. Refresh before updating it.");
      const allowed =
        key === "appointments"
          ? ["Completed", "Cancelled"]
          : ["Submitted", "Reviewing", "Shortlisted", "Rejected"];
      if (
        !allowed.includes(input.status) ||
        (key === "appointments" && item.status !== "Upcoming")
      )
        throw fail(400, "Invalid status transition.");
      transaction(() => {
        item.status = input.status;
        item.updatedAt = new Date().toISOString();
      });
      return reply(res, 200, { ok: true });
    }
    throw fail(404, "Activity route not found.");
  }
  return {
    customer,
    admin,
    validImage: (id) =>
      db.files.some(
        (file) =>
          file.id === id &&
          file.kind === "job-image" &&
          file.ownerId === "admin",
      ),
    publicImage: (res, id) => {
      const file = db.files.find(
        (item) =>
          item.id === id &&
          item.kind === "job-image" &&
          item.ownerId === "admin",
      );
      if (
        !file ||
        !getCatalog().jobs.some(
          (job) => job.status === "published" && job.imageId === id,
        )
      )
        throw fail(404, "Image not found.");
      serveFile(res, file, false);
    },
  };
}
