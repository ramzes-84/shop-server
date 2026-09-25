/** Приводит российский номер телефона в любом бытовом формате к цифрам E.164 без "+" (например, 79000000000). */
export function normalizePhoneToE164(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');

  // Russian-specific common cases:
  // - leading 8 (local) -> replace with 7
  // - 10-digit mobile (e.g. 9000000000) -> prefix with 7
  if (digits.length === 11 && digits.startsWith('8')) {
    return '7' + digits.slice(1);
  }
  if (digits.length === 11 && digits.startsWith('7')) {
    return digits;
  }
  if (digits.length === 10) {
    return '7' + digits;
  }

  // If it already looks like an international number (11-15 digits),
  // return as-is (without a plus). Otherwise return undefined.
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return undefined;
}
