import { z } from "zod";
import { attributionSchema, page, paginationSchema } from "./contracts";
export const stipsCodeSchema = z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/);
export const stipsQuerySchema = paginationSchema
  .extend({
    q: z.string().trim().max(120).optional(),
    category: z
      .enum([
        "fruit",
        "vegetable",
        "livestock",
        "grain",
        "feed",
        "eggs",
        "meat",
        "dairy",
        "input",
        "other",
      ])
      .optional(),
  })
  .strict();
export const stipsDetailQuerySchema = paginationSchema
  .extend({
    q: z.string().trim().max(120).optional(),
  })
  .strict();
const nullableText = z.string().max(2000).nullable();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();
const price = z.number().finite().nullable();
export const stipsObservationSchema = z.object({
  id: z.string().uuid(),
  location: z.string(),
  locationDetail: nullableText,
  locationKind: nullableText,
  marketType: z.string(),
  priceRole: z.string(),
  minimum: price,
  dominant: price,
  maximum: price,
  single: price,
  currency: z.string(),
  unit: z.string(),
  variety: nullableText,
  quality: nullableText,
  attributes: z.record(z.string()),
  periodFrom: date,
  periodTo: date,
  bulletinNumber: z.number().int().nullable(),
  reportYear: z.number().int().nullable(),
  freshness: z.enum(["fresh", "stale", "unknown"]),
  attribution: attributionSchema,
});
export const stipsProductSchema = z.object({
  code: stipsCodeSchema,
  name: z.string(),
  category: z.string(),
  periodFrom: date,
  periodTo: date,
  observationCount: z.number().int(),
  sample: stipsObservationSchema.nullable(),
});
export const stipsDetailSchema = page(stipsObservationSchema).extend({
  product: stipsProductSchema,
  matchingCount: z.number().int(),
});
