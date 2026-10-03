import {
  mockAppointments,
  mockServices,
  type MockAppointment,
} from "./mockData";

export async function getAppointments(
  userId: string,
): Promise<MockAppointment[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const userAppointments = mockAppointments.filter(
        (appointment) => appointment.userId === userId,
      );

      resolve(userAppointments);
    }, 200);
  });
}

export async function getAppointmentServiceName(
  serviceId: string,
): Promise<string> {
  const service = mockServices.find(
    (service) => service.id === serviceId,
  );

  return service?.name ?? "Unknown Service";
}