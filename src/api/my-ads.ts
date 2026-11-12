import { z } from "zod";
import { adId } from "./ads";
import type { AdForm, AdFields } from "../ads/submission";

const status = z.enum([
  "draft",
  "active",
  "expired",
  "withdrawn",
  "completed",
  "suspended",
]);
const review = z.enum([
  "draft",
  "pending_review",
  "changes_requested",
  "rejected",
  "approved",
]);
const action = z.enum(["edit", "withdraw", "complete", "renew"]);
export type OwnerAction = z.infer<typeof action>;
const base = z.object({
  id: adId,
  status,
  expiresAt: z.string().nullable(),
  hasPendingReview: z.boolean(),
  actions: z.array(action),
  title: z.string().nullable(),
  category: z.string().nullable(),
});
export const myAdsSchema = z.object({
  items: z.array(base.extend({ firstPublishedAt: z.string().nullable() })),
  pagination: z.object({
    nextOffset: z.number().int().nonnegative().nullable(),
  }),
});
const photos = z.array(z.object({ id: adId }));
export const myAdSchema = base.extend({
  publishedAt: z.string().nullable(),
  description: z.string().nullable(),
  approvedVersionId: adId.nullable(),
  pendingVersionId: adId.nullable(),
  versions: z.array(
    z.object({
      id: adId,
      reviewStatus: review,
      reason: z.string().nullable(),
      photos,
    }),
  ),
});
const fieldsSchema = z.object({
  title: z.string(),
  description: z.string(),
  phone: z.string(),
  category: z.string(),
  type: z.string(),
  municipalityCode: z.string(),
  settlement: z.string().optional(),
  subcategory: z.string().optional(),
  email: z.string().optional(),
  priceAmount: z.number().optional(),
  currency: z.string().optional(),
  priceBasis: z.string().optional(),
  attributes: z.record(z.string()).optional(),
});
export const myEditSchema = z.object({
  id: adId,
  expectedVersionId: adId.nullable(),
  fields: fieldsSchema,
  photos,
});
export const ownerOk = z.object({ ok: z.literal(true) });
export const renewed = z.object({
  id: adId,
  expiresAt: z.string(),
  replayed: z.boolean(),
});
export type MyAd = z.infer<typeof base>;
export type MyEdit = z.infer<typeof myEditSchema>;

export const ownerAdsKey = (owner: string) =>
  ["private", owner, "my-ads"] as const;
export const ownerAdsPath = (id: string) => "/me/ads/" + adId.parse(id);

export function editForm(fields: MyEdit["fields"]): AdForm {
  return {
    title: fields.title,
    description: fields.description,
    phone: fields.phone,
    category: fields.category,
    type: fields.type,
    municipalityCode: fields.municipalityCode,
    settlement: fields.settlement ?? "",
    subcategory: fields.subcategory ?? "",
    amount: fields.priceAmount?.toString() ?? "",
    currency: fields.currency ?? "RSD",
    priceBasis: fields.priceBasis ?? "",
    details: fields.attributes?.details ?? "",
  };
}
export const editRequestLimit = 32768;
export function editBody(
  edit: MyEdit,
  fields: AdFields,
  keepPhotoIds: string[],
) {
  if (
    keepPhotoIds.length > 5 ||
    new Set(keepPhotoIds).size !== keepPhotoIds.length ||
    keepPhotoIds.some((id) => !edit.photos.some((photo) => photo.id === id))
  )
    throw new Error("Proverite izbor fotografija.");
  const attributes = { ...edit.fields.attributes };
  delete attributes.details;
  Object.assign(attributes, fields.attributes);
  const body = {
    expectedVersionId: edit.expectedVersionId,
    fields: {
      ...fields,
      ...(edit.fields.email ? { email: edit.fields.email } : {}),
      attributes,
    },
    keepPhotoIds,
    photos: [] as [],
  };
  let size = 0;
  for (const char of JSON.stringify(body)) {
    const point = char.codePointAt(0)!;
    size += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  if (size > editRequestLimit)
    throw new Error(
      "Izmena je prevelika za bezbedno slanje. Skratite podatke i pokušajte ponovo.",
    );
  return body;
}
