import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import {
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";
import { currentUser } from "../utils/currentUser";
import { HttpError } from "../utils/errors";
import { routeParam } from "../utils/routeParam";

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
    const notification = markNotificationAsRead(
      user.id,
      routeParam(req, "notificationId"),
    );

    if (!notification) {
      throw new HttpError(404, "Notification not found");
    }

    res.json(notification);
  });

  return router;
}
