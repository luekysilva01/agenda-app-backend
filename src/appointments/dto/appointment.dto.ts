import { z } from 'zod';
import { noXss } from '../../common/helpers/security.helper.js';

export const createAppointmentSchema = z.object({
  clientName: noXss().pipe(
    z
      .string()
      .trim()
      .min(2, 'Client name must be at least 2 characters long')
      .max(100),
  ),
  clientEmail: noXss().pipe(
    z
      .string()
      .trim()
      .email('Please provide a valid client email address')
      .max(255),
  ),
  clientPhone: noXss().pipe(
    z
      .string()
      .trim()
      .min(6, 'Please provide a valid client contact number')
      .max(30),
  ),
  serviceId: z
    .string()
    .uuid('Invalid service UUID format')
    .optional()
    .nullable(),
  serviceName: noXss().pipe(
    z.string().trim().min(1, 'Service name is required').max(100),
  ),
  scheduledAt: z
    .union([
      z.string().datetime({ offset: true }),
      z.string().datetime(),
      z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Must be a valid ISO 8601 date string',
      }),
      z.date(),
    ])
    .transform((val) => (val instanceof Date ? val.toISOString() : val)),
  durationMinutes: z.coerce.number().min(5).max(480).optional().default(45),
  status: z
    .enum(['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .optional()
    .default('CONFIRMED'),
  notes: noXss().pipe(z.string().trim().max(1000)).optional().nullable(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentDto = z.infer<typeof updateAppointmentSchema>;
