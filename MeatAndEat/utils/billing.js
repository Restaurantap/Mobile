// ===== ตั้งค่าร้าน / อัตราภาษี (แก้ตรงนี้ที่เดียว) =====
export const SHOP_NAME = 'Kaze Kiba BBQ';
export const SERVICE_RATE = 0.10; // ค่าบริการ 10%
export const VAT_RATE = 0.07; // ภาษีมูลค่าเพิ่ม 7%

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// คำนวณส่วนลดเป็นจำนวนเงิน (ไม่เกินยอดอาหาร)
export function calculateDiscount(subtotal, discountType, discountValue) {
  if (!discountType || !discountValue) return 0;
  const raw = discountType === 'PERCENT' ? (subtotal * discountValue) / 100 : discountValue;
  return round2(Math.min(Math.max(raw, 0), subtotal));
}

// ลำดับคิด: ยอดอาหาร -> หักส่วนลด -> บวกค่าบริการ -> บวก VAT (คิดจากยอดหลังบวกค่าบริการ)
export function calculateBillTotals(subtotal, discountType, discountValue) {
  const sub = subtotal || 0;
  const discount = calculateDiscount(sub, discountType, discountValue);
  const afterDiscount = round2(sub - discount);
  const service = round2(afterDiscount * SERVICE_RATE);
  const vat = round2((afterDiscount + service) * VAT_RATE);
  const total = round2(afterDiscount + service + vat);
  return { subtotal: sub, discount, afterDiscount, service, vat, total };
}

// จัดรูปแบบเงิน เช่น 1,234.50
export const money = (n) => {
  const [intPart, decPart] = Number(n || 0).toFixed(2).split('.');
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + decPart;
};

// ===== วันที่/เวลา =====
// ฐานข้อมูลเก็บเวลาเป็น UTC (CURRENT_TIMESTAMP) จึงแปลงเป็นเวลาเครื่องก่อนแสดง
const pad = (n) => String(n).padStart(2, '0');

export function parseDbDate(str) {
  if (!str) return null;
  const d = new Date(String(str).replace(' ', 'T') + 'Z');
  return isNaN(d.getTime()) ? null : d;
}

// 29/09/2569 14:35
export function formatDateTime(str) {
  const d = parseDbDate(str);
  if (!d) return '-';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 14:35
export function formatTime(str) {
  const d = parseDbDate(str);
  if (!d) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}