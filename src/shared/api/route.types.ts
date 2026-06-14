export type TransportProfile = 'driving' | 'walking' | 'cycling'
export type VehicleClass = 'passenger' | 'light_truck' | 'heavy_truck'
export type FuelType = 'petrol' | 'diesel'
export type OptimizationMode = 'weighted' | 'pareto'
export type OptimizationStrategy = 'strict' | 'balanced' | 'custom' | 'user-driven'
export type PriorityProfile = 'balanced' | 'fastest' | 'cheapest' | 'safest' | 'greenest'
export type CargoProfile = 'standard' | 'perishable' | 'heavy'

export type Point = {
  lat: number
  lon: number
  label?: string | null
}

export type CriteriaWeights = {
  distance: number
  duration: number
  fuel_cost: number
  emissions: number
  congestion: number
  weather_risk: number
  reliability: number
  safety: number
  tolls: number
  road_quality: number
  dynamic_events: number
  operational_cost: number
  cargo_risk: number
}

export type OptimizationConstraints = {
  max_distance_km?: number | null
  max_duration_min?: number | null
  max_fuel_cost?: number | null
  max_operational_cost?: number | null
  max_co2_kg?: number | null
  max_safety_risk?: number | null
  max_cargo_risk?: number | null
}

export type TradeoffTolerance = {
  max_distance_regression_pct: number
  max_duration_regression_pct: number
  max_fuel_cost_regression_pct: number
  max_operational_cost_regression_pct: number
  max_fuel_liters_regression_pct: number
  max_co2_regression_pct: number
  max_cargo_risk_regression_pct: number
  min_risk_reduction_pct: number
  min_reliability_gain_pct: number
  allow_constraint_penalty_regression: boolean
}

export type VehicleDimensions = {
  height_m?: number | null
  weight_t?: number | null
  width_m?: number | null
  length_m?: number | null
}

export type CargoParameters = {
  profile: CargoProfile
  weight_t?: number | null
  declared_value_rub?: number | null
  deadline_at?: string | null
}

export type CvrpParameters = {
  point_demands_t: number[]
  vehicle_count: number
  depot_index: number
  return_to_depot: boolean
}

export type OperatingCostParameters = {
  driver_cost_per_hour?: number | null
  maintenance_cost_per_km?: number | null
}

export type RouteRequest = {
  points: Point[]
  optimize: boolean
  fix_ends: boolean
  profile: TransportProfile
  vehicle_class: VehicleClass
  vehicle_dimensions: VehicleDimensions
  vehicle_capacity_t?: number | null
  cargo: CargoParameters
  cvrp: CvrpParameters
  operating_costs: OperatingCostParameters
  fuel_type: FuelType
  fuel_consumption_l_per_100km?: number | null
  optimize_mode: OptimizationMode
  optimization_strategy: OptimizationStrategy
  tradeoff_tolerance: TradeoffTolerance
  priority_profile: PriorityProfile
  criteria_weights: CriteriaWeights
  constraints: OptimizationConstraints
  use_dynamic_weights: boolean
  departure_at?: string | null
  adapt_from_run_id?: string | null
  population_size: number
  generations: number
  crossover_rate: number
  mutation_rate: number
  max_alternatives: number
  random_seed?: number | null
}

export type FuelCostBreakdown = {
  fuel_type: FuelType
  vehicle_class: VehicleClass
  consumption_l_per_100km: number
  distance_km: number
  uphill_share_pct: number
  downhill_share_pct: number
  terrain_multiplier: number
  mountain_multiplier: number
  temperature_multiplier: number
  congestion_multiplier: number
  surface_multiplier: number
  dynamic_events_multiplier: number
  load_multiplier: number
  load_ratio: number
  cargo_weight_t?: number | null
  vehicle_capacity_t?: number | null
  liters_total: number
  price_per_liter: number
  total_cost: number
  currency: string
  price_source: string
  price_source_url?: string | null
  price_date?: string | null
  price_retrieved_at: string
}

