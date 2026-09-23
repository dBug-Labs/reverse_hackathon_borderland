/**
 * UPI intent URI (NPCI deep-link format), used as the payment QR payload.
 *
 * Scanning it in GPay / PhonePe / Paytm / BHIM opens the pay screen with the
 * payee, amount and note (the Team ID) already filled in.
 *
 * Safe to import on both client and server.
 */
export function buildUpiIntent(opts: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}): string {
  // encodeURIComponent (not URLSearchParams): some UPI apps show a "+" for spaces.
  // Keep "@" literal so the VPA reads as-is in apps that don't decode %40.
  const encode = (v: string) => encodeURIComponent(v).replace(/%40/g, '@');
  const params: [string, string][] = [
    ['pa', opts.upiId],
    ['pn', opts.payeeName],
    ['am', opts.amount.toFixed(2)],
    ['cu', 'INR'],
    ['tn', opts.note],
  ];
  return `upi://pay?${params.map(([k, v]) => `${k}=${encode(v)}`).join('&')}`;
}
