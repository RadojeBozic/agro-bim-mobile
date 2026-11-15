import { expect, it } from "vitest";
import type { z } from "zod";
import type { offerSchema } from "../src/api/contracts";
import { homeOfferPrices } from "../src/screens/home-offer-prices";

const offer = {
  price: { amount: 4970, currency: "RSD", type: "fixed", basis: "per_package" },
  normalized: { amount: 198.8, unit: "kg", state: "comparable" },
  package: { label: "25 kg" },
} as z.output<typeof offerSchema>;

it("keeps the normalized and total package prices distinct", () => {
  expect(homeOfferPrices(offer)).toEqual({
    unitPrice: "198,8 RSD/kg",
    packagePrice: "4.970 RSD za pakovanje · 25 kg",
  });
});

it("uses an explicit reference unit and preserves a starting price", () => {
  expect(
    homeOfferPrices({
      ...offer,
      price: {
        ...offer.price,
        amount: 12,
        currency: "EUR",
        basis: "per_reference_unit",
        basisUnit: "l",
        type: "from",
      },
      normalized: { ...offer.normalized, amount: null, unit: null },
    }),
  ).toEqual({ unitPrice: "od 12 EUR/l", packagePrice: undefined });
});

it("omits incomplete and on-request prices", () => {
  expect(
    homeOfferPrices({ ...offer, price: { ...offer.price, currency: null } }),
  ).toEqual({});
  expect(
    homeOfferPrices({
      ...offer,
      price: { ...offer.price, type: "on_request" },
    }),
  ).toEqual({});
  expect(
    homeOfferPrices({
      ...offer,
      price: { ...offer.price, amount: null },
      normalized: { ...offer.normalized, amount: null, unit: null },
    }),
  ).toEqual({ unitPrice: undefined, packagePrice: undefined });
});
