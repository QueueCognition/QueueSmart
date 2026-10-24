import {
  ADMIN_ACCOUNT,
  DEMO_ACCOUNT,
  findUserByEmail,
  insertUser,
  type NewUser,
} from "../models/userStore";
import type { QueueService } from "../services/queueService";

const MOCK_ACCOUNTS: NewUser[] = [
  {
    id: "u_demo",
    firstName: "Demo",
    lastName: "User",
    email: DEMO_ACCOUNT.email,
    password: DEMO_ACCOUNT.password,
    role: "user",
  },
  {
    id: "u_admin",
    firstName: "Admin",
    lastName: "Manager",
    email: ADMIN_ACCOUNT.email,
    password: ADMIN_ACCOUNT.password,
    role: "admin",
  },
];

export function seedMockAccounts(): void {
  for (const account of MOCK_ACCOUNTS) {
    if (findUserByEmail(account.email)) continue;
    insertUser(account);
  }
}

export async function seedDemoQueue(
  queueService: QueueService,
  serviceId: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const people = [
    {
      userId: "seed-1",
      name: "Alex Johnson",
      email: "alex.j@example.com",
      slot: "9:00 AM",
    },
    {
      userId: "seed-2",
      name: "Maria Garcia",
      email: "maria.g@example.com",
      slot: "9:30 AM",
    },
    {
      userId: "u_demo",
      name: "Demo User",
      email: DEMO_ACCOUNT.email,
      slot: "10:00 AM",
    },
    {
      userId: "seed-4",
      name: "Sarah Lee",
      email: "sarah.l@example.com",
      slot: "10:30 AM",
    },
  ];

  for (const person of people) {
    await queueService.join(person.userId, {
      serviceId,
      customerName: person.name,
      customerEmail: person.email,
      date: today,
      timeSlot: person.slot,
    });
  }
}
