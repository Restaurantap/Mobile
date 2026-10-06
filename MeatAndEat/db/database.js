import { calculateBillTotals } from '../utils/billing';

// ⚠️ ห้ามเปลี่ยนชื่อไฟล์ฐานข้อมูลนี้อีก! ถ้าเปลี่ยน ข้อมูลบิล/ประวัติยอดขายเดิมจะ "หาย" (เหมือนเปิดแอปใหม่)
// ถ้าต้องแก้โครงสร้างตารางในอนาคต ให้เพิ่มขั้นตอนใน runMigrations() ด้านล่างแทน ข้อมูลเดิมจะอยู่ครบ
export const DATABASE_NAME = 'kaze_kiba_bbq_v11.db';

async function addColumnIfMissing(db, table, column, definition) {
  const cols = await db.getAllAsync(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}

// ระบบอัปเดตโครงสร้างฐานข้อมูลแบบไม่ลบข้อมูลเดิม (ใช้เลขเวอร์ชันของ SQLite: PRAGMA user_version)
async function runMigrations(db) {
  const row = await db.getFirstAsync('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await addColumnIfMissing(db, 'bills', 'promo_name', 'TEXT NULL');
    await addColumnIfMissing(db, 'bills', 'discount_type', 'TEXT NULL');
    await addColumnIfMissing(db, 'bills', 'discount_value', 'INTEGER NOT NULL DEFAULT 0');
    await addColumnIfMissing(db, 'bills', 'subtotal', 'REAL NULL');
    await addColumnIfMissing(db, 'bills', 'discount_amount', 'REAL NULL');
    await addColumnIfMissing(db, 'bills', 'service_charge', 'REAL NULL');
    await addColumnIfMissing(db, 'bills', 'vat_amount', 'REAL NULL');
    await addColumnIfMissing(db, 'bills', 'net_total', 'REAL NULL');
    await addColumnIfMissing(db, 'order_items', 'options_text', 'TEXT NULL');
    await db.execAsync('PRAGMA user_version = 1;');
  }

  // อนาคต: ถ้าต้องเพิ่มคอลัมน์/ตารางใหม่ ให้เพิ่มต่อตรงนี้ เช่น
  // if (version < 2) { await addColumnIfMissing(db, 'menus', 'xxx', 'TEXT NULL'); await db.execAsync('PRAGMA user_version = 2;'); }
}

export async function initializeDatabase(db) {
  try {
    await db.execAsync('PRAGMA foreign_keys = ON;');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tables (
        table_number INTEGER PRIMARY KEY,
        capacity INTEGER NOT NULL CHECK(capacity > 0),
        status TEXT NOT NULL CHECK(status IN ('AVAILABLE', 'OCCUPIED'))
      );

      CREATE TABLE IF NOT EXISTS categories (
        category_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS menus (
        menu_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        menu_name TEXT NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        is_available INTEGER NOT NULL DEFAULT 1,
        image_url TEXT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
      );

      -- ตัวเลือกย่อยของเมนู เช่น ขนาดพิเศษ (+฿40) ที่มีผลต่อราคา
      CREATE TABLE IF NOT EXISTS menu_options (
        option_id INTEGER PRIMARY KEY AUTOINCREMENT,
        menu_id INTEGER NOT NULL,
        option_name TEXT NOT NULL,
        extra_price INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (menu_id) REFERENCES menus(menu_id)
      );

      -- โปรโมชัน/ส่วนลด (PERCENT = เปอร์เซ็นต์, AMOUNT = บาท)
      CREATE TABLE IF NOT EXISTS promotions (
        promo_id INTEGER PRIMARY KEY AUTOINCREMENT,
        promo_name TEXT NOT NULL,
        discount_type TEXT NOT NULL CHECK(discount_type IN ('PERCENT', 'AMOUNT')),
        discount_value INTEGER NOT NULL CHECK(discount_value > 0),
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS bills (
        bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id INTEGER NOT NULL,
        opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at TEXT NULL,
        status TEXT NOT NULL CHECK(status IN ('OPEN', 'CLOSED')),
        promo_name TEXT NULL,
        discount_type TEXT NULL,
        discount_value INTEGER NOT NULL DEFAULT 0,
        subtotal REAL NULL,
        discount_amount REAL NULL,
        service_charge REAL NULL,
        vat_amount REAL NULL,
        net_total REAL NULL,
        FOREIGN KEY (table_id) REFERENCES tables(table_number)
      );

      CREATE TABLE IF NOT EXISTS orders (
        order_id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER NOT NULL,
        round_number INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        item_id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        menu_id INTEGER NOT NULL,
        unit_price INTEGER NOT NULL CHECK(unit_price >= 0), -- ราคาต่อหน่วยรวมตัวเลือกแล้ว
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        note TEXT NULL,
        options_text TEXT NULL,
        status TEXT NOT NULL CHECK(status IN ('PENDING', 'COOKING', 'SERVED', 'CANCELLED')),
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (menu_id) REFERENCES menus(menu_id)
      );
    `);

    await runMigrations(db);

    const tableCheck = await db.getFirstAsync('SELECT COUNT(*) as count FROM tables');
    if (tableCheck.count === 0) {
      for (let i = 1; i <= 15; i++) {
        await db.runAsync('INSERT INTO tables (table_number, capacity, status) VALUES (?, ?, ?)', [i, 4, 'AVAILABLE']);
      }

      const cat1 = await db.runAsync('INSERT INTO categories (category_name) VALUES (?)', ['เนื้อสัตว์ปิ้งย่าง']);
      const cat2 = await db.runAsync('INSERT INTO categories (category_name) VALUES (?)', ['เครื่องดื่ม']);
      const cat3 = await db.runAsync('INSERT INTO categories (category_name) VALUES (?)', ['กิมจิและเครื่องเคียง']);
      const cat4 = await db.runAsync('INSERT INTO categories (category_name) VALUES (?)', ['ของทานเล่น']);
      const cat5 = await db.runAsync('INSERT INTO categories (category_name) VALUES (?)', ['ของหวาน']);

      // ใส่ลิงก์รูปภาพตัวอย่าง (สามารถใส่ URL รูปภาพจริง หรือเว้นว่างไว้ได้)
      const initialMenus = [
        [cat1.lastInsertRowId, 'หมูสามชั้นหมักโคชูจัง', 129, 1, null],
        [cat1.lastInsertRowId, 'สันคอหมูสไลด์', 119, 1, null],
        [cat1.lastInsertRowId, 'สันในหมู', 129, 1, null],
        [cat1.lastInsertRowId, 'เบคอนสไลด์', 99, 1, null],
        [cat1.lastInsertRowId, 'สามชั้นสไลด์พันเบคอน', 139, 1, null],
        [cat1.lastInsertRowId, 'หมูหมักงา', 119, 1, null],
        [cat1.lastInsertRowId, 'ตับหมูสไลด์', 79, 1, null],
        [cat1.lastInsertRowId, 'หมูหมักพริกไทยดำ', 89, 1, null],
        [cat1.lastInsertRowId, 'เซี่ยงจี้หมู', 99, 1, null],
        [cat1.lastInsertRowId, 'สันคอวัวออสเตรเลีย', 189, 1, null],
        [cat1.lastInsertRowId, 'เนื้อริบอายหมักซอสเกาหลี', 199, 1, null],
        [cat1.lastInsertRowId, 'สันคอเนื้อ', 99, 1, null],
        [cat1.lastInsertRowId, 'เสือร้องไห้ออสเตรเลีย', 219, 1, null],
        [cat1.lastInsertRowId, 'เนื้อวัวสไลด์ติดมัน', 159, 1, null],
        [cat1.lastInsertRowId, 'เนื้อวัวหมักนุ่ม', 149, 1, null],
        [cat1.lastInsertRowId, 'ลิ้นวัว', 179, 1, null],
        [cat1.lastInsertRowId, 'ไก่หมักซอสเผ็ด', 89, 1, null],
        [cat1.lastInsertRowId, 'สันในไก่', 99, 1, null],
        [cat1.lastInsertRowId, 'กุ้งแม่น้ำ', 229, 1, null],
        [cat1.lastInsertRowId, 'ปีกไก่บนหมักเกลือ', 89, 1, null],
        [cat1.lastInsertRowId, 'ไก่หมักซอสบาร์บีคิว', 99, 1, null],

        [cat2.lastInsertRowId, 'ชาอูหลง', 30, 1, null],
        [cat2.lastInsertRowId, 'น้ำพั้นซ์', 30, 1, null],
        [cat2.lastInsertRowId, 'ชามะนาว', 30, 1, null],
        [cat2.lastInsertRowId, 'ชาไทย', 30, 1, null],
        [cat2.lastInsertRowId, 'ชาเขียว', 30, 1, null],
        [cat2.lastInsertRowId, 'น้ำแดงแฟนต้า', 25, 1, null],
        [cat2.lastInsertRowId, 'น้ำเขียวแฟนต้า', 25, 1, null],
        [cat2.lastInsertRowId, 'น้ำส้มแฟนต้า', 25, 1, null],
        [cat2.lastInsertRowId, 'น้ำสไปร์ท', 25, 1, null],
        [cat2.lastInsertRowId, 'น้ำโค้ก', 25, 1, null],
        [cat2.lastInsertRowId, 'โซจู', 169, 1, null],
        [cat2.lastInsertRowId, 'น้ำเปล่า', 15, 1, null],

        [cat3.lastInsertRowId, 'กิมจิผักกาดขาว', 40, 1, null],
        [cat3.lastInsertRowId, 'พริกหวาน', 19, 1, null],
        [cat3.lastInsertRowId, 'ฟักทอง', 19, 1, null],
        [cat3.lastInsertRowId, 'เห็ดออรินจิ', 19, 1, null],
        [cat3.lastInsertRowId, 'เห็ดเข็มทอง', 19, 1, null],
        [cat3.lastInsertRowId, 'ข้าวโพดหวาน', 19, 1, null],
        [cat3.lastInsertRowId, 'มันฝรั่ง', 19, 1, null],
        [cat3.lastInsertRowId, 'ผักกาดแก้ว', 19, 1, null],
        [cat3.lastInsertRowId, 'ผักคอส', 19, 1, null],
        [cat3.lastInsertRowId, 'มะเขือยาว', 19, 1, null],
        [cat3.lastInsertRowId, 'ใบงา', 19, 1, null],
        [cat3.lastInsertRowId, 'พริกชีฟ้าเขียว', 19, 1, null],
        [cat3.lastInsertRowId, 'กระเทียมสด', 19, 1, null],
        [cat3.lastInsertRowId, 'แครอท', 19, 1, null],
        [cat3.lastInsertRowId, 'เห็ดหอม', 19, 1, null],
        [cat3.lastInsertRowId, 'หัวหอมใหญ่', 19, 1, null],
        [cat3.lastInsertRowId, 'ต้นหอมญี่ปุ่น', 19, 1, null],


        [cat4.lastInsertRowId, 'ต็อกบกกี', 79, 1, null],
        [cat4.lastInsertRowId, 'ไข่ตุ๋นเกาหลี', 59, 1, null],
        [cat4.lastInsertRowId, 'พาจอน', 89, 1, null],
        [cat4.lastInsertRowId, 'เกี๊ยวซ่า', 89, 1, null],
        [cat4.lastInsertRowId, 'คิมบับ', 129, 1, null],
        [cat4.lastInsertRowId, 'ออมุก', 59, 1, null],
        [cat4.lastInsertRowId, 'หนังไก่ทอด', 59, 1, null],
        [cat4.lastInsertRowId, 'ชีสบอล', 59, 1, null],
        [cat4.lastInsertRowId, 'นักเก็ต', 59, 1, null],
        [cat4.lastInsertRowId, 'เฟรนซ์ฟรายส์', 59, 1, null],
        [cat4.lastInsertRowId, 'ไก่ทอดซอสเกาหลี', 89, 1, null],
        [cat4.lastInsertRowId, 'ทวิกิม', 59, 1, null],
        [cat4.lastInsertRowId, 'คิมมาริ', 69, 1, null],

        [cat5.lastInsertRowId, 'ไอศกรีมวนิลา', 49, 1, null],
        [cat5.lastInsertRowId, 'ไอศกรีมช็อคโกแลต', 49, 1, null],
        [cat5.lastInsertRowId, 'ไอศกรีมสตรอว์เบอร์รี่', 49, 1, null],
        [cat5.lastInsertRowId, 'ไอศกรีมมะนาว', 49, 1, null],
        [cat5.lastInsertRowId, 'ไอศกรีมนมสดฮ็อกไกโด', 49, 1, null],
        [cat5.lastInsertRowId, 'ไอศกรีมช็อคโกแลตชิฟ', 49, 1, null],
        [cat5.lastInsertRowId, 'ไอศกรีมชาไทย', 49, 1, null],
        [cat5.lastInsertRowId, 'น้ำแข็งใส', 59, 1, null],
        [cat5.lastInsertRowId, 'ลูกตาลลอยแก้ว', 59, 1, null],
        [cat5.lastInsertRowId, 'มาชเมลโล่เคลือบช็อคโกแลต', 69, 1, null],
      ];

      for (const menu of initialMenus) {
        await db.runAsync('INSERT INTO menus (category_id, menu_name, price, is_available, image_url) VALUES (?, ?, ?, ?, ?)', menu);
      }

      // ตัวเลือกย่อยตัวอย่าง (แก้ชื่อ/ราคาได้ตามต้องการ) — ใส่ให้ทุกเมนูในหมวดนั้น
      const optionSeeds = [
        [cat1.lastInsertRowId, [['ขนาดพิเศษ (เพิ่มเนื้อ)', 40]]],
        [cat2.lastInsertRowId, [['ขนาดใหญ่', 10], ['ไม่ใส่น้ำแข็ง', 0]]],
        [cat4.lastInsertRowId, [['ขนาดพิเศษ', 30]]],
        [cat5.lastInsertRowId, [['เพิ่มท็อปปิ้ง', 15]]],
      ];
      for (const [catId, opts] of optionSeeds) {
        const menusInCat = await db.getAllAsync('SELECT menu_id FROM menus WHERE category_id = ?', [catId]);
        for (const m of menusInCat) {
          for (const [name, extra] of opts) {
            await db.runAsync('INSERT INTO menu_options (menu_id, option_name, extra_price) VALUES (?, ?, ?)', [m.menu_id, name, extra]);
          }
        }
      }

      // โปรโมชันตัวอย่าง
      const promoSeeds = [
        ['ส่วนลด 10%', 'PERCENT', 10],
        ['สมาชิกลด 5%', 'PERCENT', 5],
        ['ลดทันที 50 บาท', 'AMOUNT', 50],
      ];
      for (const p of promoSeeds) {
        await db.runAsync('INSERT INTO promotions (promo_name, discount_type, discount_value) VALUES (?, ?, ?)', p);
      }
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

export async function fetchAllTables(db) {
  return await db.getAllAsync('SELECT * FROM tables ORDER BY table_number ASC');
}

export async function fetchActiveBillByTable(db, tableNumber) {
  return await db.getFirstAsync(
    'SELECT * FROM bills WHERE table_id = ? AND status = ? ORDER BY bill_id ASC',
    [tableNumber, 'OPEN']
  );
}

// กันเปิดบิลซ้ำ: ถ้าเรียกซ้อนกันสำหรับโต๊ะเดียวกัน จะได้บิลใบเดียวกัน
const pendingOpenBills = {};

export async function openTableBill(db, tableNumber) {
  if (pendingOpenBills[tableNumber]) return pendingOpenBills[tableNumber];

  pendingOpenBills[tableNumber] = (async () => {
    try {
      const existing = await db.getFirstAsync(
        'SELECT * FROM bills WHERE table_id = ? AND status = ? ORDER BY bill_id ASC',
        [tableNumber, 'OPEN']
      );
      if (existing) {
        await db.runAsync('UPDATE tables SET status = ? WHERE table_number = ?', ['OCCUPIED', tableNumber]);
        return existing;
      }

      const result = await db.runAsync('INSERT INTO bills (table_id, status) VALUES (?, ?)', [tableNumber, 'OPEN']);
      await db.runAsync('UPDATE tables SET status = ? WHERE table_number = ?', ['OCCUPIED', tableNumber]);
      return await db.getFirstAsync('SELECT * FROM bills WHERE bill_id = ?', [result.lastInsertRowId]);
    } finally {
      delete pendingOpenBills[tableNumber];
    }
  })();

  return pendingOpenBills[tableNumber];
}

export async function fetchCategories(db) {
  return await db.getAllAsync('SELECT * FROM categories');
}

export async function fetchMenusByCategory(db, catId) {
  return await db.getAllAsync('SELECT * FROM menus WHERE category_id = ?', [catId]);
}

// ตัวเลือกย่อยของทุกเมนู (โหลดครั้งเดียวแล้วจัดกลุ่มตาม menu_id ที่หน้าจอ)
export async function fetchAllMenuOptions(db) {
  try {
    return await db.getAllAsync('SELECT * FROM menu_options ORDER BY menu_id ASC, option_id ASC');
  } catch (error) {
    return [];
  }
}

export async function fetchPromotions(db) {
  try {
    return await db.getAllAsync('SELECT * FROM promotions WHERE is_active = 1 ORDER BY promo_id ASC');
  } catch (error) {
    return [];
  }
}

// ใส่/ถอดโปรโมชันของบิล (promoId = null คือไม่ใช้โปร) — ทำได้เฉพาะบิลที่ยังเปิดอยู่
export async function applyPromotionToBill(db, billId, promoId) {
  const bill = await db.getFirstAsync('SELECT status FROM bills WHERE bill_id = ?', [billId]);
  if (!bill || bill.status !== 'OPEN') return;

  if (!promoId) {
    await db.runAsync(
      'UPDATE bills SET promo_name = NULL, discount_type = NULL, discount_value = 0 WHERE bill_id = ?',
      [billId]
    );
    return;
  }
  const promo = await db.getFirstAsync('SELECT * FROM promotions WHERE promo_id = ?', [promoId]);
  if (!promo) return;
  await db.runAsync(
    'UPDATE bills SET promo_name = ?, discount_type = ?, discount_value = ? WHERE bill_id = ?',
    [promo.promo_name, promo.discount_type, promo.discount_value, billId]
  );
}

// สรุปบิล: ข้อมูลบิล + รายการ + ยอดคิดเงิน (บิลที่ปิดแล้วใช้ตัวเลขที่บันทึกไว้ตอนปิด)
export async function fetchBillSummary(db, billId) {
  const bill = await db.getFirstAsync('SELECT * FROM bills WHERE bill_id = ?', [billId]);

  const totalResult = await db.getFirstAsync(
    `SELECT SUM(oi.unit_price * oi.quantity) as grand_total 
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.order_id
     WHERE o.bill_id = ? AND oi.status != 'CANCELLED'`,
    [billId]
  );

  const items = await db.getAllAsync(
    `SELECT oi.*, m.menu_name, o.round_number 
     FROM order_items oi
     JOIN menus m ON oi.menu_id = m.menu_id
     JOIN orders o ON oi.order_id = o.order_id
     WHERE o.bill_id = ?
     ORDER BY o.round_number ASC, oi.item_id ASC`,
    [billId]
  );

  const subtotal = totalResult?.grand_total || 0;

  let totals;
  if (bill && bill.status === 'CLOSED' && bill.net_total != null) {
    totals = {
      subtotal: bill.subtotal,
      discount: bill.discount_amount || 0,
      afterDiscount: bill.subtotal - (bill.discount_amount || 0),
      service: bill.service_charge || 0,
      vat: bill.vat_amount || 0,
      total: bill.net_total,
    };
  } else {
    totals = calculateBillTotals(subtotal, bill?.discount_type, bill?.discount_value);
  }

  return { grandTotal: subtotal, bill, totals, items };
}

export async function createOrderTransaction(db, billId, itemsToOrder) {
  await db.withTransactionAsync(async () => {
    const bill = await db.getFirstAsync('SELECT status FROM bills WHERE bill_id = ?', [billId]);
    if (!bill || bill.status !== 'OPEN') {
      throw new Error('บิลนี้ถูกปิดแล้ว กรุณาสลับโต๊ะหรือรีเฟรชเพื่อเปิดบิลใหม่');
    }

    const lastRound = await db.getFirstAsync('SELECT MAX(round_number) as max_round FROM orders WHERE bill_id = ?', [billId]);
    const nextRound = (lastRound?.max_round || 0) + 1;

    const orderResult = await db.runAsync('INSERT INTO orders (bill_id, round_number) VALUES (?, ?)', [billId, nextRound]);

    for (const item of itemsToOrder) {
      const unitPrice = item.unitPrice ?? item.menu.price;
      const optionsText = item.options && item.options.length > 0
        ? item.options.map((o) => o.option_name).join(', ')
        : null;
      await db.runAsync(
        `INSERT INTO order_items (order_id, menu_id, unit_price, quantity, note, options_text, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderResult.lastInsertRowId, item.menu.menu_id, unitPrice, item.quantity, item.note || null, optionsText, 'PENDING']
      );
    }
  });
}

