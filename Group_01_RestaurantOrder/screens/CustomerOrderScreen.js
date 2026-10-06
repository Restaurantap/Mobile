import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  Alert, 
  Switch, 
  Modal,
  Image, 
  ScrollView,
  StyleSheet 
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  fetchCategories,
  fetchMenusByCategory,
  fetchAllMenuOptions,
  fetchBillSummary,
  createOrderTransaction,
  closeBillTransaction,
} from '../db/database';
import { money, formatDateTime, calculateBillTotals, SERVICE_RATE, VAT_RATE } from '../utils/billing';

export default function CustomerOrderScreen({ tableNumber, bill, savedCart, onUpdateCart, onBillClosed }) {
  const db = useSQLiteContext();
  const [sectionsData, setSectionsData] = useState([]);
  const [optionsByMenu, setOptionsByMenu] = useState({}); 
  const [cart, setCart] = useState(savedCart || {});
  const [billSummary, setBillSummary] = useState(null);
  const [viewMode, setViewMode] = useState('MENU');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [optionPicker, setOptionPicker] = useState(null); 

  const [searchText, setSearchText] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  
 
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  useEffect(() => {
    loadData();
    loadSummaryData();
  }, [bill]);

  const getMenuImage = (menuName) => {
    switch (menuName) {
      case 'หมูสามชั้นหมักโคชูจัง':
        return require('../photo/หมูสามชั้นโคคูจัง.jpg');
      case 'สันคอหมูสไลด์':
        return require('../photo/สันคอหมูสไลด์.jpg');
      case 'เนื้อริบอายหมักซอสเกาหลี':
        return require('../photo/เนื้อริบอายหมักซอสเกาหลี.jpg');
      case 'เบคอนสไลด์':
        return require('../photo/เบคอนสไลด์.jpg');
      case 'สันในหมู':
        return require('../photo/สันในหมู.jpg');
      case 'สามชั้นสไลด์พันเบคอน':
        return require('../photo/สามชั้นสไลด์พันเบคอน.jpg');
      case 'ตับหมูสไลด์':
        return require('../photo/ตับหมูสไลด์.jpg');
      case 'หมูหมักพริกไทยดำ':
        return require('../photo/หมูหมักพริกไทยดำ.jpg');
      case 'หมูหมักงา':
        return require('../photo/หมูหมักงา.jpg');
      case 'เซี่ยงจี้หมู':
        return require('../photo/เซี่ยงจี้หมู.jpg');
      case 'สันคอเนื้อ':
        return require('../photo/สันคอเนื้อ.jpg');
      case 'เสือร้องไห้ออสเตรเลีย':
        return require('../photo/เสือร้องไห้ออสเตรเลีย.jpg');
      case 'เนื้อวัวหมักนุ่ม':
        return require('../photo/เนื้อวัวหมักนุ่ม.jpg');
      case 'เนื้อวัวสไลด์ติดมัน':
        return require('../photo/เนื้อวัวสไลด์ติดมัน.jpg');
      case 'ลิ้นวัว':
        return require('../photo/ลิ้นวัวสไลด์.jpg');
      case 'สันในไก่':
        return require('../photo/สันในไก่.jpg');
      case 'ไก่หมักซอสเผ็ด':
        return require('../photo/ไก่หมักซอสเผ็ด.jpg');
      case 'ปีกไก่บนหมักเกลือ':
        return require('../photo/ปีกไก่บนหมักเกลือ.jpg');
      case 'กุ้งแม่น้ำ':
        return require('../photo/กุ้งแม่น้ำ.jpg');
      case 'ไก่หมักซอสบาร์บีคิว':
        return require('../photo/ไก่หมักซอสบาร์บีคิว.jpg');
      case 'สันคอวัวออสเตรเลีย':
        return require('../photo/สันคอวัวออสเตรเลีย.jpg');
      
      
      case 'ชาไทย':
        return require('../photo/ชาไทย.jpg');
      case 'ชาเขียว':
        return require('../photo/ชาเขียว.jpg');
      case 'น้ำโค้ก':
        return require('../photo/น้ำโค้ก.jpg');
      case 'น้ำแดงแฟนต้า':
        return require('../photo/น้ำแดงแฟนต้า.jpg');
      case 'น้ำเขียวแฟนต้า':
        return require('../photo/น้ำเขียวแฟนต้า.jpg');
      case 'น้ำส้มแฟนต้า':
        return require('../photo/น้ำส้มแฟนต้า.jpg');
      case 'น้ำเปล่า':
        return require('../photo/น้ำเปล่า.jpg');
      case 'น้ำสไปร์ท':
        return require('../photo/น้ำสไปร์ท.jpg');
      case 'ชามะนาว':
        return require('../photo/ชามะนาว.jpg');
      case 'โซจู':
        return require('../photo/โซจู.jpg');
      case 'น้ำพั้นซ์':
        return require('../photo/น้ำพั้นซ์.jpg');
      case 'ชาอูหลง':
        return require('../photo/ชาอู่หลง.jpg');


      case 'พริกหวาน':
        return require('../photo/พริกหวาน.jpg');
      case 'ฟักทอง':
        return require('../photo/ฟักทอง.jpg');
      case 'เห็ดออรินจิ':
        return require('../photo/เห็ดออรินจิ.jpg');
      case 'เห็ดเข็มทอง':
        return require('../photo/เห็ดเข็มทอง.jpg');
      case 'มันฝรั่ง':
        return require('../photo/มันฝรั่ง.jpg');
      case 'ผักคอส':
        return require('../photo/ผักคอส.jpg');
      case 'ใบงา':
        return require('../photo/ใบงา.jpg');
      case 'กระเทียมสด':
        return require('../photo/กระเทียมสด.jpg');
      case 'แครอท':
        return require('../photo/เเครอท.jpg');
      case 'เห็ดหอม':
        return require('../photo/เห็ดหอม.jpg');
      case 'มะเขือยาว':
        return require('../photo/มะเขือยาว.jpg');
      case 'หัวหอมใหญ่':
        return require('../photo/หัวหอมใหญ่.jpg');
      case 'ต้นหอมญี่ปุ่น':
        return require('../photo/ต้นหอมญี่ปุ่น.jpg');
      case 'ข้าวโพดหวาน':
        return require('../photo/ข้าวโพดหวาน.jpg');
      case 'ผักกาดแก้ว':
        return require('../photo/ผักกาดแก้ว.jpg');
      case 'พริกชีฟ้าเขียว':
        return require('../photo/พริกชี้ฟ้าเขียว.jpg');
      case 'กิมจิผักกาดขาว':
        return require('../photo/กิมจิผักกาดขาว.jpg');

      
      case 'ไข่ตุ๋นเกาหลี':
        return require('../photo/ไข่ตุ๋นเกาหลี.jpg');
      case 'ต็อกบกกี':
        return require('../photo/ต็อกบกกี.jpg');
      case 'พาจอน':
        return require('../photo/พาจอน.jpg');
      case 'เกี๊ยวซ่า':
        return require('../photo/เกี๊ยวซ่า.jpg');
      case 'คิมบับ':
        return require('../photo/คิมบับ.jpg');
      case 'ออมุก':
        return require('../photo/ออมุก.jpg');
      case 'ไก่ทอดซอสเกาหลี':
        return require('../photo/ไก่ทอดซอสเกาหลี.jpg');
      case 'ทวิกิม':
        return require('../photo/ทวิกิม.jpg');
      case 'ชีสบอล':
        return require('../photo/ชีสบอล.jpg');
      case 'เฟรนซ์ฟรายส์':
        return require('../photo/เฟรนซ์ฟรายส์.jpg');
      case 'หนังไก่ทอด':
        return require('../photo/หนังไก่ทอด.jpg');
      case 'นักเก็ต':
        return require('../photo/นักเก็ต.jpg');
      case 'คิมมาริ':
        return require('../photo/คิมมาริ.jpg');


      case 'ไอศกรีมช็อคโกแลต':
        return require('../photo/ไอศกรีมช็อคโกแลต.jpg');
      case 'ไอศกรีมวนิลา':
        return require('../photo/ไอศกรีมวนิลา.jpg');
      case 'ไอศกรีมสตรอว์เบอร์รี่':
        return require('../photo/ไอศกรีมสตรอว์เบอร์รี่.jpg');
      case 'ไอศกรีมช็อคโกแลตชิฟ':
        return require('../photo/ไอศกรีมช็อกโกแลตชิฟ.jpg');
      case 'มาชเมลโล่เคลือบช็อคโกแลต':
        return require('../photo/มาชเมลโล่เคลือบช็อคโกแลต.jpg');
      case 'ไอศกรีมชาไทย':
        return require('../photo/ไอศกรีมชาไทย.jpg');
      case 'ไอศกรีมมะนาว':
        return require('../photo/ไอศกรีมมะนาว.jpg');
      case 'น้ำแข็งใส':
        return require('../photo/นํ้าเเข็งใส.jpg');
      case 'ไอศกรีมนมสดฮ็อกไกโด':
        return require('../photo/ไอศกรีมนมสดฮอกไกโด.jpg');
      case 'ลูกตาลลอยแก้ว':
        return require('../photo/ลูกตาลลอยแก้ว.jpg');


      default:
        return null;
    }
  };

  const loadData = async () => {
    try {
      const cats = await fetchCategories(db);
      const loadedSections = [];
      for (let cat of cats) {
        const menus = await fetchMenusByCategory(db, cat.category_id);
        if (menus && menus.length > 0) {
          loadedSections.push({
            title: cat.category_name,
            category_id: cat.category_id,
            data: menus
          });
        }
      }
      setSectionsData(loadedSections);
      if (loadedSections.length > 0) {
        setSelectedCategoryId(loadedSections[0].category_id);
      }

      const allOptions = await fetchAllMenuOptions(db);
      const grouped = {};
      for (const opt of allOptions) {
        if (!grouped[opt.menu_id]) grouped[opt.menu_id] = [];
        grouped[opt.menu_id].push(opt);
      }
      setOptionsByMenu(grouped);
    } catch (e) {
      console.log(e);
    }
  };

  const loadSummaryData = async () => {
    if (!bill) return;
    const summary = await fetchBillSummary(db, bill.bill_id);
    setBillSummary(summary);
  };

  
  const currentCategoryData = useMemo(() => {
    const activeSection = sectionsData.find(sec => sec.category_id === selectedCategoryId);
    if (!activeSection) return [];

    return activeSection.data.filter(menu => {
      const matchesSearch = menu.menu_name?.toLowerCase().includes(searchText.toLowerCase());
      const matchesAvailability = onlyAvailable ? menu.is_available === 1 : true;
      return matchesSearch && matchesAvailability;
    });
  }, [sectionsData, selectedCategoryId, searchText, onlyAvailable]);


  const makeKey = (menuId, options) =>
    options.length === 0
      ? String(menuId)
      : `${menuId}:${options.map((o) => o.option_id).sort((x, y) => x - y).join(',')}`;

  const updateCart = (updated) => {
    setCart(updated);
    onUpdateCart(updated);
  };

  const addLine = (menu, options = []) => {
    const key = makeKey(menu.menu_id, options);
    const extra = options.reduce((sum, o) => sum + o.extra_price, 0);
    const current = cart[key] || { menu, options, unitPrice: menu.price + extra, quantity: 0, note: '' };
    updateCart({ ...cart, [key]: { ...current, quantity: current.quantity + 1 } });
  };

  const removeLine = (key) => {
    const current = cart[key];
    if (!current) return;
    const updated = { ...cart };
    if (current.quantity <= 1) {
      delete updated[key]; 
    } else {
      updated[key] = { ...current, quantity: current.quantity - 1 };
    }
    updateCart(updated);
  };

  const handleNoteChange = (key, text) => {
    const current = cart[key];
    if (!current) return;
    updateCart({ ...cart, [key]: { ...current, note: text } });
  };

  
  const openOptionPicker = (menu) => setOptionPicker({ menu, selectedIds: [] });

  const togglePickerOption = (optionId) => {
    setOptionPicker((prev) => {
      const has = prev.selectedIds.includes(optionId);
      return {
        ...prev,
        selectedIds: has ? prev.selectedIds.filter((id) => id !== optionId) : [...prev.selectedIds, optionId],
      };
    });
  };

  const pickerMenu = optionPicker?.menu;
  const pickerOptions = pickerMenu ? optionsByMenu[pickerMenu.menu_id] || [] : [];
  const pickerChosen = optionPicker ? pickerOptions.filter((o) => optionPicker.selectedIds.includes(o.option_id)) : [];
  const pickerUnitPrice = pickerMenu ? pickerMenu.price + pickerChosen.reduce((sum, o) => sum + o.extra_price, 0) : 0;

  const confirmPicker = () => {
    addLine(pickerMenu, pickerChosen);
    setOptionPicker(null);
  };

  const cartLines = Object.entries(cart);
  const totalCartItems = cartLines.reduce((sum, [, line]) => sum + line.quantity, 0);
  const cartSubtotal = cartLines.reduce((sum, [, line]) => sum + line.unitPrice * line.quantity, 0);
  const itemsToOrderList = cartLines.map(([, line]) => line).filter((i) => i.quantity > 0);

  const handlePressSubmit = () => {
    if (itemsToOrderList.length === 0) {
      Alert.alert('เตือน', 'กรุณาเลือกรายการอาหารก่อนส่ง');
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmAndSubmitOrder = async () => {
    try {
      await createOrderTransaction(db, bill.bill_id, itemsToOrderList);
      setCart({});
      onUpdateCart({});
      setShowConfirmModal(false);
      Alert.alert('สำเร็จ', 'ส่งออร์เดอร์เข้าครัวเรียบร้อย');
      loadSummaryData();
    } catch (err) {
      setShowConfirmModal(false);
      Alert.alert('ข้อผิดพลาด', err.message);
    }
  };

  const summaryTotals = billSummary?.totals || calculateBillTotals(0);
  const summaryBill = billSummary?.bill;
  const isBillOpen = summaryBill ? summaryBill.status === 'OPEN' : true;

  const closeBill = async () => {
    Alert.alert('ยืนยันชำระเงิน', `ยอดสุทธิ ${money(summaryTotals.total)} บาท (รวมค่าบริการและภาษี)`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'เช็คบิล/ปิดบิล',
        onPress: async () => {
          await closeBillTransaction(db, bill.bill_id, tableNumber);
          setCart({});
          onUpdateCart({});
          Alert.alert('สำเร็จ', `ปิดบิลโต๊ะ ${tableNumber} เรียบร้อยแล้ว`);
          if (onBillClosed) onBillClosed();
        },
      },
    ]);
  };

  const toggleViewMode = () => {
    if (viewMode === 'MENU') loadSummaryData(); 
    setViewMode(viewMode === 'MENU' ? 'SUMMARY' : 'MENU');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>โต๊ะ {tableNumber}</Text>
        <TouchableOpacity style={styles.btnNav} onPress={toggleViewMode}>
          <Text style={{ fontWeight: 'bold', color: '#333' }}>{viewMode === 'MENU' ? '📜 สรุปบิล' : '🛒 สั่งอาหารเพิ่ม'}</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'MENU' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.filterBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 ค้นหาชื่อเมนู..."
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={setSearchText}
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>แสดงเฉพาะรายการที่มีของ</Text>
              <Switch
                value={onlyAvailable}
                onValueChange={setOnlyAvailable}
                trackColor={{ false: '#767577', true: '#2b8a3e' }}
              />
            </View>
          </View>

          <View style={styles.categoryNavContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {sectionsData.map((cat) => {
                const isSelected = selectedCategoryId === cat.category_id;
                return (
                  <TouchableOpacity 
                    key={cat.category_id} 
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setSelectedCategoryId(cat.category_id)}
                  >
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                      {cat.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <FlatList
            data={currentCategoryData}
            keyExtractor={(item) => item.menu_id.toString()}
            extraData={cart}
            ListEmptyComponent={<Text style={styles.emptyText}>ไม่พบรายการอาหารในหมวดหมู่นี้</Text>}
            renderItem={({ item }) => {
              const isOut = item.is_available === 0;
              const localImage = getMenuImage(item.menu_name);
              const menuOptions = optionsByMenu[item.menu_id] || [];
              const hasOptions = menuOptions.length > 0;
              const lines = cartLines.filter(([, l]) => l.menu.menu_id === item.menu_id);
              const totalQty = lines.reduce((sum, [, l]) => sum + l.quantity, 0);
              const plainLine = !hasOptions && lines.length > 0 ? lines[0] : null; // เมนูไม่มีตัวเลือก มีบรรทัดเดียว

              return (
                <View style={[styles.menuCard, isOut && styles.disabledCard]}>
                  <View style={styles.menuRow}>
                    {localImage ? (
                      <Image source={localImage} style={styles.menuImage} />
                    ) : (
                      <View style={styles.menuImagePlaceholder}>
                        <Text style={{ fontSize: 9, color: '#888' }}>ไม่มีรูป</Text>
                      </View>
                    )}

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.menuNameText}>{item.menu_name}</Text>
                      <Text style={styles.priceText}>
                        {hasOptions ? `เริ่มต้น ฿${item.price}` : `฿${item.price}.00`}
                      </Text>
                      {hasOptions && !isOut && <Text style={styles.optionHint}>มีตัวเลือกเพิ่มเติม</Text>}
                      {isOut && <Text style={{ color: '#e03131', fontSize: 11 }}>* สินค้าหมด</Text>}
                      {!isOut && plainLine && (
                        <TextInput
                          style={styles.noteInput}
                          placeholder="ระบุหมายเหตุ (ถ้ามี)..."
                          placeholderTextColor="#999"
                          value={plainLine[1].note}
                          onChangeText={(txt) => handleNoteChange(plainLine[0], txt)}
                        />
                      )}
                    </View>

                    {!isOut && plainLine && (
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeLine(plainLine[0])}>
                        <Text style={styles.removeBtnText}>−</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                      style={[styles.addBtn, isOut && styles.disabledBtn]} 
                      disabled={isOut}
                      onPress={() => (hasOptions ? openOptionPicker(item) : addLine(item))}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                        {isOut ? 'หมด' : hasOptions ? `เลือก (${totalQty})` : `+ สั่ง (${totalQty})`}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* เมนูที่มีตัวเลือก: แสดงแต่ละแบบที่สั่งไว้ พร้อมปุ่มปรับจำนวนและหมายเหตุ */}
                  {hasOptions && lines.map(([key, line]) => (
                    <View key={key} style={styles.lineBox}>
                      <View style={styles.lineRow}>
                        <Text style={styles.lineLabel}>
                          {line.options.length > 0 ? line.options.map((o) => o.option_name).join(', ') : 'แบบปกติ'}
                          {'  '}฿{line.unitPrice}
                        </Text>
                        <TouchableOpacity style={styles.smallBtnOutline} onPress={() => removeLine(key)}>
                          <Text style={styles.smallBtnOutlineText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.lineQty}>{line.quantity}</Text>
                        <TouchableOpacity style={styles.smallBtnSolid} onPress={() => addLine(line.menu, line.options)}>
                          <Text style={styles.smallBtnSolidText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.noteInput}
                        placeholder="ระบุหมายเหตุ (ถ้ามี)..."
                        placeholderTextColor="#999"
                        value={line.note}
                        onChangeText={(txt) => handleNoteChange(key, txt)}
                      />
                    </View>
                  ))}
                </View>
              );
            }}
          />

          <TouchableOpacity 
            style={[styles.submitBtn, totalCartItems === 0 && styles.disabledBtn]} 
            onPress={handlePressSubmit}
            disabled={totalCartItems === 0}
          >
            <Text style={styles.submitText}>
              {totalCartItems > 0 ? `ตรวจสอบรายการก่อนส่ง (${totalCartItems} รายการ)` : 'กรุณาเลือกรายการอาหาร'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={billSummary?.items || []}
            keyExtractor={(item, index) => item.item_id ? item.item_id.toString() : index.toString()}
            ListHeaderComponent={
              <View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoTitle}>บิล # {summaryBill?.bill_id ?? '-'}  •  โต๊ะ {tableNumber}</Text>
                  <Text style={styles.infoLine}>เปิดบิลเมื่อ: {formatDateTime(summaryBill?.opened_at)}</Text>
                  {!isBillOpen && <Text style={styles.infoLine}>ปิดบิลเมื่อ: {formatDateTime(summaryBill?.closed_at)}</Text>}
                  <Text style={styles.infoLine}>
                    สถานะ:{' '}
                    <Text style={{ fontWeight: 'bold', color: isBillOpen ? '#e8590c' : '#495057' }}>
                      {isBillOpen ? 'เปิดอยู่' : 'ปิดแล้ว'}
                    </Text>
                  </Text>
                </View>
                <View style={styles.sectionHeaderContainer}>
                  <Text style={styles.sectionHeaderTitle}>รายการอาหารที่สั่งในบิลนี้</Text>
                </View>
              </View>
            }
            ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีรายการในบิล</Text>}
            renderItem={({ item }) => (
              <View style={styles.summaryCard}>
                <Text style={{ fontWeight: 'bold' }}>รอบ {item.round_number}: {item.menu_name}</Text>
                {item.options_text ? <Text style={styles.optionHint}>ตัวเลือก: {item.options_text}</Text> : null}
                {item.note ? <Text style={{ fontSize: 11, color: '#f59f00' }}>หมายเหตุ: {item.note}</Text> : null}
                <Text>{item.quantity} x {item.unit_price} = {item.quantity * item.unit_price} บาท</Text>
                <Text style={{ color: '#1c7ed6' }}>สถานะ: {item.status}</Text>
              </View>
            )}
          />
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ยอดอาหาร</Text>
              <Text style={styles.totalValue}>{money(summaryTotals.subtotal)}</Text>
            </View>
            {summaryTotals.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>ส่วนลด{summaryBill?.promo_name ? ` (${summaryBill.promo_name})` : ''}</Text>
                <Text style={[styles.totalValue, { color: '#2b8a3e' }]}>-{money(summaryTotals.discount)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ค่าบริการ {Math.round(SERVICE_RATE * 100)}%</Text>
              <Text style={styles.totalValue}>{money(summaryTotals.service)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ภาษีมูลค่าเพิ่ม {Math.round(VAT_RATE * 100)}%</Text>
              <Text style={styles.totalValue}>{money(summaryTotals.vat)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandRow]}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>ยอดสุทธิ</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#e03131' }}>{money(summaryTotals.total)} บาท</Text>
            </View>
            {isBillOpen && (
              <TouchableOpacity style={styles.closeBtn} onPress={closeBill}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>ปิดบิล/เช็คบิล</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* หน้าต่างเลือกตัวเลือกย่อยของเมนู */}
      <Modal visible={!!optionPicker} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{pickerMenu?.menu_name}</Text>
            <Text style={{ textAlign: 'center', color: '#868e96', marginBottom: 6 }}>
              ราคาเริ่มต้น ฿{pickerMenu?.price}
            </Text>

            {pickerOptions.map((opt) => {
              const checked = optionPicker?.selectedIds.includes(opt.option_id);
              return (
                <TouchableOpacity
                  key={opt.option_id}
                  style={[styles.pickerRow, checked && styles.pickerRowChecked]}
                  onPress={() => togglePickerOption(opt.option_id)}
                >
                  <Text style={styles.pickerCheck}>{checked ? '☑' : '☐'}</Text>
                  <Text style={{ flex: 1, fontSize: 14 }}>{opt.option_name}</Text>
                  <Text style={{ fontWeight: 'bold', color: opt.extra_price > 0 ? '#e03131' : '#868e96' }}>
                    {opt.extra_price > 0 ? `+฿${opt.extra_price}` : 'ฟรี'}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.modalTotalRow}>
              <Text style={{ fontWeight: 'bold', fontSize: 15 }}>ราคาต่อหน่วย:</Text>
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#e03131' }}>฿{pickerUnitPrice}</Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelModalBtn]} onPress={() => setOptionPicker(null)}>
                <Text style={{ fontWeight: 'bold', color: '#495057' }}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmModalBtn]} onPress={confirmPicker}>
                <Text style={{ fontWeight: 'bold', color: '#fff' }}>เพิ่มลงตะกร้า</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* หน้าต่างยืนยันรายการก่อนส่งเข้าครัว */}
      <Modal visible={showConfirmModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 ตรวจสอบรายการอาหาร (โต๊ะ {tableNumber})</Text>
            
            <FlatList
              data={itemsToOrderList}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.modalItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{item.menu.menu_name}</Text>
                    {item.options && item.options.length > 0 ? (
                      <Text style={styles.optionHint}>ตัวเลือก: {item.options.map((o) => o.option_name).join(', ')}</Text>
                    ) : null}
                    {item.note ? <Text style={{ fontSize: 12, color: '#f59f00' }}>หมายเหตุ: {item.note}</Text> : null}
                  </View>
                  <Text style={{ fontSize: 14 }}>{item.quantity}x  ({item.unitPrice * item.quantity} ฿)</Text>
                </View>
              )}
              style={{ maxHeight: 250, marginVertical: 8 }}
            />

            <View style={styles.modalTotalRow}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>ยอดอาหารรอบนี้:</Text>
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#e03131' }}>{cartSubtotal} บาท</Text>
            </View>
            <Text style={{ fontSize: 11, color: '#868e96', marginBottom: 6 }}>
              * ค่าบริการและภาษีจะคิดตอนเช็คบิล
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelModalBtn]} onPress={() => setShowConfirmModal(false)}>
                <Text style={{ fontWeight: 'bold', color: '#495057' }}>กลับไปแก้ไข</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmModalBtn]} onPress={confirmAndSubmitOrder}>
                <Text style={{ fontWeight: 'bold', color: '#fff' }}>ยืนยันส่งเข้าครัว</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', padding: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  btnNav: { padding: 8, backgroundColor: 'rgba(233,236,239,0.85)', borderRadius: 6 },
  filterBox: { backgroundColor: 'rgba(255,255,255,0.85)', padding: 10, borderRadius: 8, marginBottom: 8, elevation: 1 },
  searchInput: { backgroundColor: '#f1f3f5', padding: 8, borderRadius: 6, fontSize: 13, marginBottom: 6 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 12, fontWeight: 'bold', color: '#495057' },
  
  categoryNavContainer: { marginBottom: 6 },
  categoryScroll: { gap: 6, paddingVertical: 4 },
  categoryChip: { backgroundColor: 'rgba(233,236,239,0.9)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  categoryChipSelected: { backgroundColor: '#343a40' },
  categoryChipText: { color: '#495057', fontSize: 12, fontWeight: 'bold' },
  categoryChipTextSelected: { color: '#fff' },

  sectionHeaderContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    marginTop: 8
  },
  sectionHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#e03131' },

  menuCard: { 
    padding: 10, 
    backgroundColor: 'rgba(255,255,255,0.85)', 
    marginTop: 8, 
    borderRadius: 8, 
    elevation: 1
  },
  menuRow: { flexDirection: 'row', alignItems: 'center' },
  menuImage: { width: 65, height: 65, borderRadius: 8, backgroundColor: '#e9ecef' },
  menuImagePlaceholder: {
    width: 65,
    height: 65,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuNameText: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  priceText: { color: '#e03131', fontWeight: '600', marginTop: 2 },
  optionHint: { fontSize: 11, color: '#1c7ed6', marginTop: 1 },
  disabledCard: { backgroundColor: 'rgba(241,243,245,0.85)', opacity: 0.6 },
  noteInput: { borderBottomWidth: 1, borderColor: '#ccc', fontSize: 12, marginTop: 4, paddingBottom: 2 },
  addBtn: { backgroundColor: '#e03131', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, justifyContent: 'center' },
  removeBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e03131', width: 34, height: 34, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  removeBtnText: { color: '#e03131', fontSize: 20, fontWeight: 'bold', lineHeight: 22 },

  lineBox: { marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f3f5' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineLabel: { flex: 1, fontSize: 12, color: '#495057', fontWeight: '600' },
  lineQty: { minWidth: 20, textAlign: 'center', fontWeight: 'bold' },
  smallBtnOutline: { borderWidth: 1.5, borderColor: '#e03131', backgroundColor: '#fff', width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  smallBtnOutlineText: { color: '#e03131', fontWeight: 'bold', fontSize: 16, lineHeight: 18 },
  smallBtnSolid: { backgroundColor: '#e03131', width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  smallBtnSolidText: { color: '#fff', fontWeight: 'bold', fontSize: 16, lineHeight: 18 },

  submitBtn: { backgroundColor: '#2b8a3e', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  disabledBtn: { backgroundColor: '#adb5bd' },
  submitText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#495057', marginTop: 20 },

  infoCard: { backgroundColor: 'rgba(255,255,255,0.85)', padding: 12, borderRadius: 8, marginBottom: 4 },
  infoTitle: { fontSize: 15, fontWeight: 'bold', color: '#343a40', marginBottom: 4 },
  infoLine: { fontSize: 12, color: '#495057', marginTop: 2 },
  summaryCard: { padding: 12, backgroundColor: 'rgba(255,255,255,0.85)', marginBottom: 6, borderRadius: 6 },
  totalBox: { padding: 12, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 8, marginTop: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  totalLabel: { fontSize: 13, color: '#495057' },
  totalValue: { fontSize: 13, fontWeight: '600', color: '#343a40' },
  grandRow: { borderTopWidth: 1, borderTopColor: '#dee2e6', marginTop: 8, paddingTop: 8, alignItems: 'center' },
  closeBtn: { backgroundColor: '#d9480f', padding: 12, borderRadius: 6, width: '100%', alignItems: 'center', marginTop: 10 },

  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#dee2e6', marginTop: 6 },
  pickerRowChecked: { borderColor: '#e03131', backgroundColor: '#fff5f5' },
  pickerCheck: { fontSize: 20, color: '#e03131' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  modalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12, borderTopWidth: 1, borderTopColor: '#dee2e6', paddingTop: 8 },
  modalBtnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 6, alignItems: 'center' },
  cancelModalBtn: { backgroundColor: '#e9ecef' },
  confirmModalBtn: { backgroundColor: '#2b8a3e' }
});