import { z } from 'zod';

const HTML_TAG_REGEX = /<[^>]*>/;
const SUSPICIOUS_SCHEMES_REGEX = /(javascript:|vbscript:|data:\s*text\/html)/i;
const EVENT_HANDLER_REGEX = /\bon[a-z]+\s*=/i;

/**
 * Reusable Zod validator that prevents Cross-Site Scripting (XSS),
 * HTML injection, and JavaScript execution tricks.
 */
export const noXss = (
  message = 'Input contains disallowed HTML tags, scripts, or dangerous characters',
) =>
  z.string().refine(
    (val) => {
      if (!val) return true;
      return (
        !HTML_TAG_REGEX.test(val) &&
        !SUSPICIOUS_SCHEMES_REGEX.test(val) &&
        !EVENT_HANDLER_REGEX.test(val)
      );
    },
    { message },
  );

/**
 * Escapes characters for SQL LIKE / ILIKE queries to prevent wildcard injection.
 */
export function escapeSqlLike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}
