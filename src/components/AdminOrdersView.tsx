import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  Truck, 
  CheckCircle2, 
  Trash2, 
  Search, 
  AlertCircle, 
  Check, 
  Copy, 
  ExternalLink,
  ClipboardList,
  Clock,
  Radio
} from 'lucide-react';
import { 
  subscribeToStoreOrders, 
  updateOrderStatus, 
  removeOrder, 
  OrderItem 
} from '../services/orderService';

interface AdminOrdersViewProps {
  onClose: () => void;
}

export default function AdminOrdersView({ onClose }: AdminOrdersViewProps) {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | OrderItem['status']>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [lastOrderCount, setLastOrderCount] = useState<number | null>(null);

  // 실시간 주문 구독 (새로고침 없이 실시간 반영)
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToStoreOrders((liveOrders) => {
      setOrders(liveOrders);
      setIsLoading(false);

      // 새 주문이 추가되었을 때 알림
      setLastOrderCount(prevCount => {
        if (prevCount !== null && liveOrders.length > prevCount) {
          const newest = liveOrders[0];
          setNotification(`🔔 [실시간 새 주문 접수] ${newest.customerName} 님의 주문이 자동 추가되었습니다!`);
          setTimeout(() => setNotification(null), 5000);
        }
        return liveOrders.length;
      });
    });

    return () => unsubscribe();
  }, []);

  // 원클릭 상태 변경 (배송중, 배송완료 등)
  const handleSetStatus = async (orderId: string, newStatus: OrderItem['status']) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setNotification(`주문 상태가 '${newStatus}'(으)로 변경되었습니다.`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm('정말 이 주문 내역을 삭제하시겠습니까?')) return;
    try {
      await removeOrder(orderId);
      setNotification('주문 내역이 삭제되었습니다.');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert('주문 삭제에 실패했습니다.');
    }
  };

  // 필터링 및 검색
  const filteredOrders = orders.filter(o => {
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    const kw = searchKeyword.trim().toLowerCase();
    const matchesSearch = !kw || 
      o.customerName.toLowerCase().includes(kw) ||
      o.orderNumber.toLowerCase().includes(kw) ||
      o.phone.includes(kw) ||
      o.address.toLowerCase().includes(kw);
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const preparingCount = orders.filter(o => o.status === '접수완료' || o.status === '배송준비').length;
  const shippingCount = orders.filter(o => o.status === '배송중').length;
  const completedCount = orders.filter(o => o.status === '배송완료').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#FAF7F2] rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col border-2 border-[#D8CEB7] shadow-2xl relative overflow-hidden">
        
        {/* 상단 헤더 */}
        <div className="p-4 sm:p-6 bg-[#FFFFFF] border-b border-[#E5DEC9] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#156937] bg-[#E1F3E7] px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#156937] animate-pulse" />
                실시간 연동 중 (새로고침 불필요)
              </span>
              <span className="text-xs text-[#707E6F]">손님이 주문하면 즉시 표에 뜹니다</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1C3627]">
              판매자 주문관리 센터
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#F2ECE1] text-[#475445] cursor-pointer"
              title="창 닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 통계 요약 카드 바 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-[#F5EFE3] border-b border-[#E3D9C4]">
          <div className="bg-white p-3 rounded-2xl border border-[#E3D8C3] text-center">
            <span className="text-xs text-[#707E6F] font-bold">총 주문 접수</span>
            <span className="block text-xl sm:text-2xl font-black text-[#204E37] mt-0.5">{orders.length}건</span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#E3D8C3] text-center">
            <span className="text-xs text-[#B36200] font-bold">배송 대기/접수</span>
            <span className="block text-xl sm:text-2xl font-black text-[#B36200] mt-0.5">{preparingCount}건</span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#E3D8C3] text-center">
            <span className="text-xs text-[#0066CC] font-bold">배송중</span>
            <span className="block text-xl sm:text-2xl font-black text-[#0066CC] mt-0.5">{shippingCount}건</span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-[#E3D8C3] text-center">
            <span className="text-xs text-[#204E37] font-bold">총 누적 매출</span>
            <span className="block text-lg sm:text-xl font-black text-[#204E37] mt-0.5">
              {totalRevenue.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 실시간 알림 토스트 배너 */}
        {notification && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border-2 border-emerald-400 text-emerald-900 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* 필터 탭 & 검색창 */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 justify-between items-center bg-[#FAF7F2]">
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {(['all', '접수완료', '배송준비', '배송중', '배송완료'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  filterStatus === tab
                    ? 'bg-[#204E37] text-white shadow-xs'
                    : 'bg-white border border-[#DDD5C3] text-[#556353] hover:bg-[#F2ECE1]'
                }`}
              >
                {tab === 'all' ? `전체 (${orders.length})` : `${tab} (${orders.filter(o => o.status === tab).length})`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#859484]" />
            <input
              type="text"
              placeholder="주문자, 전화번호, 주문번호 검색"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D5CABB] bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#204E37]"
            />
          </div>
        </div>

        {/* 표(Table) 형태의 주문 목록 */}
        <div className="flex-1 overflow-auto p-4 pt-0">
          {isLoading ? (
            <div className="bg-white p-12 rounded-2xl border border-[#E5DDC9] text-center text-[#6A7869]">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#204E37]" />
              <p className="text-sm font-bold">주문 데이터를 실시간으로 연결하는 중입니다...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#E5DDC9] text-center text-[#6A7869]">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 text-[#A3B5A8]" />
              <p className="text-base font-bold text-[#233527]">표시할 주문이 없습니다.</p>
              <p className="text-xs text-[#7D8C7C] mt-1">외부에서 손님이 결제하면 새로고침 없이 즉시 이곳에 나타납니다.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-[#E1D7C1] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#F4EFE5] text-[#2F3E30] font-black border-b border-[#E1D7C1]">
                      <th className="py-3 px-3.5">주문일시 / 주문번호</th>
                      <th className="py-3 px-3.5">주문자 정보</th>
                      <th className="py-3 px-3.5">상품 / 수량</th>
                      <th className="py-3 px-3.5">결제금액</th>
                      <th className="py-3 px-3.5 text-center">배송상태</th>
                      <th className="py-3 px-3.5 text-center">상태 변경 버튼</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1EADC]">
                    {filteredOrders.map((order) => {
                      const isDelivering = order.status === '배송중';
                      const isDelivered = order.status === '배송완료';

                      return (
                        <tr key={order.id} className="hover:bg-[#FAF8F5] transition-colors">
                          {/* 1. 주문일시 & 주문번호 */}
                          <td className="py-3.5 px-3.5 align-top">
                            <span className="font-mono font-black text-xs sm:text-sm text-[#204E37] bg-[#E8EFE9] px-2 py-0.5 rounded block w-fit mb-1">
                              {order.orderNumber}
                            </span>
                            <span className="text-[11px] text-[#7E8B7D] block">
                              {new Date(order.createdAt).toLocaleString('ko-KR')}
                            </span>
                          </td>

                          {/* 2. 주문자 정보 */}
                          <td className="py-3.5 px-3.5 align-top">
                            <div className="font-black text-[#1C3627] text-sm sm:text-base">
                              {order.customerName}
                            </div>
                            <div className="text-xs font-semibold text-[#546253]">
                              📞 {order.phone}
                            </div>
                            <div className="text-xs text-[#6B776A] mt-1 max-w-xs break-words">
                              📍 {order.address} {order.addressDetail}
                            </div>
                            {order.note && (
                              <div className="text-[11px] text-[#869585] mt-0.5">
                                💬 {order.note}
                              </div>
                            )}
                          </td>

                          {/* 3. 상품 / 수량 */}
                          <td className="py-3.5 px-3.5 align-top">
                            <div className="font-bold text-[#233527]">
                              {order.packageName}
                            </div>
                            <div className="text-xs text-[#5D6B5C] font-semibold">
                              수량: {order.quantity}세트
                            </div>
                          </td>

                          {/* 4. 결제금액 & 결제수단 */}
                          <td className="py-3.5 px-3.5 align-top">
                            <div className="font-black text-[#204E37] text-sm sm:text-base">
                              {order.totalPrice.toLocaleString()}원
                            </div>
                            <span className="text-[11px] bg-[#F2ECE1] text-[#556354] font-medium px-2 py-0.5 rounded inline-block mt-0.5">
                              {order.paymentMethod}
                            </span>
                          </td>

                          {/* 5. 배송상태 뱃지 */}
                          <td className="py-3.5 px-3.5 align-top text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black ${
                              order.status === '배송완료'
                                ? 'bg-[#E1F3E7] text-[#156937]'
                                : order.status === '배송중'
                                ? 'bg-[#E5F1FF] text-[#0066CC]'
                                : order.status === '주문취소'
                                ? 'bg-[#FFEBEB] text-[#D32F2F]'
                                : 'bg-[#FFF3E0] text-[#E65100]'
                            }`}>
                              {order.status}
                            </span>
                          </td>

                          {/* 6. 상태 변경 버튼 (요청사항: '배송중', '배송완료' 원클릭 버튼) */}
                          <td className="py-3.5 px-3.5 align-top">
                            <div className="flex flex-col gap-1.5 items-center justify-center">
                              <div className="flex gap-1.5 w-full">
                                {/* 배송중으로 바꾸기 버튼 */}
                                <button
                                  type="button"
                                  onClick={() => handleSetStatus(order.id!, '배송중')}
                                  disabled={isDelivering}
                                  className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                    isDelivering
                                      ? 'bg-[#E0EEFF] text-[#0060BF] border border-[#B3D6FF] opacity-80 cursor-default'
                                      : 'bg-white hover:bg-[#0066CC] hover:text-white text-[#0066CC] border border-[#0066CC]'
                                  }`}
                                  title="배송중으로 상태 변경"
                                >
                                  <Truck className="w-3.5 h-3.5 shrink-0" />
                                  <span>배송중</span>
                                </button>

                                {/* 배송완료로 바꾸기 버튼 */}
                                <button
                                  type="button"
                                  onClick={() => handleSetStatus(order.id!, '배송완료')}
                                  disabled={isDelivered}
                                  className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                    isDelivered
                                      ? 'bg-[#E1F3E7] text-[#156937] border border-[#A6E0B9] opacity-80 cursor-default'
                                      : 'bg-white hover:bg-[#156937] hover:text-white text-[#156937] border border-[#156937]'
                                  }`}
                                  title="배송완료로 상태 변경"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>배송완료</span>
                                </button>
                              </div>

                              <div className="flex items-center gap-2 mt-0.5">
                                <select
                                  value={order.status}
                                  onChange={(e) => handleSetStatus(order.id!, e.target.value as OrderItem['status'])}
                                  className="text-[11px] p-1 rounded-lg border border-[#DACDB7] bg-[#FAF8F5] text-[#3B473A] font-medium cursor-pointer"
                                >
                                  <option value="접수완료">접수완료</option>
                                  <option value="배송준비">배송준비</option>
                                  <option value="배송중">배송중</option>
                                  <option value="배송완료">배송완료</option>
                                  <option value="주문취소">주문취소</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleDelete(order.id!)}
                                  className="p-1 rounded text-[#C2351A] hover:bg-[#FFEAE5] transition-colors"
                                  title="주문 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
