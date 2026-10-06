import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { DATABASE_NAME, initializeDatabase, fetchActiveBillByTable, openTableBill } from './db/database';
import CustomerOrderScreen from './screens/CustomerOrderScreen';
import KitchenScreen from './screens/KitchenScreen';
import CashierScreen from './screens/CashierScreen';
import ReportScreen from './screens/ReportScreen';

export default function App() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
      <MainContainer />
    </SQLiteProvider>
  );
}

function MainContainer() {
  const db = useSQLiteContext();
  const [role, setRole] = useState('CUSTOMER'); 
  const [thisDeviceTable, setThisDeviceTable] = useState(1);
  const [activeBill, setActiveBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState({});
  const [tables, setTables] = useState([]);

  const initTableBill = async (tableNum) => {
    if (!tableNum) return;
    setLoading(true);
    let bill = await fetchActiveBillByTable(db, tableNum);
    if (!bill) {
      bill = await openTableBill(db, tableNum);
    }
    setActiveBill(bill);
    setLoading(false);
  };

  const loadTablesStatus = async () => {
    const list = await db.getAllAsync('SELECT * FROM tables');
    setTables(list);
  };

  useEffect(() => {
    if (role === 'CUSTOMER') {
      initTableBill(thisDeviceTable);
    } else if (role === 'CASHIER') {
      loadTablesStatus();
    }
  }, [role, thisDeviceTable]);

  const handleSelectDeviceTable = (tableNum) => {
    setThisDeviceTable(tableNum);
    setCart({});
  
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('./assets/bg.jpg')}
        style={styles.bgImage}
        imageStyle={styles.bgImageStyle}
        resizeMode="cover"
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <View style={styles.roleBar}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'CUSTOMER' && styles.activeRoleBtn]}
                onPress={() => setRole('CUSTOMER')}
              >
                <Text style={styles.roleBtnText}>โต๊ะ {thisDeviceTable}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleBtn, role === 'KITCHEN' && styles.activeRoleBtn]}
                onPress={() => setRole('KITCHEN')}
              >
                <Text style={styles.roleBtnText}>ฝั่งครัว</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleBtn, role === 'CASHIER' && styles.activeRoleBtn]}
                onPress={() => { setRole('CASHIER'); loadTablesStatus(); }}
              >
                <Text style={styles.roleBtnText}>แคชเชียร์</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleBtn, role === 'REPORT' && styles.activeRoleBtn]}
                onPress={() => setRole('REPORT')}
              >
                <Text style={styles.roleBtnText}>รายงานยอดขาย</Text>
              </TouchableOpacity>
            </View>

            {role === 'CUSTOMER' && (
              <View style={styles.tableSelectorBar}>
                <Text style={styles.selectorLabel}>สลับทดสอบโต๊ะ:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tableSelectorBar}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.tableChip,
                        thisDeviceTable === num && styles.activeTableChip,
                      ]}
                      onPress={() => handleSelectDeviceTable(num)}
                    >
                      <Text
                        style={[
                          styles.tableChipText,
                          thisDeviceTable === num && styles.activeTableChipText,
                        ]}
                      >
                        โต๊ะ {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {role === 'CUSTOMER' ? (
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#e03131" />
                <Text style={{ marginTop: 10 }}>กำลังโหลดข้อมูล โต๊ะ {thisDeviceTable}...</Text>
              </View>
            ) : (
              <CustomerOrderScreen
                tableNumber={thisDeviceTable}
                bill={activeBill}
                savedCart={cart}
                onUpdateCart={(newCart) => setCart(newCart)}
                onBillClosed={() => initTableBill(thisDeviceTable)}
              />
            )
          ) : role === 'KITCHEN' ? (
            <KitchenScreen />
          ) : role === 'CASHIER' ? (
            <CashierScreen tables={tables} onRefreshTables={loadTablesStatus} />
          ) : (
            <ReportScreen />
          )}
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' }, // สีขาวอยู่ใต้รูป
  bgImage: { flex: 1 },
  bgImageStyle: { opacity: 0.25 }, // 0.1 = จางมาก, 0.5 = ชัดขึ้น
  topBar: { backgroundColor: '#343a40' },
  roleBar: { flexDirection: 'row', padding: 6, gap: 6 },
  roleBtn: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 4, backgroundColor: '#495057' },
  activeRoleBtn: { backgroundColor: '#e03131' },
  roleBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  tableSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#212529',
    gap: 6,
    justifyContent: 'center',
  },
  selectorLabel: { color: '#adb5bd', fontSize: 11, fontWeight: 'bold' },
  tableChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4, backgroundColor: '#495057' },
  activeTableChip: { backgroundColor: '#2b8a3e' },
  tableChipText: { color: '#fff', fontSize: 12 },
  activeTableChipText: { fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});