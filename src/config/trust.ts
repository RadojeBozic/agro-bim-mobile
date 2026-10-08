import { safePublicUrl } from "../content";
export type TrustKey = "privacy" | "deletion" | "terms" | "support";
export type TrustDestinations = Record<TrustKey, string | null>;
/** Source: agro-bim-next CallToAction.tsx (Section id="kontakt").
 * Privacy/terms in site.ts point to contact placeholders, not policies.
 * No public deletion-request page was found. Keep unverified destinations absent.
 */
export const trustDestinations: TrustDestinations = {
  privacy: null,
  deletion: null,
  terms: null,
  support: "https://agrobim.digital/#kontakt",
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
