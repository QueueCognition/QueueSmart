import type { Request, RequestHandler } from "express";
import type { QueueService } from "../services/queueService";
import { currentUser } from "../utils/currentUser";
import { HttpError } from "../utils/errors";
import { validateJoinQueueInput } from "../validators/queueValidators";

// With noUncheckedIndexedAccess, route params may be undefined
function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, `Missing route parameter: ${name}`);
  }
  return value;
}

export function createQueueController(queueService: QueueService) {
  // ---------- User routes ----------

  const join: RequestHandler = async (req, res) => {
    const user = currentUser(res);
    const input = validateJoinQueueInput(req.body);
    res.status(201).json(await queueService.join(user.id, input));
  };

  const leave: RequestHandler = async (req, res) => {
    const user = currentUser(res);
    res.json(await queueService.leave(routeParam(req, "entryId"), user.id));
  };

  const getMine: RequestHandler = (_req, res) => {
    res.json(queueService.listForUser(currentUser(res).id));
  };

  const getHistory: RequestHandler = (_req, res) => {
    const user = currentUser(res);
    res.json(queueService.getHistoryForUser(user.id));
  };

  const getOne: RequestHandler = (req, res) => {
    const user = currentUser(res);
    res.json(queueService.getEntry(routeParam(req, "entryId"), user.id));
  };

  const getWaitTime: RequestHandler = async (req, res) => {
    res.json(await queueService.getWaitEstimate(routeParam(req, "serviceId")));
  };

  const getBoard: RequestHandler = async (req, res) => {
    res.json(await queueService.getPublicBoard(routeParam(req, "serviceId")));
  };

  const listAdminQueues: RequestHandler = async (_req, res) => {
    res.json(await queueService.listAdminQueues());
  };

  const getAdminQueue: RequestHandler = async (req, res) => {
    res.json(await queueService.getAdminQueue(routeParam(req, "serviceId")));
  };

  const serveNext: RequestHandler = async (req, res) => {
    res.json(await queueService.serveNext(routeParam(req, "serviceId")));
  };

  return {
    join,
    leave,
    getMine,
    getHistory,
    getOne,
    getWaitTime,
    getBoard,
    listAdminQueues,
    getAdminQueue,
    serveNext,
  };
}