export type OperationalCostBreakdown = {
  fuel_and_tolls: number
  fuel_only: number
  toll_cost: number
  driver_cost: number
  maintenance_cost: number
  cargo_expected_loss: number
  total_cost: number
  cargo_risk: number
  currency: string
}

export type RouteFitnessComponents = {
  distance: number
  time: number
  cost: number
  fuel: number
  risk: number
  operational_complexity: number
  penalty: number
}

export type RouteMetrics = {
  distance_km: number
  duration_min: number
  fuel_liters: number
  fuel_cost: number
  operational_cost: number
  driver_cost: number
  maintenance_cost: number
  co2_kg: number
  congestion_index: number
  weather_risk: number
  weather_factor?: number
  reliability_score: number
  route_reliability_score?: number
  safety_risk: number
  toll_cost: number
  road_quality_risk: number
  road_quality_factor?: number
  incident_risk: number
  roadwork_risk: number
  dynamic_event_risk: number
  road_event_factor?: number
  traffic_factor?: number
  cargo_risk: number
  cargo_expected_loss: number
  objective_score: number
  constraint_penalty: number
  feasible: boolean
  infrastructure_penalty: number
  temporal_restriction_penalty: number
  deadline_penalty: number
  capacity_penalty: number
  vehicle_routes_used: number
  max_route_load_t: number
  capacity_utilization: number
  capacity_feasible: boolean
  refined_segments_count: number
  average_detour_ratio: number
  segment_alternative_gain_pct: number
  violated_constraints: string[]
  fitness_components?: RouteFitnessComponents | null
}

export type RouteSegmentFactor = {
  start_index: number
  end_index: number
  distance_km: number
  duration_min: number
  avg_speed_kph: number
  elevation_gain_m: number
  elevation_loss_m: number
  congestion_index: number
  weather_severity: number
  reliability_risk: number
  safety_risk: number
  toll_cost: number
  road_quality: number
  road_quality_risk: number
  incident_risk: number
  roadwork_risk: number
  dynamic_event_risk: number
  cargo_risk: number
  temporal_accessible: boolean
  infrastructure_penalty: number
  violated_constraints: string[]
  height_clearance_m?: number | null
  weight_limit_t?: number | null
  width_limit_m?: number | null
  length_limit_m?: number | null
  infrastructure_accessible: boolean
  segment_variant_type?: string | null
  segment_variant_score?: number | null
  detour_ratio?: number
  refinement_applied_on_segment?: boolean
}

export type RouteTerrainSegment = {
  trend: 'uphill' | 'downhill' | 'flat'
  geometry: number[][]
  distance_km: number
  elevation_delta_m: number
  elevation_gain_m: number
  elevation_loss_m: number
  grade_pct: number
}

export type RouteTerrainProfile = {
  sampled_points: number
  total_gain_m: number
  total_loss_m: number
  max_uphill_grade_pct: number
  max_downhill_grade_pct: number
  source: string
  segments: RouteTerrainSegment[]
}

export type RouteSegmentInsight = {
  start_index: number
  end_index: number
  start_label: string
  end_label: string
  dominant_factor_key: string
  dominant_factor_label: string
  severity_score: number
  severity_level: string
  color_hex: string
  map_color_hex?: string | null
  map_stroke_weight?: number
  map_dash_array?: string | null
  is_problematic?: boolean
  narrative: string
  distance_km: number
  duration_min: number
  congestion_index: number
  weather_severity: number
  reliability_risk: number
  safety_risk: number
  toll_cost: number
  elevation_gain_m: number
  road_quality: number
  road_quality_risk: number
  incident_risk: number
  roadwork_risk: number
  dynamic_event_risk: number
  cargo_risk: number
  temporal_accessible: boolean
  infrastructure_penalty: number
  violated_constraints: string[]
}

export type StressTestHighlight = {
  factor_key: string
  factor_label: string
  expected_delay_min: number
  expected_cost_increase: number
  note: string
}

export type RouteStressTest = {
  simulations: number
  on_time_probability: number
  within_budget_probability: number
  within_safety_probability: number
  failure_probability: number
  resilience_index: number
  expected_duration_min: number
  duration_p10_min: number
  duration_p90_min: number
  expected_fuel_cost: number
  fuel_cost_p10: number
  fuel_cost_p90: number
  expected_safety_risk: number
  worst_case_delay_min: number
  highlights: StressTestHighlight[]
}

