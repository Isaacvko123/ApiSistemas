import type { Request, Response } from "express";

type ListMeta = Record<string, unknown>;

export function respondList<T>(
  req: Request,
  res: Response,
  items: T[],
  meta: ListMeta,
) {
  const includeMeta =
    req.query.meta === "1" || req.query.meta === "true";

  if (!includeMeta) {
    return res.status(200).json(items);
  }

  return res.status(200).json({
    data: items,
    meta,
  });
}