// ปิดบิล: บันทึกยอดคิดเงินทั้งหมด (ยอดอาหาร/ส่วนลด/ค่าบริการ/VAT/สุทธิ) และเวลาปิด
export async function closeBillTransaction(db, billId, tableNumber) {
  await db.withTransactionAsync(async () => {
    const bill = await db.getFirstAsync('SELECT * FROM bills WHERE bill_id = ?', [billId]);
    if (!bill || bill.status !== 'OPEN') return;

    const sumRow = await db.getFirstAsync(
      `SELECT SUM(oi.unit_price * oi.quantity) as grand_total 
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.order_id
       WHERE o.bill_id = ? AND oi.status != 'CANCELLED'`,
      [billId]
    );
    const t = calculateBillTotals(sumRow?.grand_total || 0, bill.discount_type, bill.discount_value);

    await db.runAsync(
      `UPDATE bills 
       SET status = ?, closed_at = CURRENT_TIMESTAMP,
           subtotal = ?, discount_amount = ?, service_charge = ?, vat_amount = ?, net_total = ?
       WHERE bill_id = ?`,
      ['CLOSED', t.subtotal, t.discount, t.service, t.vat, t.total, billId]
    );

    // เคลียร์โต๊ะเฉพาะเมื่อไม่มีบิลเปิดค้างของโต๊ะนี้แล้ว
    const stillOpen = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM bills WHERE table_id = ? AND status = ?',
      [tableNumber, 'OPEN']
    );
    if (stillOpen.count === 0) {
      await db.runAsync('UPDATE tables SET status = ? WHERE table_number = ?', ['AVAILABLE', tableNumber]);
    }
  });
}

