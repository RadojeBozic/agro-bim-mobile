import { z } from "zod";
import { listingCategories, proposedCategoryPolicy } from "../api/ads-catalog";
import municipalities from "../api/ads-municipalities.json";

export const maxPhotos = 5;
export const maxPhotoBytes = 5 * 1024 * 1024;
export const initialAdForm = {
  category: "",
  type: "",
  title: "",
  description: "",
  municipalityCode: "",
  settlement: "",
  phone: "",
  subcategory: "",
  amount: "",
  currency: "RSD",
  priceBasis: "",
  details: "",
};
export type AdForm = typeof initialAdForm;
export const photoRoom = (count: number) => Math.max(0, maxPhotos - count);
export function allowedAdTypes(category: string) {
  return Object.hasOwn(listingCategories, category)
    ? proposedCategoryPolicy[category as keyof typeof listingCategories]
    : [];
}
export function validateAd(form: AdForm) {
  const title = form.title.trim();
  const description = form.description.trim();
  const phone = form.phone.trim();
  const amount = form.amount.trim().replace(",", ".");
  const price = amount ? Number(amount) : undefined;
  if (!allowedAdTypes(form.category).some((type) => type === form.type))
    return { error: "Izaberite rubriku i odgovarajuću vrstu oglasa." } as const;
  if (!title || Array.from(title).length > 80)
    return { error: "Unesite naslov do 80 karaktera." } as const;
  if (!description || Array.from(description).length > 200)
    return { error: "Unesite opis do 200 karaktera." } as const;
  if (!municipalities.items.some((item) => item.code === form.municipalityCode))
    return { error: "Izaberite opštinu iz kataloga." } as const;
  if (!/^\+?[\d ().-]+$/.test(phone) || !/\d/.test(phone) || phone.length > 60)
    return { error: "Unesite ispravan broj telefona." } as const;
  if (
    amount &&
    (!/^\d+(?:\.\d+)?$/.test(amount) ||
      !Number.isFinite(price) ||
      !/^[A-Z]{3}$/.test(form.currency))
  )
    return { error: "Unesite ispravnu cenu i valutu." } as const;
  if (!amount && form.priceBasis.trim())
    return { error: "Unesite cenu ili uklonite jedinicu obračuna." } as const;
  const optional = {
    settlement: form.settlement.trim(),
    subcategory: form.subcategory.trim(),
    priceBasis: form.priceBasis.trim(),
  };
  if (
    optional.settlement.length > 200 ||
    optional.subcategory.length > 100 ||
    optional.priceBasis.length > 100 ||
    form.details.trim().length > 500
  )
    return { error: "Skratite opcione podatke oglasa." } as const;
  return {
    fields: {
      title,
      description,
      phone,
      category: form.category,
      type: form.type,
      municipalityCode: form.municipalityCode,
      ...(optional.settlement ? { settlement: optional.settlement } : {}),
      ...(optional.subcategory ? { subcategory: optional.subcategory } : {}),
      ...(optional.priceBasis ? { priceBasis: optional.priceBasis } : {}),
      ...(form.details.trim()
        ? { attributes: { details: form.details.trim() } }
        : {}),
      ...(price !== undefined
        ? { priceAmount: price, currency: form.currency }
        : {}),
    },
  };
}
export type AdFields = NonNullable<ReturnType<typeof validateAd>["fields"]>;
export const adReceipt = z.object({
  listingId: z.string().uuid(),
  status: z.enum(["draft", "pending_review"]),
});
export const photoReceipt = z.object({ accepted: z.literal(true) });
export type SubmissionReceipt = z.infer<typeof adReceipt>;
export type Attempt = {
  requestId: string;
  listingId?: string;
  uploaded: number;
};
export type SubmissionTransport = {
  create: (input: {
    requestId: string;
    fields: AdFields;
    photoCount: number;
  }) => Promise<SubmissionReceipt>;
  upload: (listingId: string, position: number, uri: string) => Promise<void>;
  submit: (listingId: string) => Promise<SubmissionReceipt>;
};

// The caller keeps this attempt and the exact same prepared files until confirmation.
export async function sendAd(
  transport: SubmissionTransport,
  attempt: Attempt,
  fields: AdFields,
  photos: readonly string[],
  progress: (uploaded: number) => void,
) {
  if (photos.length > maxPhotos) throw new Error("Previše fotografija.");
  if (!attempt.listingId) {
    const receipt = await transport.create({
      requestId: attempt.requestId,
      fields,
      photoCount: photos.length,
    });
    attempt.listingId = receipt.listingId;
    if (receipt.status === "pending_review") return receipt;
  }
  for (let i = attempt.uploaded; i < photos.length; i++) {
    await transport.upload(attempt.listingId, i + 1, photos[i]!);
    attempt.uploaded = i + 1;
    progress(attempt.uploaded);
  }
  const receipt = await transport.submit(attempt.listingId);
  if (
    receipt.status !== "pending_review" ||
    receipt.listingId !== attempt.listingId
  )
    throw new Error("Predaja nije potvrđena.");
  return receipt;
}
