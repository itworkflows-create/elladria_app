import test from "node:test";
import http from "node:http";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAdminServer } from "../../admin-server/server.mjs";
import { jobs, filterJobs, restoreState } from "../src/domain.ts";
import {
  validateJob,
  validateContent,
  defaultContent,
} from "../src/catalog.ts";
async function start(dataFile) {
  const server = createAdminServer({ dataFile });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${url}/api/admin/session`);
  const cookie = response.headers.get("set-cookie").split(";")[0];
  const { token } = await response.json();
  const headers = {
    "Content-Type": "application/json",
    Origin: url,
    Cookie: cookie,
    "X-CSRF-Token": token,
  };
  return { server, url, headers };
}
const stop = (server) => new Promise((resolve) => server.close(resolve));
test("admin catalog lifecycle: drafts, publishing, updates, archiving, deletion and persistence", async () => {
  const file = path.join(
    mkdtempSync(path.join(tmpdir(), "elladria-admin-test-")),
    "catalog.json",
  );
  let { server, url, headers } = await start(file);
  const request = async (
    route,
    body,
    method = "PUT",
    customHeaders = headers,
  ) => {
    const response = await fetch(`${url}${route}`, {
      method,
      headers: customHeaders,
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const read = async () => (await fetch(`${url}/api/catalog`)).json();
  try {
    let catalog = await read();
    const firstRevision = catalog.revision;
    const sample = {
      ...jobs[0],
      id: "managed-job",
      title: "Admin-created Engineer",
      country: "Germany",
      category: "Engineering",
      status: "draft",
      featured: false,
    };
    let result = await request("/api/admin/jobs/managed-job", {
      job: sample,
      create: true,
      revision: catalog.revision,
    });
    assert.equal(result.status, 200);
    catalog = result.body;
    assert.equal(
      (await read()).jobs.some((job) => job.id === sample.id),
      false,
      "draft is hidden",
    );
    result = await request("/api/admin/jobs/managed-job", {
      job: { ...sample, status: "published", featured: true },
      revision: catalog.revision,
    });
    assert.equal(result.status, 200);
    catalog = result.body;
    let publicData = await read();
    assert.equal(publicData.jobs.filter((job) => job.featured).length, 1);
    assert.equal(publicData.jobs.find((job) => job.featured).id, sample.id);
    assert.equal(
      filterJobs("Germany", "Engineering", false, [], publicData.jobs)[0].id,
      sample.id,
    );
    const stale = await request("/api/admin/jobs/managed-job", {
      job: sample,
      revision: firstRevision,
    });
    assert.equal(
      stale.status,
      409,
      "stale updates cannot overwrite newer data",
    );
    result = await request("/api/admin/jobs/managed-job", {
      job: {
        ...sample,
        status: "published",
        salary: "€2,100",
        hours: "35 hrs / week",
      },
      revision: catalog.revision,
    });
    assert.equal(result.status, 200);
    catalog = result.body;
    assert.equal(
      (await read()).jobs.find((job) => job.id === sample.id).salary,
      "€2,100",
    );
    result = await request(
      "/api/admin/jobs/managed-job",
      { revision: catalog.revision },
      "DELETE",
    );
    assert.equal(
      result.status,
      400,
      "published jobs require archiving before deletion",
    );
    result = await request("/api/admin/content", {
      revision: catalog.revision,
      content: {
        ...defaultContent,
        heroTitle: "Your next career starts here",
        announcementEnabled: true,
        announcementTitle: "Office update",
        announcementBody: "Demo information from admin",
        supportEmail: "support@example.com",
      },
    });
    assert.equal(result.status, 200);
    catalog = result.body;
    assert.equal((await read()).content.announcementTitle, "Office update");
    result = await request("/api/admin/jobs/managed-job", {
      job: { ...sample, status: "archived" },
      revision: catalog.revision,
    });
    assert.equal(result.status, 200);
    catalog = result.body;
    assert.equal(
      (await read()).jobs.some((job) => job.id === sample.id),
      false,
      "archived job disappears from mobile feed",
    );
    result = await request(
      "/api/admin/jobs/managed-job",
      { revision: catalog.revision },
      "DELETE",
    );
    assert.equal(result.status, 200);
    catalog = result.body;
    result = await request("/api/admin/jobs/managed-job", {
      job: sample,
      revision: catalog.revision,
    });
    assert.equal(
      result.status,
      404,
      "editing a deleted job cannot recreate it",
    );
    await stop(server);
    const next = await start(file);
    server = next.server;
    url = next.url;
    headers = next.headers;
    publicData = await read();
    assert.equal(publicData.content.heroTitle, "Your next career starts here");
    assert.equal(
      publicData.revision,
      catalog.revision,
      "data survives server restart",
    );
    assert.equal(
      publicData.jobs.some((job) => job.id === sample.id),
      false,
    );
  } finally {
    await stop(server);
  }
});
test("admin APIs enforce local access, session, origin, CSRF and valid data", async () => {
  const file = path.join(
    mkdtempSync(path.join(tmpdir(), "elladria-admin-access-")),
    "catalog.json",
  );
  const { server, url, headers } = await start(file);
  const body = JSON.stringify({ job: jobs[0], revision: 1 });
  try {
    assert.equal((await fetch(`${url}/api/admin/catalog`)).status, 401);
    const forgedHost = await new Promise((resolve, reject) => {
      const request = http.get(
        url + "/api/admin/session",
        { headers: { Host: "evil.example" } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      );
      request.on("error", reject);
    });
    assert.equal(forgedHost, 403);
    assert.equal(
      (
        await fetch(`${url}/api/admin/jobs/factory`, {
          method: "PUT",
          headers: { ...headers, Origin: "https://evil.example" },
          body,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${url}/api/admin/jobs/factory`, {
          method: "PUT",
          headers: { ...headers, "X-CSRF-Token": "bad" },
          body,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${url}/api/admin/jobs/factory`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            job: { ...jobs[0], openings: -1 },
            revision: 1,
          }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${url}/api/admin/content`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            content: { ...defaultContent, heroTitle: "" },
            revision: 1,
          }),
        })
      ).status,
      400,
    );
    assert.equal(
      (await fetch(`${url}/api/catalog`, { method: "POST" })).status,
      404,
    );
    assert.equal(
      (await (await fetch(`${url}/api/catalog`)).json()).revision,
      1,
      "rejected requests leave data unchanged",
    );
  } finally {
    await stop(server);
  }
});
test("managed job IDs survive local profile restore; invalid content is rejected", () => {
  assert.deepEqual(
    restoreState(
      JSON.stringify({
        saved: ["managed-job", "bad/id"],
        applications: ["managed-job"],
      }),
    ).saved,
    ["managed-job"],
  );
  assert.throws(() => validateJob({ ...jobs[0], requirements: [] }));
  assert.throws(() => validateJob({ ...jobs[0], status: "unknown" }));
  assert.throws(() =>
    validateContent({ ...defaultContent, announcementEnabled: true }),
  );
  assert.throws(() =>
    validateContent({ ...defaultContent, supportEmail: "not-email" }),
  );
  assert.equal(
    validateJob({ ...jobs[0], status: "draft", featured: true }).featured,
    false,
  );
});
