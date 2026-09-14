export type Language = "en" | "si" | "ta";
export type Profile = { name: string; phone: string; email: string };
export type Appointment = {
  id: string;
  office: string;
  date: string;
  time: string;
  reason: string;
  notes: string;
  status: "Upcoming" | "Completed" | "Cancelled";
  candidate: string;
};
export type DemoState = {
  language: Language | null;
  profile: Profile | null;
  saved: string[];
  reminders: string[];
  applications: string[];
  appointments: Appointment[];
};
export const initialState: DemoState = {
  language: null,
  profile: null,
  saved: [],
  reminders: [],
  applications: [],
  appointments: [],
};
export type Job = {
  id: string;
  title: string;
  company: string;
  city: string;
  country: string;
  salary: string;
  category: string;
  openings: number;
  icon: "business-outline" | "bed-outline" | "cube-outline";
  description: string;
  requirements: string[];
  status: "draft" | "published" | "archived";
  featured: boolean;
  hours: string;
  accommodation: string;
  benefits: string;
  contract: string;
  updatedAt: string;
};
export const jobs: Job[] = [
  {
    id: "factory",
    title: "Factory Worker",
    company: "EuroManufacture S.A.",
    city: "Bucharest",
    salary: "€800 – €1,000",
    category: "Manufacturing",
    openings: 20,
    icon: "business-outline" as const,
    description:
      "Join an organised production team in Bucharest. Assist on the production line, maintain a clean and safe workspace, and help meet quality standards.",
    requirements: [
      "Physical fitness for standing and manual tasks",
      "Basic English or Romanian",
      "Manufacturing experience welcome; training provided",
    ],
  },
  {
    id: "hospitality",
    title: "Hotel Housekeeper",
    company: "Carpathian Hospitality",
    city: "Brașov",
    salary: "€750 – €950",
    category: "Hospitality",
    openings: 12,
    icon: "bed-outline" as const,
    description:
      "Help a hotel team create a welcoming stay for guests. Prepare rooms, replenish supplies, and follow housekeeping and hygiene standards.",
    requirements: [
      "Attention to detail and a reliable work ethic",
      "Basic conversational English",
      "Hospitality experience welcome",
    ],
  },
  {
    id: "warehouse",
    title: "Warehouse Assistant",
    company: "Danube Logistics",
    city: "Cluj-Napoca",
    salary: "€850 – €1,100",
    category: "Logistics",
    openings: 8,
    icon: "cube-outline" as const,
    description:
      "Support a warehouse team with picking, packing, stock checks, and safe movement of goods. Work with colleagues to keep daily orders on track.",
    requirements: [
      "Ability to safely lift and handle stock",
      "Basic English and numeracy",
      "Willingness to work scheduled shifts",
    ],
  },
].map((job, index) => ({
  ...job,
  country: "Romania",
  status: "published" as const,
  featured: index === 0,
  hours: "40 hrs / week",
  accommodation: "Included",
  benefits: "Provided",
  contract: "Full-time",
  updatedAt: "2026-09-14T00:00:00.000Z",
}));
export const offices = [
  { name: "Colombo HQ", address: "World Trade Center, Echelon Square" },
  { name: "Kandy Branch", address: "Dalada Vidiya, Kandy City Center" },
  { name: "Galle Branch", address: "Galle Fort, Pedlar Street" },
];
export const times = ["09:00", "10:00", "10:30", "11:30", "14:00"];
export const reasons = [
  "Visa Consultation",
  "Document Submission",
  "Interview Preparation",
  "Other Inquiry",
];
export function toggleItem(items: string[], id: string) {
  return items.includes(id)
    ? items.filter((item) => item !== id)
    : [...items, id];
}
export function validateProfile(profile: Profile, password: string) {
  const errors: Record<string, string> = {};
  if (profile.name.trim().length < 2) errors.name = "Enter your full name";
  if (!/^(?:\+94|0)7\d{8}$/.test(profile.phone.replace(/[\s()-]/g, "")))
    errors.phone = "Enter a valid Sri Lankan mobile number";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()))
    errors.email = "Enter a valid email address";
  if (password.length < 8) errors.password = "Use at least 8 characters";
  return errors;
}
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function availableDates(now = new Date()) {
  const dates: string[] = [];
  for (let i = 1; i <= 28; i++) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + i,
      12,
    );
    if (date.getDay() !== 0 && date.getDay() !== 6) dates.push(dateKey(date));
  }
  return dates;
}
export function canBook(
  appointments: Appointment[],
  office: string,
  date: string,
  time: string,
  now = new Date(),
) {
  return (
    offices.some((item) => item.name === office) &&
    availableDates(now).includes(date) &&
    times.includes(time) &&
    !appointments.some(
      (item) =>
        item.status === "Upcoming" && item.date === date && item.time === time,
    )
  );
}
export function filterJobs(
  query: string,
  category: string,
  savedOnly = false,
  saved: string[] = [],
  catalogJobs: Job[] = jobs,
) {
  const term = query.trim().toLowerCase();
  return catalogJobs.filter(
    (job) =>
      `${job.title} ${job.company} ${job.city} ${job.country} ${job.category}`
        .toLowerCase()
        .includes(term) &&
      (category === "All" || job.category === category) &&
      (!savedOnly || saved.includes(job.id)),
  );
}
export function restoreState(raw: string): DemoState {
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid saved demo");
  const strings = (items: unknown): string[] =>
    Array.isArray(items)
      ? items.filter(
          (item): item is string =>
            typeof item === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(item),
        )
      : [];
  const p = value.profile;
  const appointments = Array.isArray(value.appointments)
    ? value.appointments.filter(
        (item: any) =>
          item &&
          [
            "id",
            "office",
            "date",
            "time",
            "reason",
            "notes",
            "candidate",
          ].every((key) => typeof item[key] === "string") &&
          /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
          ["Upcoming", "Completed", "Cancelled"].includes(item.status),
      )
    : [];
  return {
    language: ["en", "si", "ta"].includes(value.language)
      ? value.language
      : null,
    profile:
      p && ["name", "email", "phone"].every((key) => typeof p[key] === "string")
        ? { name: p.name, email: p.email, phone: p.phone }
        : null,
    saved: strings(value.saved),
    reminders: strings(value.reminders),
    applications: strings(value.applications),
    appointments,
  };
}
