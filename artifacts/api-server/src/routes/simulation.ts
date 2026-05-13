import { Router, type IRouter, type Request, type Response } from "express";
import { RunSimulationBody, RunSimulationResponse, FindOptimalTiltBody, FindOptimalTiltResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SOLAR_SIM_URL = process.env.SOLAR_SIM_URL ?? "http://localhost:5001";

async function proxyToSim(path: string, body: unknown): Promise<Response | unknown> {
  const url = `${SOLAR_SIM_URL}${path}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp;
}

router.post("/simulate", async (req, res): Promise<void> => {
  const parsed = RunSimulationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const simResp = await fetch(`${SOLAR_SIM_URL}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!simResp.ok) {
      const errData = await simResp.json().catch(() => ({ error: "Simulation failed" }));
      req.log.error({ status: simResp.status, errData }, "Simulation service error");
      res.status(simResp.status).json(errData);
      return;
    }

    const data = await simResp.json();
    const validated = RunSimulationResponse.safeParse(data);
    if (!validated.success) {
      req.log.error({ error: validated.error.message }, "Simulation response validation failed");
      res.status(500).json({ error: "Invalid simulation response" });
      return;
    }

    res.json(validated.data);
  } catch (err) {
    req.log.error({ err }, "Failed to reach simulation service");
    res.status(503).json({ error: "Simulation service unavailable. Ensure the Python service is running." });
  }
});

router.post("/simulate/optimal-tilt", async (req, res): Promise<void> => {
  const parsed = FindOptimalTiltBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const simResp = await fetch(`${SOLAR_SIM_URL}/simulate/optimal-tilt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    if (!simResp.ok) {
      const errData = await simResp.json().catch(() => ({ error: "Simulation failed" }));
      req.log.error({ status: simResp.status, errData }, "Simulation service error");
      res.status(simResp.status).json(errData);
      return;
    }

    const data = await simResp.json();
    const validated = FindOptimalTiltResponse.safeParse(data);
    if (!validated.success) {
      req.log.error({ error: validated.error.message }, "Optimal tilt response validation failed");
      res.status(500).json({ error: "Invalid simulation response" });
      return;
    }

    res.json(validated.data);
  } catch (err) {
    req.log.error({ err }, "Failed to reach simulation service");
    res.status(503).json({ error: "Simulation service unavailable. Ensure the Python service is running." });
  }
});

export default router;
