import type { Href } from "expo-router";
import { targetSchema } from "./api/contracts";
import { targetHref } from "./navigation";

export function safePublicUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value));
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export type ContentItem = {
  id?: string;
  key?: string;
  title?: string;
  name?: string;
  productName?: string;
  shortBody?: string | null;
  target?: unknown;
  attribution?: { publicUrl?: string | null };
};
export function contentHref(item: ContentItem, signed: boolean): Href | null {
  const parsed = targetSchema.safeParse(item.target);
  if (!parsed.success) return null;
  if (parsed.data.type === "feed_item" && !signed) {
    return item.key && item.shortBody
      ? { pathname: "/home/information/[key]", params: { key: item.key } }
      : null;
  }
  return targetHref(parsed.data);
}
export const labels: Record<string, string> = {
  unknown: "Nije navedeno",
  planned: "Planirano",
  open: "Otvoreno",
  closed: "Zatvoreno",
  archived: "Arhivirano",
  upcoming: "U najavi",
  ongoing: "U toku",
  grant: "Bespovratna sredstva",
  subsidy: "Subvencija",
  subsidized_loan: "Subvencionisani kredit",
  commercial_loan: "Komercijalni kredit",
  development_fund_loan: "Kredit razvojnog fonda",
  guaranteed_loan: "Kredit uz garanciju",
  leasing: "Lizing",
  credit_line: "Kreditna linija",
  working_capital: "Obrtna sredstva",
  bridge_financing: "Premošćavanje finansiranja",
  co_financing: "Sufinansiranje",
  combined_financing: "Kombinovano finansiranje",
  other: "Ostalo",
  registered: "Registrovano",
  in_progress: "Registracija u toku",
  not_registered: "Neregistrovano",
  active: "Aktivno",
  inactive: "Neaktivno",
  none: "Bez organskog statusa",
  in_conversion: "U konverziji",
  certified: "Sertifikovano",
  registered_agricultural_holding: "Registrovano poljoprivredno gazdinstvo",
  entrepreneur: "Preduzetnik",
  company: "Privredno društvo",
  cooperative: "Zadruga",
  other_legal_entity: "Drugo pravno lice",
  individual: "Fizičko lice",
  crop_farming: "Ratarstvo",
  vegetables: "Povrtarstvo",
  fruit: "Voćarstvo",
  viticulture: "Vinogradarstvo",
  livestock: "Stočarstvo",
  dairy: "Mlekarstvo",
  poultry: "Živinarstvo",
  beekeeping: "Pčelarstvo",
  greenhouse: "Plastenička proizvodnja",
  organic: "Organska proizvodnja",
  processing: "Prerada",
  mixed: "Mešovita proizvodnja",
  machinery: "Mehanizacija",
  equipment: "Oprema",
  agricultural_land: "Poljoprivredno zemljište",
  inputs: "Repromaterijal",
  irrigation: "Navodnjavanje",
  agricultural_buildings: "Poljoprivredni objekti",
  perennial_crops: "Višegodišnji zasadi",
  storage: "Skladištenje",
  land_purchase: "Kupovina zemljišta",
  seed: "Seme",
  fertilizer: "Đubrivo",
  plant_protection: "Zaštita bilja",
  livestock_purchase: "Kupovina stoke",
  breeding_livestock: "Priplodna grla",
  farm_machinery: "Poljoprivredna mehanizacija",
  wells: "Bunari",
  greenhouses: "Plastenici",
  orchards: "Voćnjaci",
  vineyards: "Vinogradi",
  anti_hail_systems: "Protivgradni sistemi",
  silos: "Silosi",
  cold_storage: "Hladnjače",
  farm_buildings: "Objekti gazdinstva",
  renewable_energy: "Obnovljiva energija",
  digitalization: "Digitalizacija",
  organic_production: "Organska proizvodnja",
  land_owned: "Sopstveno zemljište",
  land_leased: "Zakupljeno zemljište",
  land_cultivated: "Obrađeno zemljište",
  crop_area: "Površina pod usevom",
  greenhouse_area: "Površina plastenika",
  machinery_summary: "Mehanizacija",
  within_3_months: "U naredna 3 meseca",
  within_6_months: "U narednih 6 meseci",
  within_12_months: "U narednih 12 meseci",
  later: "Kasnije",
  in_stock: "Na stanju",
  out_of_stock: "Nije na stanju",
  preorder: "Pretporudžbina",
  on_request: "Na upit",
  included: "PDV uključen",
  excluded: "Bez PDV-a",
  exempt: "Oslobođeno PDV-a",
  fresh: "Aktuelno",
  stale: "Potrebna provera aktuelnosti",
  fixed: "Fiksna cena",
  from: "Cena od",
  tiered: "Cena zavisi od količine",
  per_package: "Po pakovanju",
  per_reference_unit: "Po referentnoj jedinici",
  per_pallet: "Po paleti",
};
export const label = (value: string | null | undefined) =>
  value ? (labels[value] ?? "Nije navedeno") : null;
export const dateLabel = (value: string | null) =>
  value
    ? new Date(
        value.length === 10 ? value + "T12:00:00" : value,
      ).toLocaleDateString("sr-Latn-RS")
    : null;
