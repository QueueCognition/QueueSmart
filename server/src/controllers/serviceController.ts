import type { Request, Response } from "express";
import { ServiceService } from "../services/serviceService";

const INVALID_ID = "Service ID must be a positive integer.";

export function createServiceController(serviceService: ServiceService) {
  function fail(res: Response, status: number, errors: string[]): void {
    res.status(status).json({ success: false, errors });
  }

  function readServiceId(req: Request, res: Response): number | null {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      fail(res, 400, [INVALID_ID]);
      return null;
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
    try {
      const service = serviceService.createService(req.body);

      res.status(201).json({
        success: true,
        data: service,
      });
    } catch (error: unknown) {
      fail(res, 400, [
        error instanceof Error ? error.message : "Invalid service input.",
      ]);
    }
  }

  function updateService(req: Request, res: Response): void {
    const id = readServiceId(req, res);
    if (id === null) return;

    try {
      const service = serviceService.updateService(id, req.body);

      if (!service) {
        fail(res, 404, ["Service not found."]);
        return;
      }

      res.status(200).json({
        success: true,
        data: service,
      });
    } catch (error: unknown) {
      fail(res, 400, [
        error instanceof Error ? error.message : "Invalid service input.",
      ]);
    }
  }

  function setServiceAvailability(req: Request, res: Response): void {
    const id = readServiceId(req, res);
    if (id === null) return;

    const body = req.body as { isAvailable?: unknown } | null;
    const isAvailable = body?.isAvailable;

    if (typeof isAvailable !== "boolean") {
      fail(res, 400, ["isAvailable must be a boolean."]);
      return;
    }

    const service = serviceService.setAvailability(id, isAvailable);

    if (!service) {
      fail(res, 404, ["Service not found."]);
      return;
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  }

  function removeService(req: Request, res: Response): void {
    const id = readServiceId(req, res);
    if (id === null) return;

    const removed = serviceService.removeService(id);

    if (!removed) {
      fail(res, 404, ["Service not found."]);
      return;
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
