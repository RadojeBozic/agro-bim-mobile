/** Portable /api/v1 contracts. No database, browser or server imports. */
import { z } from "zod";

export const API_VERSION = "1" as const;
export const idSchema = z.string().uuid();
const text = z.string().max(2000);
const nullableText = text.nullable();
const timestamp = z.string().datetime({ offset: true }).nullable();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();
const number = z.number().finite().nullable();
export const knownEnum = <T extends readonly [string, ...string[]]>(
  values: T,
) =>
  z
    .string()
    .transform((v) => (values.includes(v) ? (v as T[number]) : "unknown"));
const classification = knownEnum([
  "potential_match",
  "needs_review",
  "known_mismatch",
  "insufficient_data",
]);
export const targetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("programme"), id: idSchema }),
  z.object({ type: z.literal("cenoteka_product"), id: idSchema }),
  z.object({
    type: z.literal("cenoteka_offer"),
    id: idSchema,
    productId: idSchema,
  }),
  z.object({ type: z.literal("financing_product"), id: idSchema }),
  z.object({
    type: z.literal("market"),
    source: z.enum(["exchange", "stips", "all"]),
  }),
  z.object({ type: z.literal("feed_item"), key: text }),
]);
export const attributionSchema = z.object({
  name: nullableText,
  publicUrl: nullableText,
  publishedAt: timestamp,
  checkedAt: timestamp,
  verifiedAt: timestamp,
  validUntil: date,
});
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});
export const listQuerySchema = paginationSchema
  .extend({
    q: z.string().trim().max(120).optional(),
    category: z
      .string()
      .regex(/^[a-zA-Z0-9_.-]{1,80}$/)
      .optional(),
  })
  .strict();
export const feedQuerySchema = paginationSchema
  .extend({
    topic: z
      .enum([
        "subsidy",
        "deadline",
        "financing",
        "market",
        "investment",
        "scenario",
        "cenoteka",
      ])
      .optional(),
    state: z.enum(["unread", "read", "dismissed"]).optional(),
  })
  .strict();
export const comparisonQuerySchema = z
  .object({
    ids: z
      .string()
      .transform((v) => v.split(","))
      .pipe(z.array(idSchema).min(2).max(3))
      .refine((v) => new Set(v).size === v.length),
  })
  .strict();
const activities = [
  "crop_farming",
  "vegetables",
  "fruit",
  "viticulture",
  "livestock",
  "dairy",
  "poultry",
  "beekeeping",
  "greenhouse",
  "organic",
  "processing",
  "mixed",
  "other",
] as const;
const applicants = [
  "registered_agricultural_holding",
  "entrepreneur",
  "company",
  "cooperative",
  "other_legal_entity",
  "individual",
] as const;
const purposes = [
  "machinery",
  "equipment",
  "agricultural_land",
  "working_capital",
  "inputs",
  "livestock",
  "irrigation",
  "agricultural_buildings",
  "processing",
  "perennial_crops",
  "storage",
  "beekeeping",
  "greenhouse",
  "other",
  "land_purchase",
  "seed",
  "fertilizer",
  "plant_protection",
  "livestock_purchase",
  "breeding_livestock",
  "farm_machinery",
  "wells",
  "greenhouses",
  "orchards",
  "vineyards",
  "anti_hail_systems",
  "silos",
  "cold_storage",
  "farm_buildings",
  "renewable_energy",
  "digitalization",
  "organic_production",
] as const;
export const capacitySchema = z
  .object({
    type: z.enum([
      "land_owned",
      "land_leased",
      "land_cultivated",
      "crop_area",
      "livestock",
      "greenhouse_area",
      "storage",
      "cold_storage",
      "processing",
    ]),
    category: z.string().max(80).nullable(),
    quantity: z.number().finite().min(0).max(1e10).nullable(),
    unit: z.enum(["ha", "m2", "head", "t", "t_day"]),
  })
  .strict()
  .superRefine((v, c) => {
    const unit: Record<string, string> = {
      land_owned: "ha",
      land_leased: "ha",
      land_cultivated: "ha",
      crop_area: "ha",
      livestock: "head",
      greenhouse_area: "m2",
      storage: "t",
      cold_storage: "t",
      processing: "t_day",
    };
    if (unit[v.type] !== v.unit)
      c.addIssue({
        code: "custom",
        message: "Invalid capacity unit",
        path: ["unit"],
      });
  });
