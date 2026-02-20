import type { VercelRequest, VercelResponse } from "@vercel/node";
import { openapiSpec } from "./_lib/openapi-spec.js";

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json(openapiSpec);
}
