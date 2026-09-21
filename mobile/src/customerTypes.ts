import type { Appointment, Profile } from "./domain";
export type CustomerProfile = Profile & {
  id: string;
  createdAt: string;
  appearance: "light" | "dark";
};
export type CustomerAppointment = Appointment & {
  customerId: string;
  createdAt: string;
};
export type Application = {
  id: string;
  customerId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: "Submitted" | "Reviewing" | "Shortlisted" | "Rejected";
  createdAt: string;
};
export type Upload = {
  id: string;
  ownerId: string;
  name: string;
  mime: string;
  size: number;
  kind: "CV" | "Document" | "job-image";
  createdAt: string;
};
export type CustomerData = {
  profile: CustomerProfile;
  appointments: CustomerAppointment[];
  applications: Application[];
  files: Upload[];
};
export type AdminActivity = {
  customers: CustomerProfile[];
  appointments: CustomerAppointment[];
  applications: Application[];
  files: Upload[];
};