const basicFields = {
  displayName: z.string().trim().max(160).nullable(),
  registrationStatus: z.enum([
    "registered",
    "in_progress",
    "not_registered",
    "unknown",
  ]),
  registrationNumber: z.string().trim().max(80).nullable(),
  applicantType: z.enum(applicants).nullable(),
  legalForm: z.string().max(80).nullable(),
  region: z
    .enum([
      "AP Vojvodina",
      "Beograd",
      "Šumadija i Zapadna Srbija",
      "Južna i Istočna Srbija",
    ])
    .nullable(),
  municipality: z.string().trim().max(120).nullable(),
  settlement: z.string().trim().max(120).nullable(),
  holderBirthYear: z.number().int().min(1900).max(2100).nullable(),
  operationalStatus: z.enum(["active", "inactive", "unknown"]),
  organicStatus: z.enum(["none", "in_conversion", "certified", "unknown"]),
  vatRegistered: z.boolean().nullable(),
};
export const intentSchema = z
  .object({
    title: z.string().trim().max(160).nullable(),
    purpose: z.enum(purposes).nullable(),
    targetTimeframe: z
      .enum([
        "within_3_months",
        "within_6_months",
        "within_12_months",
        "later",
        "unknown",
      ])
      .nullable(),
  })
  .strict();
export const profilePatchSchema = z
  .object({
    version: z.string().regex(/^\d{1,15}$/),
    basicProfile: z.object(basicFields).partial().strict(),
    activities: z
      .array(z.enum(activities))
      .max(13)
      .refine((v) => new Set(v).size === v.length)
      .optional(),
    capacities: z
      .array(capacitySchema)
      .max(100)
      .refine(
        (v) =>
          new Set(v.map((c) => c.type + ":" + c.category)).size === v.length,
      )
      .optional(),
    intent: intentSchema.partial().optional(),
  })
  .strict();
export const profileSchema = z.object({
  id: idSchema.nullable(),
  version: z.string().regex(/^\d+$/),
  basicProfile: z
    .object({
      ...basicFields,
      registrationStatus: knownEnum([
        "registered",
        "in_progress",
        "not_registered",
        "unknown",
      ]),
      applicantType: knownEnum(applicants).nullable(),
      region: nullableText,
      operationalStatus: knownEnum(["active", "inactive", "unknown"]),
      organicStatus: knownEnum([
        "none",
        "in_conversion",
        "certified",
        "unknown",
      ]),
    })
    .nullable(),
  activities: z.array(knownEnum(activities)),
  capacities: z.array(
    z.object({
      type: knownEnum([
        "land_owned",
        "land_leased",
        "land_cultivated",
        "crop_area",
        "livestock",
        "greenhouse_area",
        "storage",
        "cold_storage",
        "processing",
        "machinery_summary",
      ]),
      category: nullableText,
      quantity: number,
      unit: knownEnum([
        "ha",
        "m2",
        "head",
        "t",
        "m3",
        "l_day",
        "t_day",
        "count",
        "text",
      ]),
    }),
  ),
  intent: z
    .object({
      title: nullableText,
      purpose: knownEnum(purposes).nullable(),
      targetTimeframe: knownEnum([
        "within_3_months",
        "within_6_months",
        "within_12_months",
        "later",
        "unknown",
      ]).nullable(),
    })
    .nullable(),
  completionState: z.enum(["missing", "partial", "ready"]),
  relevanceReady: z.boolean(),
});
export const accessSchema = z.object({
  financingState: knownEnum([
    "trial_not_started",
    "trial_active",
    "trial_expired",
    "paid",
    "manually_granted",
  ]),
  financingTrialEndsAt: timestamp,
  capabilityPolicies: z.record(
    z.enum([
      "public_free",
      "registered_free",
      "trial_or_paid",
      "paid_only",
      "staff_only",
    ]),
  ),
  capabilities: z.object({
    editBasicFarmProfile: z.boolean(),
    usePersonalizedFeed: z.boolean(),
    useFreeCalculator: z.boolean(),
    runBasicEligibility: z.boolean(),
    runAdvancedEligibility: z.boolean(),
    createFinancingScenario: z.boolean(),
    runEligibilityCheck: z.boolean(),
    runFinancingAnalysis: z.boolean(),
    editAdvancedFinancingData: z.boolean(),
  }),
});
export const meSchema = z.object({
  user: z.object({
    id: idSchema,
    emailVerified: z.boolean(),
    displayName: nullableText,
  }),
  farm: z.object({
    hasProfile: z.boolean(),
    profileId: idSchema.nullable(),
    displayName: nullableText,
    completionState: z.enum(["missing", "partial", "ready"]),
  }),
  access: accessSchema,
});
export const feedStateSchema = z
  .object({
    key: z.string().min(1).max(240),
    state: z.enum(["read", "dismissed", "unread", "restore"]),
  })
  .strict();
