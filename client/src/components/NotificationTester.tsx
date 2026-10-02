import { useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";


function NotificationTester() {
  const { push } = useNotifications();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey || e.repeat) return; 

      const key = e.key.toLowerCase();

      if (key === "q") {
        e.preventDefault(); 
        push({ message: "You're now #2 in line", type: "queue_update" });
      } else if (key === "e") {
        e.preventDefault();
        push({
          message: "Your status is now almost ready",
          type: "status_change",
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [push]);

  return null; 
}

export default NotificationTester;