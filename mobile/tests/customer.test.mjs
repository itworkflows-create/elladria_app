import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAdminServer } from "../../admin-server/server.mjs";
import { availableDates, jobs } from "../src/domain.ts";
const password = "DemoPassword123";
async function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "elladria-customer-"));
  const server = createAdminServer({
    dataFile: path.join(dir, "catalog.json"),
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const sessionResponse = await fetch(url + "/api/admin/session");
  const session = await sessionResponse.json();
  const admin = {
    "Content-Type": "application/json",
    Origin: url,
    Cookie: sessionResponse.headers.get("set-cookie").split(";")[0],
    "X-CSRF-Token": session.token,
  };
  return { server, url, dir, admin };
}
const close = (server) => new Promise((resolve) => server.close(resolve));
async function send(url, route, body, token, method = "POST", extra = {}) {
  const response = await fetch(url + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
async function register(url, email) {
  return send(url, "/api/customer/register", {
    name: email.split("@")[0],
    email,
    phone: "0771234567",
    password,
  });
}
test("customer accounts, bookings and applications appear in admin and status updates sync back", async () => {
  const { server, url, dir, admin } = await fixture();
  try {
    const a = await register(url, "alice@example.com"),
      b = await register(url, "brenda@example.com");
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.equal(a.body.profile.passwordHash, undefined);
    assert.equal((await register(url, "alice@example.com")).status, 409);
    assert.equal(
      (
        await send(url, "/api/customer/login", {
          email: "alice@example.com",
          password: "wrongpass",
        })
      ).status,
      401,
    );
    const login = await send(url, "/api/customer/login", {
      email: "alice@example.com",
      password,
    });
    assert.equal(login.status, 200);
    assert.equal(
      (await send(url, "/api/customer/me", undefined, undefined, "GET")).status,
      401,
    );
    const booking = {
      office: "Colombo HQ",
      date: availableDates()[0],
      time: "10:00",
      reason: "Visa Consultation",
      notes: "Discuss my application",
    };
    let result = await send(
      url,
      "/api/customer/appointments",
      booking,
      a.body.token,
    );
    assert.equal(result.status, 201);
    const appointment = result.body.appointments[0];
    assert.equal(
      (await send(url, "/api/customer/appointments", booking, b.body.token))
        .status,
      409,
    );
    assert.equal(
      (
        await send(
          url,
          "/api/customer/appointments/" + appointment.id,
          {},
          b.body.token,
          "PATCH",
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await send(
          url,
          "/api/customer/appointments",
          { ...booking, date: "2020-01-01" },
          a.body.token,
        )
      ).status,
      400,
    );
    result = await send(
      url,
      "/api/customer/applications",
      { jobId: "factory" },
      a.body.token,
    );
    assert.equal(result.status, 200);
    const application = result.body.applications[0];
    result = await send(
      url,
      "/api/customer/applications",
      { jobId: "factory" },
      a.body.token,
    );
    assert.equal(
      result.body.applications.length,
      1,
      "repeat apply is idempotent",
    );
    const activity = await (
      await fetch(url + "/api/admin/activity", { headers: admin })
    ).json();
    assert.equal(activity.customers.length, 2);
    assert.equal(activity.appointments[0].candidate, "alice");
    assert.equal(activity.applications[0].jobTitle, "Factory Worker");
    assert.equal(activity.customers[0].passwordHash, undefined);
    assert.equal(activity.customers[0].salt, undefined);
    result = await send(
      url,
      "/api/admin/appointments/" + appointment.id,
      { previousStatus: "Upcoming", status: "Completed" },
      undefined,
      "PATCH",
      admin,
    );
    assert.equal(result.status, 200);
    result = await send(
      url,
      "/api/admin/applications/" + application.id,
      { previousStatus: "Submitted", status: "Shortlisted" },
      undefined,
      "PATCH",
      admin,
    );
    assert.equal(result.status, 200);
    const mine = (
      await send(url, "/api/customer/me", undefined, a.body.token, "GET")
    ).body;
    assert.equal(mine.appointments[0].status, "Completed");
    assert.equal(mine.applications[0].status, "Shortlisted");
    assert.equal(
      (
        await send(
          url,
          "/api/admin/applications/" + application.id,
          { previousStatus: "Submitted", status: "Rejected" },
          undefined,
          "PATCH",
          admin,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await send(
          url,
          "/api/customer/appointments/" + appointment.id,
          {},
          a.body.token,
          "PATCH",
        )
      ).status,
      409,
    );
    const stored = readFileSync(path.join(dir, "customers.json"), "utf8");
    assert.ok(!stored.includes(password));
    assert.ok(!stored.includes(a.body.token));
    assert.equal(
      (await send(url, "/api/customer/logout", undefined, a.body.token)).status,
      200,
    );
    assert.equal(
      (await send(url, "/api/customer/me", undefined, a.body.token, "GET"))
        .status,
      401,
    );
  } finally {
    await close(server);
  }
});
test("private documents and published job images enforce ownership, file type and visibility", async () => {
  const { server, url, admin } = await fixture();
  try {
    const a = await register(url, "alice@example.com"),
      b = await register(url, "brenda@example.com");
    const pdf = Buffer.from(
      "%PDF-1.4\n1 0 obj <</Type /Catalog>> endobj\n%%EOF",
    );
    let response = await fetch(url + "/api/customer/files", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + a.body.token,
        "Content-Type": "application/pdf",
        "X-File-Name": "sample-cv.pdf",
        "X-File-Kind": "CV",
      },
      body: pdf,
    });
    assert.equal(response.status, 201);
    const file = (await response.json()).files[0];
    assert.equal(
      (await fetch(url + "/api/customer/files/" + file.id)).status,
      401,
    );
    assert.equal(
      (
        await fetch(url + "/api/customer/files/" + file.id, {
          headers: { Authorization: "Bearer " + b.body.token },
        })
      ).status,
      404,
    );
    response = await fetch(url + "/api/admin/files/" + file.id, {
      headers: admin,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
    assert.match(response.headers.get("content-disposition"), /^attachment/);
    assert.equal((await fetch(url + "/api/images/" + file.id)).status, 404);
    response = await fetch(url + "/api/customer/files", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + a.body.token,
        "Content-Type": "image/png",
        "X-File-Name": "fake.png",
      },
      body: "<svg><script>alert(1)</script></svg>",
    });
    assert.equal(response.status, 415);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lOQAAAAASUVORK5CYII=",
      "base64",
    );
    response = await fetch(url + "/api/admin/uploads", {
      method: "POST",
      headers: {
        ...admin,
        "Content-Type": "image/png",
        "X-File-Name": "job.png",
      },
      body: png,
    });
    assert.equal(response.status, 201);
    const image = await response.json();
    assert.equal(
      (await fetch(url + "/api/images/" + image.id)).status,
      404,
      "unattached image stays private",
    );
    let result = await send(
      url,
      "/api/admin/jobs/factory",
      { job: { ...jobs[0], imageId: image.id }, revision: 1 },
      undefined,
      "PUT",
      admin,
    );
    assert.equal(result.status, 200);
    assert.equal((await fetch(url + "/api/images/" + image.id)).status, 200);
    assert.equal(
      (await (await fetch(url + "/api/catalog")).json()).jobs[0].imageId,
      image.id,
    );
    result = await send(
      url,
      "/api/admin/jobs/factory",
      {
        job: { ...jobs[0], imageId: image.id, status: "archived" },
        revision: 2,
      },
      undefined,
      "PUT",
      admin,
    );
    assert.equal(result.status, 200);
    assert.equal(
      (await fetch(url + "/api/images/" + image.id)).status,
      404,
      "archived image is not public",
    );
    assert.equal(
      (
        await send(
          url,
          "/api/customer/files/" + file.id,
          undefined,
          a.body.token,
          "DELETE",
        )
      ).status,
      200,
    );
    assert.equal(
      (await fetch(url + "/api/admin/files/" + file.id, { headers: admin }))
        .status,
      404,
    );
  } finally {
    await close(server);
  }
});
test("customer data and sessions survive restart and browser mutation origins are checked", async () => {
  const f = await fixture();
  let server = f.server;
  try {
    const a = await register(f.url, "alice@example.com");
    const token = a.body.token;
    assert.equal(
      (
        await send(
          f.url,
          "/api/customer/applications",
          { jobId: "factory" },
          token,
          "POST",
          { Origin: "https://evil.example" },
        )
      ).status,
      403,
    );
    await close(server);
    server = createAdminServer({ dataFile: path.join(f.dir, "catalog.json") });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const mine = await send(url, "/api/customer/me", undefined, token, "GET");
    assert.equal(mine.status, 200);
    assert.equal(mine.body.profile.email, "alice@example.com");
  } finally {
    await close(server);
  }
});