export const feedItemSchema = z.object({
  key: text,
  section: knownEnum([
    "deadline",
    "subsidy",
    "financing",
    "scenario",
    "market",
    "cenoteka",
    "other",
  ]),
  topic: knownEnum([
    "subsidy",
    "deadline",
    "financing",
    "market",
    "investment",
    "scenario",
    "cenoteka",
  ]),
  title: text,
  shortBody: nullableText,
  importance: knownEnum([
    "informational",
    "useful",
    "important",
    "time_sensitive",
  ]),
  state: z.enum(["read", "unread", "dismissed"]),
  reasons: z.array(z.object({ code: z.string(), message: text })),
  target: targetSchema,
  canonicalPath: nullableText,
  publishedAt: timestamp,
  validUntil: date,
  daysLeft: z.number().int().nullable(),
  freshness: z.enum(["current", "expired", "unknown"]),
});
export const programmeSchema = z.object({
  id: idSchema,
  title: text,
  institution: nullableText,
  category: nullableText,
  status: knownEnum(["planned", "open", "closed", "archived"]),
  summary: nullableText,
  support: nullableText,
  deadline: date,
  deadlineText: nullableText,
  attribution: attributionSchema,
  target: targetSchema,
  canonicalPath: text,
  documents: z
    .array(z.object({ id: idSchema, label: text, note: nullableText }))
    .optional(),
});
export const conditionSchema = z.object({
  ruleId: z.string(),
  code: z.string(),
  status: knownEnum([
    "match",
    "mismatch",
    "unknown",
    "manual_review",
    "not_applicable",
  ]),
  explanation: text,
  hard: z.boolean(),
  core: z.boolean(),
});
export const questionSchema = z.object({
  factKey: text,
  ruleId: z.string(),
  question: text,
  input: knownEnum(["number", "yes_no", "select", "date"]),
  unit: nullableText,
  options: z.array(text),
  savable: z.boolean(),
});
export const checkRequestSchema = z
  .object({
    answers: z
      .record(z.string().max(160), z.string().max(500))
      .refine((v) => Object.keys(v).length <= 80)
      .default({}),
  })
  .strict();
