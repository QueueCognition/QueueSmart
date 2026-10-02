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
