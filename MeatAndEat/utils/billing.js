export const SHOP_NAME = 'Kaze Kiba BBQ';
export const SERVICE_RATE = 0.10; 
export const VAT_RATE = 0.07; 

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;


export function calculateDiscount(subtotal, discountType, discountValue) {
  if (!discountType || !discountValue) return 0;
  const raw = discountType === 'PERCENT' ? (subtotal * discountValue) / 100 : discountValue;
  return round2(Math.min(Math.max(raw, 0), subtotal));
}


export function calculateBillTotals(subtotal, discountType, discountValue) {
  const sub = subtotal || 0;
  const discount = calculateDiscount(sub, discountType, discountValue);
  const afterDiscount = round2(sub - discount);
  const service = round2(afterDiscount * SERVICE_RATE);
  const vat = round2((afterDiscount + service) * VAT_RATE);
  const total = round2(afterDiscount + service + vat);
  return { subtotal: sub, discount, afterDiscount, service, vat, total };
}


export const money = (n) => {
  const [intPart, decPart] = Number(n || 0).toFixed(2).split('.');
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + decPart;
};


const pad = (n) => String(n).padStart(2, '0');

export function parseDbDate(str) {
  if (!str) return null;
  const d = new Date(String(str).replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? null : d;
}


export function formatDateTime(str) {
  const d = parseDbDate(str);
  if (!d) return '-';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


export function formatTime(str) {
  const d = parseDbDate(str);
  if (!d) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}