import { Router } from "express";
import { ServiceService } from "../services/serviceService";
import { createServiceController } from "../controllers/serviceController";
import { requireAuth } from "../middleware/requireAuth";
import { requireStaff } from "../middleware/requireStaff";

export function createServiceRoutes(serviceService: ServiceService) {
  const router = Router();
  const controller = createServiceController(serviceService);

  router.get("/", controller.listServices);

  router.post(
    "/",
    requireAuth,
    requireStaff,
    controller.createService
  );

  router.put(
    "/:id",
    requireAuth,
    requireStaff,
    controller.updateService
  );

  router.patch(
    "/:id/availability",
    requireAuth,
    requireStaff,
    controller.setServiceAvailability
  );

  router.delete(
    "/:id",
    requireAuth,
    requireStaff,
    controller.removeService
  );

  return router;
}