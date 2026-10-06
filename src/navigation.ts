import { z } from "zod";
import type { Href } from "expo-router";
import { targetSchema } from "./api/contracts";
export const primaryTabs = [
  "home",
  "farm",
  "programmes",
  "cenoteka",
  "more",
] as const;
export function targetHref(input: unknown): Href {
  const target: z.output<typeof targetSchema> = targetSchema.parse(input);
  switch (target.type) {
    case "programme":
      return { pathname: "/programmes/[id]", params: { id: target.id } };
    case "cenoteka_product":
      return { pathname: "/cenoteka/[id]", params: { id: target.id } };
    case "cenoteka_offer":
      return { pathname: "/cenoteka/[id]", params: { id: target.productId } };
    case "financing_product":
      return { pathname: "/more/financing/[id]", params: { id: target.id } };
    case "market":
      return "/more/market";
    case "feed_item":
      return { pathname: "/farm/feed/[key]", params: { key: target.key } };
  }
}
