import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";

const login = vi.fn();
const push = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login,
    sessionNotice: null,
  }),
}));

vi.mock("../context/NotificationContext", () => ({
  useNotifications: () => ({ push }),
}));

async function renderLogin() {
  const { default: Login } = await import("./Login");
  return renderWithProviders(<Login />);
}

describe("Login form", () => {
  it("blocks submission and shows the original messages when empty", async () => {
    const user = userEvent.setup();
    await renderLogin();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const user = userEvent.setup();
    await renderLogin();

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Enter a valid email address"),
    ).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("marks invalid inputs and wires them to their messages", async () => {
    const user = userEvent.setup();
    await renderLogin();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "email-error");
    expect(email).toHaveClass("auth__input--invalid");
  });

  it("submits trimmed credentials", async () => {
    login.mockResolvedValue({ firstName: "Ada" });
    const user = userEvent.setup();
    await renderLogin();

    await user.type(screen.getByLabelText("Email"), "  ada@example.com  ");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(login).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "secret123",
      remember: false,
    });
    expect(push).toHaveBeenCalledWith({
      message: "Welcome back, Ada",
      type: "status_change",
    });
  });
});