export async function fetchKitchenOrders(db) {
  return await db.getAllAsync(`
    SELECT oi.item_id, oi.quantity, oi.note, oi.options_text, oi.status, m.menu_name, o.round_number, o.created_at, b.table_id
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    JOIN bills b ON o.bill_id = b.bill_id
    JOIN menus m ON oi.menu_id = m.menu_id
    WHERE b.status = 'OPEN' 
      AND oi.status != 'CANCELLED'
      AND oi.status != 'SERVED'
    ORDER BY o.created_at ASC, oi.item_id ASC
  `);
}

export async function updateOrderItemStatus(db, itemId, status) {
  await db.runAsync('UPDATE order_items SET status = ? WHERE item_id = ?', [status, itemId]);
}

export async function fetchAllMenusForManage(db) {
  try {
    return await db.getAllAsync(`
      SELECT m.menu_id, m.menu_name, m.price, m.is_available, c.category_name 
      FROM menus m
      LEFT JOIN categories c ON m.category_id = c.category_id
      ORDER BY m.menu_id ASC
    `);
  } catch (error) {
    return [];
  }
}

export async function updateMenuAvailability(db, menuId, isAvailable) {
  try {
    await db.runAsync('UPDATE menus SET is_available = ? WHERE menu_id = ?', [isAvailable, menuId]);
  } catch (error) {}
}

