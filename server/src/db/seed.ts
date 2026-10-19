import {
  ADMIN_ACCOUNT,
  DEMO_ACCOUNT,
  findUserByEmail,
  insertUser,
  type NewUser,
} from "../models/userStore";

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
