import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Link } from "react-router-dom";

type NavDropdownItem = { label: string } & (
  { to: string } | { onSelect: () => void }
);

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
  alignRight?: boolean;
}

function NavDropdown({ label, items, alignRight = false }: NavDropdownProps) {
  return (
    <Menu
      as="div"
      className={
        alignRight
          ? "navbar-dropdown navbar-dropdown--right"
          : "navbar-dropdown"
      }
    >
      <MenuButton
        as="button"
        type="button"
        className="navbar-link navbar-dropdown-trigger"
      >
        {label}
      </MenuButton>

      <MenuItems as="div" className="navbar-dropdown-menu" modal={false}>
        {items.map((item) =>
          "to" in item ? (
            <MenuItem
              key={item.label}
              as={Link}
              to={item.to}
              className="navbar-dropdown-item"
            >
              {item.label}
            </MenuItem>
          ) : (
            <MenuItem
              key={item.label}
              as="button"
              type="button"
              className="navbar-dropdown-item navbar-dropdown-button"
              onClick={() => item.onSelect()}
            >
              {item.label}
            </MenuItem>
          ),
        )}
      </MenuItems>
    </Menu>
  );
}

export default NavDropdown;