export type RouteAlternative = {
  ordered_points: Point[]
  metrics: RouteMetrics
  rank: number
  crowding_distance?: number | null
  geometry: number[][]
  provider?: string | null
  terrain_profile?: RouteTerrainProfile | null
}

export type RouteVehicleRoute = {
  vehicle_index: number
  order_indices: number[]
  ordered_points: Point[]
  demand_t: number
  capacity_t: number
  load_ratio: number
  feasible: boolean
  metrics?: RouteMetrics | null
  geometry: number[][]
  provider?: string | null
  terrain_profile?: RouteTerrainProfile | null
}

export type CvrpPlanInfo = {
  enabled: boolean
  depot_index: number
  vehicle_count: number
  routes_used: number
  capacity_t: number
  total_demand_t: number
  max_route_load_t: number
  max_load_ratio: number
  feasible: boolean
  capacity_penalty: number
  total_distance_km: number
  total_duration_min: number
  makespan_min: number
  routes: RouteVehicleRoute[]
}

export type PerformanceTimings = {
  context_ms: number
  optimization_ms: number
  refinement_ms: number
  analysis_ms: number
  total_ms: number
}

export type OptimizationDiagnostics = {
  mode: OptimizationMode
  optimization_active: boolean
  optimization_reason?: string | null
  score_mode: string
  generations: number
  population_size: number
  crossover_rate: number
  mutation_rate: number
  stagnation_generations: number
  evaluated_solutions: number
  pareto_solutions: number
  warm_start_solutions: number
  population_memory_solutions: number
  repaired_solutions: number
  forbidden_edges: number
  forbidden_edges_count?: number
  unrepairable_candidates?: number
  infrastructure_violations_count?: number
  baseline_guard_applied?: boolean
  original_best_score?: number | null
  baseline_score?: number | null
  final_selected_from?: 'optimizer' | 'alternative' | 'baseline' | string
  final_selection_reason?: string
  segment_alternatives_enabled?: boolean
  segment_alternatives_total_candidates?: number
  segment_alternatives_used?: number
  segment_alternative_gain_pct?: number
  route_refinement_applied?: boolean
  route_refinement_reason?: string | null
  optimization_strategy?: OptimizationStrategy
  accepted_tradeoff?: boolean
  rejected_regression_metrics?: string[]
  rejected_alternative_reasons?: string[]
  performance_timings?: PerformanceTimings | null
}

export type DynamicWeightsInfo = {
  base: CriteriaWeights
  adjusted: CriteriaWeights
  triggers: string[]
}

export type ScoreComponent = {
  key: string
  label: string
  weight: number
  raw_value: number
  normalized_value: number
  contribution: number
}

export type ScoreExplanation = {
  score_mode: string
  total_score: number
  components: ScoreComponent[]
}

export type RouteComparisonDelta = {
  distance_km: number
  duration_min: number
  fuel_cost: number
  operational_cost: number
  cargo_risk: number
  co2_kg: number
  objective_score: number
}

export type RouteComparisonInfo = {
  baseline_ordered_points: Point[]
  baseline_geometry: number[][]
  baseline_metrics: RouteMetrics
  baseline_terrain_profile?: RouteTerrainProfile | null
  optimized_metrics: RouteMetrics
  delta: RouteComparisonDelta
  improvement_pct: RouteComparisonDelta
  baseline_score: ScoreExplanation
  optimized_score: ScoreExplanation
}

export type RouteComparisonRouteView = {
  label: string
  ordered_points: Point[]
  geometry: number[][]
  metrics: RouteMetrics
  terrain_profile?: RouteTerrainProfile | null
  score?: ScoreExplanation | null
  provider?: string | null
}

