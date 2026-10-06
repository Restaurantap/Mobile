import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SHOP_NAME, SERVICE_RATE, VAT_RATE, money, formatDateTime } from './billing';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export function buildReceiptHtml({ bill, items, totals }) {
  const isClosed = bill?.status === 'CLOSED';
  const title = isClosed ? 'ใบเสร็จรับเงิน' : 'ใบแจ้งยอด (ยังไม่ชำระ)';

  const rows = (items || [])
    .filter((i) => i.status !== 'CANCELLED')
    .map(
      (i) => `
      <tr>
        <td class="name">${esc(i.menu_name)}
          ${i.options_text ? `<div class="opt">+ ${esc(i.options_text)}</div>` : ''}
          ${i.note ? `<div class="opt">หมายเหตุ: ${esc(i.note)}</div>` : ''}
        </td>
        <td class="num">${i.quantity}</td>
        <td class="num">${money(i.unit_price)}</td>
        <td class="num">${money(i.unit_price * i.quantity)}</td>
      </tr>`
    )
    .join('');

  const discountRow =
    totals.discount > 0
      ? `<tr><td>ส่วนลด${bill?.promo_name ? ` (${esc(bill.promo_name)})` : ''}</td><td class="num">-${money(totals.discount)}</td></tr>`
      : '';

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: sans-serif; font-size: 12px; color: #111; padding: 12px; }
        h1 { text-align: center; font-size: 18px; margin: 0; }
        h2 { text-align: center; font-size: 13px; margin: 4px 0 10px; font-weight: normal; }
        .meta div { margin: 2px 0; }
        hr { border: 0; border-top: 1px dashed #666; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; border-bottom: 1px solid #333; padding: 3px 0; }
        td { padding: 3px 0; vertical-align: top; }
        .num { text-align: right; white-space: nowrap; }
        .name .opt { font-size: 10px; color: #555; }
        .sum td { padding: 2px 0; }
        .grand td { font-size: 15px; font-weight: bold; border-top: 1px solid #333; padding-top: 6px; }
        .foot { text-align: center; margin-top: 14px; font-size: 11px; }
      </style>
    </head>
    <body>
      <h1>${esc(SHOP_NAME)}</h1>
      <h2>${title}</h2>
      <div class="meta">
        <div>บิลเลขที่: #${bill?.bill_id ?? '-'}</div>
        <div>โต๊ะ: ${bill?.table_id ?? '-'}</div>
        <div>เปิดบิล: ${formatDateTime(bill?.opened_at)}</div>
        <div>ปิดบิล: ${isClosed ? formatDateTime(bill?.closed_at) : '-'}</div>
        <div>สถานะ: ${isClosed ? 'ปิดแล้ว' : 'เปิดอยู่'}</div>
      </div>
      <hr />
      <table>
        <tr><th>รายการ</th><th class="num">จำนวน</th><th class="num">ราคา</th><th class="num">รวม</th></tr>
        ${rows}
      </table>
      <hr />
      <table class="sum">
        <tr><td>ยอดอาหาร</td><td class="num">${money(totals.subtotal)}</td></tr>
        ${discountRow}
        <tr><td>ค่าบริการ ${Math.round(SERVICE_RATE * 100)}%</td><td class="num">${money(totals.service)}</td></tr>
        <tr><td>ภาษีมูลค่าเพิ่ม ${Math.round(VAT_RATE * 100)}%</td><td class="num">${money(totals.vat)}</td></tr>
        <tr class="grand"><td>ยอดสุทธิ</td><td class="num">${money(totals.total)} บาท</td></tr>
      </table>
      <div class="foot">ขอบคุณที่ใช้บริการ</div>
    </body>
  </html>`;
}

// สร้างไฟล์ PDF แล้วเปิดหน้าต่างแชร์/บันทึก (บันทึกลงเครื่อง, ส่ง LINE ฯลฯ)
// ถ้าเครื่องแชร์ไฟล์ไม่ได้ จะเปิดหน้าต่างพิมพ์ของระบบแทน (เลือก "บันทึกเป็น PDF" ได้)
export async function exportReceiptPdf({ bill, items, totals }) {
  const html = buildReceiptHtml({ bill, items, totals });
  const lineCount = (items || []).length;

  let uri;
  try {
    const result = await Print.printToFileAsync({
      html,
      width: 320,
      height: Math.max(520, 360 + lineCount * 34),
    });
    uri = result.uri;
  } catch (e) {
    throw new Error('สร้างไฟล์ PDF ไม่สำเร็จ: ' + (e?.message || e));
  }

  let canShare = false;
  try {
    canShare = await Sharing.isAvailableAsync();
  } catch (e) {}

  if (canShare) {
    try {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `ใบเสร็จบิล #${bill?.bill_id ?? ''}`,
        UTI: 'com.adobe.pdf',
      });
      return uri;
    } catch (e) {
      // ตกไปใช้หน้าต่างพิมพ์ด้านล่าง
    }
  }

  await Print.printAsync({ html });
  return uri;
}

// เปิดหน้าต่างพิมพ์ของระบบโดยตรง (ต่อเครื่องพิมพ์ หรือเลือกบันทึกเป็น PDF)
export async function printReceipt({ bill, items, totals }) {
  await Print.printAsync({ html: buildReceiptHtml({ bill, items, totals }) });
}