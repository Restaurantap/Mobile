import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Modal, 
  ScrollView, 
  Alert, 
  StyleSheet 
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  fetchClosedBills,
  fetchOpenBillsWithTotals,
  fetchBillSummary,
  fetchPromotions,
  applyPromotionToBill,
  closeBillTransaction,
} from '../db/database';
import { money, formatDateTime, calculateBillTotals, SERVICE_RATE, VAT_RATE } from '../utils/billing';
import { exportReceiptPdf } from '../utils/receipt';

// ป้ายสถานะบิล: เปิดอยู่ / ปิดแล้ว
function StatusBadge({ status }) {
  const isOpen = status === 'OPEN';
  return (
    <View style={[styles.badge, isOpen ? styles.badgeOpen : styles.badgeClosed]}>
      <Text style={[styles.badgeText, { color: isOpen ? '#e8590c' : '#495057' }]}>
        {isOpen ? 'เปิดอยู่' : 'ปิดแล้ว'}
      </Text>
    </View>
  );
}

export default function CashierScreen({ onRefreshTables }) {
  const db = useSQLiteContext();
  const [subTab, setSubTab] = useState('ACTIVE');
  const [openBills, setOpenBills] = useState([]);
  const [closedBills, setClosedBills] = useState([]);
  const [promotions, setPromotions] = useState([]);
  
  const [selectedBill, setSelectedBill] = useState(null);
  const [billDetail, setBillDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadOpenBills = async () => {
    const list = await fetchOpenBillsWithTotals(db);
    setOpenBills(list);
  };

  const loadClosedBills = async () => {
    const list = await fetchClosedBills(db);
    setClosedBills(list);
  };

  useEffect(() => {
    fetchPromotions(db).then(setPromotions);
  }, []);

  // โหลดข้อมูลสดทุกครั้งที่เข้าแท็บ และรีเฟรชอัตโนมัติทุก 3 วินาทีในแท็บ "กำลังทานอยู่"
  useEffect(() => {
    if (subTab === 'ACTIVE') {
      loadOpenBills();
      const interval = setInterval(loadOpenBills, 3000);
      return () => clearInterval(interval);
    } else {
      loadClosedBills();
    }
  }, [subTab]);

  // เปิดรายละเอียดด้วย bill_id ตรงๆ ของใบที่กด
  const handleOpenBillDetail = async (billId, tableNum, isClosed = false) => {
    const summary = await fetchBillSummary(db, billId);
    setSelectedBill({ bill_id: billId, table_id: tableNum, isClosed });
    setBillDetail(summary);
    setShowDetailModal(true);
  };

  // เลือก/ยกเลิกโปรโมชันของบิลที่เปิดอยู่
  const handleSelectPromo = async (promoId) => {
    await applyPromotionToBill(db, selectedBill.bill_id, promoId);
    const summary = await fetchBillSummary(db, selectedBill.bill_id);
    setBillDetail(summary);
    loadOpenBills();
  };

  const handleExportReceipt = async (summary) => {
    try {
      await exportReceiptPdf({ bill: summary.bill, items: summary.items, totals: summary.totals });
    } catch (e) {
      Alert.alert('สร้างใบเสร็จไม่สำเร็จ', String(e?.message || e));
    }
  };

  const handleCloseBill = (tableNum, billId) => {
    Alert.alert('ยืนยันการปิดบิล', `ต้องการปิดบิล #${billId} และเคลียร์โต๊ะ ${tableNum} หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ยืนยันปิดบิล',
        style: 'destructive',
        onPress: async () => {
          await closeBillTransaction(db, billId, tableNum);
          setShowDetailModal(false);
          if (onRefreshTables) onRefreshTables();
          loadOpenBills();
          if (subTab === 'HISTORY') loadClosedBills();

          Alert.alert('สำเร็จ', `ปิดบิลโต๊ะ ${tableNum} เรียบร้อยแล้ว`, [
            { text: 'ปิด', style: 'cancel' },
            {
              text: '🧾 บันทึกใบเสร็จ PDF',
              onPress: async () => {
                const summary = await fetchBillSummary(db, billId);
                handleExportReceipt(summary);
              },
            },
          ]);
        }
      }
    ]);
  };

  const bill = billDetail?.bill;
  const totals = billDetail?.totals || calculateBillTotals(0);
  const detailIsOpen = bill ? bill.status === 'OPEN' : !selectedBill?.isClosed;

  return (
    <View style={styles.container}>
      <View style={styles.subTabRow}>
        <TouchableOpacity 
          style={[styles.subTabBtn, subTab === 'ACTIVE' && styles.activeSubTab]}
          onPress={() => setSubTab('ACTIVE')}
        >
          <Text style={[styles.subTabText, subTab === 'ACTIVE' && styles.activeSubTabText]}>
            โต๊ะที่กำลังทานอยู่ ({openBills.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.subTabBtn, subTab === 'HISTORY' && styles.activeSubTab]}
          onPress={() => setSubTab('HISTORY')}
        >
          <Text style={[styles.subTabText, subTab === 'HISTORY' && styles.activeSubTabText]}>
            ประวัติบิลย้อนหลัง
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'ACTIVE' ? (
        <FlatList
          data={openBills}
          keyExtractor={(item) => item.bill_id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีโต๊ะที่กำลังใช้งานในขณะนี้</Text>}
          renderItem={({ item }) => {
            const t = calculateBillTotals(item.subtotal, item.discount_type, item.discount_value);
            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle}>โต๊ะ {item.table_id} (บิล # {item.bill_id})</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.cardSubtitle}>เปิดเมื่อ: {formatDateTime(item.opened_at)}</Text>
                  {item.subtotal > 0 ? (
                    <>
                      <Text style={styles.grandTotalText}>ยอดสุทธิ: {money(t.total)} บาท</Text>
                      {item.promo_name ? <Text style={styles.promoText}>🏷 {item.promo_name}</Text> : null}
                    </>
                  ) : (
                    <Text style={styles.cardSubtitle}>ยังไม่มีรายการสั่ง</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => handleOpenBillDetail(item.bill_id, item.table_id, false)}
                >
                  <Text style={styles.actionBtnText}>ตรวจสอบ/ปิดบิล</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={closedBills}
          keyExtractor={(item) => item.bill_id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีประวัติการปิดบิล</Text>}
          renderItem={({ item }) => (
            <View style={[styles.card, { borderLeftColor: '#2b8a3e' }]}>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>โต๊ะ {item.table_id} (บิล # {item.bill_id})</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.cardSubtitle}>เปิด: {formatDateTime(item.opened_at)}</Text>
                <Text style={styles.cardSubtitle}>ปิด: {formatDateTime(item.closed_at)}</Text>
                <Text style={styles.grandTotalText}>ยอดสุทธิ: {money(item.net_total ?? item.subtotal)} บาท</Text>
                {item.promo_name ? <Text style={styles.promoText}>🏷 {item.promo_name}</Text> : null}
              </View>
              <TouchableOpacity 
                style={styles.detailBtn}
                onPress={() => handleOpenBillDetail(item.bill_id, item.table_id, true)}
              >
                <Text style={styles.detailBtnText}>ดูรายการ</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Modal visible={showDetailModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {detailIsOpen ? '💰' : '📜'} โต๊ะ {selectedBill?.table_id} (บิล # {selectedBill?.bill_id})
            </Text>

            <View style={styles.infoBox}>
              <View style={styles.titleRow}>
                <Text style={styles.infoLine}>สถานะบิล</Text>
                <StatusBadge status={bill?.status || (detailIsOpen ? 'OPEN' : 'CLOSED')} />
              </View>
              <Text style={styles.infoLine}>เปิดบิล: {formatDateTime(bill?.opened_at)}</Text>
              <Text style={styles.infoLine}>ปิดบิล: {detailIsOpen ? '-' : formatDateTime(bill?.closed_at)}</Text>
            </View>

            <ScrollView style={{ maxHeight: 200, marginVertical: 6 }}>
              {(billDetail?.items || []).length === 0 ? (
                <Text style={styles.emptyText}>ยังไม่มีรายการสั่งในบิลนี้</Text>
              ) : (
                (billDetail?.items || []).map((item, idx) => (
                  <View key={idx} style={styles.modalItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: 'bold' }}>รอบ {item.round_number}: {item.menu_name}</Text>
                      {item.options_text ? <Text style={{ fontSize: 11, color: '#1c7ed6' }}>ตัวเลือก: {item.options_text}</Text> : null}
                      {item.note ? <Text style={{ fontSize: 11, color: '#f59f00' }}>หมายเหตุ: {item.note}</Text> : null}
                      <Text style={{ fontSize: 11, color: '#868e96' }}>สถานะ: {item.status}</Text>
                    </View>
                    <Text>{item.quantity} x {item.unit_price} = {item.quantity * item.unit_price} ฿</Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* เลือกโปรโมชัน (เฉพาะบิลที่ยังเปิดอยู่) */}
            {detailIsOpen && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.promoTitle}>โปรโมชัน / ส่วนลด</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                  <TouchableOpacity
                    style={[styles.promoChip, !bill?.promo_name && styles.promoChipActive]}
                    onPress={() => handleSelectPromo(null)}
                  >
                    <Text style={[styles.promoChipText, !bill?.promo_name && styles.promoChipTextActive]}>ไม่ใช้</Text>
                  </TouchableOpacity>
                  {promotions.map((p) => {
                    const active = bill?.promo_name === p.promo_name;
                    return (
                      <TouchableOpacity
                        key={p.promo_id}
                        style={[styles.promoChip, active && styles.promoChipActive]}
                        onPress={() => handleSelectPromo(p.promo_id)}
                      >
                        <Text style={[styles.promoChipText, active && styles.promoChipTextActive]}>{p.promo_name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            {!detailIsOpen && bill?.promo_name ? (
              <Text style={styles.promoText}>🏷 โปรโมชันที่ใช้: {bill.promo_name}</Text>
            ) : null}

            {/* สรุปยอด */}
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>ยอดอาหาร</Text>
                <Text style={styles.totalValue}>{money(totals.subtotal)}</Text>
              </View>
              {totals.discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>ส่วนลด{bill?.promo_name ? ` (${bill.promo_name})` : ''}</Text>
                  <Text style={[styles.totalValue, { color: '#2b8a3e' }]}>-{money(totals.discount)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>ค่าบริการ {Math.round(SERVICE_RATE * 100)}%</Text>
                <Text style={styles.totalValue}>{money(totals.service)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>ภาษีมูลค่าเพิ่ม {Math.round(VAT_RATE * 100)}%</Text>
                <Text style={styles.totalValue}>{money(totals.vat)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandRow]}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>ยอดสุทธิ:</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#e03131' }}>{money(totals.total)} บาท</Text>
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#adb5bd' }]} 
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>ปิดหน้าต่าง</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#1c7ed6' }]} 
                onPress={() => billDetail && handleExportReceipt(billDetail)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>🧾 ใบเสร็จ PDF</Text>
              </TouchableOpacity>
            </View>

            {detailIsOpen && (
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#d9480f', marginTop: 8 }]} 
                onPress={() => handleCloseBill(selectedBill.table_id, selectedBill.bill_id)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>ชำระเงิน/ปิดบิลโต๊ะนี้</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: 'transparent' },
  subTabRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  subTabBtn: { flex: 1, padding: 10, backgroundColor: 'rgba(233,236,239,0.85)', borderRadius: 6, alignItems: 'center' },
  activeSubTab: { backgroundColor: '#2b8a3e' },
  subTabText: { fontWeight: 'bold', color: '#495057' },
  activeSubTabText: { color: '#fff' },
  emptyText: { textAlign: 'center', color: '#495057', marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.85)', padding: 14, borderRadius: 8, marginBottom: 8, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#f59f00' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#343a40', flexShrink: 1 },
  cardSubtitle: { fontSize: 12, color: '#868e96', marginTop: 2 },
  grandTotalText: { fontSize: 13, fontWeight: 'bold', color: '#2b8a3e', marginTop: 4 },
  promoText: { fontSize: 11, color: '#e8590c', marginTop: 2, fontWeight: '600' },
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  badgeOpen: { backgroundColor: '#fff4e6' },
  badgeClosed: { backgroundColor: '#e9ecef' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  actionBtn: { backgroundColor: '#d9480f', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginLeft: 8 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  detailBtn: { backgroundColor: '#1c7ed6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginLeft: 8 },
  detailBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '92%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  infoBox: { backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8 },
  infoLine: { fontSize: 12, color: '#495057', marginTop: 2 },
  modalItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f3f5', alignItems: 'center' },
  promoTitle: { fontSize: 12, fontWeight: 'bold', color: '#495057' },
  promoChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#e9ecef' },
  promoChipActive: { backgroundColor: '#e8590c' },
  promoChipText: { fontSize: 12, fontWeight: 'bold', color: '#495057' },
  promoChipTextActive: { color: '#fff' },
  totalsBox: { borderTopWidth: 1, borderTopColor: '#dee2e6', paddingTop: 8, marginBottom: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  totalLabel: { fontSize: 13, color: '#495057' },
  totalValue: { fontSize: 13, fontWeight: '600', color: '#343a40' },
  grandRow: { borderTopWidth: 1, borderTopColor: '#dee2e6', marginTop: 8, paddingTop: 8, alignItems: 'center' },
  modalBtnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 6, alignItems: 'center' }
});