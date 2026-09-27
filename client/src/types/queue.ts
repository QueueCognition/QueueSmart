export type QueueStatus = 'waiting' | 'almost_ready' | 'served' | 'cancelled';

export interface Service {
  id: string;
  name: string;
  description: string;
  expectedDuration: number; // minutes
  priority: 'low' | 'medium' | 'high';
}

export interface QueueEntry {
  id: string;
  serviceId: string;
  position: number;
  estimatedWaitMinutes: number;
  status: QueueStatus;
  joinedAt: string; // ISO timestamp
}

export interface Notification {
  id: string;
  message: string;
  type: 'queue_update' | 'status_change';
  timestamp: string;
  read: boolean;
}