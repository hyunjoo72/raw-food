import React, { useState, useEffect, useRef } from 'react';
import { 
  Leaf, 
  Droplets, 
  Clock, 
  UtensilsCrossed, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck, 
  Plus, 
  Minus, 
  X, 
  CheckCircle2, 
  Gift, 
  Truck,
  Search,
  ClipboardList,
  RefreshCw,
  Trash2,
  AlertCircle,
  User as UserIcon,
  LogIn,
  LogOut,
  Lock,
  Mail,
  CreditCard,
  Smartphone,
  AlertTriangle,
  Building2,
  Receipt,
  Copy
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  submitRealOrder, 
  findOrdersByPhone, 
  fetchAllStoreOrders, 
  updateOrderStatus, 
  removeOrder,
  OrderItem 
} from './services/orderService';
import { 
  registerWithEmail, 
  loginWithEmail, 
  logoutUser, 
  subscribeToUserAuth, 
  getFriendlyAuthErrorMessage 
} from './services/authService';
import AdminOrdersView from './components/AdminOrdersView';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('윤성미');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Product & Order Selection State
  const [quantity, setQuantity] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState<'1box' | '2boxes' | '3boxes'>('1box');
  
  // Checkout Multi-Step Modal State: 'delivery' -> 'payment' -> 'completed'
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'delivery' | 'payment' | 'completed'>('delivery');

  // Payment method selection
  const [selectedPayMethod, setSelectedPayMethod] = useState<'card' | 'naver' | 'kakao' | 'toss' | 'bank'>('card');
  const [cardNumber, setCardNumber] = useState('1111-2222-3333-4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('777');

  // Other Modals
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Real Order States
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderItem | null>(null);

  // Lookup state
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResults, setLookupResults] = useState<OrderItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Admin orders state
  const [adminOrders, setAdminOrders] = useState<OrderItem[]>([]);
  const [isLoadingAdminOrders, setIsLoadingAdminOrders] = useState(false);
  const [adminFilter, setAdminFilter] = useState<'all' | OrderItem['status']>('all');
  const [adminNotification, setAdminNotification] = useState<string | null>(null);

  // Form states for Delivery
  const [orderForm, setOrderForm] = useState({
    name: '윤성미',
    phone: '010-1234-5678',
    address: '서울특별시 서초구 서초대로 123',
    addressDetail: '101동 1204호',
    note: '문 앞에 놓아주세요'
  });

  const orderSectionRef = useRef<HTMLDivElement>(null);

  // Subscribe to Auth State changes
  useEffect(() => {
    const unsubscribe = subscribeToUserAuth((user) => {
      setCurrentUser(user);
      if (user && user.displayName) {
        setOrderForm(prev => ({
          ...prev,
          name: user.displayName || prev.name
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const scrollToOrder = () => {
    if (orderSectionRef.current) {
      orderSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Triggered when user clicks "주문하기"
  const handleStartOrder = () => {
    if (!currentUser) {
      setAuthError('주문하시려면 먼저 회원가입 또는 로그인을 해주세요.');
      setAuthTab('login');
      setIsAuthModalOpen(true);
      return;
    }
    // Start checkout with delivery step
    setCheckoutStep('delivery');
    setIsCheckoutModalOpen(true);
  };

  // Pricing details based on package
  const packages = {
    '1box': {
      title: '1박스 (30포 / 1개월분)',
      sub: '기본 30일 간편 아침 구성 + 친환경 보틀 증정',
      originalPrice: 60000,
      price: 49000,
      discount: '18%',
      perServing: '1포당 1,630원',
      boxes: 1
    },
    '2boxes': {
      title: '2박스 (60포 / 2개월분)',
      sub: '부부·가족 함께 마시기 좋은 구성 (추가 할인)',
      originalPrice: 120000,
      price: 89000,
      discount: '25%',
      perServing: '1포당 1,480원',
      boxes: 2
    },
    '3boxes': {
      title: '3박스 (90포 / 3개월분)',
      sub: '가장 넉넉한 든든 패키지 (최대 혜택 + 쉐이커 2개)',
      originalPrice: 180000,
      price: 126000,
      discount: '30%',
      perServing: '1포당 1,400원',
      boxes: 3
    }
  };

  const currentPkg = packages[selectedPackage];
  const totalPrice = currentPkg.price * quantity;

  // Handle Auth (Login / Register) Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!authEmail.trim()) {
      setAuthError('이메일 주소를 입력해 주세요.');
      return;
    }
    if (!authPassword) {
      setAuthError('비밀번호를 입력해 주세요.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('비밀번호는 최소 6자리 이상 입력해 주셔야 안전합니다. (현재 ' + authPassword.length + '자리)');
      return;
    }

    if (authTab === 'register') {
      if (!authName.trim()) {
        setAuthError('받으시는 분의 성함(이름)을 입력해 주세요.');
        return;
      }
      if (authPassword !== authPasswordConfirm) {
        setAuthError('비밀번호와 비밀번호 확인이 서로 다릅니다. 다시 한 번 확인해 주세요.');
        return;
      }
    }

    setIsAuthLoading(true);

    try {
      if (authTab === 'register') {
        await registerWithEmail(authName, authEmail, authPassword);
        setAuthSuccessMsg(`${authName} 님, 회원가입이 완료되었습니다! 바로 주문 결제를 진행합니다.`);
        setTimeout(() => {
          setIsAuthModalOpen(false);
          setCheckoutStep('delivery');
          setIsCheckoutModalOpen(true);
        }, 1200);
      } else {
        const user = await loginWithEmail(authEmail, authPassword);
        const displayName = user.displayName || '고객';
        setAuthSuccessMsg(`${displayName} 님, 환영합니다! 로그인되었습니다.`);
        setTimeout(() => {
          setIsAuthModalOpen(false);
          setCheckoutStep('delivery');
          setIsCheckoutModalOpen(true);
        }, 1000);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const friendlyMsg = getFriendlyAuthErrorMessage(err.message || err.code || '');
      setAuthError(friendlyMsg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('정말 로그아웃 하시겠습니까?')) {
      await logoutUser();
      alert('로그아웃 되었습니다.');
    }
  };

  // Step 1: Proceed from Delivery to Payment Screen
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.name.trim() || !orderForm.phone.trim() || !orderForm.address.trim()) {
      alert('주문자 성함, 연락처, 주소를 모두 입력해주세요.');
      return;
    }
    setSubmitError(null);
    setCheckoutStep('payment');
  };

  // Step 2: Simulated Payment & Real Order Recording
  const handleExecutePayment = async () => {
    setIsSubmittingOrder(true);
    setSubmitError(null);

    // Map payment label
    const methodNames: Record<typeof selectedPayMethod, string> = {
      card: '신용/체크카드 (연습결제)',
      naver: '네이버페이 (연습결제)',
      kakao: '카카오페이 (연습결제)',
      toss: '토스페이 (연습결제)',
      bank: '가상계좌 무통장 (연습결제)'
    };

    try {
      // Simulate real-time payment gateway network call (800ms)
      await new Promise(resolve => setTimeout(resolve, 800));

      const placedOrder = await submitRealOrder({
        customerName: orderForm.name,
        phone: orderForm.phone,
        address: orderForm.address,
        addressDetail: orderForm.addressDetail,
        note: orderForm.note,
        packageKey: selectedPackage,
        packageName: currentPkg.title,
        quantity,
        totalPrice,
        paymentMethod: methodNames[selectedPayMethod]
      });

      setConfirmedOrder(placedOrder);
      setCheckoutStep('completed');
    } catch (err: any) {
      console.error('결제 처리 오류:', err);
      setSubmitError(err.message || '가상 결제 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Lookup orders by phone
  const handleSearchOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupPhone.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await findOrdersByPhone(lookupPhone);
      setLookupResults(res);
    } catch (err) {
      console.error('주문 조회 실패:', err);
      setLookupResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Load admin orders
  const loadAdminOrders = async () => {
    setIsLoadingAdminOrders(true);
    try {
      const orders = await fetchAllStoreOrders();
      setAdminOrders(orders);
    } catch (err) {
      console.error('관리자 주문 불러오기 실패:', err);
    } finally {
      setIsLoadingAdminOrders(false);
    }
  };

  const handleOpenAdmin = () => {
    setIsAdminModalOpen(true);
    loadAdminOrders();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderItem['status']) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setAdminOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setAdminNotification(`주문 상태가 '${newStatus}'(으)로 변경되었습니다.`);
      setTimeout(() => setAdminNotification(null), 3000);
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('정말 이 주문 내역을 삭제하시겠습니까?')) return;
    try {
      await removeOrder(orderId);
      setAdminOrders(prev => prev.filter(o => o.id !== orderId));
      setAdminNotification('주문 내역이 삭제되었습니다.');
      setTimeout(() => setAdminNotification(null), 3000);
    } catch (err) {
      alert('주문 삭제에 실패했습니다.');
    }
  };

  // 50 ingredients by category
  const ingredientCategories = [
    {
      category: '국내산 통곡류 (15종)',
      items: ['현미', '발아현미', '찰보리', '늘보리', '검은쌀(흑미)', '찹쌀', '멥쌀', '수수', '기장', '조', '율무', '메밀', '통밀', '귀리', '옥수수']
    },
    {
      category: '국내산 두류 및 종실류 (8종)',
      items: ['서리태(검은콩)', '대두(백태)', '쥐눈이콩(약콩)', '팥', '녹두', '참깨', '검은깨(흑임자)', '들깨']
    },
    {
      category: '국내산 채소류 및 잎채소류 (16종)',
      items: ['케일', '신선초', '시금치', '양배추', '브로콜리', '당근', '단호박', '무', '무청(시래기)', '우엉', '연근', '연잎', '미나리', '더덕', '도라지', '쑥']
    },
    {
      category: '국내산 과일 및 버섯·해조류 (11종)',
      items: ['사과', '배', '감', '유자', '표고버섯', '느타리버섯', '영지버섯', '목이버섯', '미역', '다시마', '김']
    }
  ];

  const faqs = [
    {
      q: '물이나 우유 외에 두유에 타서 마셔도 되나요?',
      a: '네, 아주 좋습니다! 무가당 두유나 귀리 음료(오트밀크)에 타서 드시면 한층 더 고소하고 깊은 풍미를 느끼실 수 있습니다. 물 200ml에 가볍게 타 드셔도 본연의 곡물 단맛과 고소함이 풍부합니다.'
    },
    {
      q: '찬물에도 잘 뭉치지 않고 잘 풀리나요?',
      a: '하루한잔 생식은 원물을 미세하고 균일하게 분쇄한 미세 분말 공법을 적용하여 찬물이나 냉장 우유에도 텀블러에 넣고 4~5회 가볍게 흔들면 뭉침 없이 부드럽게 잘 섞입니다.'
    },
    {
      q: '보관 방법과 유통기한은 어떻게 되나요?',
      a: '직사광선과 습기를 피해 서늘한 실온 또는 건조한 곳에 보관해 주시면 됩니다. 개별 스틱 1포씩 질소 충전 안심 포장되어 있어 제조일로부터 18개월간 신선하게 즐기실 수 있습니다.'
    },
    {
      q: '단맛이나 첨가물이 들어있나요?',
      a: '설탕, 인공 감미료, 착향료, 보존료, 색소를 일절 넣지 않았습니다. 50가지 순수 곡물과 채소가 지닌 자연 그대로의 은은한 단맛과 진한 고소함만을 담았습니다.'
    }
  ];

  const userGreetingName = currentUser?.displayName || '윤성미';

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#263328] font-sans pb-28 sm:pb-16 selection:bg-[#204E37] selection:text-white">
      
      {/* 1. TOP ANNOUNCEMENT BAR & USER LOGIN GREETING */}
      <header className="bg-[#204E37] text-[#FAF7F2] py-2.5 px-4 text-xs sm:text-base font-medium flex flex-wrap items-center justify-between border-b border-[#2C6246] gap-2">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#D8E6DC] shrink-0" />
          <span className="hidden sm:inline">전국 무료배송 · </span>
          <span>오늘 주문 시 친환경 쉐이커 100% 증정</span>
        </div>

        {/* 상단 회원 로그인 환영 문구 및 컨트롤 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2 bg-[#173E2B] px-3 py-1 rounded-full border border-[#3A6B4F]">
              <span className="text-[#A2E3BE] font-black text-xs sm:text-sm">
                🌿 {userGreetingName} 님 환영합니다
              </span>
              <button
                onClick={handleLogout}
                className="text-[11px] sm:text-xs text-[#E1EFE7] underline hover:text-white ml-1 cursor-pointer"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthError(null);
                setAuthTab('login');
                setIsAuthModalOpen(true);
              }}
              className="text-xs sm:text-sm bg-[#EAE2D0] hover:bg-[#FFFFFF] text-[#204E37] font-extrabold px-3 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>로그인 / 회원가입</span>
            </button>
          )}

          <button
            onClick={() => setIsLookupModalOpen(true)}
            className="text-xs bg-[#1A3F2C] hover:bg-[#133022] text-[#E0EFE6] px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>주문조회</span>
          </button>

          <button
            onClick={handleOpenAdmin}
            className="text-xs bg-[#D4E8DC] hover:bg-[#FFFFFF] text-[#204E37] font-bold px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            title="사장님 실시간 주문 관리"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>사장님 주문관리</span>
          </button>
        </div>
      </header>

      {/* 2. NAVIGATION / BRAND HEADER */}
      <nav className="bg-[#FAF7F2]/90 backdrop-blur-md sticky top-0 z-40 border-b border-[#E8DFC9] px-4 sm:px-8 py-4 transition-all">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-[#204E37] text-white flex items-center justify-center font-bold text-xl shadow-xs">
              生
            </span>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-[#204E37] leading-none">
                하루한잔 생식
              </span>
              <span className="text-xs text-[#6B7569] font-medium tracking-wide">
                100% 국내산 50곡 채소 자연식
              </span>
            </div>
          </div>

          {currentUser && (
            <div className="hidden md:flex items-center gap-2 bg-[#E8EFE9] text-[#204E37] px-4 py-1.5 rounded-2xl border border-[#CCE0D2] font-black text-sm">
              <span className="w-2 h-2 rounded-full bg-[#204E37] animate-pulse" />
              <span>{userGreetingName} 님 환영합니다</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 sm:gap-4">
            <a 
              href="tel:080-123-4567" 
              className="hidden sm:flex items-center gap-1.5 text-[#204E37] font-bold hover:text-[#183B2A] px-3 py-2 text-sm"
              title="전화 문의"
            >
              <Phone className="w-4 h-4 text-[#204E37]" />
              <span>080-123-4567</span>
            </a>
            
            <button
              onClick={handleStartOrder}
              className="bg-[#204E37] hover:bg-[#183B2A] text-white font-extrabold px-5 sm:px-7 py-2.5 rounded-xl text-sm sm:text-base shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              주문하기
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* 3. HERO SECTION */}
        <section className="pt-8 sm:pt-14 pb-12 sm:pb-16 text-center">
          
          {currentUser ? (
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#204E37] text-white font-black text-base sm:text-lg mb-4 sm:mb-6 shadow-md">
              <span>🌿 {userGreetingName} 님 환영합니다</span>
              <span className="text-xs bg-white/20 text-[#E0F2E9] px-2 py-0.5 rounded-full font-bold">회원인증 완료</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8EFE9] text-[#204E37] font-bold text-sm sm:text-base mb-4 sm:mb-6 shadow-xs">
              <Leaf className="w-4 h-4" />
              <span>신선한 자연 원료 100% 그대로</span>
            </div>
          )}

          {/* MAIN PROMINENT HEADLINE */}
          <h1 className="text-4xl sm:text-6xl font-black text-[#1C3627] tracking-tight leading-[1.2] mb-4 sm:mb-6">
            하루한잔, 간편한 한끼
          </h1>

          <p className="text-lg sm:text-2xl text-[#4A554A] font-medium leading-relaxed max-w-2xl mx-auto mb-8 sm:mb-10">
            바쁜 일상 속 거르기 쉬운 식사, <br className="sm:hidden" />
            국내산 50가지 통곡물과 신선 채소를 물 한 잔에 간편하게 담았습니다.
          </p>

          {/* BIG PROMINENT ORDER BUTTON */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-10">
            <button
              onClick={handleStartOrder}
              className="w-full bg-[#204E37] hover:bg-[#183B2A] active:bg-[#112B1E] text-white font-extrabold text-xl sm:text-2xl py-4 sm:py-5 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 cursor-pointer"
            >
              <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7" />
              <span>간편하게 주문하기</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

          {/* HERO IMAGE */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-[#EAE3D2] bg-[#EBE4D5] max-w-3xl mx-auto aspect-[4/3] sm:aspect-[16/10]">
            <img
              src="/src/assets/images/hero_grain_shake_1791342195948.jpg"
              alt="하루한잔 국내산 50곡 생식 한 잔과 정갈한 통곡물"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-5 sm:p-8">
              <div className="text-left text-white">
                <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#D8E6DC] bg-black/40 px-2.5 py-1 rounded-md backdrop-blur-sm">
                  정직한 자연의 맛
                </span>
                <p className="text-lg sm:text-2xl font-bold mt-2 text-white">
                  고소하고 담백한 풍미, 1분이면 완성되는 든든한 아침
                </p>
              </div>
            </div>
          </div>

          {/* 3 핵심 요약 뱃지 */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-6 sm:mt-10 max-w-3xl mx-auto">
            <div className="bg-[#F2ECE1] border border-[#E3D9C7] rounded-2xl p-3 sm:p-5 text-center">
              <span className="block text-2xl sm:text-3xl font-black text-[#204E37]">50가지</span>
              <span className="text-xs sm:text-base font-semibold text-[#546053] mt-1 block">100% 국내산 원료</span>
            </div>
            <div className="bg-[#F2ECE1] border border-[#E3D9C7] rounded-2xl p-3 sm:p-5 text-center">
              <span className="block text-2xl sm:text-3xl font-black text-[#204E37]">동결건조</span>
              <span className="text-xs sm:text-base font-semibold text-[#546053] mt-1 block">원물 영양 보존 공법</span>
            </div>
            <div className="bg-[#F2ECE1] border border-[#E3D9C7] rounded-2xl p-3 sm:p-5 text-center">
              <span className="block text-2xl sm:text-3xl font-black text-[#204E37]">1분 완성</span>
              <span className="text-xs sm:text-base font-semibold text-[#546053] mt-1 block">개별 스틱 간편 포장</span>
            </div>
          </div>
        </section>

        {/* 4. 국내산 50가지 곡물, 채소로 만들었다는 소개 */}
        <section className="py-12 sm:py-16 border-t border-[#E8DFC9]">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-sm sm:text-base font-bold text-[#204E37] tracking-wider uppercase">
              우리 땅에서 자란 자연 그대로
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#1C3627] mt-2 mb-4 leading-snug">
              국내산 50가지 곡물과 채소
            </h2>
            <p className="text-base sm:text-xl text-[#536052] font-medium max-w-2xl mx-auto leading-relaxed">
              수입산 원료나 저렴한 부원료로 채우지 않았습니다. <br className="hidden sm:inline" />
              대한민국 청정 산지에서 수확한 통곡물과 제철 채소를 정성껏 골라 담았습니다.
            </p>
          </div>

          <div className="bg-[#FFFFFF] border-2 border-[#E5DDC9] rounded-3xl p-5 sm:p-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 items-center">
              <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-[#EFE9DD] border border-[#E0D5BF]">
                <img
                  src="/src/assets/images/fifty_korean_grains_1791342209013.jpg"
                  alt="국내산 50가지 곡물과 채소 모음"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-5 text-left">
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#204E37]">
                    자연 본연의 고소함과 신선함
                  </h3>
                  <p className="text-sm sm:text-base text-[#5C685B] leading-relaxed">
                    열풍 건조 대신 원물을 영하에서 급속 동결시킨 뒤 수분만 건조하는 <strong>동결건조 공법</strong>을 적용하여 곡물과 채소의 신선한 맛과 향, 본래의 고운 빛깔을 고스란히 지켰습니다.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#E8EFE9] text-[#204E37] flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-bold text-base sm:text-lg text-[#263328]">100% 국내산 원산지 증명</h4>
                      <p className="text-xs sm:text-sm text-[#6A7869]">엄격하게 선별한 국내 재배 곡물과 채소만을 사용합니다.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#E8EFE9] text-[#204E37] flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-bold text-base sm:text-lg text-[#263328]">인공 첨가물 0% 무첨가 원칙</h4>
                      <p className="text-xs sm:text-sm text-[#6A7869]">보존료, 합성향료, 착색료, 설탕을 일체 넣지 않았습니다.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#E8EFE9] text-[#204E37] flex items-center justify-center shrink-0 mt-0.5 font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-bold text-base sm:text-lg text-[#263328]">통곡물의 풍부한 식이섬유</h4>
                      <p className="text-xs sm:text-sm text-[#6A7869]">껍질과 씨눈까지 통째로 갈아 한 잔으로도 속이 든든합니다.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsIngredientModalOpen(true)}
                  className="w-full sm:w-auto bg-[#F2ECE1] hover:bg-[#E7DFD1] text-[#204E37] font-bold py-3 px-5 rounded-xl text-sm sm:text-base border border-[#DACFBB] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>50가지 전성분 원재료 전체 보기</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 5. 이런 분께 좋아요 (3가지) */}
        <section className="py-12 sm:py-16 border-t border-[#E8DFC9]">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-sm sm:text-base font-bold text-[#204E37] tracking-wider uppercase">
              맞춤 추천
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#1C3627] mt-2 mb-4">
              이런 분께 좋아요
            </h2>
            <p className="text-base sm:text-xl text-[#536052] font-medium">
              간편하고 든든한 하루를 시작하고 싶은 분들을 위해 준비했습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            <div className="bg-[#FFFFFF] border-2 border-[#E5DDC9] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:border-[#204E37] transition-all">
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E8EFE9] text-[#204E37] flex items-center justify-center mb-6">
                  <Clock className="w-8 h-8 sm:w-9 sm:h-9" />
                </div>
                <div className="text-xs font-bold text-[#204E37] uppercase tracking-wider mb-1">
                  추천 01
                </div>
                <h3 className="text-2xl sm:text-2xl font-black text-[#1F2F23] mb-3 leading-snug">
                  바쁜 아침, <br />
                  식사를 자주 거르는 분
                </h3>
                <p className="text-base sm:text-base text-[#556353] leading-relaxed">
                  출근 준비나 등교로 바빠 빈속으로 하루를 시작하시나요? 물이나 우유에 타서 1분이면 든든하게 속을 채울 수 있습니다.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F0E9DA] text-sm font-semibold text-[#204E37] flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>아침 1분 간편 대용식</span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border-2 border-[#E5DDC9] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:border-[#204E37] transition-all">
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E8EFE9] text-[#204E37] flex items-center justify-center mb-6">
                  <UtensilsCrossed className="w-8 h-8 sm:w-9 sm:h-9" />
                </div>
                <div className="text-xs font-bold text-[#204E37] uppercase tracking-wider mb-1">
                  추천 02
                </div>
                <h3 className="text-2xl sm:text-2xl font-black text-[#1F2F23] mb-3 leading-snug">
                  매 끼니 챙겨 먹거나 <br />
                  요리하기 번거로운 분
                </h3>
                <p className="text-base sm:text-base text-[#556353] leading-relaxed">
                  혼자 살아서, 혹은 일상이 바빠 식사 차리고 설거지하기 번거로우신 분께 간편하고 깔끔한 최적의 한 끼를 선물합니다.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F0E9DA] text-sm font-semibold text-[#204E37] flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>설거지 없는 간편한 한 끼</span>
              </div>
            </div>

            <div className="bg-[#FFFFFF] border-2 border-[#E5DDC9] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:border-[#204E37] transition-all">
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#E8EFE9] text-[#204E37] flex items-center justify-center mb-6">
                  <Leaf className="w-8 h-8 sm:w-9 sm:h-9" />
                </div>
                <div className="text-xs font-bold text-[#204E37] uppercase tracking-wider mb-1">
                  추천 03
                </div>
                <h3 className="text-2xl sm:text-2xl font-black text-[#1F2F23] mb-3 leading-snug">
                  자극적인 배달음식 대신 <br />
                  속 편한 자연식을 찾는 분
                </h3>
                <p className="text-base sm:text-base text-[#556353] leading-relaxed">
                  기름지고 짠 외식에 지쳐 담백하고 정직한 곡채류 본연의 고소한 식사를 원하시는 분께 속 편안한 만족감을 드립니다.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#F0E9DA] text-sm font-semibold text-[#204E37] flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>순수 자연 곡물과 채소</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. 물이나 우유에 타서 드세요 (1→2→3 순서표시) */}
        <section className="py-12 sm:py-16 border-t border-[#E8DFC9]">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-sm sm:text-base font-bold text-[#204E37] tracking-wider uppercase">
              섭취 방법 안내
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#1C3627] mt-2 mb-4">
              물이나 우유에 타서 드세요
            </h2>
            <p className="text-base sm:text-xl text-[#536052] font-medium">
              누구나 1분이면 끝나는 초간편 3단계 준비법
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 relative">
            <div className="bg-[#FFFFFF] border-2 border-[#E5DDC9] rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#204E37] text-white font-black text-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                1
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E3022] mb-3">
                물 또는 우유 붓기
              </h3>
              <p className="text-base sm:text-base text-[#536152] leading-relaxed">
                텀블러나 컵에 물, 우유 또는 두유 <strong>약 200ml</strong>를 먼저 부어줍니다.
              </p>
              <div className="mt-5 p-3 rounded-xl bg-[#F8F5EF] text-xs sm:text-sm text-[#667264] font-medium">
                💡 액체를 먼저 부어야 가루가 바닥에 뭉치지 않아요.
              </div>
            </div>

            <div className="bg-[#FFFFFF] border-2 border-[#E5DDC9] rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#204E37] text-white font-black text-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                2
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E3022] mb-3">
                생식 1포 톡 넣기
              </h3>
              <p className="text-base sm:text-base text-[#536152] leading-relaxed">
                이지컷을 뜯어 <strong>하루한잔 생식 1포(30g)</strong>를 텀블러 안에 털어 넣습니다.
              </p>
              <div className="mt-5 p-3 rounded-xl bg-[#F8F5EF] text-xs sm:text-sm text-[#667264] font-medium">
                💡 외출 시에는 스틱 1포만 가방에 챙겨가면 끝!
              </div>
            </div>

            <div className="bg-[#FFFFFF] border-2 border-[#E5DDC9] rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#204E37] text-white font-black text-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                3
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E3022] mb-3">
                흔들어서 꿀꺽 마시기
              </h3>
              <p className="text-base sm:text-base text-[#536152] leading-relaxed">
                뚜껑을 닫고 <strong>가볍게 4~5회 흔든 뒤</strong> 든든하고 고소하게 마십니다.
              </p>
              <div className="mt-5 p-3 rounded-xl bg-[#F8F5EF] text-xs sm:text-sm text-[#667264] font-medium">
                💡 달콤한 맛을 원하시면 꿀 반 스푼을 넣어도 훌륭해요.
              </div>
            </div>
          </div>

          <div className="mt-8 bg-[#E9F1EB] border border-[#CCDDCF] rounded-2xl p-5 sm:p-6 text-center max-w-2xl mx-auto">
            <p className="text-sm sm:text-base text-[#1E432E] font-medium">
              🌾 <strong>맛있게 마시는 꿀팁</strong>: 따뜻한 물보다는 <strong>미온수나 시원한 물/우유</strong>에 타 드실 때 곡물 본연의 고소한 향과 식감이 가장 깔끔하게 살아납니다.
            </p>
          </div>
        </section>

        {/* 7. 상품 1개와 가격, "주문하기" 버튼 (단일 정직 상품) */}
        <section ref={orderSectionRef} className="py-12 sm:py-16 border-t border-[#E8DFC9]">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-sm sm:text-base font-bold text-[#204E37] tracking-wider uppercase">
              단 하나의 정직한 선택
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#1C3627] mt-2 mb-4">
              상품 안내 및 바로 주문
            </h2>
            <p className="text-base sm:text-xl text-[#536052] font-medium">
              국내산 50가지 원료를 듬뿍 담은 신선한 생식을 지금 만나보세요.
            </p>
          </div>

          <div className="bg-[#FFFFFF] border-2 border-[#D8CEB7] rounded-3xl p-6 sm:p-10 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
              
              {/* 상품 이미지 */}
              <div className="space-y-4">
                <div className="rounded-3xl overflow-hidden aspect-square bg-[#F7F3EB] border border-[#E8DFC9] shadow-inner relative">
                  <img
                    src="/src/assets/images/product_box_pack_1791342231888.jpg"
                    alt="하루한잔 국내산 50곡 생식 1박스 패키지"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-[#204E37] text-white font-extrabold text-xs sm:text-sm px-3 py-1.5 rounded-lg shadow">
                    전용 쉐이커 100% 무료 증정
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm text-[#6C786A] px-2 font-medium">
                  <span>· 제조국: 대한민국 (100% 국내산 원료)</span>
                  <span>· 용량: 30g × 30포 (총 900g)</span>
                </div>
              </div>

              {/* 상품 상세 및 주문 선택기 */}
              <div className="space-y-6 text-left">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-[#204E37] uppercase tracking-wide">
                    하루한잔 시그니처 단독 상품
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#1C3627] mt-1 leading-snug">
                    [하루한잔] 국내산 50곡 동결건조 생식
                  </h3>
                  <p className="text-sm sm:text-base text-[#616D60] mt-1">
                    한 박스 30포 구성 (1일 1포 기준 30일분)
                  </p>
                </div>

                {/* 패키지 구성 선택 (1박스 / 2박스 / 3박스) */}
                <div className="space-y-2.5">
                  <label className="block text-sm font-bold text-[#354335]">
                    패키지 구성 선택
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {(Object.keys(packages) as Array<keyof typeof packages>).map((key) => {
                      const item = packages[key];
                      const isSelected = selectedPackage === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedPackage(key);
                            setQuantity(1);
                          }}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                            isSelected 
                              ? 'border-[#204E37] bg-[#F2F7F4] shadow-sm' 
                              : 'border-[#E7DFC9] bg-white hover:border-[#CCDDCF]'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#204E37] bg-[#204E37]' : 'border-[#9EAA9C]'}`}>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </span>
                              <span className="font-extrabold text-base sm:text-lg text-[#204E37]">
                                {item.title}
                              </span>
                              <span className="text-xs font-bold text-[#B34024] bg-[#FFEAE4] px-2 py-0.5 rounded-md">
                                {item.discount} 할인
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-[#667265] ml-6 mt-1">
                              {item.sub} · <span className="font-semibold text-[#204E37]">{item.perServing}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-base sm:text-lg font-black text-[#1C3627]">
                              {item.price.toLocaleString()}원
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 수량 선택기 */}
                <div className="flex items-center justify-between p-4 bg-[#FAF7F2] rounded-2xl border border-[#E5DDC9]">
                  <span className="font-bold text-base sm:text-lg text-[#324032]">
                    세트 수량
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-xl bg-white border border-[#D5CABB] flex items-center justify-center text-lg font-bold text-[#204E37] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
                      aria-label="수량 감소"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-xl font-black text-[#1C3627]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-xl bg-white border border-[#D5CABB] flex items-center justify-center text-lg font-bold text-[#204E37] hover:bg-[#F2ECE1] transition-colors cursor-pointer"
                      aria-label="수량 증가"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 총 결제 금액 */}
                <div className="pt-2 border-t border-[#EAE2D0] flex items-baseline justify-between">
                  <span className="text-base sm:text-lg font-bold text-[#556353]">
                    총 주문 금액 (무료배송)
                  </span>
                  <div className="text-right">
                    <span className="text-sm sm:text-base text-[#919D90] line-through mr-2">
                      {(currentPkg.originalPrice * quantity).toLocaleString()}원
                    </span>
                    <span className="text-3xl sm:text-4xl font-black text-[#204E37]">
                      {totalPrice.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 큰 "주문하기" 버튼 */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleStartOrder}
                    className="w-full bg-[#204E37] hover:bg-[#183B2A] active:bg-[#112B1E] text-white font-extrabold text-xl sm:text-2xl py-4 sm:py-5 px-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <ShoppingBag className="w-6 h-6" />
                    <span>지금 주문하기</span>
                  </button>

                  <div className="flex items-center justify-center gap-4 text-xs sm:text-sm text-[#6B776A] font-medium pt-1">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-[#204E37]" /> 국내산 100% 보증
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-4 h-4 text-[#204E37]" /> 전 지역 무료배송
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Gift className="w-4 h-4 text-[#204E37]" /> 쉐이커 무료 증정
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 8. 식품표시광고법 준수 고지 & 고객 후기 */}
        <section className="py-12 sm:py-16 border-t border-[#E8DFC9]">
          <div className="bg-[#EFECE3] border border-[#DDD4C1] rounded-3xl p-6 sm:p-8 text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#576455] bg-[#E3DDCB] px-3 py-1 rounded-full mb-3">
              <ShieldCheck className="w-4 h-4 text-[#204E37]" />
              식품안전 및 품질 안내
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#233527] mb-2">
              정직한 원료와 간편함을 약속합니다
            </h3>
            <p className="text-xs sm:text-sm text-[#5B6659] leading-relaxed max-w-2xl mx-auto">
              ※ 본 제품은 질병의 예방 및 치료를 위한 의약품이 아닌 <strong>일반가공식품(생식)</strong>입니다. 과장된 표현 없이 오직 청정 국내산 50가지 곡채류 원료의 정직한 영양과 바쁜 일상을 든든하게 채워주는 간편함에만 집중하여 정성껏 만들었습니다.
            </p>
          </div>

          <div className="text-center mb-8">
            <h3 className="text-2xl sm:text-3xl font-black text-[#1C3627]">
              직접 드셔보신 분들의 솔직한 이야기
            </h3>
            <p className="text-sm sm:text-base text-[#5E6B5D] mt-1">
              재료의 진솔함과 간편함에 만족하신 고객님들의 후기입니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-[#E6DEC9] p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1 text-[#204E37] mb-3">
                {'★★★★★'}
              </div>
              <h4 className="font-bold text-lg text-[#1C3627] mb-2">
                "출근길 1분이면 든든해요"
              </h4>
              <p className="text-sm text-[#576355] leading-relaxed">
                늘 아침 거르고 다니다가 속이 허전했는데, 물에 톡 털어 넣고 몇 번 흔들어 마시니 정말 간편합니다. 곡물이 씹히듯 고소해서 매일 챙겨 마십니다.
              </p>
              <div className="text-xs text-[#8A9687] mt-4 font-medium">
                직장인 김*현 님 (30대)
              </div>
            </div>

            <div className="bg-white border border-[#E6DEC9] p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1 text-[#204E37] mb-3">
                {'★★★★★'}
              </div>
              <h4 className="font-bold text-lg text-[#1C3627] mb-2">
                "국내산 50가지라 믿음이 가요"
              </h4>
              <p className="text-sm text-[#576355] leading-relaxed">
                원재료 목록을 보니 잡다한 설탕이나 화학 첨가물 없이 순수 국내산 통곡물과 채소로만 채워져 있어서 안심하고 온 가족이 함께 마십니다.
              </p>
              <div className="text-xs text-[#8A9687] mt-4 font-medium">
                주부 박*옥 님 (50대)
              </div>
            </div>

            <div className="bg-white border border-[#E6DEC9] p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-1 text-[#204E37] mb-3">
                {'★★★★★'}
              </div>
              <h4 className="font-bold text-lg text-[#1C3627] mb-2">
                "찬물에도 뭉치지 않고 잘 녹네요"
              </h4>
              <p className="text-sm text-[#576355] leading-relaxed">
                예전에 먹던 다른 가루 제품은 뭉쳐서 씻기도 힘들었는데, 이건 텀블러에 찬 우유 넣고 쉐킷 흔들면 깔끔하게 풀려서 목 넘김이 아주 좋습니다.
              </p>
              <div className="text-xs text-[#8A9687] mt-4 font-medium">
                자취생 이*준 님 (20대)
              </div>
            </div>
          </div>
        </section>

        {/* 9. 자주 묻는 질문 (FAQ) */}
        <section className="py-12 sm:py-16 border-t border-[#E8DFC9]">
          <div className="text-center mb-8 sm:mb-10">
            <h3 className="text-2xl sm:text-4xl font-black text-[#1C3627]">
              자주 묻는 질문
            </h3>
            <p className="text-sm sm:text-base text-[#5E6B5D] mt-1">
              궁금하신 점을 빠르게 확인해보세요.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-[#E5DEC9] rounded-2xl overflow-hidden transition-all shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-base sm:text-lg text-[#204E37] cursor-pointer"
                >
                  <span>Q. {faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-5 h-5 shrink-0 text-[#204E37]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 shrink-0 text-[#7F8D7E]" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm sm:text-base text-[#536152] border-t border-[#F1EADC] pt-3 leading-relaxed bg-[#FAF8F5]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 10. 전화 주문 및 안심 고객센터 */}
        <section className="py-10 mb-6 bg-[#204E37] text-white rounded-3xl p-6 sm:p-10 text-center shadow-lg">
          <div className="max-w-xl mx-auto space-y-4">
            <Phone className="w-10 h-10 mx-auto text-[#D8E6DC]" />
            <h3 className="text-2xl sm:text-3xl font-black leading-snug">
              인터넷 주문이 번거로우신가요?
            </h3>
            <p className="text-sm sm:text-base text-[#D3E2D7] leading-relaxed">
              어르신분들도 편안하게 이용하실 수 있도록 친절한 전화 주문 상담을 지원합니다.
            </p>
            <div className="pt-2">
              <a
                href="tel:080-123-4567"
                className="inline-flex items-center gap-3 bg-[#FAF7F2] hover:bg-[#FFFFFF] text-[#204E37] font-black text-2xl sm:text-3xl py-4 px-8 rounded-2xl shadow-md transition-all active:scale-95"
              >
                <Phone className="w-6 h-6 sm:w-7 sm:h-7" />
                <span>080-123-4567</span>
              </a>
            </div>
            <p className="text-xs text-[#B2CBB8] pt-1">
              상담시간: 평일 오전 9시 ~ 오후 6시 (주말 및 공휴일 휴무)
            </p>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-[#EDE6D6] border-t border-[#DCD1BA] py-10 px-4 text-[#5F6B5E] text-xs sm:text-sm">
        <div className="max-w-4xl mx-auto space-y-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-[#D8CDAF] pb-4">
            <span className="font-extrabold text-base text-[#204E37]">하루한잔 생식</span>
            <div className="flex items-center gap-3">
              {currentUser ? (
                <button 
                  onClick={handleLogout}
                  className="text-xs font-semibold text-[#204E37] underline hover:text-black cursor-pointer"
                >
                  로그아웃 ({userGreetingName})
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setAuthTab('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="text-xs font-semibold text-[#204E37] underline hover:text-black cursor-pointer"
                >
                  회원 로그인 / 가입
                </button>
              )}
              <span>·</span>
              <button 
                onClick={() => setIsLookupModalOpen(true)}
                className="text-xs font-semibold text-[#204E37] underline hover:text-black cursor-pointer"
              >
                내 주문 내역 조회
              </button>
              <span>·</span>
              <button 
                onClick={handleOpenAdmin}
                className="text-xs font-bold text-[#204E37] underline hover:text-black cursor-pointer"
              >
                가게 사장님 주문 관리
              </button>
            </div>
          </div>
          <div className="space-y-1 text-xs text-[#6F7B6E] leading-relaxed">
            <p>상호명: 하루한잔 생식 주식회사 | 대표자: 홍길동 | 사업자등록번호: 123-45-67890</p>
            <p>통신판매업신고: 제 2026-서울강남-01234호 | 소재지: 서울특별시 서초구 자연대로 50</p>
            <p>고객센터: 080-123-4567 | 이메일: contact@haruhanjan-rawfood.kr</p>
            <p className="pt-2 text-[#7F8D7E]">
              본 사이트의 모든 제품은 질병 치료 및 예방 목적의 의약품이 아니며, 건전한 식습관을 위한 순수 일반식품입니다.
            </p>
          </div>
          <div className="text-center pt-2 text-[11px] text-[#8F9C8E]">
            © 2026 하루한잔 생식. All rights reserved.
          </div>
        </div>
      </footer>

      {/* MOBILE FLOATING BOTTOM BAR */}
      <aside aria-label="간편 주문 바" className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-lg border-t-2 border-[#DCD2BC] p-3 sm:hidden shadow-2xl">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="flex flex-col pl-1">
            <span className="text-xs font-semibold text-[#667265]">
              {currentUser ? `🌿 ${userGreetingName} 님` : currentPkg.title}
            </span>
            <span className="text-xl font-black text-[#204E37]">
              {totalPrice.toLocaleString()}원
            </span>
          </div>
          <button
            onClick={handleStartOrder}
            className="flex-1 bg-[#204E37] hover:bg-[#183B2A] text-white font-black text-lg py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>{currentUser ? '바로 주문하기' : '로그인 후 주문'}</span>
          </button>
        </div>
      </aside>

      {/* ========================================================
          로그인 및 회원가입 모달
      ======================================================== */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 border-2 border-[#D8CEB7] shadow-2xl relative text-left">
            <button
              onClick={() => {
                setIsAuthModalOpen(false);
                setAuthError(null);
                setAuthSuccessMsg(null);
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#EAE0CA] text-[#475445] cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-left mb-5">
              <span className="text-xs font-bold text-[#204E37] uppercase tracking-wider">
                주문 전 본인 확인
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#1C3627] mt-1">
                {authTab === 'login' ? '회원 로그인' : '간편 회원가입'}
              </h3>
              <p className="text-xs sm:text-sm text-[#5D6B5C] mt-1">
                주문하시려면 먼저 이메일과 비밀번호로 로그인해 주세요.
              </p>
            </div>

            <div className="flex bg-[#EFE8DA] p-1.5 rounded-2xl mb-5 border border-[#DECDB3]">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                }}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm sm:text-base transition-all cursor-pointer ${
                  authTab === 'login'
                    ? 'bg-[#204E37] text-white shadow-sm'
                    : 'text-[#536152] hover:text-[#204E37]'
                }`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                }}
                className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm sm:text-base transition-all cursor-pointer ${
                  authTab === 'register'
                    ? 'bg-[#204E37] text-white shadow-sm'
                    : 'text-[#536152] hover:text-[#204E37]'
                }`}
              >
                회원가입
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3.5 bg-[#FFF1EE] border-2 border-[#F5B8AC] text-[#A82810] rounded-2xl text-xs sm:text-sm font-bold flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-5 h-5 shrink-0 text-[#D83617] mt-0.5" />
                <div>
                  <span className="block font-black text-xs uppercase text-[#A82810] mb-0.5">안내 사항</span>
                  {authError}
                </div>
              </div>
            )}

            {authSuccessMsg && (
              <div className="mb-4 p-3.5 bg-[#EEF7F2] border-2 border-[#9FD3B6] text-[#145C33] rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-[#1B7743]" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authTab === 'register' && (
                <div>
                  <label className="block text-sm font-extrabold text-[#2F3D2F] mb-1.5">
                    고객님 성함(이름) <span className="text-[#D32F2F]">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#889686]" />
                    <input
                      type="text"
                      required
                      placeholder="예: 윤성미"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#D5CABB] bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#204E37]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-extrabold text-[#2F3D2F] mb-1.5">
                  이메일 주소 <span className="text-[#D32F2F]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#889686]" />
                  <input
                    type="email"
                    required
                    placeholder="예: seongmi@naver.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#D5CABB] bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#204E37]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-extrabold text-[#2F3D2F]">
                    비밀번호 <span className="text-[#D32F2F]">*</span>
                  </label>
                  <span className="text-xs font-bold text-[#204E37] bg-[#E7EFEA] px-2 py-0.5 rounded-md">
                    최소 6자리 이상
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#889686]" />
                  <input
                    type="password"
                    required
                    placeholder="비밀번호 6자리 이상 입력"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#D5CABB] bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#204E37]"
                  />
                </div>
                {authPassword.length > 0 && authPassword.length < 6 && (
                  <p className="text-xs text-[#C2351A] font-semibold mt-1 ml-1">
                    ⚠️ 현재 {authPassword.length}자리입니다. 6자리 이상 입력해 주셔야 합니다.
                  </p>
                )}
              </div>

              {authTab === 'register' && (
                <div>
                  <label className="block text-sm font-extrabold text-[#2F3D2F] mb-1.5">
                    비밀번호 다시 입력(확인) <span className="text-[#D32F2F]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#889686]" />
                    <input
                      type="password"
                      required
                      placeholder="위와 동일하게 다시 입력해 주세요"
                      value={authPasswordConfirm}
                      onChange={(e) => setAuthPasswordConfirm(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-[#D5CABB] bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#204E37]"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-[#204E37] hover:bg-[#183B2A] text-white font-black text-xl py-4 rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isAuthLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>처리 중입니다...</span>
                    </>
                  ) : authTab === 'login' ? (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>로그인하고 주문 계속하기</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>회원가입 완료하고 주문하기</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          통합 주문 및 결제 모달 (배송지 입력 -> 연습용 가짜 결제 -> 주문완료)
      ======================================================== */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-8 border-2 border-[#D8CEB7] shadow-2xl relative text-left">
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#EAE0CA] text-[#475445] cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-6 h-6" />
            </button>

            {/* 단계 표시 인디케이터 */}
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#E8DFC9]">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  checkoutStep === 'delivery' ? 'bg-[#204E37] text-white' : 'bg-[#D3E4D9] text-[#204E37]'
                }`}>1</span>
                <span className={`text-xs sm:text-sm font-bold ${
                  checkoutStep === 'delivery' ? 'text-[#204E37]' : 'text-[#7A8878]'
                }`}>배송지 정보</span>
              </div>
              <span className="text-[#C0CBBF]">──</span>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  checkoutStep === 'payment' ? 'bg-[#204E37] text-white' : 'bg-[#E5DEC9] text-[#7A8878]'
                }`}>2</span>
                <span className={`text-xs sm:text-sm font-bold ${
                  checkoutStep === 'payment' ? 'text-[#204E37]' : 'text-[#7A8878]'
                }`}>결제하기(연습)</span>
              </div>
              <span className="text-[#C0CBBF]">──</span>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  checkoutStep === 'completed' ? 'bg-[#204E37] text-white' : 'bg-[#E5DEC9] text-[#7A8878]'
                }`}>3</span>
                <span className={`text-xs sm:text-sm font-bold ${
                  checkoutStep === 'completed' ? 'text-[#204E37]' : 'text-[#7A8878]'
                }`}>주문완료</span>
              </div>
            </div>

            {/* ---------------- 1단계: 배송지 정보 입력 ---------------- */}
            {checkoutStep === 'delivery' && (
              <div>
                <div className="mb-5">
                  <div className="inline-flex items-center gap-1.5 bg-[#E8EFE9] text-[#204E37] px-3 py-1 rounded-full text-xs font-bold mb-1">
                    <span>🌿 회원: {userGreetingName} 님</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-[#1C3627] mt-1">
                    배송지 정보 입력
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C6A5B] mt-1">
                    신선하고 안전하게 배송해 드릴 주소를 확인해 주세요.
                  </p>
                </div>

                {/* 주문 상품 요약 */}
                <div className="bg-white p-4 rounded-2xl border border-[#E5DDC9] mb-5">
                  <div className="flex justify-between items-center text-sm font-semibold text-[#546253]">
                    <span>선택 상품</span>
                    <span className="text-[#204E37] font-bold">{currentPkg.title} × {quantity}세트</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-black text-[#1C3627] mt-2 pt-2 border-t border-[#F2ECE1]">
                    <span>결제 예정 금액</span>
                    <span className="text-[#204E37] text-xl">{totalPrice.toLocaleString()}원 (무료배송)</span>
                  </div>
                </div>

                <form onSubmit={handleProceedToPayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-extrabold text-[#2F3D2F] mb-1.5">
                      받는 분 성함 <span className="text-[#D32F2F]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="예: 윤성미"
                      value={orderForm.name}
                      onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-[#D5CABB] bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#204E37]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-extrabold text-[#2F3D2F] mb-1.5">
                      휴대폰 번호 <span className="text-[#D32F2F]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="예: 010-1234-5678"
                      value={orderForm.phone}
                      onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-[#D5CABB] bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#204E37]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-extrabold text-[#2F3D2F] mb-1.5">
                      배송지 주소 <span className="text-[#D32F2F]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="예: 서울시 서초구 서초대로 123"
                      value={orderForm.address}
                      onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-[#D5CABB] bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#204E37] mb-2"
                    />
                    <input
                      type="text"
                      placeholder="상세주소 (동, 호수 입력)"
                      value={orderForm.addressDetail}
                      onChange={(e) => setOrderForm({ ...orderForm, addressDetail: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-[#D5CABB] bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#204E37]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-extrabold text-[#2F3D2F] mb-1.5">
                      배송 요청사항
                    </label>
                    <input
                      type="text"
                      placeholder="예: 문 앞에 놓아주세요"
                      value={orderForm.note}
                      onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })}
                      className="w-full p-3.5 rounded-xl border border-[#D5CABB] bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#204E37]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-[#204E37] hover:bg-[#183B2A] text-white font-extrabold text-xl py-4 rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>결제 단계로 이동하기</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ---------------- 2단계: 결제화면 (연습용 가짜 결제) ---------------- */}
            {checkoutStep === 'payment' && (
              <div>
                {/* 큼직한 연습용 안내 배너 (요구사항 필수) */}
                <div className="mb-5 p-4 sm:p-5 bg-[#FFF4E5] border-2 border-[#F5A623] text-[#8A4B00] rounded-2xl text-center shadow-xs">
                  <div className="inline-flex items-center gap-1.5 text-base sm:text-xl font-black text-[#D35400] mb-1">
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                    <span>실제로 결제되지 않는 연습용 입니다</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-[#7A4B1A] leading-relaxed">
                    안심하세요! <strong>실제 카드나 계좌에서 돈이 절대 빠져나가지 않는 안전한 모의 결제 화면</strong>입니다.
                  </p>
                </div>

                <div className="mb-4">
                  <h3 className="text-xl sm:text-2xl font-black text-[#1C3627]">
                    결제 수단 선택
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5B695A]">
                    원하시는 결제 수단을 선택 후 '결제하기'를 눌러보세요.
                  </p>
                </div>

                {/* 결제 수단 탭: 신용카드, 네이버페이, 카카오페이, 토스페이, 무통장 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('card')}
                    className={`p-3 rounded-xl border-2 font-bold text-xs sm:text-sm flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      selectedPayMethod === 'card'
                        ? 'border-[#204E37] bg-[#EAF2ED] text-[#204E37] shadow-xs'
                        : 'border-[#E0D7C3] bg-white text-[#4F5B4E] hover:border-[#204E37]'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-[#204E37]" />
                    <span>신용/체크카드</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('naver')}
                    className={`p-3 rounded-xl border-2 font-bold text-xs sm:text-sm flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      selectedPayMethod === 'naver'
                        ? 'border-[#03C75A] bg-[#E8F9EE] text-[#03C75A] shadow-xs'
                        : 'border-[#E0D7C3] bg-white text-[#4F5B4E] hover:border-[#03C75A]'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-md bg-[#03C75A] text-white flex items-center justify-center font-black text-xs">N</span>
                    <span>네이버페이</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('kakao')}
                    className={`p-3 rounded-xl border-2 font-bold text-xs sm:text-sm flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      selectedPayMethod === 'kakao'
                        ? 'border-[#E5AC00] bg-[#FFFBEA] text-[#5C4500] shadow-xs'
                        : 'border-[#E0D7C3] bg-white text-[#4F5B4E] hover:border-[#FEE500]'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-md bg-[#FEE500] text-black flex items-center justify-center font-black text-xs">pay</span>
                    <span>카카오페이</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('toss')}
                    className={`p-3 rounded-xl border-2 font-bold text-xs sm:text-sm flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      selectedPayMethod === 'toss'
                        ? 'border-[#0064FF] bg-[#EDF4FF] text-[#0064FF] shadow-xs'
                        : 'border-[#E0D7C3] bg-white text-[#4F5B4E] hover:border-[#0064FF]'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-[#0064FF]" />
                    <span>토스페이</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPayMethod('bank')}
                    className={`p-3 rounded-xl border-2 font-bold text-xs sm:text-sm flex flex-col items-center gap-1 col-span-2 sm:col-span-2 transition-all cursor-pointer ${
                      selectedPayMethod === 'bank'
                        ? 'border-[#204E37] bg-[#EAF2ED] text-[#204E37] shadow-xs'
                        : 'border-[#E0D7C3] bg-white text-[#4F5B4E] hover:border-[#204E37]'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-[#204E37]" />
                    <span>가상계좌 무통장입금</span>
                  </button>
                </div>

                {/* 결제 수단별 세부 폼 (신용카드: 카드번호 1111-2222-3333-4444 기본 기재) */}
                {selectedPayMethod === 'card' && (
                  <div className="bg-white p-4 rounded-2xl border-2 border-[#D9CDB6] space-y-3.5 mb-5 shadow-inner">
                    <div className="flex items-center justify-between text-xs text-[#6F7D6D] border-b border-[#F4EFE5] pb-2 font-bold">
                      <span>💳 카드 결제 정보 (테스트 자동 입력)</span>
                      <span className="text-[#204E37] bg-[#E8EFE9] px-2 py-0.5 rounded">연습용 번호</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#324032] mb-1">
                        카드번호 <span className="text-[#C2351A]">*</span>
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full p-3 rounded-xl border border-[#D5CABB] bg-[#FAF8F5] font-mono text-base font-bold text-[#204E37] tracking-wider focus:outline-none focus:ring-2 focus:ring-[#204E37]"
                      />
                      <p className="text-[11px] text-[#718070] mt-1">
                        ✓ 연습용 카드번호 <strong>1111-2222-3333-4444</strong>가 자동으로 준비되어 있습니다.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#324032] mb-1">
                          유효기간 (MM/YY)
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full p-3 rounded-xl border border-[#D5CABB] bg-[#FAF8F5] font-mono text-sm font-bold text-[#204E37] focus:outline-none focus:ring-2 focus:ring-[#204E37]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#324032] mb-1">
                          CVC (3자리)
                        </label>
                        <input
                          type="password"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full p-3 rounded-xl border border-[#D5CABB] bg-[#FAF8F5] font-mono text-sm font-bold text-[#204E37] focus:outline-none focus:ring-2 focus:ring-[#204E37]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedPayMethod === 'naver' && (
                  <div className="bg-[#F8FCF9] p-4 rounded-2xl border-2 border-[#03C75A]/40 mb-5 text-sm text-[#18532F] space-y-2">
                    <div className="flex items-center gap-2 font-black text-[#03C75A] text-base">
                      <span className="w-6 h-6 rounded-md bg-[#03C75A] text-white flex items-center justify-center text-xs">N</span>
                      <span>네이버페이 간편결제 (연습)</span>
                    </div>
                    <p className="text-xs text-[#4F6856] leading-relaxed">
                      네이버페이 등록 카드 또는 포인트 모의 결제가 연동됩니다. 실제 결제 승인 없이 테스트 주문 번호가 생성됩니다.
                    </p>
                  </div>
                )}

                {selectedPayMethod === 'kakao' && (
                  <div className="bg-[#FFFDF5] p-4 rounded-2xl border-2 border-[#E5AC00]/40 mb-5 text-sm text-[#5C4500] space-y-2">
                    <div className="flex items-center gap-2 font-black text-[#3C1E1E] text-base">
                      <span className="w-6 h-6 rounded-md bg-[#FEE500] text-black flex items-center justify-center text-xs">pay</span>
                      <span>카카오페이 간편결제 (연습)</span>
                    </div>
                    <p className="text-xs text-[#6B5A24] leading-relaxed">
                      카카오톡 결제 창을 시뮬레이션하여 안전하게 테스트 완료를 지원합니다. 실제 청구는 이루어지지 않습니다.
                    </p>
                  </div>
                )}

                {selectedPayMethod === 'toss' && (
                  <div className="bg-[#F5F8FF] p-4 rounded-2xl border-2 border-[#0064FF]/40 mb-5 text-sm text-[#0048B8] space-y-2">
                    <div className="flex items-center gap-2 font-black text-[#0064FF] text-base">
                      <Smartphone className="w-5 h-5 text-[#0064FF]" />
                      <span>토스페이 원클릭 결제 (연습)</span>
                    </div>
                    <p className="text-xs text-[#4268A6] leading-relaxed">
                      토스 앱 승인 모의 프로세스로 바로 결제 승인이 완료 처리됩니다.
                    </p>
                  </div>
                )}

                {selectedPayMethod === 'bank' && (
                  <div className="bg-white p-4 rounded-2xl border border-[#D5CABB] mb-5 text-sm text-[#3E4A3D] space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#204E37]">
                      <Building2 className="w-5 h-5" />
                      <span>가상계좌 입금 안내 (모의)</span>
                    </div>
                    <p className="text-xs text-[#5D6B5C]">
                      농협은행: 302-1234-5678-91 (예금주: 하루한잔 생식) <br />
                      주문 완료 즉시 가상계좌 입금 확인 상태로 안전하게 전환됩니다.
                    </p>
                  </div>
                )}

                {/* 최종 결제 금액 확인 바 */}
                <div className="bg-white p-4 rounded-2xl border border-[#E3D9C4] mb-5 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-[#6A7869] block">최종 결제 금액</span>
                    <span className="text-xl sm:text-2xl font-black text-[#204E37]">
                      {totalPrice.toLocaleString()}원
                    </span>
                  </div>
                  <div className="text-right text-xs text-[#7A8878]">
                    <span>배송비 0원 무료</span>
                    <span className="block font-bold text-[#204E37]">연습용 모의 결제</span>
                  </div>
                </div>

                {submitError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* 버튼 2개: 이전 단계 & 결제하기 */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('delivery')}
                    className="w-1/3 bg-[#F0E9DA] hover:bg-[#E5DDCB] text-[#475445] font-bold py-4 rounded-2xl transition-colors cursor-pointer text-sm sm:text-base"
                  >
                    이전으로
                  </button>
                  <button
                    type="button"
                    onClick={handleExecutePayment}
                    disabled={isSubmittingOrder}
                    className="flex-1 bg-[#204E37] hover:bg-[#183B2A] text-white font-black text-xl py-4 rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>가상 결제 승인 중...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-6 h-6" />
                        <span>{totalPrice.toLocaleString()}원 결제하기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ---------------- 3단계: 주문완료 화면 ---------------- */}
            {checkoutStep === 'completed' && confirmedOrder && (
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-full bg-[#204E37] text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <span className="text-xs font-bold text-[#204E37] uppercase tracking-wider bg-[#E5EFE8] px-3.5 py-1 rounded-full">
                  연습용 결제 및 주문완료
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#1C3627] mt-3 mb-2">
                  주문이 정상 완료되었습니다!
                </h3>
                <p className="text-sm text-[#546253] leading-relaxed mb-5">
                  <strong>{confirmedOrder.customerName}</strong> 님, 주문해 주셔서 감사합니다. <br />
                  가짜 결제가 성공적으로 승인되어 가게 데이터베이스에 안전하게 등록되었습니다.
                </p>

                {/* 주문 영수증 카드 */}
                <div className="bg-white p-5 rounded-2xl border-2 border-[#E3D8C3] text-left text-sm space-y-3 mb-6 shadow-xs">
                  <div className="flex justify-between items-center pb-2.5 border-b border-[#F4EFE5]">
                    <span className="text-[#6D7A6C] font-extrabold flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-[#204E37]" />
                      주문번호
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-base sm:text-lg text-[#204E37] bg-[#E8EFE9] px-2.5 py-0.5 rounded-md">
                        {confirmedOrder.orderNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(confirmedOrder.orderNumber);
                          alert('주문번호가 복사되었습니다: ' + confirmedOrder.orderNumber);
                        }}
                        className="p-1 rounded hover:bg-[#F2ECE1] text-[#204E37]"
                        title="주문번호 복사"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6D7A6C]">상품명:</span>
                    <span className="font-bold text-[#204E37]">{confirmedOrder.packageName} ({confirmedOrder.quantity}세트)</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6D7A6C]">결제 수단:</span>
                    <span className="font-semibold text-[#1F2E21]">{confirmedOrder.paymentMethod}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6D7A6C]">결제 금액:</span>
                    <span className="font-black text-base text-[#204E37]">{confirmedOrder.totalPrice.toLocaleString()}원 (무료배송)</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6D7A6C]">받는 분 연락처:</span>
                    <span className="font-semibold text-[#233527]">{confirmedOrder.phone}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#6D7A6C]">배송지 주소:</span>
                    <span className="font-medium text-right text-[#233527] truncate max-w-[200px]">
                      {confirmedOrder.address} {confirmedOrder.addressDetail}
                    </span>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-[#F4EFE5] text-xs">
                    <span className="text-[#6D7A6C]">주문 상태:</span>
                    <span className="font-bold text-[#204E37] bg-[#E8EFE9] px-2.5 py-0.5 rounded-full">
                      {confirmedOrder.status}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(confirmedOrder.orderNumber);
                      alert('주문번호가 복사되었습니다: ' + confirmedOrder.orderNumber);
                    }}
                    className="flex-1 bg-[#F0E8D9] text-[#204E37] font-bold text-sm py-4 rounded-xl hover:bg-[#E5DBC7] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-4 h-4" />
                    <span>주문번호 복사</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsCheckoutModalOpen(false);
                      setCheckoutStep('delivery');
                    }}
                    className="flex-1 bg-[#204E37] text-white font-extrabold text-sm py-4 rounded-xl hover:bg-[#183B2A] transition-all cursor-pointer"
                  >
                    확인 및 창 닫기
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 50가지 전성분 원재료 모달 */}
      {isIngredientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 border-2 border-[#DACFB7] shadow-2xl relative">
            <button
              onClick={() => setIsIngredientModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#EAE0CA] text-[#475445] cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-left mb-6">
              <span className="text-xs font-bold text-[#204E37] uppercase tracking-wider">
                100% 국내산 원료 공개
              </span>
              <h3 className="text-2xl font-black text-[#1C3627] mt-1">
                국내산 50가지 전성분 안내
              </h3>
              <p className="text-xs sm:text-sm text-[#5D6B5C] mt-1">
                인공 감미료, 착향료, 설탕 없이 자연 원물만 정직하게 건조하여 분쇄했습니다.
              </p>
            </div>

            <div className="space-y-5">
              {ingredientCategories.map((group, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-[#E5DEC9]">
                  <h4 className="font-extrabold text-sm sm:text-base text-[#204E37] mb-2 flex items-center gap-1.5">
                    <Leaf className="w-4 h-4" />
                    <span>{group.category}</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5 text-xs sm:text-sm text-[#465445]">
                    {group.items.map((item, itemIdx) => (
                      <span key={itemIdx} className="bg-[#F4EFE5] px-2.5 py-1 rounded-md font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsIngredientModalOpen(false)}
                className="w-full bg-[#204E37] text-white font-bold py-3.5 rounded-xl cursor-pointer hover:bg-[#183B2A]"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 고객 실시간 주문 조회 모달 */}
      {isLookupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 border-2 border-[#D8CEB7] shadow-2xl relative text-left">
            <button
              onClick={() => {
                setIsLookupModalOpen(false);
                setLookupResults([]);
                setHasSearched(false);
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#EAE0CA] text-[#475445] cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-5">
              <span className="text-xs font-bold text-[#204E37] uppercase tracking-wider">
                실시간 주문 조회
              </span>
              <h3 className="text-2xl font-black text-[#1C3627] mt-1">
                내 주문 내역 찾기
              </h3>
              <p className="text-xs sm:text-sm text-[#5C6A5B] mt-1">
                주문 시 입력하신 휴대폰 번호 또는 주문번호를 입력해 주세요.
              </p>
            </div>

            <form onSubmit={handleSearchOrders} className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="휴대폰 번호 (예: 01012345678) 또는 주문번호"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                className="flex-1 p-3.5 rounded-xl border border-[#D5CABB] bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#204E37]"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="bg-[#204E37] hover:bg-[#183B2A] text-white font-bold px-5 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>조회</span>
              </button>
            </form>

            {hasSearched && (
              <div>
                {lookupResults.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-[#E5DDC9] text-center text-sm text-[#7A8679]">
                    조회된 주문 내역이 없습니다. 번호를 다시 확인해 주세요.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-[#556353]">총 {lookupResults.length}건의 주문이 있습니다.</p>
                    {lookupResults.map((item) => (
                      <div key={item.id} className="bg-white p-4 rounded-2xl border border-[#E5DEC9] shadow-xs space-y-2 text-sm">
                        <div className="flex justify-between items-center border-b border-[#F5EFE4] pb-2">
                          <span className="font-mono font-bold text-[#204E37]">{item.orderNumber}</span>
                          <span className="bg-[#E8EFE9] text-[#204E37] px-2.5 py-0.5 rounded-full text-xs font-extrabold">
                            {item.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-[#6C786A]">
                          <span>주문일시: {new Date(item.createdAt).toLocaleString('ko-KR')}</span>
                          <span className="font-bold text-[#1C3627] text-sm">{item.totalPrice.toLocaleString()}원</span>
                        </div>
                        <div className="text-xs text-[#4E5C4E]">
                          <strong>{item.packageName}</strong> × {item.quantity}세트 ({item.paymentMethod})
                        </div>
                        <div className="text-xs text-[#7B887A] truncate">
                          배송지: {item.address} {item.addressDetail}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 판매자 실시간 주문 관리 화면 (표 형식, 실시간 감지, 배송중/배송완료 원클릭) */}
      {isAdminModalOpen && (
        <AdminOrdersView onClose={() => setIsAdminModalOpen(false)} />
      )}

    </div>
  );
}
