import { noXss, escapeSqlLike } from './security.helper.js';

describe('Security Helper', () => {
  describe('escapeSqlLike', () => {
    it('should escape wildcards %, _, and \\', () => {
      expect(escapeSqlLike('100% discount')).toBe('100\\% discount');
      expect(escapeSqlLike('user_name')).toBe('user\\_name');
      expect(escapeSqlLike('path\\to\\file')).toBe('path\\\\to\\\\file');
      expect(escapeSqlLike('normal text')).toBe('normal text');
    });
  });

  describe('noXss schema validator', () => {
    const schema = noXss();

    it('should allow legitimate strings', () => {
      expect(schema.safeParse('Dr. João Silva').success).toBe(true);
      expect(schema.safeParse('Consulta Geral - Avaliação').success).toBe(true);
      expect(schema.safeParse('+55 11 99999-9999').success).toBe(true);
    });

    it('should block HTML tag injection', () => {
      expect(schema.safeParse('<script>alert(1)</script>').success).toBe(false);
      expect(schema.safeParse('<img src=x onerror=alert(1)>').success).toBe(
        false,
      );
      expect(schema.safeParse('<svg onload=alert(1)>').success).toBe(false);
      expect(schema.safeParse('<iframe src="evil.com"></iframe>').success).toBe(
        false,
      );
    });

    it('should block javascript: and dangerous URI schemes', () => {
      expect(schema.safeParse('javascript:alert(1)').success).toBe(false);
      expect(schema.safeParse('javascript:void(0)').success).toBe(false);
      expect(
        schema.safeParse('data:text/html;base64,PHNjcmlwdD4=').success,
      ).toBe(false);
    });

    it('should block standalone event handlers', () => {
      expect(schema.safeParse('onload=alert(1)').success).toBe(false);
      expect(schema.safeParse('onerror=steal()').success).toBe(false);
      expect(schema.safeParse('onclick = evil()').success).toBe(false);
    });
  });
});
