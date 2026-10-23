export type AppointmentStatus = "upcoming" | "completed" | "cancelled";

export interface Appointment {
  id: string;
  userId: string;
  serviceId: string;
  date: string;
  time: string;
  status: AppointmentStatus;
}
