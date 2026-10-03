import type { Service, QueueEntry } from "../types/queue";

export const mockServices: Service[] = [
  {
    id: "s1",
    name: "DMV License Renewal",
    description: "Renew your driver's license or state ID",
    expectedDuration: 15,
    priority: "medium",
  },
  {
    id: "s2",
    name: "Student ID Card",
    description: "Request a new or replacement student ID card",
    expectedDuration: 10,
    priority: "low",
  },
  {
    id: "s3",
    name: "Financial Aid Consultation",
    description: "Meet with an advisor about your financial aid package",
    expectedDuration: 20,
    priority: "high",
  },
];

export const mockQueueEntry: QueueEntry = {
  id: "q1",
  serviceId: "s1",
  position: 3,
  estimatedWaitMinutes: 12,
  status: "waiting",
  joinedAt: new Date().toISOString(),
};


export type AppointmentStatus = "upcoming" | "completed" | "cancelled";

export interface MockAppointment {
  id: string;
  userId: string;
  serviceId: string;
  date: string;
  time: string;
  status: AppointmentStatus;
}

export const mockAppointments: MockAppointment[] = [
  {
    id: "a1",
    userId: "u_demo",
    serviceId: "s1",
    date: "2026-10-08",
    time: "10:00 AM",
    status: "upcoming",
  },
  {
    id: "a2",
    userId: "u_demo",
    serviceId: "s3",
    date: "2026-10-15",
    time: "2:30 PM",
    status: "upcoming",
  },
  {
    id: "a3",
    userId: "u_demo",
    serviceId: "s2",
    date: "2026-09-12",
    time: "11:00 AM",
    status: "completed",
  },
  {
    id: "a4",
    userId: "u_demo",
    serviceId: "s1",
    date: "2026-08-20",
    time: "9:30 AM",
    status: "completed",
  },
  {
    id: "a5",
    userId: "u_demo",
    serviceId: "s3",
    date: "2026-11-03",
    time: "1:00 PM",
    status: "upcoming",
  },
];