// 📌 บิลที่ยังเปิดอยู่ทั้งหมด พร้อมยอดอาหารและข้อมูลโปรโมชัน (หน้าแคชเชียร์)
export async function fetchOpenBillsWithTotals(db) {
  try {
    return await db.getAllAsync(`
      SELECT b.bill_id, b.table_id, b.opened_at, b.status,
             b.promo_name, b.discount_type, b.discount_value,
             COALESCE(SUM(CASE WHEN oi.status != 'CANCELLED' THEN oi.unit_price * oi.quantity END), 0) as subtotal
      FROM bills b
      LEFT JOIN orders o ON b.bill_id = o.bill_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE b.status = 'OPEN'
      GROUP BY b.bill_id
      ORDER BY b.table_id ASC, b.bill_id ASC
    `);
  } catch (error) {
    console.error('Error fetchOpenBillsWithTotals:', error);
    return [];
  }
}

export async function fetchClosedBills(db) {
  try {
    return await db.getAllAsync(`
      SELECT b.bill_id, b.table_id, b.opened_at, b.closed_at, b.status, b.promo_name, b.net_total,
             COALESCE(SUM(CASE WHEN oi.status != 'CANCELLED' THEN oi.unit_price * oi.quantity END), 0) as subtotal
      FROM bills b
      LEFT JOIN orders o ON b.bill_id = o.bill_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE b.status = 'CLOSED'
      GROUP BY b.bill_id
      ORDER BY b.closed_at DESC
    `);
  } catch (error) {
    return [];
  }
}

