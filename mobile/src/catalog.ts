import type { Job } from "./domain";
export type AppContent = {
  heroTitle: string;
  heroDescription: string;
  announcementEnabled: boolean;
  announcementTitle: string;
  announcementBody: string;
  supportEmail: string;
  supportPhone: string;
};
export type Catalog = {
  categories?: string[];
  revision: number;
  jobs: Job[];
  content: AppContent;
  updatedAt: string;
};
export const defaultContent: AppContent = {
  heroTitle: "Find your opportunity in Romania",
  heroDescription:
    "Explore jobs, plan your office visit, and take the next step in your career.",
  announcementEnabled: false,
  announcementTitle: "",
  announcementBody: "",
  supportEmail: "",
  supportPhone: "",
};
export function validateJob(value: unknown): Job {
  if (!value || typeof value !== "object")
    throw new Error("Job information is required.");
  const job = value as Record<string, unknown>;
  const required = (key: string, max: number) => {
    if (
      typeof job[key] !== "string" ||
      !job[key].trim() ||
      job[key].trim().length > max
    )
      throw new Error(
        `${key} is required and must be at most ${max} characters.`,
      );
    return job[key].trim();
  };
  const id = required("id", 80);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid job ID.");
  if (!["draft", "published", "archived"].includes(String(job.status)))
    throw new Error("Choose a valid publication status.");
  if (
    !Number.isInteger(job.openings) ||
    Number(job.openings) < 1 ||
    Number(job.openings) > 100000
  )
    throw new Error("Openings must be a whole number between 1 and 100000.");
  if (
    !Array.isArray(job.requirements) ||
    !job.requirements.length ||
    job.requirements.length > 30 ||
    !job.requirements.every(
      (item) => typeof item === "string" && item.trim() && item.length <= 500,
    )
  )
    throw new Error("Add 1–30 requirements, each at most 500 characters.");
  if (
    !["business-outline", "bed-outline", "cube-outline"].includes(
      String(job.icon),
    )
  )
    throw new Error("Choose a valid job icon.");
  if (typeof job.featured !== "boolean")
    throw new Error("Featured must be true or false.");
  return {
    id,
    imageId:
      typeof job.imageId === "string" && /^[a-f0-9-]{36}$/.test(job.imageId)
        ? job.imageId
        : undefined,
    title: required("title", 120),
    company: required("company", 160),
    city: required("city", 100),
    country: required("country", 100),
    salary: required("salary", 80),
    category: required("category", 80),
    description: required("description", 6000),
    hours: required("hours", 100),
    accommodation: required("accommodation", 160),
    benefits: required("benefits", 250),
    contract: required("contract", 100),
    openings: Number(job.openings),
    requirements: job.requirements.map((item) => item.trim()),
    icon: job.icon as Job["icon"],
    status: job.status as Job["status"],
    featured: job.featured && job.status === "published",
    updatedAt: new Date().toISOString(),
  };
}
export function validateContent(value: unknown): AppContent {
  if (!value || typeof value !== "object")
    throw new Error("App content is required.");
  const content = value as Record<string, unknown>;
  const read = (key: string, max: number, required = false) => {
    const value = content[key];
    if (
      typeof value !== "string" ||
      value.trim().length > max ||
      (required && !value.trim())
    )
      throw new Error(
        `${key} must ${required ? "contain text and " : ""}be at most ${max} characters.`,
      );
    return value.trim();
  };
  if (typeof content.announcementEnabled !== "boolean")
    throw new Error("Choose whether the announcement is visible.");
  const result = {
    heroTitle: read("heroTitle", 120, true),
    heroDescription: read("heroDescription", 500, true),
    announcementEnabled: content.announcementEnabled,
    announcementTitle: read(
      "announcementTitle",
      120,
      content.announcementEnabled,
    ),
    announcementBody: read(
      "announcementBody",
      1000,
      content.announcementEnabled,
    ),
    supportEmail: read("supportEmail", 160),
    supportPhone: read("supportPhone", 40),
  };
  if (
    result.supportEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.supportEmail)
  )
    throw new Error("Enter a valid support email.");
  if (result.supportPhone && !/^[+\d ()-]{6,40}$/.test(result.supportPhone))
    throw new Error("Enter a valid support phone number.");
  return result;
}
export function publicCatalog(catalog: Catalog): Catalog {
  return {
    ...catalog,
    jobs: catalog.jobs.filter((job) => job.status === "published"),
  };
}
