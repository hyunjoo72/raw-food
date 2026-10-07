import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc,
  serverTimestamp,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, ensureAuthenticated } from '../firebase';

export interface OrderItem {
  id?: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  phone: string;
  address: string;
  addressDetail?: string;
  note?: string;
  packageKey: string;
  packageName: string;
  quantity: number;
  totalPrice: number;
  status: '접수완료' | '배송준비' | '배송중' | '배송완료' | '주문취소';
  paymentMethod: string;
  createdAt: string;
  updatedAt?: any;
}

// Generate friendly order number like ORD-20261001-3843
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${year}${month}${day}-${randomStr}`;
}

// Save a real order to Firestore
export async function submitRealOrder(params: {
  customerName: string;
  phone: string;
  address: string;
  addressDetail?: string;
  note?: string;
  packageKey: string;
  packageName: string;
  quantity: number;
  totalPrice: number;
  paymentMethod?: string;
}): Promise<OrderItem> {
  const user = await ensureAuthenticated();
  const orderNumber = generateOrderNumber();
  const orderDocRef = doc(collection(db, 'orders'));

  // Clean phone number format
  const cleanPhone = params.phone.replace(/[^0-9]/g, '');

  const orderData: OrderItem = {
    id: orderDocRef.id,
    orderNumber,
    userId: user.uid,
    customerName: params.customerName.trim(),
    phone: cleanPhone || params.phone.trim(),
    address: params.address.trim(),
    addressDetail: params.addressDetail?.trim() || '',
    note: params.note?.trim() || '문 앞에 놓아주세요',
    packageKey: params.packageKey,
    packageName: params.packageName,
    quantity: params.quantity,
    totalPrice: params.totalPrice,
    status: '접수완료',
    paymentMethod: params.paymentMethod || '무통장입금/안심간편결제',
    createdAt: new Date().toISOString()
  };

  await setDoc(orderDocRef, {
    ...orderData,
    firestoreCreatedAt: serverTimestamp()
  });

  return orderData;
}

// Search orders by customer phone number
export async function findOrdersByPhone(phoneQuery: string): Promise<OrderItem[]> {
  await ensureAuthenticated();
  const cleanQuery = phoneQuery.replace(/[^0-9]/g, '');

  const ordersRef = collection(db, 'orders');
  const snap = await getDocs(ordersRef);

  const results: OrderItem[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as OrderItem;
    const docPhone = (data.phone || '').replace(/[^0-9]/g, '');
    if (
      (cleanQuery.length >= 4 && docPhone.includes(cleanQuery)) ||
      (data.orderNumber && data.orderNumber.toLowerCase().includes(phoneQuery.toLowerCase().trim()))
    ) {
      results.push({ ...data, id: docSnap.id });
    }
  });

  // Sort descending by createdAt
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}

// Fetch all orders for store management (사장님 주문 관리)
export async function fetchAllStoreOrders(): Promise<OrderItem[]> {
  await ensureAuthenticated();
  const ordersRef = collection(db, 'orders');
  const snap = await getDocs(ordersRef);

  const list: OrderItem[] = [];
  snap.forEach((docSnap) => {
    list.push({ ...(docSnap.data() as OrderItem), id: docSnap.id });
  });

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

// Update order status (접수완료 -> 배송준비 -> 배송중 -> 배송완료)
export async function updateOrderStatus(orderId: string, newStatus: OrderItem['status']): Promise<void> {
  await ensureAuthenticated();
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, {
    status: newStatus,
    updatedAt: serverTimestamp()
  });
}

// Cancel or delete order
export async function removeOrder(orderId: string): Promise<void> {
  await ensureAuthenticated();
  const docRef = doc(db, 'orders', orderId);
  await deleteDoc(docRef);
}

// Real-time subscription to orders collection (새 주문이 들어오면 새로고침 없이 실시간 자동 업데이트)
export function subscribeToStoreOrders(callback: (orders: OrderItem[]) => void) {
  const ordersRef = collection(db, 'orders');
  
  return onSnapshot(ordersRef, (snapshot) => {
    const list: OrderItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as OrderItem), id: docSnap.id });
    });
    // Sort descending by createdAt
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (error) => {
    console.error('실시간 주문 구독 에러:', error);
  });
}

