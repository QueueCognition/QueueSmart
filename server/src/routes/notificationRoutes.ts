import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { getNotificationsForUser, markNotificationAsRead, markAllNotificationsAsRead } from "../services/notificationService";
import { currentUser } from "../utils/currentUser";

export function createNotificationRoutes() {
  const router = Router();

  router.get("/", requireAuth, (_req, res) => {
    const user = currentUser(res);
    const notifications = getNotificationsForUser(user.id);

    res.json(notifications);
  });


  router.patch("/read", requireAuth, (_req, res) => {
    const user = currentUser(res);

    markAllNotificationsAsRead(user.id);

    res.status(204).send();
  });

  router.patch("/:notificationId/read", requireAuth, (req, res) => {
    const user = currentUser(res);

    const notificationId = req.params.notificationId;

    if (typeof notificationId !== "string") {
    res.status(400).json({ message: "Invalid notification ID" });
    return;
    }

    const notification = markNotificationAsRead(
    user.id,
    notificationId
    );
    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    res.json(notification);
  });


  return router;
}
