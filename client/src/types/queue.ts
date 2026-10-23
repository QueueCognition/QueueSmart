export type QueueStatus = "waiting" | "almost_ready" | "served" | "cancelled";

export interface Service {
  id: string;
  name: string;
  description: string;
  expectedDuration: number; // minutes
  priority: "low" | "medium" | "high";
  isAvailable?: boolean;
}

export interface QueueEntry {
  id: string;
  serviceId: string;
  position: number;
  estimatedWaitMinutes: number;
  status: QueueStatus;
  joinedAt: string; // ISO timestamp
  customerName?: string;
  customerEmail?: string;
  date?: string;
  timeSlot?: string;
  ticketNumber?: string;
  userId?: string;
  priority?: Service["priority"];
}

export interface QueueServiceSummary {
  service: Service;
  waitingCount: number;
  estimatedWaitMinutes: number;
  waitingList: QueueEntry[];
}

export interface PublicQueueRow {
  position: number;
  patient: string;
  date: string;
  timeSlot: string;
}

export interface WaitEstimate {
  serviceId: string;
  waitingCount: number;
  expectedDuration: number;
  estimatedWaitMinutes: number;
}

export interface Notification {
  id: string;
  message: string;
  type: "queue_update" | "status_change";
  timestamp: string;
  read: boolean;
}
