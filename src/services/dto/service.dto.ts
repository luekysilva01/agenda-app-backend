import { z } from 'zod';
import { noXss } from '../../common/helpers/security.helper.js';

export const createServiceSchema = z.object({
  name: noXss().pipe(
    z
      .string()
      .trim()
      .min(2, 'Service name must be at least 2 characters long')
      .max(100),
  ),
  description: noXss().pipe(z.string().trim().max(500)).optional().nullable(),
  durationMinutes: z.coerce.number().min(5).max(480).optional().default(45),
  category: noXss()
    .pipe(z.string().trim().min(1).max(60))
    .optional()
    .default('General'),
  isActive: z.boolean().optional().default(true),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceDto = z.infer<typeof createServiceSchema>;
export type UpdateServiceDto = z.infer<typeof updateServiceSchema>;
