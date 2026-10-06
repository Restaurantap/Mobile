import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { fetchDailySalesByCategory, fetchDailyBillSummary, fetchDailyHistory } from '../db/database';
import { money } from '../utils/billing';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

// แปลงวันที่เป็นข้อความ YYYY-MM-DD ตามเวลาเครื่อง (ใช้ส่งเข้า SQL)
const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// แสดงเป็นภาษาไทย เช่น 29 กันยายน 2569
const formatThaiDate = (d) => `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;

const isSameDay = (a, b) => toYMD(a) === toYMD(b);

// 'YYYY-MM-DD' -> Date (เวลาเครื่อง)
const ymdToDate = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function ReportScreen() {
  const db = useSQLiteContext();
  const [mode, setMode] = useState('DAY'); // 'DAY' = รายวัน, 'HISTORY' = ประวัติทุกวัน
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reportData, setReportData] = useState([]);
  const [dayBills, setDayBills] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const isToday = isSameDay(selectedDate, new Date());

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await fetchDailySalesByCategory(db, toYMD(selectedDate));
      setReportData(data || []);
      setDayBills(await fetchDailyBillSummary(db, toYMD(selectedDate)));
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      setHistory((await fetchDailyHistory(db)) || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => (mode === 'DAY' ? loadReport() : loadHistory());

  useEffect(() => {
    if (mode === 'DAY') loadReport();
    else loadHistory();
  }, [selectedDate, mode]);

  const shiftDay = (delta) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    if (next > new Date()) return; // ไม่ให้เลือกวันในอนาคต
    setSelectedDate(next);
  };

  const openDayFromHistory = (ymd) => {
    setSelectedDate(ymdToDate(ymd));
    setMode('DAY');
  };

  const grandTotalSales = reportData.reduce((sum, item) => sum + (item.total_sales || 0), 0);
  const totalQuantitySold = reportData.reduce((sum, item) => sum + (item.total_quantity || 0), 0);

  const dayHeader = (
    <View>
      {/* แถบเลือกวันที่ */}
      <View style={styles.dateBar}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => shiftDay(-1)}>
          <Text style={styles.dateArrowText}>◀</Text>
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.dateText}>{formatThaiDate(selectedDate)}</Text>
          {isToday ? (
            <Text style={styles.todayBadge}>วันนี้</Text>
          ) : (
            <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
              <Text style={styles.backToday}>กลับไปวันนี้</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
          onPress={() => shiftDay(1)}
          disabled={isToday}
        >
          <Text style={styles.dateArrowText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* กล่องสรุปภาพรวมของวันที่เลือก */}
      <View style={styles.summaryCard}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.summaryLabel}>ยอดอาหารรวม (ก่อนส่วนลด/ภาษี)</Text>
          <Text style={styles.summaryValue}>{grandTotalSales} บาท</Text>
        </View>
        <View style={styles.divider} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.summaryLabel}>จำนวนที่ขายได้</Text>
          <Text style={[styles.summaryValue, { color: '#1c7ed6' }]}>{totalQuantitySold} จาน/หน่วย</Text>
        </View>
      </View>

      {/* สรุปการเงินของวัน (นับเฉพาะบิลที่ปิดแล้ว) */}
      <View style={styles.netCard}>
        <Text style={styles.netTitle}>สรุปบิลของวัน ({dayBills?.bill_count || 0} บิล)</Text>
        <View style={styles.netRow}>
          <Text style={styles.netLabel}>ยอดอาหาร</Text>
          <Text style={styles.netValue}>{money(dayBills?.subtotal)}</Text>
        </View>
        <View style={styles.netRow}>
          <Text style={styles.netLabel}>ส่วนลดรวม</Text>
          <Text style={[styles.netValue, { color: '#2b8a3e' }]}>-{money(dayBills?.discount)}</Text>
        </View>
        <View style={styles.netRow}>
          <Text style={styles.netLabel}>ค่าบริการรวม</Text>
          <Text style={styles.netValue}>{money(dayBills?.service)}</Text>
        </View>
        <View style={styles.netRow}>
          <Text style={styles.netLabel}>ภาษีมูลค่าเพิ่มรวม</Text>
          <Text style={styles.netValue}>{money(dayBills?.vat)}</Text>
        </View>
        <View style={[styles.netRow, styles.netGrand]}>
          <Text style={{ fontWeight: 'bold', fontSize: 15 }}>ยอดสุทธิที่รับเงิน</Text>
          <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#e03131' }}>{money(dayBills?.net)} บาท</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>แยกตามหมวดหมู่อาหาร</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>📊 รายงานยอดขาย</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>รีเฟรช</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'DAY' && styles.modeBtnActive]}
          onPress={() => setMode('DAY')}
        >
          <Text style={[styles.modeText, mode === 'DAY' && styles.modeTextActive]}>รายวัน</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'HISTORY' && styles.modeBtnActive]}
          onPress={() => setMode('HISTORY')}
        >
          <Text style={[styles.modeText, mode === 'HISTORY' && styles.modeTextActive]}>ประวัติทุกวัน</Text>
        </TouchableOpacity>
      </View>

      {mode === 'DAY' ? (
        <FlatList
          data={loading ? [] : reportData}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={dayHeader}
          ListEmptyComponent={
            loading ? (
              <View style={{ alignItems: 'center', marginTop: 24 }}>
                <ActivityIndicator size="large" color="#e03131" />
                <Text style={{ marginTop: 8 }}>กำลังโหลดรายงาน...</Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>ไม่มียอดขายในวันนี้ (ยอดจะนับเมื่อปิดบิลแล้วเท่านั้น)</Text>
            )
          }
          renderItem={({ item }) => {
            const percent = grandTotalSales > 0 ? (item.total_sales / grandTotalSales) * 100 : 0;
            return (
              <View style={styles.rowCard}>
                <View style={styles.rowTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryName}>{item.category_name}</Text>
                    <Text style={styles.qtyText}>ขายไป: {item.total_quantity} หน่วย</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.salesText}>{item.total_sales} บาท</Text>
                    <Text style={styles.percentText}>{percent.toFixed(1)}%</Text>
                  </View>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${percent}%` }]} />
                </View>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={loading ? [] : history}
          keyExtractor={(item) => item.day}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>ยอดขายที่บันทึกไว้แต่ละวัน (กดเพื่อดูรายละเอียด)</Text>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color="#e03131" style={{ marginTop: 24 }} />
            ) : (
              <Text style={styles.emptyText}>ยังไม่มีประวัติ (ยอดจะถูกบันทึกเมื่อปิดบิล)</Text>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.historyCard} onPress={() => openDayFromHistory(item.day)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryName}>{formatThaiDate(ymdToDate(item.day))}</Text>
                <Text style={styles.qtyText}>{item.bill_count} บิล</Text>
              </View>
              <Text style={styles.salesText}>{money(item.net)} บาท</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: 'transparent' },
  headerBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#343a40' },
  refreshBtn: { backgroundColor: '#1c7ed6', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },

  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeBtn: { flex: 1, padding: 10, backgroundColor: 'rgba(233,236,239,0.85)', borderRadius: 6, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#e03131' },
  modeText: { fontWeight: 'bold', color: '#495057' },
  modeTextActive: { color: '#fff' },

  dateBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', padding: 8, borderRadius: 8, marginBottom: 10, gap: 8 },
  dateArrow: { backgroundColor: '#343a40', width: 40, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  dateArrowDisabled: { backgroundColor: '#adb5bd' },
  dateArrowText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  dateText: { fontSize: 16, fontWeight: 'bold', color: '#343a40' },
  todayBadge: { fontSize: 11, color: '#2b8a3e', fontWeight: 'bold', marginTop: 2 },
  backToday: { fontSize: 11, color: '#1c7ed6', fontWeight: 'bold', marginTop: 2, textDecorationLine: 'underline' },

  summaryCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.85)', padding: 16, borderRadius: 8, marginBottom: 14, elevation: 2 },
  summaryLabel: { fontSize: 12, color: '#868e96', fontWeight: 'bold', textAlign: 'center' },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: '#2b8a3e', marginTop: 4 },
  divider: { width: 1, backgroundColor: '#dee2e6', marginHorizontal: 8 },

  netCard: { backgroundColor: 'rgba(255,255,255,0.85)', padding: 14, borderRadius: 8, marginBottom: 14, elevation: 2 },
  netTitle: { fontSize: 13, fontWeight: 'bold', color: '#495057', marginBottom: 4 },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  netLabel: { fontSize: 13, color: '#495057' },
  netValue: { fontSize: 13, fontWeight: '600', color: '#343a40' },
  netGrand: { borderTopWidth: 1, borderTopColor: '#dee2e6', marginTop: 8, paddingTop: 8, alignItems: 'center' },

  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 8, color: '#495057' },
  emptyText: { textAlign: 'center', color: '#495057', marginTop: 40 },

  rowCard: { backgroundColor: 'rgba(255,255,255,0.85)', padding: 14, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#e03131' },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  categoryName: { fontSize: 16, fontWeight: 'bold', color: '#343a40' },
  qtyText: { fontSize: 12, color: '#868e96', marginTop: 2 },
  salesText: { fontSize: 16, fontWeight: 'bold', color: '#e03131' },
  percentText: { fontSize: 11, color: '#868e96', marginTop: 2 },
  barTrack: { height: 6, backgroundColor: '#e9ecef', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#e03131', borderRadius: 3 },

  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', padding: 14, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#2b8a3e', gap: 8 },
  chevron: { fontSize: 24, color: '#868e96', marginLeft: 4 },
});