export async function resetDatabase(db) {
  try {
    await db.execAsync('PRAGMA foreign_keys = OFF;');

    await db.execAsync('DROP TABLE IF EXISTS order_items;');
    await db.execAsync('DROP TABLE IF EXISTS orders;');
    await db.execAsync('DROP TABLE IF EXISTS bills;');
    await db.execAsync('DROP TABLE IF EXISTS menu_options;');
    await db.execAsync('DROP TABLE IF EXISTS menus;');
    await db.execAsync('DROP TABLE IF EXISTS promotions;');
    await db.execAsync('DROP TABLE IF EXISTS categories;');
    await db.execAsync('DROP TABLE IF EXISTS tables;');

    await db.execAsync('PRAGMA foreign_keys = ON;');

    await initializeDatabase(db);
    console.log('รีเซ็ตฐานข้อมูลสำเร็จเรียบร้อย!');
  } catch (error) {
    console.error('Error resetting database:', error);
  }
}

// 📌 ยอดขายรายวัน แยกตามหมวดหมู่อาหาร (ยอดอาหารก่อนส่วนลด/ภาษี)
// dateStr รูปแบบ 'YYYY-MM-DD' (ตามเวลาเครื่อง)
export async function fetchDailySalesByCategory(db, dateStr) {
  try {
    return await db.getAllAsync(`
      SELECT c.category_name, 
             SUM(oi.quantity) as total_quantity, 
             SUM(oi.unit_price * oi.quantity) as total_sales
      FROM bills b
      JOIN orders o ON b.bill_id = o.bill_id
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN menus m ON oi.menu_id = m.menu_id
      JOIN categories c ON m.category_id = c.category_id
      WHERE b.status = 'CLOSED' 
        AND oi.status != 'CANCELLED'
        AND date(b.closed_at, 'localtime') = ?
      GROUP BY c.category_id
      ORDER BY total_sales DESC
    `, [dateStr]);
  } catch (error) {
    console.error('Error fetchDailySalesByCategory:', error);
    return [];
  }
}