export type RouteComparisonSummary = {
  baseline?: RouteComparisonRouteView
  selected?: RouteComparisonRouteView
  delta?: Partial<RouteComparisonDelta>
  improvement_pct?: Partial<RouteComparisonDelta>
  improved_metrics?: string[]
  main_reason?: string
  key_benefits?: string[]
  main_risk?: string | null
  baseline_guard_applied?: boolean
  selected_from?: string | null
}

export type DecisionExplanation = {
  main_reason: string
  top_positive_factors: string[]
  top_negative_factors: string[]
  rejected_reasons: string[]
  influential_criteria: string[]
  constraints_influence: string[]
  selected_from?: string | null
  strategy: OptimizationStrategy
  compromise_accepted: boolean
}

export type RouteQualityComponent = {
  key: string
  label: string
  score: number
  weight: number
}

export type RouteQualityIndex = {
  score: number
  label: string
  components: RouteQualityComponent[]
}

export type DataConfidenceScore = {
  score: number
  label: string
  source_scores: Record<string, number>
  fallback_sources: string[]
  notes: string[]
}

export type ConstraintHealthItem = {
  key: string
  label: string
  status: 'satisfied' | 'violated' | 'near_violation' | string
  value?: number | null
  limit?: number | null
  margin_pct?: number | null
  violated: boolean
}

export type ConstraintHealthReport = {
  overall_status: 'not_configured' | 'satisfied' | 'violated' | 'near_violation' | string
  items: ConstraintHealthItem[]
}

export type DataSourceInfo = {
  routing: string
  matrix: string
  weather: string
  elevation: string
  traffic: string
  tolls: string
  fuel_prices: string
  infrastructure: string
  road_quality: string
  road_events: string
}

export type RouteAnalysisMatrices = {
  point_labels: string[]
  distance_km: number[][]
  duration_min: number[][]
  traffic_index: number[][]
  toll_cost: number[][]
  road_quality: number[][]
  incident_risk: number[][]
  roadwork_risk: number[][]
  elevation_gain_m: number[][]
  elevation_loss_m: number[][]
  mean_elevation_m: number[][]
  height_clearance_m: Array<Array<number | null>>
  weight_limit_t: Array<Array<number | null>>
  width_limit_m: Array<Array<number | null>>
  length_limit_m: Array<Array<number | null>>
  infrastructure_access: boolean[][]
  temporal_access: boolean[][]
}

export type RouteResponse = {
  run_id?: string | null
  ordered_points: Point[]
  total_distance_km: number
  total_duration_min?: number | null
  geometry: number[][]
  geojson: Record<string, unknown>
  provider: string
  fuel_cost?: FuelCostBreakdown | null
  operational_cost?: OperationalCostBreakdown | null
  metrics?: RouteMetrics | null
  alternatives: RouteAlternative[]
  segment_factors: RouteSegmentFactor[]
  segment_insights: RouteSegmentInsight[]
  terrain_profile?: RouteTerrainProfile | null
  stress_test?: RouteStressTest | null
  diagnostics?: OptimizationDiagnostics | null
  decision_explanation?: DecisionExplanation | null
  route_quality_index?: RouteQualityIndex | null
  data_confidence?: DataConfidenceScore | null
  constraint_health?: ConstraintHealthReport | null
  dynamic_weights?: DynamicWeightsInfo | null
  comparison?: RouteComparisonInfo | null
  comparison_summary?: RouteComparisonSummary | null
  analysis_matrices?: RouteAnalysisMatrices | null
  data_sources?: DataSourceInfo | null
  population_memory_orders: number[][]
  cvrp_plan?: CvrpPlanInfo | null
}

export type RouteRunListItem = {
  run_id: string
  created_at: string
  provider_summary: string
  provider?: string | null
  distance_km?: number | null
  duration_min?: number | null
  operational_cost?: number | null
  objective_score?: number | null
  points_count?: number | null
  priority_profile?: PriorityProfile | string | null
  vehicle_class?: VehicleClass | string | null
  cargo_profile?: CargoProfile | string | null
  improvement_pct?: number | null
  feasible?: boolean | null
  feasible_count: number
}

export type RouteRunDetails = {
  run_id: string
  created_at: string
  request: RouteRequest
  response: RouteResponse
}
