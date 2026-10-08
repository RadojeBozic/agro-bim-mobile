import { safePublicUrl } from "../content";
export type TrustKey = "privacy" | "deletion" | "terms" | "support";
export type TrustDestinations = Record<TrustKey, string | null>;
/** Official public destinations supplied in AGRO-MOB-002C1, verified without login. */
export const trustDestinations: TrustDestinations = {
  privacy: "https://agrobim.digital/politika-privatnosti",
  terms: "https://agrobim.digital/uslovi-koriscenja",
  deletion: "https://agrobim.digital/brisanje-naloga",
  support: "https://agrobim.digital/podrska",
};
const officialOrigins = ["https://agrobim.digital", "https://agro-bim.com"];
export function availableTrustLinks(destinations: TrustDestinations) {
  return (Object.keys(destinations) as TrustKey[]).flatMap((key) => {
    const safe = safePublicUrl(destinations[key]);
    if (!safe) return [];
    const url = new URL(safe);
    if (!officialOrigins.includes(url.origin)) return [];
    // A homepage/contact anchor is not a published legal page.
    if (key !== "support" && (url.pathname === "/" || url.hash === "#kontakt"))
      return [];
    return [{ key, url: safe }];
  });
}