// 📌 สรุปการเงินรายวัน: จำนวนบิล ส่วนลด ค่าบริการ VAT ยอดสุทธิ
export async function fetchDailyBillSummary(db, dateStr) {
  try {
    return await db.getFirstAsync(`
      SELECT COUNT(*) as bill_count,
             COALESCE(SUM(subtotal), 0) as subtotal,
             COALESCE(SUM(discount_amount), 0) as discount,
             COALESCE(SUM(service_charge), 0) as service,
             COALESCE(SUM(vat_amount), 0) as vat,
             COALESCE(SUM(net_total), 0) as net
      FROM bills
      WHERE status = 'CLOSED' AND date(closed_at, 'localtime') = ?
    `, [dateStr]);
  } catch (error) {
    console.error('Error fetchDailyBillSummary:', error);
    return null;
  }
}

// 📌 ประวัติยอดขายทุกวัน (เรียงจากวันล่าสุด) — ข้อมูลมาจากบิลที่ปิดแล้วซึ่งเก็บถาวรในฐานข้อมูล
export async function fetchDailyHistory(db) {
  try {
    return await db.getAllAsync(`
      SELECT date(closed_at, 'localtime') as day,
             COUNT(*) as bill_count,
             COALESCE(SUM(net_total), 0) as net
      FROM bills
      WHERE status = 'CLOSED' AND closed_at IS NOT NULL
      GROUP BY day
      ORDER BY day DESC
    `);
  } catch (error) {
    console.error('Error fetchDailyHistory:', error);
    return [];
  }
}