import { z } from "zod";
import { stipsObservationSchema } from "./api/stips-contracts";
export type StipsObservation = z.output<typeof stipsObservationSchema>;
const labels: Record<string, string> = {
  fruit: "Voće",
  vegetable: "Povrće",
  livestock: "Stoka",
  grain: "Žitarice",
  feed: "Stočna hrana",
  eggs: "Jaja",
  meat: "Pileće meso",
  dairy: "Mleko i mlečni proizvodi",
  input: "Inputi",
  other: "Ostalo",
  zelena_pijaca: "Zelena pijaca",
  kvantaska_pijaca: "Kvantaška pijaca",
  stocna_pijaca: "Stočna pijaca",
  klanica: "Klanica (otkup)",
  gazdinstvo: "Gazdinstvo",
  pijaca: "Pijaca",
  otkup: "Otkup",
  prodaja: "Prodaja",
  maloprodaja: "Maloprodaja",
  silos: "Silos (otkup)",
  minimum: "Najniža cena",
  maximum: "Najviša cena",
  dominant: "Dominantna cena",
  single: "Cena",
  unknown: "Nije utvrđeno",
  pakovanje: "Pakovanje",
  tezina: "Težina",
  rasa: "Rasa",
  oblik: "Vrsta",
};
export const stipsLabel = (v: string) => labels[v] ?? v;
export const locationLabel = (o: StipsObservation) =>
  [o.location, o.locationDetail].filter(Boolean).join(" — ") +
  (o.locationKind === "district" ? " (okrug)" : "");
export const priceLabel = (v: number | null, o: StipsObservation) =>
  v == null
    ? null
    : v.toLocaleString("sr-Latn-RS", { maximumFractionDigits: 2 }) +
      " " +
      o.currency +
      "/" +
      o.unit;
export function samplePrice(o: StipsObservation) {
  if (o.dominant != null)
    return "Dominantna cena: " + priceLabel(o.dominant, o);
  if (o.single != null)
    return (
      stipsLabel(o.priceRole === "dominant" ? "dominant" : "single") +
      ": " +
      priceLabel(o.single, o)
    );
  return null;
}
