import { z } from 'zod'

const nullableNumber = z.union([z.number(), z.null()]).optional()

const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  label: z
    .string()
    .max(64, 'Название или адрес точки должен быть не длиннее 64 символов.')
    .nullable()
    .optional(),
})

export const routeRequestSchema = z
  .object({
    points: z.array(pointSchema).min(2),
    optimize: z.boolean(),
    fix_ends: z.boolean(),
    profile: z.enum(['driving', 'walking', 'cycling']),
    vehicle_class: z.enum(['passenger', 'light_truck', 'heavy_truck']),
    vehicle_dimensions: z.object({
      height_m: nullableNumber,
      weight_t: nullableNumber,
      width_m: nullableNumber,
      length_m: nullableNumber,
    }),
    vehicle_capacity_t: nullableNumber,
    cargo: z.object({
      profile: z.enum(['standard', 'perishable', 'heavy']),
      weight_t: nullableNumber,
      declared_value_rub: nullableNumber,
      deadline_at: z.string().nullable().optional(),
    }),
    cvrp: z.object({
      point_demands_t: z.array(z.number().min(0)),
      vehicle_count: z.number().int().min(1).max(200),
      depot_index: z.number().int().min(0),
      return_to_depot: z.boolean(),
    }),
    operating_costs: z.object({
      driver_cost_per_hour: nullableNumber,
      maintenance_cost_per_km: nullableNumber,
    }),
    fuel_type: z.enum(['petrol', 'diesel']),
    fuel_consumption_l_per_100km: nullableNumber,
    optimize_mode: z.enum(['weighted', 'pareto']),
    optimization_strategy: z.enum(['strict', 'balanced', 'custom', 'user-driven']),
    tradeoff_tolerance: z.object({
      max_distance_regression_pct: z.number().min(0).max(100),
      max_duration_regression_pct: z.number().min(0).max(100),
      max_fuel_cost_regression_pct: z.number().min(0).max(100),
      max_operational_cost_regression_pct: z.number().min(0).max(100),
      max_fuel_liters_regression_pct: z.number().min(0).max(100),
      max_co2_regression_pct: z.number().min(0).max(100),
      max_cargo_risk_regression_pct: z.number().min(0).max(100),
      min_risk_reduction_pct: z.number().min(0).max(100),
      min_reliability_gain_pct: z.number().min(0).max(100),
      allow_constraint_penalty_regression: z.boolean(),
    }),
    priority_profile: z.enum(['balanced', 'fastest', 'cheapest', 'safest', 'greenest']),
    criteria_weights: z.record(z.string(), z.number().min(0)),
    constraints: z.record(z.string(), z.union([z.number(), z.null()]).optional()),
    use_dynamic_weights: z.boolean(),
    departure_at: z.string().nullable().optional(),
    adapt_from_run_id: z.string().nullable().optional(),
    population_size: z.number().int().min(24).max(400),
    generations: z.number().int().min(20).max(800),
    crossover_rate: z.number().min(0.1).max(1),
    mutation_rate: z.number().min(0.01).max(0.9),
    max_alternatives: z.number().int().min(1).max(20),
    random_seed: nullableNumber,
  })
  .superRefine((value, context) => {
    const first = value.points[0]
    const last = value.points[value.points.length - 1]

    if (first && last && first.lat === last.lat && first.lon === last.lon) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Первая и последняя точки должны отличаться.',
        path: ['points'],
      })
    }

    const weightSum = Object.values(value.criteria_weights).reduce((sum, weight) => sum + weight, 0)

    if (weightSum <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Сумма весов критериев должна быть больше нуля.',
        path: ['criteria_weights'],
      })
    }

    if (value.cvrp.depot_index >= value.points.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Стартовая точка многомашинной доставки должна быть в списке точек.',
        path: ['cvrp', 'depot_index'],
      })
    }

    if (value.cvrp.point_demands_t.length > value.points.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Список грузов по точкам не может быть длиннее списка точек маршрута.',
        path: ['cvrp', 'point_demands_t'],
      })
    }
  })

export function validateRouteDraft(value: unknown) {
  return routeRequestSchema.safeParse(value)
}
