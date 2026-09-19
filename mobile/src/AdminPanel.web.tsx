import { CategoryManager } from "./CategoryManager.web";
import { adminRequest, jobImageUrl } from "./cloudApi";
import { cloudEnabled } from "./supabase";
import { StaffGate } from "./StaffGate.web";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import {
  validateJob,
  validateContent,
  type AppContent,
  type Catalog,
} from "./catalog";
import type { Job } from "./domain";
import "./admin.css";
import { AdminActivityPanel, type ActivityPage } from "./AdminActivity.web";
const paths: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  jobs: "M8 7V4h8v3 M3 7h18v14H3z M3 12h18 M10 12v3h4v-3",
  edit: "m4 16 12-12 4 4L8 20H4z M14 6l4 4",
  phone: "M7 2h10v20H7z M10 18h4",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  plus: "M12 5v14 M5 12h14",
  search: "M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12 M6 18 18 6",
  globe:
    "M2 12h20 M12 2c7 5 7 15 0 20-7-5-7-15 0-20 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  refresh: "M20 7a9 9 0 1 0 1 9 M20 2v6h-6",
  info: "M12 11v6 M12 7v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
};
function Glyph({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.jobs} />
    </svg>
  );
}
function Status({ status }: { status: Job["status"] }) {
  return (
    <span className={`status ${status}`}>
      <i />
      {status[0].toUpperCase() + status.slice(1)}
    </span>
  );
}
function Dialog({
  children,
  close,
  label,
  drawer = false,
}: React.PropsWithChildren<{
  close: () => void;
  label: string;
  drawer?: boolean;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={drawer ? "admin-dialog drawer" : "admin-dialog"}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      {children}
    </dialog>
  );
}
const blankJob = (): Job => ({
  id: crypto.randomUUID(),
  title: "",
  company: "",
  city: "",
  country: "Romania",
  salary: "",
  category: "Manufacturing",
  openings: 1,
  icon: "business-outline",
  description: "",
  requirements: [],
  status: "draft",
  featured: false,
  hours: "40 hrs / week",
  accommodation: "Included",
  benefits: "Provided",
  contract: "Full-time",
  updatedAt: "",
});
export default function AdminPanel() {
  return cloudEnabled ? <StaffGate><AdminWorkspace /></StaffGate> : <AdminWorkspace />;
}
function AdminWorkspace() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [page, setPage] = useState<
    | "overview"
    | "jobs"
    | "content"
    | "customers"
    | "appointments"
    | "applications"
    | "documents"
  >("overview");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [editor, setEditor] = useState<{ job: Job; create: boolean } | null>(
    null,
  );
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    label: string;
    run: () => Promise<void>;
  } | null>(null);
  const [content, setContent] = useState<AppContent | null>(null);
  const [contentRevision, setContentRevision] = useState(0);
  const [contentDirty, setContentDirty] = useState(false);
  const [fonts, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const pending = useRef(false);
  const request = adminRequest;
  const reload = useCallback(async () => {
    setError("");
    try {
      const session = await request("/api/admin/session");
      setToken(session.token);
      const value = await request("/api/admin/catalog");
      setCatalog(value);
      setContentRevision(value.revision);
    } catch (error) {
      setError((error as Error).message);
    }
  }, []);
  useEffect(() => {
    document.title = "Elladria | Admin";
    void reload();
  }, [reload]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (catalog && !contentDirty) {
      setContent(catalog.content);
      setContentRevision(catalog.revision);
    }
  }, [catalog, contentDirty]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (editor || contentDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editor, contentDirty]);
  async function mutate(route: string, body: unknown, method = "PUT") {
    if (pending.current) throw new Error("Please wait for the current save.");
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const value = await request(route, {
        method,
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify(body),
      });
      setCatalog(value);
      return value as Catalog;
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function saveJob(job: Job, create: boolean, revision: number) {
    const valid = validateJob(job);
    await mutate(`/api/admin/jobs/${encodeURIComponent(job.id)}`, {
      job: valid,
      create,
      revision,
    });
    setEditor(null);
    if (create) {
      setQuery("");
      setCategory("all");
      setStatus(valid.status);
    }
    setNotice(
      valid.status === "published"
        ? "Job published. It is now available to the app."
        : "Job saved. Only published jobs appear in the app.",
    );
  }
  function changeStatus(job: Job, next: Job["status"]) {
    setConfirmation({
      title:
        next === "published"
          ? "Publish this job?"
          : next === "archived"
            ? "Archive this job?"
            : "Move this job to drafts?",
      message:
        next === "published"
          ? `${job.title} will appear in the candidate app.`
          : `${job.title} will be removed from the app's available jobs. You can publish it again later.`,
      label:
        next === "published"
          ? "Publish job"
          : next === "archived"
            ? "Archive job"
            : "Move to drafts",
      run: async () => {
        await saveJob(
          {
            ...job,
            status: next,
            featured: next === "published" && job.featured,
          },
          false,
          catalog!.revision,
        );
        setConfirmation(null);
      },
    });
  }
  function remove(job: Job) {
    setConfirmation({
      title: "Permanently delete this job?",
      message: `${job.title} will be deleted from the catalog. This cannot be undone.`,
      label: "Delete job",
      run: async () => {
        await mutate(
          `/api/admin/jobs/${encodeURIComponent(job.id)}`,
          { revision: catalog!.revision },
          "DELETE",
        );
        setConfirmation(null);
        setNotice("Job deleted.");
      },
    });
  }
  function duplicate(job: Job) {
    setEditor({
      create: true,
      job: {
        ...job,
        id: crypto.randomUUID(),
        title: `${job.title} (copy)`.slice(0, 120),
        status: "draft",
        featured: false,
      },
    });
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool || !catalog) return;
    const lifecycle = new AbortController();
    const tool = {
      name: "search_admin_jobs",
      title: "Search managed jobs",
      description:
        "Read jobs in this admin catalog. Does not change publication or app content.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input: unknown) => {
        if (
          !input ||
          typeof input !== "object" ||
          Object.keys(input).some((key) => key !== "query")
        )
          throw new Error("Expected an optional query string.");
        const query = (input as { query?: unknown }).query ?? "";
        if (typeof query !== "string")
          throw new Error("query must be a string.");
        return catalog.jobs
          .filter((job) =>
            (job.title + " " + job.company)
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((job) => ({
            id: job.id,
            title: job.title,
            status: job.status,
            country: job.country,
          }));
      },
    };
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [catalog]);
  function move(next: typeof page) {
    if (contentDirty && next !== "content") {
      setConfirmation({
        title: "Leave unsaved changes?",
        message: "Your app-content edits have not been published.",
        label: "Discard changes",
        run: async () => {
          setContentDirty(false);
          setPage(next);
          setConfirmation(null);
        },
      });
    } else setPage(next);
  }
  const published =
    catalog?.jobs.filter((job) => job.status === "published") || [];
  const categories = catalog?.categories ?? [...new Set(catalog?.jobs.map((job) => job.category) || [])];
  const visible =
    catalog?.jobs.filter(
      (job) =>
        (status === "all" || job.status === status) &&
        (category === "all" || job.category === category) &&
        `${job.title} ${job.company} ${job.city} ${job.country}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    ) || [];
  const newJob = () => {
    setPage("jobs");
    setEditor({ create: true, job: {...blankJob(), category: categories[0] || ""} });
  };
  const table = (items: Job[]) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Job & employer</th>
            <th>Location</th>
            <th>Monthly salary</th>
            <th>Openings</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((job) => (
            <tr key={job.id}>
              <td>
                <div className="job-cell">
                  <span className="job-symbol">
                    <Glyph name="jobs" />
                  </span>
                  <div>
                    <strong>{job.title}</strong>
                    <small>
                      {job.company}
                      {job.featured && (
                        <span className="featured">Featured</span>
                      )}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                {job.city}
                <small>{job.country}</small>
              </td>
              <td className="salary-cell">{job.salary}</td>
              <td>{job.openings}</td>
              <td>
                <Status status={job.status} />
              </td>
              <td>
                <div className="row-actions">
                  <button
                    className="icon-action"
                    aria-label={`Edit ${job.title}`}
                    onClick={() =>
                      setEditor({ job: { ...job }, create: false })
                    }
                  >
                    <Glyph name="edit" />
                  </button>
                  <details className="actions-menu">
                    <summary aria-label={`More actions for ${job.title}`}>
                      •••
                    </summary>
                    <div
                      onClick={(event) =>
                        event.currentTarget.parentElement?.removeAttribute(
                          "open",
                        )
                      }
                    >
                      {job.status !== "published" && (
                        <button onClick={() => changeStatus(job, "published")}>
                          Publish job
                        </button>
                      )}
                      {job.status === "published" && (
                        <button onClick={() => changeStatus(job, "draft")}>
                          Move to drafts
                        </button>
                      )}
                      {job.status !== "archived" && (
                        <button onClick={() => changeStatus(job, "archived")}>
                          Archive job
                        </button>
                      )}
                      <button onClick={() => duplicate(job)}>
                        Duplicate as draft
                      </button>
                      {job.status !== "published" && (
                        <button
                          className="danger-text"
                          onClick={() => remove(job)}
                        >
                          Delete permanently
                        </button>
                      )}
                    </div>
                  </details>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && (
        <div className="empty-admin">
          <Glyph name="search" size={32} />
          <h3>No matching jobs</h3>
          <p>Try a different filter, or add your first vacancy.</p>
          <button className="btn primary" onClick={newJob}>
            Create a job
          </button>
        </div>
      )}
    </div>
  );
  if (!fonts && !fontError)
    return <div className="admin-loading">Loading Elladria admin…</div>;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/?admin=1" className="admin-brand">
          <span><img src="/elladria-app-icon.png" alt="" /></span>
          <div>
            ELLADRIA<small>ADMIN WORKSPACE</small>
          </div>
        </a>
        <div className="nav-caption">MANAGE YOUR APP</div>
        <nav>
          {(
            [
              { key: "overview", name: "Overview", icon: "grid" },
              { key: "jobs", name: "Jobs & vacancies", icon: "jobs" },
              {
                key: "content",
                name: "App content",
                icon: "edit",
              },
              { key: "customers", name: "Customers", icon: "globe" },
              { key: "appointments", name: "Appointments", icon: "grid" },
              { key: "applications", name: "Applications", icon: "jobs" },
              { key: "documents", name: "Documents", icon: "edit" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              className={page === item.key ? "active" : ""}
              onClick={() => move(item.key)}
              aria-current={page === item.key ? "page" : undefined}
            >
              <Glyph name={item.icon} />
              {item.name}
              {item.key === "jobs" && (
                <span className="nav-count">{catalog?.jobs.length ?? "—"}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-label">
            <i />
            {cloudEnabled ? "Cloud workspace" : "Local demo workspace"}
          </div>
          <p>Published jobs and content sync with your connected app.</p>
          <a
            className="preview-link"
            href="/mobile-preview.html"
            target="_blank"
            rel="noreferrer"
          >
            <Glyph name="phone" />
            Open mobile preview
            <Glyph name="arrow" size={16} />
          </a>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {page === "overview"
                ? "Overview"
                : page === "jobs"
                  ? "Jobs & vacancies"
                  : page === "content"
                    ? "App content"
                    : page[0].toUpperCase() + page.slice(1)}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="connection">
              <i />
              {catalog ? "Connected to app catalog" : "Connecting…"}
            </span>
            <span className="admin-avatar">AD</span>
            <div className="admin-user">
              Staff<small>{cloudEnabled ? "Secure staff access" : "Local computer access"}</small>
            </div>
          </div>
        </header>
        <main className="admin-content">
          {error && (
            <div className="admin-alert" role="alert">
              <Glyph name="info" />
              <span>{error}</span>
              <button onClick={() => void reload()}>Reload latest data</button>
            </div>
          )}
          {!catalog && (
            <section className="panel empty-admin">
              <h2>
                {error ? "Workspace unavailable" : "Loading your workspace…"}
              </h2>
              <p>
                {cloudEnabled ? "Check your connection and confirm both Supabase setup scripts have been applied." : "Use the admin launch script to start the shared local server."}
              </p>
            </section>
          )}
          {catalog && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">ELLADRIA MANAGEMENT</div>
                  <h1>
                    {page === "overview"
                      ? "Your recruitment workspace"
                      : page === "jobs"
                        ? "Jobs & vacancies"
                        : page === "content"
                          ? "App content"
                          : page[0].toUpperCase() + page.slice(1)}
                  </h1>
                  <p>
                    {page === "overview"
                      ? "Manage the opportunities and information your candidates see."
                      : page === "jobs"
                        ? "Create opportunities. Review the details. Publish when ready."
                        : "Manage the information and customer activity connected to your app."}
                  </p>
                </div>
                {["overview", "jobs"].includes(page) ? (
                  <button className="btn primary" onClick={newJob}>
                    <Glyph name="plus" />
                    Create job
                  </button>
                ) : (
                  <a
                    className="btn secondary"
                    href="/mobile-preview.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Glyph name="phone" />
                    Preview app
                  </a>
                )}
              </div>
              {page === "overview" && (
                <>
                  <div className="stat-grid">
                    {[
                      {
                        label: "Published jobs",
                        value: published.length,
                        hint: "Visible in the app",
                        icon: "jobs",
                        color: "teal",
                      },
                      {
                        label: "Draft jobs",
                        value: catalog.jobs.filter(
                          (job) => job.status === "draft",
                        ).length,
                        hint: "Ready for your review",
                        icon: "edit",
                        color: "amber",
                      },
                      {
                        label: "Open positions",
                        value: published.reduce(
                          (n, job) => n + job.openings,
                          0,
                        ),
                        hint: "Across published jobs",
                        icon: "check",
                        color: "blue",
                      },
                      {
                        label: "Destinations",
                        value: new Set(published.map((job) => job.country))
                          .size,
                        hint: "Countries with opportunities",
                        icon: "globe",
                        color: "purple",
                      },
                    ].map((stat) => (
                      <div className="stat-card" key={stat.label}>
                        <div className="stat-top">
                          <span>{stat.label}</span>
                          <span className={`stat-icon ${stat.color}`}>
                            <Glyph name={stat.icon} />
                          </span>
                        </div>
                        <strong>{stat.value}</strong>
                        <small>{stat.hint}</small>
                      </div>
                    ))}
                  </div>
                  <section className="overview-banner">
                    <div>
                      <span className="eyebrow">
                        FROM YOUR DESK TO THEIR NEXT CHAPTER
                      </span>
                      <h2>Keep every opportunity current.</h2>
                      <p>
                        Draft a vacancy, update its requirements, and publish it
                        to the app—all from one place.
                      </p>
                    </div>
                    <button
                      className="btn secondary"
                      onClick={() => setPage("jobs")}
                    >
                      Manage jobs
                      <Glyph name="arrow" />
                    </button>
                  </section>
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Latest vacancies</h2>
                        <p>Your most recently updated opportunities.</p>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => setPage("jobs")}
                      >
                        View all jobs →
                      </button>
                    </div>
                    {table(
                      [...catalog.jobs]
                        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                        .slice(0, 5),
                    )}
                  </section>
                  <div className="overview-bottom">
                    <section className="panel compact-panel">
                      <span className="stat-icon teal">
                        <Glyph name="phone" />
                      </span>
                      <div>
                        <h3>The candidate home screen</h3>
                        <p>{catalog.content.heroTitle}</p>
                        <button
                          className="text-link"
                          onClick={() => setPage("content")}
                        >
                          Edit app content →
                        </button>
                      </div>
                    </section>
                    <section className="panel compact-panel">
                      <span className="stat-icon blue">
                        <Glyph name="info" />
                      </span>
                      <div>
                        <h3>Publication is in your hands</h3>
                        <p>
                          Draft and archived jobs stay out of the app. Published
                          changes refresh automatically while the app is
                          connected.
                        </p>
                      </div>
                    </section>
                  </div>
                </>
              )}
              {[
                "overview",
                "customers",
                "appointments",
                "applications",
                "documents",
              ].includes(page) && (
                <AdminActivityPanel
                  page={page as ActivityPage}
                  token={token}
                  onNavigate={setPage}
                />
              )}
              {page === "jobs" && cloudEnabled && <CategoryManager catalog={catalog} onSaved={(value)=>{setCatalog(value);setCategory("all");setNotice("Categories updated.");}} />}
              {page === "jobs" && (
                <section className="panel">
                  <div className="job-toolbar">
                    <div className="status-tabs">
                      {["all", "published", "draft", "archived"].map(
                        (value) => (
                          <button
                            key={value}
                            className={status === value ? "selected" : ""}
                            onClick={() => setStatus(value)}
                          >
                            {value === "all"
                              ? "All jobs"
                              : value[0].toUpperCase() + value.slice(1)}
                            <span>
                              {value === "all"
                                ? catalog.jobs.length
                                : catalog.jobs.filter(
                                    (job) => job.status === value,
                                  ).length}
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                    <div className="filters">
                      <label className="search-input">
                        <Glyph name="search" />
                        <input
                          aria-label="Search jobs"
                          placeholder="Search jobs, employers or locations"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </label>
                      <select
                        aria-label="Filter category"
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                      >
                        <option value="all">All categories</option>
                        {categories.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {table(visible)}
                  <div className="table-footer">
                    Showing {visible.length} of {catalog.jobs.length} jobs
                    <span>Only published jobs are visible to candidates.</span>
                  </div>
                </section>
              )}
              {page === "content" && content && (
                <form
                  className="content-layout"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    try {
                      const valid = validateContent(content);
                      await mutate("/api/admin/content", {
                        content: valid,
                        revision: contentRevision,
                      });
                      setContentDirty(false);
                      setNotice(
                        "App content updated. Your connected app will refresh shortly.",
                      );
                    } catch (error) {
                      setError((error as Error).message);
                    }
                  }}
                >
                  <div className="content-sections">
                    <section className="panel form-panel">
                      <div className="section-number">01</div>
                      <h2>Home screen</h2>
                      <p>
                        The first message candidates see when they open
                        Elladria.
                      </p>
                      <label>
                        Headline
                        <input
                          required
                          maxLength={120}
                          value={content.heroTitle}
                          onChange={(event) => {
                            setContent({
                              ...content,
                              heroTitle: event.target.value,
                            });
                            setContentDirty(true);
                          }}
                        />
                      </label>
                      <label>
                        Introduction
                        <textarea
                          required
                          maxLength={500}
                          rows={3}
                          value={content.heroDescription}
                          onChange={(event) => {
                            setContent({
                              ...content,
                              heroDescription: event.target.value,
                            });
                            setContentDirty(true);
                          }}
                        />
                      </label>
                    </section>
                    <section className="panel form-panel">
                      <div className="section-number">02</div>
                      <h2>Announcement</h2>
                      <p role="status"><strong>{contentDirty ? "Unsaved changes: click Publish app content to update what customers see." : content.announcementEnabled ? "Published: visible on the Home screen and in notifications." : "Hidden: switch on Show announcement in the app to display it."}</strong></p>
                      <p>
                        A notice displayed below the home banner. This does not
                        send a push notification.
                      </p>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={content.announcementEnabled}
                          onChange={(event) => {
                            setContent({
                              ...content,
                              announcementEnabled: event.target.checked,
                            });
                            setContentDirty(true);
                          }}
                        />
                        Show announcement in the app
                      </label>
                      <label>
                        Announcement title
                        <input
                          required={content.announcementEnabled}
                          maxLength={120}
                          value={content.announcementTitle}
                          onChange={(event) => {
                            setContent({
                              ...content,
                              announcementTitle: event.target.value,
                            });
                            setContentDirty(true);
                          }}
                        />
                      </label>
                      <label>
                        Message
                        <textarea
                          required={content.announcementEnabled}
                          maxLength={1000}
                          rows={4}
                          value={content.announcementBody}
                          onChange={(event) => {
                            setContent({
                              ...content,
                              announcementBody: event.target.value,
                            });
                            setContentDirty(true);
                          }}
                        />
                      </label>
                    </section>
                    <section className="panel form-panel">
                      <div className="section-number">03</div>
                      <h2>Support information</h2>
                      <p>
                        Displayed on the candidate's Profile screen. Leave blank
                        to hide.
                      </p>
                      <div className="form-grid">
                        <label>
                          Email address
                          <input
                            type="email"
                            maxLength={160}
                            value={content.supportEmail}
                            onChange={(event) => {
                              setContent({
                                ...content,
                                supportEmail: event.target.value,
                              });
                              setContentDirty(true);
                            }}
                          />
                        </label>
                        <label>
                          Phone number
                          <input
                            type="tel"
                            maxLength={40}
                            value={content.supportPhone}
                            onChange={(event) => {
                              setContent({
                                ...content,
                                supportPhone: event.target.value,
                              });
                              setContentDirty(true);
                            }}
                          />
                        </label>
                      </div>
                    </section>
                    <div className="content-save">
                      {contentDirty && (
                        <button
                          className="btn secondary"
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setConfirmation({
                              title: "Discard content changes?",
                              message:
                                "Your unsaved content edits will be discarded and the latest saved version loaded.",
                              label: "Discard & reload",
                              run: async () => {
                                setContentDirty(false);
                                await reload();
                                setConfirmation(null);
                              },
                            })
                          }
                        >
                          Discard changes
                        </button>
                      )}
                      <span>
                        {contentDirty
                          ? "You have unpublished changes"
                          : "All changes saved"}
                      </span>
                      <button
                        className="btn primary"
                        disabled={busy || !contentDirty}
                        type="submit"
                      >
                        <Glyph name="check" />
                        {busy ? "Saving…" : "Publish app content"}
                      </button>
                    </div>
                  </div>
                  <aside className="content-preview">
                    <span className="eyebrow">HOME SCREEN PREVIEW</span>
                    <div className="mini-phone">
                      <div className="mini-brand">
                        E <strong>Elladria</strong>
                      </div>
                      <div className="mini-hero">
                        <h3>{content.heroTitle || "Your headline"}</h3>
                        <p>{content.heroDescription}</p>
                        <div className="mini-search">
                          <Glyph name="search" size={16} />
                          Search opportunities
                        </div>
                      </div>
                      {content.announcementEnabled && (
                        <div className="mini-notice">
                          <strong>{content.announcementTitle}</strong>
                          <p>{content.announcementBody}</p>
                        </div>
                      )}
                      <div className="mini-actions">
                        <div>Browse jobs</div>
                        <div>Saved jobs</div>
                      </div>
                    </div>
                    <p>
                      Preview text changes here before publishing. Admin-written
                      content is shown as entered in all languages.
                    </p>
                  </aside>
                </form>
              )}
              <footer className="workspace-footer">
                Elladria admin � {cloudEnabled ? "Cloud" : "Local demo"}
                <span>
                  Last saved {new Date(catalog.updatedAt).toLocaleString()}
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      {notice && (
        <div className="admin-toast" role="status">
          <Glyph name="check" />
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <Glyph name="close" size={18} />
          </button>
        </div>
      )}
      {editor && (
        <JobEditor
          key={editor.job.id}
          categories={categories}
          initial={editor.job}
          create={editor.create}
          revision={catalog!.revision}
          token={token}
          busy={busy}
          onSave={saveJob}
          onClose={() => setEditor(null)}
        />
      )}
      {confirmation && (
        <Dialog
          label={confirmation.title}
          close={() => {
            if (!busy) setConfirmation(null);
          }}
        >
          <div className="confirm-body">
            <span className="stat-icon amber">
              <Glyph name="info" />
            </span>
            <h2>{confirmation.title}</h2>
            <p>{confirmation.message}</p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => void confirmation.run().catch(() => {})}
              >
                {busy ? "Saving…" : confirmation.label}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
function JobEditor({
  categories,
  token,
  initial,
  create,
  revision,
  busy,
  onSave,
  onClose,
}: {
  categories: string[];
  token: string;
  initial: Job;
  create: boolean;
  revision: number;
  busy: boolean;
  onSave: (job: Job, create: boolean, revision: number) => Promise<void>;
  onClose: () => void;
}) {
  const [job, setJob] = useState<Job>({ ...initial });
  const [requirements, setRequirements] = useState(
    initial.requirements.join("\n"),
  );
  const [error, setError] = useState("");
  const originalRevision = useRef(revision);
  const [uploading, setUploading] = useState(false);
  async function uploadImage(file: File) {
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const result = await adminRequest("/api/admin/uploads", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": file.type,
          "X-File-Name": encodeURIComponent(file.name),
          "X-CSRF-Token": token,
        },
        body: file,
      });
      setJob((previous) => ({ ...previous, imageId: result.id }));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  }
  const dirty =
    JSON.stringify(job) !== JSON.stringify(initial) ||
    requirements !== initial.requirements.join("\n");
  const close = () => {
    if (
      !busy &&
      (!dirty || window.confirm("Discard your unsaved job changes?"))
    )
      onClose();
  };
  const update = (key: keyof Job, value: unknown) =>
    setJob((previous) => ({ ...previous, [key]: value }));
  const input = (label: string, key: keyof Job, max = 120) => (
    <label>
      {label}
      <input
        required
        maxLength={max}
        value={String(job[key])}
        onChange={(event) => update(key, event.target.value)}
      />
    </label>
  );
  return (
    <Dialog label={create ? "Create job" : "Edit job"} close={close} drawer>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            await onSave(
              {
                ...job,
                requirements: requirements
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
              },
              create,
              originalRevision.current,
            );
          } catch (error) {
            setError((error as Error).message);
          }
        }}
      >
        <header className="drawer-header">
          <div>
            <span className="eyebrow">JOB MANAGEMENT</span>
            <h2>{create ? "Create a new vacancy" : "Edit vacancy"}</h2>
          </div>
          <button
            className="icon-action"
            type="button"
            disabled={busy || uploading}
            aria-label="Close job editor"
            onClick={close}
          >
            <Glyph name="close" />
          </button>
        </header>
        <div className="drawer-body">
          {error && (
            <div role="alert" className="admin-alert">
              {error}
            </div>
          )}
          <div className="editor-intro">
            <Status status={job.status} />
            <span>
              {job.status === "published"
                ? "Visible to candidates after saving"
                : "Not visible to candidates"}
            </span>
          </div>
          <section>
            <h3>Job information</h3>
            <div className="job-image-editor">
              {job.imageId && (
                <img
                  src={jobImageUrl(job.imageId, true)}
                  alt="Job image preview"
                />
              )}
              <label>
                Job image
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={uploading || busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadImage(file);
                    event.target.value = "";
                  }}
                />
              </label>
              <span className="upload-hint">
                {uploading
                  ? "Uploading image…"
                  : "PNG or JPEG, up to 5 MB. Upload only images intended for public use."}
              </span>
              {job.imageId && (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() =>
                    setJob((previous) => ({ ...previous, imageId: undefined }))
                  }
                >
                  Remove image from job
                </button>
              )}
            </div>
            <p>Give candidates a clear picture of the opportunity.</p>
            {input("Job title", "title")}
            {input("Employer / company", "company", 160)}
            <div className="form-grid">
              {input("City", "city", 100)}
              {input("Country", "country", 100)}
              <label>Category<select required value={job.category} onChange={event=>update("category",event.target.value)}>
                <option value="" disabled>Choose an admin-defined category</option>
                {[...new Set([...categories,...(job.category?[job.category]:[])])].map(name=><option key={name} value={name}>{name}</option>)}
              </select></label>
              <p className="helper-text">Manage these choices under Jobs & vacancies → Job categories. Customers use them to filter available jobs.</p>
              <label>
                Card icon (visual symbol)
                <select
                  value={job.icon}
                  onChange={(event) => update("icon", event.target.value)}
                >
                  <option value="business-outline">
                    Manufacturing / general
                  </option>
                  <option value="bed-outline">Hospitality</option>
                  <option value="cube-outline">Logistics</option>
                </select>
              </label>
            </div>
          </section>
          <section>
            <h3>Compensation & benefits</h3>
            <div className="form-grid">
              {input("Monthly salary", "salary", 80)}
              <label>
                Number of openings
                <input
                  required
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  value={job.openings}
                  onChange={(event) =>
                    update("openings", Number(event.target.value))
                  }
                />
              </label>
              {input("Working hours", "hours", 100)}
              {input("Contract type", "contract", 100)}
              {input("Accommodation", "accommodation", 160)}
              {input("Food / other benefits", "benefits", 250)}
            </div>
          </section>
          <section>
            <h3>Role & requirements</h3>
            <label>
              About the role
              <textarea
                required
                maxLength={6000}
                rows={5}
                value={job.description}
                onChange={(event) => update("description", event.target.value)}
              />
            </label>
            <label>
              Requirements <small>One requirement per line</small>
              <textarea
                required
                maxLength={15000}
                rows={5}
                value={requirements}
                onChange={(event) => setRequirements(event.target.value)}
                placeholder="Basic English communication&#10;Relevant work experience"
              />
            </label>
          </section>
          <section>
            <h3>Publication</h3>
            <label>
              Visibility
              <select
                value={job.status}
                onChange={(event) =>
                  setJob((previous) => ({
                    ...previous,
                    status: event.target.value as Job["status"],
                    featured:
                      event.target.value === "published" && previous.featured,
                  }))
                }
              >
                <option value="draft">Draft — hidden from candidates</option>
                <option value="published">
                  Published — visible in the app
                </option>
                <option value="archived">Archived — no longer available</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                disabled={job.status !== "published"}
                checked={job.featured}
                onChange={(event) => update("featured", event.target.checked)}
              />
              Feature this job on the app home screen
            </label>
            <p className="helper-text">
              Only one job can be featured. Featuring this job replaces the
              current featured selection.
            </p>
          </section>
        </div>
        <footer className="drawer-footer">
          <button
            className="btn secondary"
            type="button"
            disabled={busy || uploading}
            onClick={close}
          >
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={busy || uploading}
            type="submit"
          >
            <Glyph name="check" />
            {busy
              ? "Saving…"
              : job.status === "published"
                ? "Save & publish job"
                : "Save job"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
