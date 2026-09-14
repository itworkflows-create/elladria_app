import http from "node:http";
import { createPortal } from "./portal.mjs";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { jobs } from "../mobile/src/domain.ts";
import {
  defaultContent,
  publicCatalog,
  validateContent,
  validateJob,
} from "../mobile/src/catalog.ts";
const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
  ".json": "application/json",
};
const fail = (status, message) => Object.assign(new Error(message), { status });
export function createAdminServer({
  dataFile = path.join(project, "admin-server/data/catalog.json"),
  staticRoot = path.join(project, "mobile/dist"),
} = {}) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  let catalog;
  if (fs.existsSync(dataFile)) {
    catalog = JSON.parse(
      fs.readFileSync(dataFile, "utf8").replace(/^\uFEFF/, ""),
    );
    if (
      !Number.isInteger(catalog.revision) ||
      catalog.revision < 1 ||
      !Array.isArray(catalog.jobs)
    )
      throw new Error(
        "Invalid stored catalog. Restore its backup before restarting.",
      );
    catalog.jobs.forEach(validateJob);
    validateContent(catalog.content);
  } else {
    catalog = {
      revision: 1,
      jobs: structuredClone(jobs),
      content: { ...defaultContent },
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(dataFile, JSON.stringify(catalog, null, 2));
  }
  const portal = createPortal(path.dirname(dataFile), () => catalog);
  const sessions = new Map();
  const reply = (res, status, data) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(data));
  };
  const local = (req) =>
    ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
      req.socket.remoteAddress,
    ) && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || "");
  const readBody = async (req) => {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 131072)
        throw fail(413, "Request is too large.");
    }
    try {
      return JSON.parse(body);
    } catch {
      throw fail(400, "Send valid JSON.");
    }
  };
  const commit = (next) => {
    next.revision = catalog.revision + 1;
    next.updatedAt = new Date().toISOString();
    const tmp = `${dataFile}.tmp`;
    fs.copyFileSync(dataFile, `${dataFile}.bak`);
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
    fs.renameSync(tmp, dataFile);
    catalog = next;
  };
  return http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/customer/"))
        return await portal.customer(req, res, url);
      if (url.pathname.startsWith("/api/images/") && req.method === "GET")
        return portal.publicImage(res, url.pathname.split("/").pop());
      if (url.pathname === "/api/catalog" && req.method === "GET") {
        res.setHeader("Access-Control-Allow-Origin", "*");
        return reply(res, 200, publicCatalog(catalog));
      }
      if (url.pathname === "/api/health" && req.method === "GET")
        return reply(res, 200, { status: "ok" });
      if (url.pathname.startsWith("/api/admin/")) {
        if (!local(req))
          throw fail(
            403,
            "Open the admin panel at http://localhost:8093/?admin=1 on the server computer. Remote administration is disabled.",
          );
        const origin = `http://${req.headers.host}`;
        if (req.headers.origin && req.headers.origin !== origin)
          throw fail(403, "Untrusted origin.");
        if (url.pathname === "/api/admin/session" && req.method === "GET") {
          for (const [key, value] of sessions)
            if (value.expires < Date.now()) sessions.delete(key);
          const id = crypto.randomBytes(24).toString("hex"),
            token = crypto.randomBytes(24).toString("hex");
          sessions.set(id, { token, expires: Date.now() + 8 * 60 * 60 * 1000 });
          res.setHeader(
            "Set-Cookie",
            `elladria_admin=${id}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=28800`,
          );
          return reply(res, 200, { token });
        }
        const id = /(?:^|;\s*)elladria_admin=([a-f0-9]+)/.exec(
          req.headers.cookie || "",
        )?.[1];
        const session = sessions.get(id);
        if (!session || session.expires < Date.now())
          throw fail(401, "Your local session expired. Reload the panel.");
        if (url.pathname === "/api/admin/catalog" && req.method === "GET")
          return reply(res, 200, catalog);
        const activityRoute = [
          "activity",
          "uploads",
          "files/",
          "appointments/",
          "applications/",
        ].some((prefix) => url.pathname.startsWith("/api/admin/" + prefix));
        if (activityRoute) {
          if (
            req.method !== "GET" &&
            (req.headers.origin !== origin ||
              req.headers["x-csrf-token"] !== session.token)
          )
            throw fail(403, "Invalid admin request.");
          return await portal.admin(req, res, url);
        }
        if (req.method !== "PUT" && req.method !== "DELETE")
          throw fail(405, "Method not allowed.");
        if (
          req.headers.origin !== origin ||
          req.headers["x-csrf-token"] !== session.token
        )
          throw fail(403, "Invalid admin request. Reload the panel.");
        if (!req.headers["content-type"]?.startsWith("application/json"))
          throw fail(415, "Use application/json.");
        const input = await readBody(req);
        if (!input || input.revision !== catalog.revision)
          throw fail(
            409,
            "Another admin view changed the data. Reopen the latest job before saving, or discard and reload content changes. Your unsaved form has been kept open.",
          );
        const next = structuredClone(catalog);
        if (url.pathname === "/api/admin/content" && req.method === "PUT") {
          try {
            next.content = validateContent(input.content);
          } catch (error) {
            throw fail(400, error.message);
          }
        } else if (url.pathname.startsWith("/api/admin/jobs/")) {
          const jobId = decodeURIComponent(
            url.pathname.slice("/api/admin/jobs/".length),
          );
          const index = next.jobs.findIndex((job) => job.id === jobId);
          if (req.method === "DELETE") {
            if (index < 0) throw fail(404, "Job not found.");
            if (next.jobs[index].status === "published")
              throw fail(
                400,
                "Archive this job before permanently deleting it.",
              );
            next.jobs.splice(index, 1);
          } else {
            let job;
            try {
              job = validateJob(input.job);
            } catch (error) {
              throw fail(400, error.message);
            }
            if (job.imageId && !portal.validImage(job.imageId))
              throw fail(400, "Upload a valid job image first.");
            if (job.id !== jobId) throw fail(400, "Job ID does not match.");
            if (input.create === true && index >= 0)
              throw fail(409, "A job with this ID already exists.");
            if (input.create !== true && index < 0)
              throw fail(404, "Job no longer exists. Refresh the list.");
            if (job.featured)
              next.jobs = next.jobs.map((item) => ({
                ...item,
                featured: false,
              }));
            if (index < 0) next.jobs.push(job);
            else next.jobs[index] = job;
          }
        } else throw fail(404, "API route not found.");
        commit(next);
        return reply(res, 200, catalog);
      }
      if (url.pathname.startsWith("/api/"))
        throw fail(404, "API route not found.");
      if (req.method !== "GET" && req.method !== "HEAD")
        throw fail(405, "Method not allowed.");
      let relative = decodeURIComponent(url.pathname);
      if (relative === "/" || relative === "/admin") relative = "/index.html";
      const root = path.resolve(staticRoot),
        file = path.resolve(root, "." + relative);
      if (!file.startsWith(root + path.sep))
        throw fail(403, "Path not allowed.");
      if (!fs.existsSync(file) || !fs.statSync(file).isFile())
        throw fail(404, "Preview not built. Run the export command first.");
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(file).pipe(res);
    } catch (error) {
      reply(res, error.status || 500, {
        error: error.status
          ? error.message
          : "Could not save or load the catalog. Please retry; your previous data is preserved.",
      });
    }
  });
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.ELLADRIA_PORT || 8093);
  createAdminServer().listen(port, "0.0.0.0", () =>
    console.log(
      `Elladria admin: http://localhost:${port}/?admin=1\nMobile preview: http://localhost:${port}/mobile-preview.html\nOnly this computer can change admin data. Public catalog is readable on the LAN.`,
    ),
  );
}
