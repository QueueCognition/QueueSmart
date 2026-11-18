import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../test/renderWithProviders";
import NavDropdown from "./NavDropdown";

const ITEMS = [
  { label: "First", to: "/first" },
  { label: "Second", to: "/second" },
];

describe("NavDropdown", () => {
  it("is closed until the trigger is activated", () => {
    renderWithProviders(<NavDropdown label="Menu" items={ITEMS} />);

    const trigger = screen.getByRole("button", { name: "Menu" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens on click and exposes menu semantics", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavDropdown label="Menu" items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByRole("button", { name: "Menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavDropdown label="Menu" items={ITEMS} />);

    const trigger = screen.getByRole("button", { name: "Menu" });
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("moves the active item with the arrow keys", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavDropdown label="Menu" items={ITEMS} />);

    const trigger = screen.getByRole("button", { name: "Menu" });
    await user.click(trigger);

    // headlessui tracks the highlighted item via aria-activedescendant rather
    // than moving DOM focus, so assert on that contract.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "First" })).toHaveAttribute(
      "data-headlessui-state",
      expect.stringContaining("active"),
    );

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Second" })).toHaveAttribute(
      "data-headlessui-state",
      expect.stringContaining("active"),
    );

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "First" })).toHaveAttribute(
      "data-headlessui-state",
      expect.stringContaining("active"),
    );
  });

  it("closes when clicking outside", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <div>
        <NavDropdown label="Menu" items={ITEMS} />
        <button type="button">outside</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "outside" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onSelect for action items", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(
      <NavDropdown label="Menu" items={[{ label: "Sign out", onSelect }]} />,
    );

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("renders link items with their destination", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavDropdown label="Menu" items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByRole("menuitem", { name: "First" })).toHaveAttribute(
      "href",
      "/first",
    );
  });
});
