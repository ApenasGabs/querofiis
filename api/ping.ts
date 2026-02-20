import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.status(200).json({
    pong: {
      status: "pongado",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      region: process.env.VERCEL_REGION,
    },
  });
}
