import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { getNotificationsForUser } from "../services/notificationService";
import { currentUser } from "../utils/currentUser";

export function createNotificationRoutes() {
  const router = Router();

  router.get("/", requireAuth, (_req, res) => {
    const user = currentUser(res);
    const notifications = getNotificationsForUser(user.id);

    res.json(notifications);
  });

  return router;
}
