import { z } from "zod";

const conf = z.number().min(0).max(1);

export const ExtractionSchema = z.object({
  brand: z.string().min(1).nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().email().nullable(),
  currency: z.string().length(3).nullable(),
  fee: z.number().positive().nullable(),
  deliverables: z
    .array(
      z.object({
        description: z.string().min(1),
        platform: z.string().nullable(),
        amount: z.number().nonnegative().nullable(),
      })
    )
    .default([]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  paymentTerms: z.string().nullable(),
  usageDays: z.number().int().positive().nullable(),
  title: z.string().nullable(),
  confidence: z
    .object({
      brand: conf, contactEmail: conf, fee: conf, deliverables: conf, dueDate: conf, paymentTerms: conf, usageDays: conf,
    })
    .partial()
    .default({}),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

/** The order fields are revealed in the UI. */
export const FIELD_ORDER = ["brand", "contactEmail", "fee", "deliverables", "dueDate", "paymentTerms", "usageDays"] as const;
export type FieldKey = (typeof FIELD_ORDER)[number];
