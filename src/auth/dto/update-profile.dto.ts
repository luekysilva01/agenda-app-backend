import { z } from 'zod';
import { noXss } from '../../common/helpers/security.helper.js';

export const updateProfileSchema = z.object({
  name: noXss()
    .pipe(
      z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters long')
        .max(100),
    )
    .optional(),
  title: noXss().pipe(z.string().trim().max(100)).optional().nullable(),
  companyName: noXss().pipe(z.string().trim().max(100)).optional().nullable(),
  emailNotifications: z.boolean().optional(),
  phone: noXss().pipe(z.string().trim().max(30)).optional().nullable(),
  slug: noXss().pipe(z.string().trim().max(100)).optional().nullable(),
  documentNumber: noXss()
    .pipe(z.string().trim().max(100))
    .optional()
    .nullable(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
