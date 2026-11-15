import type { z } from "zod";
import type { offerSchema } from "../api/contracts";

const formatAmount = (amount: number) =>
  amount.toLocaleString("sr-Latn-RS", { maximumFractionDigits: 2 });

export function homeOfferPrices(offer: z.output<typeof offerSchema>) {
  const { price, normalized, package: pack } = offer;
  const currency = price.currency?.trim();
  const prefix = price.type === "from" ? "od " : "";
  if (!currency || price.type === "on_request") return {};

  const unit = normalized.unit?.trim();
  const basisUnit = price.basisUnit?.trim();
  const unitPrice =
    normalized.amount != null && unit && normalized.state !== "not_comparable"
      ? `${prefix}${formatAmount(normalized.amount)} ${currency}/${unit}`
      : price.amount != null &&
          price.basis === "per_reference_unit" &&
          basisUnit
        ? `${prefix}${formatAmount(price.amount)} ${currency}/${basisUnit}`
        : undefined;

  const packagePrice =
    price.amount != null && price.basis === "per_package"
      ? `${prefix}${formatAmount(price.amount)} ${currency} za pakovanje${pack.label?.trim() ? " · " + pack.label : ""}`
      : undefined;

  return { unitPrice, packagePrice };
}
