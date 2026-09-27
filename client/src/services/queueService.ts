import { QueueEntry, Service } from '../types/queue';
import { mockServices, mockQueueEntry } from './mockData';

export async function getServices(): Promise<Service[]> {
  return new Promise(res => setTimeout(() => res(mockServices), 300));
}

export async function joinQueue(serviceId: string): Promise<QueueEntry> {
  return new Promise(res => setTimeout(() => res({ ...mockQueueEntry, serviceId }), 300));
}

export async function getQueueStatus(entryId: string): Promise<QueueEntry> {
  return new Promise(res => setTimeout(() => res(mockQueueEntry), 300));
}