import { adminRequest, downloadDocument } from "./cloudApi";
import React, { useEffect, useState } from "react";
import type { AdminActivity, CustomerProfile } from "./customerTypes";
export type ActivityPage =
  "overview" | "customers" | "appointments" | "applications" | "documents";
export function AdminActivityPanel({
  page,
  token,
  onNavigate,
}: {
  page: ActivityPage;
  token: string;
  onNavigate: (page: ActivityPage) => void;
}) {
  const [activity, setActivity] = useState<AdminActivity | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("All"),
    [customerId, setCustomerId] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      const result = await adminRequest("/api/admin/activity", {
        credentials: "same-origin",
        signal: AbortSignal.timeout(10000),
      });
      setActivity(result);
      setError("");
    } catch (error) {
      setError((error as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [token]);
  useEffect(() => {
    setQuery("");
    setStatus("All");
  }, [page]);
  const customer = (id: string) =>
    activity?.customers.find((item) => item.id === id);
  const matches = (id: string, extra = "") => {
    const profile = customer(id);
    return (
      (!customerId || customerId === id) &&
      `${profile?.name} ${profile?.email} ${profile?.phone} ${extra}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  };
  async function update(
    kind: string,
    id: string,
    previousStatus: string,
    next: string,
  ) {
    if (!window.confirm(`Change status from ${previousStatus} to ${next}?`))
      return;
    setBusy(true);
    try {
      await adminRequest(`/api/admin/${kind}/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({ previousStatus, status: next }),
      });
      await refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const profileCell = (id: string) => (
    <>
      <strong>{customer(id)?.name || "Customer"}</strong>
      <small>{customer(id)?.email}</small>
    </>
  );
  const badge = (value: string) => (
    <span
      className={
        "status " +
        (["Upcoming", "Submitted", "Shortlisted"].includes(value)
          ? "published"
          : value === "Rejected" || value === "Cancelled"
            ? "archived"
            : "draft")
      }
    >
      {value}
    </span>
  );
  if (!activity)
    return (
      <section className="panel empty-admin">
        <p>{error || "Loading customer activity…"}</p>
        <button className="text-link" onClick={() => void refresh()}>
          Refresh
        </button>
      </section>
    );
  if (page === "overview")
    return (
      <section className="panel" style={{ marginTop: 24 }}>
        <div className="panel-heading">
          <div>
            <h2>Customer activity</h2>
            <p>Live records from customer accounts.</p>
          </div>
        </div>
        <div className="customer-stats">
          {(
            [
              {
                label: "Customers",
                value: activity.customers.length,
                page: "customers",
              },
              {
                label: "Upcoming appointments",
                value: activity.appointments.filter(
                  (item) => item.status === "Upcoming",
                ).length,
                page: "appointments",
              },
              {
                label: "Applications",
                value: activity.applications.length,
                page: "applications",
              },
              {
                label: "Customer documents",
                value: activity.files.filter((item) => item.ownerId !== "admin")
                  .length,
                page: "documents",
              },
            ] as const
          ).map((item) => (
            <button key={item.page} onClick={() => onNavigate(item.page)}>
              <strong>{item.value}</strong>
              <span>{item.label} →</span>
            </button>
          ))}
        </div>
      </section>
    );
  const statuses =
    page === "appointments"
      ? ["All", "Upcoming", "Completed", "Cancelled"]
      : page === "applications"
        ? ["All", "Submitted", "Reviewing", "Shortlisted", "Rejected"]
        : ["All"];
  const customers = activity.customers.filter((item) => matches(item.id));
  const appointments = activity.appointments
    .filter(
      (item) =>
        matches(item.customerId, item.office + " " + item.reason) &&
        (status === "All" || item.status === status),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const applications = activity.applications.filter(
    (item) =>
      matches(item.customerId, item.jobTitle) &&
      (status === "All" || item.status === status),
  );
  const files = activity.files.filter(
    (item) => item.ownerId !== "admin" && matches(item.ownerId, item.name),
  );
  return (
    <section className="panel">
      <div className="job-toolbar">
        <div className="filters">
          <label className="search-input">
            <input
              aria-label="Search customer activity"
              placeholder="Search customer, email, phone or record"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {page !== "customers" && (
            <select
              aria-label="Filter customer"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">All customers</option>
              {activity.customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
          {statuses.length > 1 && (
            <select
              aria-label="Filter status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {statuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          )}
          <button className="btn secondary" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
        {customerId && page === "customers" && (
          <button className="text-link" onClick={() => setCustomerId("")}>
            Show all customers
          </button>
        )}
      </div>
      {error && (
        <div role="alert" className="admin-alert">
          {error}
        </div>
      )}
      <div className="table-wrap">
        {page === "customers" && (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Applications</th>
                <th>Appointments</th>
                <th>Documents</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((item) => (
                <tr key={item.id}>
                  <td>{profileCell(item.id)}</td>
                  <td>{item.phone}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  {(["applications", "appointments", "documents"] as const).map(
                    (kind) => (
                      <td key={kind}>
                        <button
                          className="text-link"
                          onClick={() => {
                            setCustomerId(item.id);
                            onNavigate(kind);
                          }}
                        >
                          {kind === "documents"
                            ? activity.files.filter(
                                (file) => file.ownerId === item.id,
                              ).length
                            : activity[kind].filter(
                                (record) => record.customerId === item.id,
                              ).length}{" "}
                          · View
                        </button>
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {page === "appointments" && (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Office & purpose</th>
                <th>Date / Sri Lanka time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((item) => (
                <tr key={item.id}>
                  <td>
                    {profileCell(item.customerId)}
                    <small>{customer(item.customerId)?.phone}</small>
                  </td>
                  <td>
                    <strong>{item.office}</strong>
                    <small>{item.reason}</small>
                    {item.notes && <p className="record-notes">{item.notes}</p>}
                  </td>
                  <td>
                    {item.date}
                    <small>{item.time}</small>
                  </td>
                  <td>{badge(item.status)}</td>
                  <td>
                    {item.status === "Upcoming" ? (
                      <div className="activity-actions">
                        <button
                          className="text-link"
                          disabled={busy}
                          onClick={() =>
                            void update(
                              "appointments",
                              item.id,
                              item.status,
                              "Completed",
                            )
                          }
                        >
                          Complete
                        </button>
                        <button
                          className="text-link danger-text"
                          disabled={busy}
                          onClick={() =>
                            void update(
                              "appointments",
                              item.id,
                              item.status,
                              "Cancelled",
                            )
                          }
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {page === "applications" && (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Job applied for</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((item) => (
                <tr key={item.id}>
                  <td>
                    {profileCell(item.customerId)}
                    <button
                      className="text-link"
                      onClick={() => {
                        setCustomerId(item.customerId);
                        onNavigate("documents");
                      }}
                    >
                      View documents
                    </button>
                  </td>
                  <td>
                    <strong>{item.jobTitle}</strong>
                    <small>{item.company}</small>
                  </td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>{badge(item.status)}</td>
                  <td>
                    <select
                      aria-label={`Application status for ${customer(item.customerId)?.name} - ${item.jobTitle}`}
                      value={item.status}
                      disabled={busy}
                      onChange={(event) =>
                        void update(
                          "applications",
                          item.id,
                          item.status,
                          event.target.value,
                        )
                      }
                    >
                      {[
                        "Submitted",
                        "Reviewing",
                        "Shortlisted",
                        "Rejected",
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {page === "documents" && (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>File</th>
                <th>Type</th>
                <th>Uploaded</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td>{profileCell(file.ownerId)}</td>
                  <td>
                    <strong>{file.name}</strong>
                    <small>{Math.ceil(file.size / 1024)} KB</small>
                  </td>
                  <td>{file.kind}</td>
                  <td>{new Date(file.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn secondary" onClick={() => void downloadDocument(file.id).catch(error => setError(error.message))}>
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!(
        page === "customers"
          ? customers
          : page === "appointments"
            ? appointments
            : page === "applications"
              ? applications
              : files
      ).length && (
        <div className="empty-admin">
          <h3>No {page} found</h3>
          <p>
            Customer activity appears here when people use their connected
            accounts in the app.
          </p>
        </div>
      )}
      <div className="table-footer">
        Updates automatically every 5 seconds
        <span>Customer documents are private.</span>
      </div>
    </section>
  );
}
