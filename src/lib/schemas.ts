import { z } from "zod";

/**
 * Zod schemas mirroring purchase_engine's API contract byte-for-byte -
 * see purchase_engine/src/purchase_engine/api/schemas.py (the Pydantic
 * source of truth) and domain/models.py (the `payload` shape, produced by
 * `to_jsonable(Recommendation)`).
 *
 * Schema-first on purpose: types are `z.infer`'d from these, and every
 * response from `backend-client.ts` is parsed through one of them before
 * anything else touches it. The backend is a separate deployable repo with
 * its own release cadence - if its shape ever drifts from what this file
 * expects, a validation error at the fetch boundary is far easier to debug
 * than a `TypeError: undefined is not an object` three components deep.
 * See docs/adr/0002-zod-at-the-api-boundary.md.
 */

export const runFreshnessSchema = z.object({
  as_of: z.string(),
  sales_through: z.string().nullable(),
  purchases_through: z.string().nullable(),
  workbook_updated: z.string().nullable(),
  run_calendar_date: z.string(),
  stale: z.boolean(),
  note: z.string().optional().default(""),
});
export type RunFreshness = z.infer<typeof runFreshnessSchema>;

export const runCountsSchema = z.object({
  scored: z.number().int(),
  buy: z.number().int(),
  buy_funded: z.number().int(),
  buy_actionable: z.number().int(),
  consider: z.number().int(),
  skip: z.number().int(),
  inventory_joined: z.number().int(),
  incoming_rows_today: z.number().int(),
  incoming_rows_window: z.number().int(),
});
export type RunCounts = z.infer<typeof runCountsSchema>;

/** One `engine_run` row - `POST /runs`, `GET /runs/latest`, `GET /runs/{id}`
 * all return this exact shape (backend ADR 0009: one type, any endpoint). */
export const runSummarySchema = z.object({
  run_id: z.string(),
  generated_at: z.string(),
  as_of: z.string(),
  budget_eur: z.number().nullable(),
  config_hash: z.string(),
  stale: z.boolean(),
  counts: runCountsSchema,
  freshness: runFreshnessSchema,
  inserted_at: z.string(),
});
export type RunSummary = z.infer<typeof runSummarySchema>;

export const profitabilityStatusSchema = z.enum([
  "CONFIRMED",
  "TEMP_CALCULATED",
  "PRÜFEN",
  "UNAVAILABLE",
]);
export type ProfitabilityStatus = z.infer<typeof profitabilityStatusSchema>;

export const productProfitabilitySchema = z.object({
  produkt_id: z.string(),
  expected_vk: z.number().nullable(),
  expected_ek: z.number().nullable(),
  expected_gross_profit: z.number().nullable(),
  margin_pct: z.number().nullable(),
  status: profitabilityStatusSchema,
  source: z.string(),
});

/** The three numbers Annika's own brief asks to be shown *separately*, never
 * pre-merged: "Available in JTL: 3 / Purchased·Still Incoming: 2 /
 * Effective Stock Position: 5" (docs/Important Factors.md). */
export const productFeaturesSchema = z.object({
  produkt_id: z.string(),
  name: z.string(),
  kategorie: z.string(),
  modell: z.string(),
  is_duplicate: z.boolean(),
  units_30d: z.number(),
  units_90d: z.number(),
  daily_velocity: z.number().nullable(),
  velocity_window_days: z.number().int(),
  days_since_sale: z.number().int().nullable(),
  inventory_joined: z.boolean(),
  current_sellable: z.number().nullable(),
  on_hand: z.number().nullable(),
  in_orders: z.number().nullable(),
  purchased_today: z.number().int(),
  older_incoming: z.number().int(),
  effective_stock: z.number(),
  days_of_supply: z.number().nullable(),
  availability: z.string(),
  join_source: z.string(),
  mapping_quelle: z.string(),
  profitability: productProfitabilitySchema,
  margin_pct: z.number().nullable(),
  hist_success: z.number().nullable(),
  ok_rows: z.number().int(),
});

export const scoreBreakdownSchema = z.object({
  demand: z.number().nullable(),
  inventory_need: z.number().nullable(),
  profit: z.number().nullable(),
  market: z.number().nullable(),
  overstock_penalty: z.number(),
  effective_weights: z.record(z.string(), z.number()),
  single_component_capped: z.boolean(),
  score: z.number().int(),
});

