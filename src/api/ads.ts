import { z } from "zod";

export const adId = z.string().uuid();
const common = z.object({
  id: adId,
  title: z.string(),
  category: z.string(),
  type: z.string(),
  municipalityCode: z.string(),
  municipality: z.string(),
  settlement: z.string().nullable(),
  publishedAt: z.string().nullable(),
  priceAmount: z.number().nullable(),
  currency: z.string().nullable(),
  priceBasis: z.string().nullable(),
});
export const adListSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(common.extend({ coverPhotoId: adId.nullable() })),
});
export const adDetailSchema = common.extend({
  description: z.string(),
  attributes: z.record(z.string()),
  photos: z.array(adId),
});
export type AdSummary = z.infer<typeof common>;
export const adSorts = {
  newest: "Najnoviji",
  oldest: "Najstariji",
  price_asc: "Cena: od najniže",
  price_desc: "Cena: od najviše",
} as const;
export type AdFilters = {
  q: string;
  category: string;
  type: string;
  municipality: string;
  sort: keyof typeof adSorts;
};
export const defaultAdFilters: AdFilters = {
  q: "",
  category: "",
  type: "",
  municipality: "",
  sort: "newest",
};
export function adsListPath(filters: AdFilters, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    sort: filters.sort,
  });
  for (const key of ["q", "category", "type", "municipality"] as const) {
    const value = key === "q" ? filters.q.trim().slice(0, 100) : filters[key];
    if (value) params.set(key, value);
  }
  // The shared client rejects literal ".." anywhere in a route, including search text.
  return "/ads?" + params.toString().replace(/\./g, "%2E");
}
export function nextAdsPage(page: number, total: number) {
  return page < 500 && page * 24 < total ? page + 1 : null;
}
export function adPhotoUrl(
  apiBase: string,
  listingId: string,
  photoId: string,
) {
  return new URL(
    "/api/public/oglasi-foto/" +
      adId.parse(listingId) +
      "/" +
      adId.parse(photoId),
    apiBase,
  ).href;
}
export function adPrice(ad: AdSummary) {
  if (ad.priceAmount === null || !ad.currency) return "Cena nije navedena";
  return (
    new Intl.NumberFormat("sr-Latn-RS", { maximumFractionDigits: 2 }).format(
      ad.priceAmount,
    ) +
    " " +
    ad.currency +
    (ad.priceBasis ? " / " + ad.priceBasis : "")
  );
}
