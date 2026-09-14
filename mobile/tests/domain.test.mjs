import test from "node:test";
import assert from "node:assert/strict";
import {
  availableDates,
  canBook,
  dateKey,
  filterJobs,
  initialState,
  restoreState,
  toggleItem,
  validateProfile,
} from "../src/domain.ts";
const now = new Date(2026, 8, 14, 12);
test("search combines category, location, and saved-only constraints", () => {
  assert.equal(filterJobs(" BUCHAREST ", "All")[0].id, "factory");
  assert.equal(filterJobs("Bucharest", "Hospitality").length, 0);
  assert.deepEqual(
    filterJobs("", "All", true, ["warehouse"]).map((j) => j.id),
    ["warehouse"],
  );
  assert.equal(filterJobs("does-not-exist", "All").length, 0);
});
test("saved jobs can be toggled without duplicates", () => {
  assert.deepEqual(toggleItem(["factory"], "factory"), []);
  assert.deepEqual(toggleItem(["factory"], "warehouse"), [
    "factory",
    "warehouse",
  ]);
});
test("profile rejects empty and malformed values and accepts local/international phone formats", () => {
  assert.equal(
    Object.keys(
      validateProfile({ name: "", phone: "123", email: "bad" }, "short"),
    ).length,
    4,
  );
  for (const phone of ["0771234567", "+94 77 123 4567"])
    assert.deepEqual(
      validateProfile(
        { name: "Demo User", phone, email: "demo@example.com" },
        "demo1234",
      ),
      {},
    );
});
test("date choices are future weekdays and cross year boundaries", () => {
  for (const base of [now, new Date(2026, 11, 28, 12)]) {
    const dates = availableDates(base);
    assert.equal(dates.length, 20);
    for (const date of dates) {
      assert.ok(date > dateKey(base));
      assert.ok(![0, 6].includes(new Date(`${date}T12:00:00`).getDay()));
    }
  }
});
test("booking rejects invalid slots and double-booking, cancellation releases the time", () => {
  const date = availableDates(now)[0];
  const appointment = {
    id: "1",
    office: "Colombo HQ",
    date,
    time: "10:00",
    status: "Upcoming",
    reason: "Visa Consultation",
    notes: "",
    candidate: "Demo",
  };
  assert.ok(canBook([], "Colombo HQ", date, "10:00", now));
  assert.equal(canBook([appointment], "Colombo HQ", date, "10:00", now), false);
  assert.equal(
    canBook([appointment], "Kandy Branch", date, "10:00", now),
    false,
  );
  assert.ok(
    canBook(
      [{ ...appointment, status: "Cancelled" }],
      "Colombo HQ",
      date,
      "10:00",
      now,
    ),
  );
  assert.equal(canBook([], "Unknown", date, "10:00", now), false);
  assert.equal(canBook([], "Colombo HQ", date, "03:00", now), false);
  assert.equal(canBook([], "Colombo HQ", dateKey(now), "10:00", now), false);
});
test("storage round-trips and rejects corrupt or malformed data", () => {
  assert.deepEqual(restoreState(JSON.stringify(initialState)), initialState);
  assert.throws(() => restoreState("bad json"));
  assert.throws(() => restoreState("null"));
  const recovered = restoreState(
    JSON.stringify({
      language: "bad",
      profile: {},
      saved: ["factory", "unknown", 2],
      appointments: [null, { id: "bad" }],
    }),
  );
  assert.equal(recovered.language, null);
  assert.equal(recovered.profile, null);
  assert.deepEqual(recovered.saved, ["factory"]);
  assert.deepEqual(recovered.appointments, []);
});
