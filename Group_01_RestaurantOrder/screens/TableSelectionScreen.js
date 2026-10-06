import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { fetchAllTables, fetchActiveBillByTable, openTableBill, resetAllData } from '../db/database';

export default function TableSelectionScreen({ onSelectTable }) {
  const db = useSQLiteContext();
  const [tables, setTables] = useState([]);

  const loadTables = async () => {
    const list = await fetchAllTables(db);
    setTables(list);
  };

  useEffect(() => { loadTables(); }, []);

  const handleSelectTable = async (tableNumber) => {
    
    let bill = await fetchActiveBillByTable(db, tableNumber);

   
    if (!bill) {
      bill = await openTableBill(db, tableNumber);
    }

    
    onSelectTable(tableNumber, bill);
  };

  const handleResetData = async () => {
    Alert.alert('รีเซ็ตข้อมูล', 'คุณต้องการล้างข้อมูลการขายทั้งหมดกลับสู่ค่าเริ่มต้นหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ล้างข้อมูล',
        style: 'destructive',
        onPress: async () => {
          await resetAllData(db);
          await loadTables();
          Alert.alert('สำเร็จ', 'รีเซ็ตข้อมูลเรียบร้อยแล้ว');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>เลือกโต๊ะเพื่อสั่งอาหาร (เปิดได้หลายโต๊ะพร้อมกัน)</Text>
      <FlatList
        data={tables}
        numColumns={3}
        keyExtractor={(item) => item.table_number.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.status === 'OCCUPIED' ? styles.occupied : styles.available]}
            onPress={() => handleSelectTable(item.table_number)}
          >
            <Text style={styles.tableName}>โต๊ะ {item.table_number}</Text>
            <Text style={styles.statusText}>{item.status === 'OCCUPIED' ? 'กำลังใช้งาน (กดเข้าได้)' : 'ว่าง (เปิดโต๊ะ)'}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.resetBtn} onPress={handleResetData}>
        <Text style={styles.resetBtnText}>ล้างข้อมูลการขายทั้งหมด (Reset Data)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  card: { flex: 1, margin: 6, padding: 16, borderRadius: 8, alignItems: 'center' },
  available: { backgroundColor: '#d3f9d8' },
  occupied: { backgroundColor: '#ffe3e3' },
  tableName: { fontSize: 18, fontWeight: 'bold' },
  statusText: { fontSize: 11, color: '#495057', textAlign: 'center', marginTop: 4 },
  resetBtn: { backgroundColor: '#fa5252', padding: 12, borderRadius: 6, marginTop: 10, alignItems: 'center' },
  resetBtnText: { color: '#fff', fontWeight: 'bold' }
});