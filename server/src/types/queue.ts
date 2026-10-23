export type QueueStatus = "waiting" | "almost_ready" | "served" | "cancelled";

export type ServicePriority = "low" | "medium" | "high";

export interface Service {
  id: string;
  name: string;
  description: string;
  expectedDuration: number;
  priority: ServicePriority;
  isAvailable: boolean;
}

export interface QueueEntry {
  id: string;
  serviceId: string;
  position: number;
  estimatedWaitMinutes: number;
  status: QueueStatus;
  joinedAt: string;
}

export interface AdminQueueEntry extends QueueEntry {
  customerName?: string;
  customerEmail?: string;
  timeSlot?: string;
  ticketNumber?: string;
}

export interface AdminServiceQueueSummary {
  service: Service;
  waitingCount: number;
  estimatedWaitMinutes: number;
  waitingList: AdminQueueEntry[];
}

export type NotificationType = "queue_update" | "status_change";

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
}

export interface QueueEntryRecord extends AdminQueueEntry {
  userId: string;
  priority: ServicePriority;
  customerName: string;
  customerEmail: string;
  date: string; // YYYY-MM-DD
  timeSlot: string;
  ticketNumber: string;
}

export interface WaitEstimate {
  serviceId: string;
  waitingCount: number;
  expectedDuration: number;
  estimatedWaitMinutes: number;
}

export interface ServeNextResult {
  served: QueueEntryRecord;
  nextUp: QueueEntryRecord | null;
}

export interface QueueSummaryRecord extends AdminServiceQueueSummary {
  waitingList: QueueEntryRecord[];
}

export interface PublicQueueRow {
  position: number;
  patient: string;
  date: string;
  timeSlot: string;
}