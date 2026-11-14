import { z } from "zod";

// Snapshot of municipalitySuggestions in the web repository (src/content/domain.ts).
export const weatherLocation = z.enum([
  "Beograd",
  "Novi Sad",
  "Subotica",
  "Zrenjanin",
  "Sombor",
  "Kikinda",
  "Pančevo",
  "Sremska Mitrovica",
  "Šabac",
  "Valjevo",
  "Kragujevac",
  "Topola",
  "Aranđelovac",
  "Jagodina",
  "Kruševac",
  "Kraljevo",
  "Čačak",
  "Užice",
  "Niš",
  "Leskovac",
  "Vranje",
  "Zaječar",
]);
export type WeatherLocation = z.infer<typeof weatherLocation>;

const number = z.number().finite();
const condition = z.object({ code: z.number().int(), text: z.string().min(1) });
export const weatherSchema = z.object({
  location: weatherLocation,
  updatedAt: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  stale: z.boolean(),
  source: z.object({
    name: z.literal("WeatherAPI.com"),
    url: z.literal("https://www.weatherapi.com/"),
  }),
  current: z.object({
    condition,
    temperatureC: number,
    precipitationMm: number,
    windKph: number,
  }),
  forecast: z
    .array(
      z.object({
        date: z.string().date(),
        condition,
        minTemperatureC: number,
        maxTemperatureC: number,
        precipitationMm: number,
        rainChancePercent: number.min(0).max(100),
        maxWindKph: number,
      }),
    )
    .length(3),
});

export function weatherPath(location: WeatherLocation) {
  return "/weather?location=" + encodeURIComponent(location);
}
