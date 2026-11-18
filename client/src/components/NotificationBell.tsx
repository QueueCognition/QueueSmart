import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { timeAgo } from "../utils/timeUtils";
import type { Notification } from "../types/queue";

const notificationLabels: Record<Notification["type"], string> = {
  queue_update: "Queue update",
  status_change: "Status change",
};

function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { notifications, markRead, markAllRead } = useNotifications();

  if (!isAuthenticated) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notif-slot">
      <Menu as="div" className="notif-wrapper">
        <MenuButton
          as="button"
          type="button"
          className="navbar-link notif-bell"
          aria-label="Notifications"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount}</span>
          )}
        </MenuButton>

        <MenuItems as="div" className="notif-menu" modal={false}>
          <div className="notif-menu-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <MenuItem
                as="button"
                type="button"
                className="notif-mark-all"
                onClick={markAllRead}
              >
                Mark all as read
              </MenuItem>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="notif-empty">You're all caught up.</p>
          ) : (
            <ul className="notif-list">
              {notifications.slice(0, 5).map((n) => (
                <MenuItem
                  key={n.id}
                  as="li"
                  className={`notif-item ${n.read ? "notif-item--read" : ""}`}
                  onClick={() => markRead(n.id)}
                >
                  <span className="notif-dot-slot">
                    {!n.read && <span className="notif-dot" />}
                  </span>
                  <div className="notif-content">
                    <span className="notif-title">
                      {notificationLabels[n.type]}
                    </span>
                    <span className="notif-message">{n.message}</span>
                    <span className="notif-time">{timeAgo(n.timestamp)}</span>
                  </div>
                </MenuItem>
              ))}
            </ul>
          )}

          <MenuItem as={Link} to="/dashboard" className="notif-view-all">
            View all
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );
}

export default NotificationBell;
