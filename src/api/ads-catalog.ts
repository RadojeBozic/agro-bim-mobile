// Snapshot: agro-bim-next at 4a7f48c, src/lib/agro-oglasi/catalog.ts.
export const listingCategories = {
  machinery: "Poljoprivredna mehanizacija",
  livestock: "Stoka i životinje",
  produce: "Poljoprivredni proizvodi",
  seeds: "Seme i sadni materijal",
  equipment: "Poljoprivredna oprema i alati",
  property: "Zemljište i objekti",
  services: "Usluge",
  jobs: "Poslovi i radna snaga",
  forestry: "Drvo i šumski proizvodi",
  tourism: "Seoski turizam i smeštaj",
  crafts: "Domaća radinost i rukotvorine",
  other: "Ostali oglasi",
} as const;

export const listingTypes = {
  sell: "Prodajem",
  buy: "Kupujem",
  exchange: "Menjam",
  rent_out: "Dajem u zakup / Iznajmljujem",
  rent_wanted: "Tražim zakup / najam",
  service_offer: "Nudim uslugu",
  service_wanted: "Tražim uslugu",
  job_offer: "Nudim posao",
  job_wanted: "Tražim posao",
  accommodation_offer: "Nudim smeštaj",
  accommodation_wanted: "Tražim smeštaj",
} as const;

type Category = keyof typeof listingCategories;
type ListingType = keyof typeof listingTypes;
export type CategoryPolicy = Readonly<Record<Category, readonly ListingType[]>>;

const trade = ["sell", "buy", "exchange"] as const;
export const proposedCategoryPolicy: CategoryPolicy = {
  machinery: [...trade, "rent_out", "rent_wanted"],
  livestock: trade,
  produce: trade,
  seeds: trade,
  equipment: [...trade, "rent_out", "rent_wanted"],
  property: ["sell", "buy", "rent_out", "rent_wanted"],
  services: ["service_offer", "service_wanted"],
  jobs: ["job_offer", "job_wanted"],
  forestry: trade,
  tourism: [
    "accommodation_offer",
    "accommodation_wanted",
    "service_offer",
    "service_wanted",
  ],
  crafts: trade,
  other: trade,
};