export const checkContextSchema = z.object({
  programmeId: idSchema,
  profileVersion: z.string(),
  rulesFingerprint: text,
  conditions: z.array(
    z.object({ id: idSchema, type: z.string(), explanation: nullableText }),
  ),
  questions: z.array(questionSchema),
});
export const checkSchema = z.object({
  id: idSchema,
  programmeId: idSchema,
  classification,
  conditions: z.array(conditionSchema),
  missingFacts: z.array(questionSchema),
  checkedAt: z.string().datetime({ offset: true }),
  rulesFingerprint: text,
  profileVersion: nullableText,
  serverAuthoritative: z.boolean(),
  stale: z.boolean(),
  staleReasons: z.array(
    z.enum([
      "rules_changed",
      "profile_changed",
      "programme_unavailable",
      "deadline_passed",
      "legacy_result",
    ]),
  ),
  officialUrl: nullableText,
});
export const offerSchema = z.object({
  id: idSchema,
  revisionId: idSchema,
  productId: idSchema,
  productName: text,
  variant: z.object({ id: idSchema, name: text, manufacturer: nullableText }),
  category: z.object({ code: text, label: text }),
  supplier: z.object({
    name: text,
    slug: text,
    website: nullableText,
    place: nullableText,
  }),
  package: z.object({
    id: idSchema,
    label: text,
    quantity: number,
    unit: nullableText,
    multipackCount: z.number(),
  }),
  price: z.object({
    amount: number,
    currency: nullableText,
    type: knownEnum(["fixed", "from", "tiered", "on_request"]),
    basis: knownEnum([
      "per_package",
      "per_reference_unit",
      "per_pallet",
      "other",
    ]),
    basisUnit: nullableText,
    originalText: nullableText,
  }),
  normalized: z.object({
    amount: number,
    unit: nullableText,
    state: knownEnum(["comparable", "conditional", "not_comparable"]),
    reasons: z.array(text),
  }),
  vat: z.object({
    state: knownEnum(["included", "excluded", "exempt", "unknown"]),
    rate: number,
  }),
  moq: z.object({ quantity: number, basis: nullableText }),
  delivery: z.array(
    z.object({
      mode: z.string(),
      feeState: z.string(),
      amount: number,
      currency: nullableText,
      freeThreshold: number,
      leadMin: number,
      leadMax: number,
      origin: nullableText,
    }),
  ),
  areas: z.array(
    z.object({
      code: text,
      name: text,
      inclusion: z.string(),
      fulfillment: z.string(),
    }),
  ),
  availability: knownEnum([
    "unknown",
    "in_stock",
    "out_of_stock",
    "preorder",
    "on_request",
  ]),
  publicNote: nullableText,
  freshness: z.enum(["fresh", "stale"]),
  attribution: attributionSchema,
  target: targetSchema,
  canonicalPath: text,
});
export const productSchema = z.object({
  id: idSchema,
  name: text,
  category: z.object({ code: text, label: text }),
  offers: z.array(offerSchema),
  target: targetSchema,
  canonicalPath: text,
});
export const comparisonSchema = z.object({
  comparableGroups: z.array(
    z.object({
      offers: z.array(offerSchema),
      lowestOfferId: idSchema.nullable(),
    }),
  ),
  conditional: z.array(
    z.object({ offer: offerSchema, reasons: z.array(text) }),
  ),
  nonComparable: z.array(
    z.object({ offer: offerSchema, reasons: z.array(text) }),
  ),
});
export const financingSchema = z.object({
  id: idSchema,
  title: text,
  instrument: knownEnum([
    "grant",
    "subsidy",
    "subsidized_loan",
    "commercial_loan",
    "development_fund_loan",
    "guaranteed_loan",
    "leasing",
    "credit_line",
    "working_capital",
    "bridge_financing",
    "co_financing",
    "combined_financing",
    "other",
  ]),
  description: nullableText,
  status: knownEnum(["open", "upcoming", "closed", "ongoing", "unknown"]),
  provider: nullableText,
  purposes: z.array(knownEnum(purposes)),
  applicants: z.array(knownEnum(applicants)),
  currency: nullableText,
  minAmount: number,
  maxAmount: number,
  nominalRate: number,
  effectiveRate: number,
  minTermMonths: number,
  maxTermMonths: number,
  graceMonths: number,
  supportPercentage: number,
  ownContributionPercentage: number,
  fees: nullableText,
  collateral: nullableText,
  documents: nullableText,
  publicNote: nullableText,
  attribution: attributionSchema,
  target: targetSchema,
  canonicalPath: text,
});
export const analysisSchema = z.object({
  status: z.enum(["ok", "profile_incomplete"]),
  missing: z.array(text),
  items: z.array(
    z.object({
      product: financingSchema,
      classification,
      rules: z.array(
        z.object({ code: text, status: z.string(), explanation: text }),
      ),
      gaps: z.array(text),
    }),
  ),
});
export const marketItemSchema = z.object({
  id: z.string(),
  commodity: text,
  status: z.string(),
  priceType: nullableText,
  value: number,
  min: number,
  max: number,
  unit: nullableText,
  currency: nullableText,
  vat: z.string(),
  location: nullableText,
  marketType: nullableText,
  attributes: z.record(z.string()),
  periodFrom: date,
  periodTo: date,
  changePercent: number,
  freshness: z.enum(["fresh", "stale", "unknown"]),
  attribution: attributionSchema,
  target: targetSchema,
});
export const marketSchema = z.object({
  exchange: z.object({
    status: z.enum(["ok", "unavailable"]),
    items: z.array(marketItemSchema),
  }),
  stips: z.object({
    status: z.enum(["ok", "unavailable"]),
    items: z.array(marketItemSchema),
  }),
});
export const page = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    pagination: z.object({
      limit: z.number(),
      offset: z.number(),
      nextOffset: z.number().nullable(),
    }),
  });
