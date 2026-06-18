import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

// ─── Intake form schema — exactly mirrors the 5 questions ───────────────────
export const AssessRequestSchema = z.object({
  employment_status: z.enum([
    "employed",
    "unemployed",
    "self_employed",
    "unable_to_work",
    "carer"
  ], {
    errorMap: () => ({ message: "employment_status must be one of: employed, unemployed, self_employed, unable_to_work, carer" })
  }),

  household_situation: z.enum([
    "single",
    "couple",
    "single_parent",
    "couple_with_children"
  ], {
    errorMap: () => ({ message: "household_situation must be one of: single, couple, single_parent, couple_with_children" })
  }),

  housing_situation: z.enum([
    "renting_privately",
    "mortgage",
    "living_with_family",
    "social_housing"
  ], {
    errorMap: () => ({ message: "housing_situation must be one of: renting_privately, mortgage, living_with_family, social_housing" })
  }),

  age_range: z.enum([
    "under_25",
    "25_to_60",
    "over_60"
  ], {
    errorMap: () => ({ message: "age_range must be one of: under_25, 25_to_60, over_60" })
  }),

  health_disability: z.enum([
    "affects_work",
    "affects_daily_life",
    "carer_for_someone",
    "none"
  ], {
    errorMap: () => ({ message: "health_disability must be one of: affects_work, affects_daily_life, carer_for_someone, none" })
  }),

  // Optional: number of children — used to estimate Child Benefit amounts
  num_children: z.number().int().min(0).max(20).optional().default(0)
});

export type AssessRequest = z.infer<typeof AssessRequestSchema>;

// ─── Generic validation middleware factory ───────────────────────────────────
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid request body",
        details: result.error.flatten().fieldErrors
      });
      return;
    }
    // Attach validated+typed data to request
    (req as Request & { validated: T }).validated = result.data;
    next();
  };
}
