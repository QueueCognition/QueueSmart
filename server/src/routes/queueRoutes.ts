import { Router } from "express";
import { createQueueController } from "../controllers/queueController";
import { requireAuth } from "../middleware/requireAuth";
import { requireStaff } from "../middleware/requireStaff";
import type { QueueService } from "../services/queueService";

export function createQueueRoutes(queueService: QueueService) {
  const router = Router();
  const controller = createQueueController(queueService);

  router.get("/wait-time/:serviceId", controller.getWaitTime);
  router.get("/board/:serviceId", controller.getBoard);

  router.post("/join", requireAuth, controller.join);
  router.get("/mine", requireAuth, controller.getMine);
  router.get("/history", requireAuth, controller.getHistory);
  router.get("/:entryId", requireAuth, controller.getOne);
  router.delete("/:entryId", requireAuth, controller.leave);

  return router;
}

export function createAdminQueueRoutes(queueService: QueueService) {
  const router = Router();
  const controller = createQueueController(queueService);

  router.use(requireAuth, requireStaff);

  router.get("/", controller.listAdminQueues);
  router.get("/:serviceId", controller.getAdminQueue);
  router.post("/:serviceId/serve-next", controller.serveNext);

  return router;
}