export const confidenceBreakdownSchema = z.object({
  mapping: z.number(),
  sales_sufficiency: z.number(),
  inventory_reliability: z.number(),
  profitability_reliability: z.number(),
  evidence_components_present: z.number().int(),
  evidence_penalty: z.number(),
  confidence: z.number().int(),
});

export const quantityPlanSchema = z.object({
  daily_velocity: z.number().nullable(),
  target_coverage_days: z.number(),
  effective_stock: z.number(),
  required_units: z.number().int().nullable(),
  per_sku_capped_qty: z.number().int(),
  recommended_qty: z.number().int(),
  per_sku_cap: z.number().int(),
  budget_trimmed: z.boolean(),
});

/** `to_jsonable(Recommendation)` - the full per-product detail nested in
 * `RecommendationOut.payload`. */
export const recommendationPayloadSchema = z.object({
  produkt_id: z.string(),
  name: z.string(),
  kategorie: z.string(),
  modell: z.string(),
  label: z.enum(["BUY", "CONSIDER", "SKIP"]),
  purchase_score: z.number().int(),
  confidence: z.number().int(),
  recommended_qty: z.number().int(),
  availability: z.string(),
  features: productFeaturesSchema,
  score: scoreBreakdownSchema,
  confidence_breakdown: confidenceBreakdownSchema,
  quantity: quantityPlanSchema,
  reasons: z.array(z.string()),
  risks: z.array(z.string()),
  est_unit_ek: z.number().nullable(),
  est_gross_profit_per_eur: z.number().nullable(),
  est_total_cost: z.number().nullable(),
  est_total_gross_profit: z.number().nullable(),
});
export type RecommendationPayload = z.infer<typeof recommendationPayloadSchema>;

export const recommendationSchema = z.object({
  run_id: z.string(),
  produkt_id: z.string(),
  name: z.string(),
  kategorie: z.string(),
  label: z.enum(["BUY", "CONSIDER", "SKIP"]),
  purchase_score: z.number().int(),
  confidence: z.number().int(),
  availability: z.string(),
  per_sku_capped_qty: z.number().int(),
  recommended_qty: z.number().int(),
  budget_trimmed: z.boolean(),
  est_unit_ek: z.number().nullable(),
  est_gross_profit_per_eur: z.number().nullable(),
  est_total_cost: z.number().nullable(),
  est_total_gross_profit: z.number().nullable(),
  payload: recommendationPayloadSchema,
});
export type Recommendation = z.infer<typeof recommendationSchema>;

export const recommendationListSchema = z.array(recommendationSchema);

export const allocationLineSchema = z.object({
  produkt_id: z.string(),
  name: z.string(),
  kategorie: z.string(),
  purchase_score: z.number().int(),
  confidence: z.number().int(),
  availability: z.string(),
  final_qty: z.number().int(),
  trimmed: z.boolean(),
  unit_ek: z.number().nullable(),
  gp_per_eur: z.number().nullable(),
  total_cost: z.number().nullable(),
  total_gross_profit: z.number().nullable(),
});
export type AllocationLine = z.infer<typeof allocationLineSchema>;

export const allocateResponseSchema = z.object({
  run_id: z.string(),
  budget_eur: z.number(),
  lines: z.array(allocationLineSchema),
});
export type AllocateResponse = z.infer<typeof allocateResponseSchema>;

export const buyerActionTypeSchema = z.enum(["BUY", "ADJUST", "SKIP"]);
export type BuyerActionType = z.infer<typeof buyerActionTypeSchema>;

export const actionOutSchema = z.object({
  id: z.number().int(),
  run_id: z.string(),
  produkt_id: z.string(),
  action: z.string(),
  qty: z.number().int().nullable(),
  note: z.string().nullable(),
  actor: z.string().nullable(),
  created_at: z.string(),
});
export type ActionOut = z.infer<typeof actionOutSchema>;

export const actionListSchema = z.array(actionOutSchema);

export type RecommendationLabel = "BUY" | "CONSIDER" | "SKIP";