export const feedPageSchema = page(feedItemSchema).extend({
  availability: z.object({
    information: z.enum(["ok", "unavailable"]),
    cenoteka: z.enum(["ok", "unavailable"]),
    market: z.enum(["ok", "unavailable"]),
  }),
});
const section = z.object({
  status: z.enum(["ok", "unavailable"]),
  items: z.array(feedItemSchema),
});
export const todaySchema = z.object({
  profile: meSchema.shape.farm,
  access: accessSchema,
  unreadCount: z.number(),
  hasProfile: z.boolean(),
  sections: z.object({
    important: section,
    deadlines: section,
    subsidies: section,
    financing: section,
    cenoteka: section,
  }),
  market: marketSchema,
});
export const publicInformationSchema = z.object({
  key: text,
  title: text,
  shortBody: nullableText,
  topic: knownEnum(["subsidy", "financing", "investment"]),
  importance: knownEnum([
    "informational",
    "useful",
    "important",
    "time_sensitive",
  ]),
  target: targetSchema,
  canonicalPath: nullableText,
  attribution: attributionSchema,
});
const publicSection = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ status: z.enum(["ok", "unavailable"]), items: z.array(item) });
export const guestTodaySchema = z.object({
  audience: z.literal("guest"),
  capabilities: z.object({
    browsePublicContent: z.literal(true),
    useFreeCalculator: z.literal(true),
  }),
  sections: z.object({
    information: publicSection(publicInformationSchema),
    programmes: publicSection(programmeSchema),
    cenoteka: publicSection(offerSchema),
    financing: publicSection(financingSchema),
  }),
  market: marketSchema,
});
export const successSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    schemaVersion: z.literal("1"),
    data,
    serverNow: z.string().datetime(),
    timezone: z.literal("Europe/Belgrade"),
    requestId: z.string().uuid(),
  });
export const errorSchema = z.object({
  error: z.object({
    code: z.enum([
      "unauthenticated",
      "unauthorized",
      "not_found",
      "validation_error",
      "capability_required",
      "trial_expired",
      "conflict",
      "rate_limited",
      "internal_error",
      "method_not_allowed",
    ]),
    message: text,
    requestId: z.string().uuid(),
    details: z.array(z.object({ path: text, message: text })).optional(),
  }),
});
export type ProfilePatch = z.infer<typeof profilePatchSchema>;
export type FeedItemDto = z.infer<typeof feedItemSchema>;
