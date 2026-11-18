import type { Request, Response } from "express";
import { ServiceService } from "../services/serviceService";
import { HttpError, ValidationError } from "../utils/errors";
import { routeParam } from "../utils/routeParam";

const INVALID_ID = "Service ID must be a positive integer.";

export function createServiceController(serviceService: ServiceService) {
  function readServiceId(req: Request): string {
    const id = routeParam(req, "id");

    if (!/^\d+$/.test(id) || Number(id) <= 0) {
      throw new ValidationError({ id: INVALID_ID }, INVALID_ID);
    }

    return id;
  }

  function listServices(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: serviceService.listServices(),
    });
  }

  function createService(req: Request, res: Response): void {
    const service = serviceService.createService(req.body);

    res.status(201).json({ success: true, data: service });
  }

  function updateService(req: Request, res: Response): void {
    const service = serviceService.updateService(readServiceId(req), req.body);

    if (!service) {
      throw new HttpError(404, "Service not found.");
    }

    res.status(200).json({ success: true, data: service });
  }

  function setServiceAvailability(req: Request, res: Response): void {
    const body = req.body as { isAvailable?: unknown } | null;
    const isAvailable = body?.isAvailable;

    if (typeof isAvailable !== "boolean") {
      throw new ValidationError(
        { isAvailable: "isAvailable must be a boolean." },
        "isAvailable must be a boolean.",
      );
    }

    const service = serviceService.setAvailability(
      readServiceId(req),
      isAvailable,
    );

    if (!service) {
      throw new HttpError(404, "Service not found.");
    }

    res.status(200).json({ success: true, data: service });
  }

  function removeService(req: Request, res: Response): void {
    const removed = serviceService.removeService(readServiceId(req));

    if (!removed) {
      throw new HttpError(404, "Service not found.");
    }

    res.status(200).json({
      success: true,
      data: { message: "Service deleted successfully." },
    });
  }

  return {
    listServices,
    createService,
    updateService,
    setServiceAvailability,
    removeService,
  };
}
