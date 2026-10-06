import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { fetchKitchenOrders, updateOrderItemStatus, fetchAllMenusForManage, updateMenuAvailability } from '../db/database';
import { formatTime } from '../utils/billing';

export default function KitchenScreen() {
  const db = useSQLiteContext();
  const [tab, setTab] = useState('ORDERS');
  const [orders, setOrders] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadKitchenOrders = async () => {
    try {
      const list = await fetchKitchenOrders(db);
      setOrders(list || []);
    } catch (e) {}
  };

  const loadManageMenus = async () => {
    setLoading(true);
    try {
      const list = await fetchAllMenusForManage(db);
      setMenus(list || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'ORDERS') {
      loadKitchenOrders();
      const interval = setInterval(loadKitchenOrders, 3000);
      return () => clearInterval(interval);
    } else {
      loadManageMenus();
    }
  }, [tab]);

  const handleUpdateStatus = async (itemId, status) => {
    await updateOrderItemStatus(db, itemId, status);
    loadKitchenOrders();
  };

  const handleToggleAvailability = async (menuId, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    await updateMenuAvailability(db, menuId, newStatus);
    loadManageMenus();
  };

  
  const formatOrderTime = (dateString) => formatTime(dateString);

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity 
          style={[styles.tabBtn, tab === 'ORDERS' && styles.activeTab]} 
          onPress={() => setTab('ORDERS')}
        >
          <Text style={[styles.tabText, tab === 'ORDERS' && styles.activeTabText]}>ออร์เดอร์เข้าครัว</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, tab === 'STOCK' && styles.activeTab]} 
          onPress={() => setTab('STOCK')}
        >
          <Text style={[styles.tabText, tab === 'STOCK' && styles.activeTabText]}>จัดการของหมด/มีของ</Text>
        </TouchableOpacity>
      </View>

      {tab === 'ORDERS' ? (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.item_id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีรายการอาหารที่ต้องทำ</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.tableText}>โต๊ะ {item.table_id} (รอบที่ {item.round_number})</Text>
                <Text style={styles.timeText}>⏰ สั่งเมื่อ: {formatOrderTime(item.created_at)} น.</Text>
              </View>

              <Text style={styles.menuText}>{item.menu_name} x {item.quantity}</Text>
              {item.options_text ? <Text style={styles.optionText}>ตัวเลือก: {item.options_text}</Text> : null}
              {item.note ? <Text style={styles.note}>หมายเหตุ: {item.note}</Text> : null}
              <Text style={styles.status}>สถานะปัจจุบัน: {item.status}</Text>
              
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.btnPending} onPress={() => handleUpdateStatus(item.item_id, 'PENDING')}>
                  <Text style={{ fontSize: 12 }}>รอทำ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnCooking} onPress={() => handleUpdateStatus(item.item_id, 'COOKING')}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold' }}>กำลังทำ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnServed} onPress={() => handleUpdateStatus(item.item_id, 'SERVED')}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2b8a3e' }}>เสิร์ฟแล้ว</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#e03131" />
          <Text style={{ marginTop: 8 }}>กำลังโหลดรายการเมนู...</Text>
        </View>
      ) : (
        <FlatList
          data={menus}
          keyExtractor={(item) => item.menu_id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>ไม่พบรายการเมนูในฐานข้อมูล</Text>}
          renderItem={({ item }) => (
            <View style={styles.stockCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stockCategory}>[{item.category_name || 'ทั่วไป'}]</Text>
                <Text style={styles.stockMenuName}>{item.menu_name}</Text>
              </View>

              <View style={styles.switchBox}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: item.is_available === 1 ? '#2b8a3e' : '#e03131', marginRight: 6 }}>
                  {item.is_available === 1 ? 'มีของ' : 'ของหมด'}
                </Text>
                <Switch
                  value={item.is_available === 1}
                  onValueChange={() => handleToggleAvailability(item.menu_id, item.is_available)}
                  trackColor={{ false: '#ffc9c9', true: '#b2f2bb' }}
                  thumbColor={item.is_available === 1 ? '#2b8a3e' : '#e03131'}
                />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: 'transparent' },
  tabRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  tabBtn: { flex: 1, padding: 10, backgroundColor: 'rgba(233,236,239,0.85)', borderRadius: 6, alignItems: 'center' },
  activeTab: { backgroundColor: '#e03131' },
  tabText: { fontWeight: 'bold', color: '#495057' },
  activeTabText: { color: '#fff' },
  emptyText: { textAlign: 'center', color: '#495057', marginTop: 40 },
  card: { backgroundColor: 'rgba(255,255,255,0.85)', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#e03131' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  tableText: { fontSize: 16, fontWeight: 'bold', color: '#c92a2a' },
  timeText: { fontSize: 12, color: '#868e96', fontWeight: '600' },
  menuText: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  note: { color: '#f59f00', fontSize: 12, marginTop: 2 },
  optionText: { color: '#1c7ed6', fontSize: 12, fontWeight: '600', marginTop: 2 },
  status: { fontSize: 12, fontWeight: 'bold', marginTop: 4, color: '#495057' },
  btnRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  btnPending: { backgroundColor: '#ffec99', padding: 8, borderRadius: 4, flex: 1, alignItems: 'center' },
  btnCooking: { backgroundColor: '#a5d8ff', padding: 8, borderRadius: 4, flex: 1, alignItems: 'center' },
  btnServed: { backgroundColor: '#b2f2bb', padding: 8, borderRadius: 4, flex: 1, alignItems: 'center' },
  stockCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.85)', padding: 12, borderRadius: 6, marginBottom: 6, alignItems: 'center' },
  stockCategory: { fontSize: 11, color: '#868e96' },
  stockMenuName: { fontSize: 15, fontWeight: 'bold' },
  switchBox: { flexDirection: 'row', alignItems: 'center' }
});