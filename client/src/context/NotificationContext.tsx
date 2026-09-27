const NotificationContext = createContext(...);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const push = (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => { ... };
  return <NotificationContext.Provider value={{ notifications, push }}>{children}</NotificationContext.Provider>;
}