"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, getDocs, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { useBillingStore } from '@/store/billingStore';
import { 
  ChevronLeftIcon,
  XMarkIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

// 🟢 1. Country Codes List
const COUNTRY_CODES = [
  { code: '+971', flag: '🇦🇪' }, 
  { code: '+91', flag: '🇮🇳' }, 
  { code: '+966', flag: '🇸🇦' }, 
  { code: '+968', flag: '🇴🇲' }, 
  { code: '+973', flag: '🇧🇭' }, 
];

export default function CreateBillPage() {
  const router = useRouter();
  const { customerName, mobile, setCustomerName, setMobile } = useBillingStore();
  
  // Helper for "Today's Date"
  const getToday = () => new Date().toISOString().split('T')[0];

  // Form State
  const [billNo, setBillNo] = useState('');
  const [orderDate, setOrderDate] = useState(getToday());
  const [deliveryDate, setDeliveryDate] = useState(getToday()); 
  const [isUrgent, setIsUrgent] = useState(false);
  const [countryCode, setCountryCode] = useState('+971'); // Default UAE
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [advancePayment, setAdvancePayment] = useState(''); 
  
  // Item Input State
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [assignedWorker, setAssignedWorker] = useState('');

  // Worker Modal State
  const [workers, setWorkers] = useState<any[]>([]);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');

  // 1. FORCE RESET ON MOUNT
  useEffect(() => {
    setCustomerName('');
    setMobile('');
  }, []);

  // 2. Auto-Generate Bill No & Fetch Workers
  useEffect(() => {
    const fetchLastBill = async () => {
      const q = query(collection(db, 'bills'), orderBy('createdAt', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const lastBill = snapshot.docs[0].data();
        const lastNo = parseInt(lastBill.billNo || '1000');
        setBillNo((lastNo + 1).toString());
      } else {
        setBillNo('1001');
      }
    };
    fetchLastBill();

    const unsubscribe = onSnapshot(collection(db, 'workers'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorkers(data);
    });
    return () => unsubscribe();
  }, []);

  // 3. Add Item (Worker Sync + VAT Logic)
  const addItem = () => {
    if (!itemName || !itemPrice) return;
    
    setItems(prev => [...prev, {
      name: itemName,
      price: parseFloat(itemPrice),
      // 🟢 FIXED: Saves to 'assignedTo' for Worker Card Sync
      assignedTo: assignedWorker || 'Unassigned', 
      worker: assignedWorker || 'Unassigned',
      vat: parseFloat(itemPrice) * 0.05,
      total: parseFloat(itemPrice) * 1.05,
      completed: false,
      sentToWorker: false
    }]);

    setItemName('');
    setItemPrice('');
    setAssignedWorker('');
  };

  // 4. Save Bill
  const saveBill = async () => {
    if (!customerName || items.length === 0) {
      alert("Please fill customer name and add at least one item.");
      return;
    }
    setLoading(true);

    const totalOriginal = items.reduce((sum, item) => sum + item.price, 0);
    const totalVat = items.reduce((sum, item) => sum + item.vat, 0);
    const grandTotal = totalOriginal + totalVat;

    try {
      await addDoc(collection(db, 'bills'), {
        billNo,
        customerName,
        // 🟢 FIXED: Saves country code + mobile
        mobile: `${countryCode} ${mobile}`,
        orderDate,      
        deliveryDate,   
        items,
        totalOriginal,
        totalVat,
        totalAmount: grandTotal,
        advancePayment: parseFloat(advancePayment) || 0,
        fullPayment: false,
        delivered: false,
        status: "Pending",
        isUrgent: isUrgent,
        isFavorite: false,
        createdAt: new Date(),
        // 🟢 FIXED: Saves main assigned worker
        assignedTo: items[0]?.assignedTo || 'Unassigned'
      });
      
      // RESET EVERYTHING
      setCustomerName(''); 
      setMobile('');       
      setItems([]);        
      setAdvancePayment('');
      setOrderDate(getToday());
      setDeliveryDate(getToday());
      setIsUrgent(false);
      
      router.push('/bills'); 
      
      // 🟢 Automatically trigger WhatsApp greeting
      const whatsappMessage = encodeURIComponent(
        "Thank you for choosing Al Huzaifa Tailoring and Emb\nنشكركم لاختياركم خدمات الخياطة والتطريز من الحذيفة"
      );
      window.open(`https://wa.me/${countryCode}${mobile}?text=${whatsappMessage}`, '_blank');
    } catch (error) {
      console.error(error);
      alert("Error saving bill");
    } finally {
      setLoading(false);
    }
  };

  // 5. Worker Logic
  const addNewWorkerInstant = async () => {
    if (!newWorkerName) return;
    try {
      await addDoc(collection(db, 'workers'), { name: newWorkerName, createdAt: new Date() });
      setAssignedWorker(newWorkerName);
      setIsWorkerModalOpen(false);
      setNewWorkerName('');
      setIsAddingWorker(false);
    } catch (error) { console.error(error); }
  };

  const openCalendar = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    try {
      if ('showPicker' in element) {
        (element as any).showPicker();
      } else {
        element.focus();
      }
    } catch (e) {
      element.focus();
    }
  };

  const sumOriginal = items.reduce((a, b) => a + b.price, 0);
  const sumVat = items.reduce((a, b) => a + b.vat, 0);
  const grandTotal = sumOriginal + sumVat;
  const balanceToPay = grandTotal - (parseFloat(advancePayment) || 0);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-48"> 
        
        {/* HEADER */}
        <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 bg-gray-100 rounded-full">
            <ChevronLeftIcon className="h-5 w-5 text-slate-900" />
          </button>
          <h1 className="text-xl font-black text-slate-900">New Bill #{billNo}</h1>
        </div>

        <div className="max-w-3xl mx-auto p-4 space-y-6">
          
          {/* 1. CUSTOMER & DATES */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            
            {/* Bill No */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Bill Number</label>
              <input 
                value={billNo} onChange={(e) => setBillNo(e.target.value)} 
                className="w-full bg-gray-50 p-3 rounded-xl font-black text-slate-900 outline-none border-2 border-transparent focus:border-green-500"
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Customer Name</label>
              <input 
                placeholder="Enter Name" 
                value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-gray-50 p-3 rounded-xl font-bold text-slate-900 outline-none border-2 border-transparent focus:border-green-500"
              />
            </div>

            {/* Contact with Dropdown */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Mobile Number</label>
              <div className="flex gap-2">
                {/* 🟢 ADDED: Country Code Dropdown */}
                <select 
                  className="bg-gray-100 rounded-xl px-2 font-bold outline-none text-slate-900"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input 
                  placeholder="050..." 
                  value={mobile} onChange={(e) => setMobile(e.target.value)}
                  className="flex-1 bg-gray-50 p-3 rounded-xl font-bold text-slate-900 outline-none border-2 border-transparent focus:border-green-500"
                />
              </div>
            </div>

            {/* DATES */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Order Date</label>
                <div className="relative" onClick={() => openCalendar('order-date')}>
                  <input 
                    id="order-date"
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full bg-gray-50 p-3 pl-4 pr-10 rounded-xl font-bold text-slate-900 outline-none border-2 border-transparent focus:border-green-500 appearance-none cursor-pointer"
                  />
                  <CalendarIcon className="absolute right-3 top-3.5 h-5 w-5 text-green-600 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Delivery Date</label>
                <div className="relative" onClick={() => openCalendar('delivery-date')}>
                  <input 
                    id="delivery-date"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className={`w-full bg-gray-50 p-3 pl-4 pr-10 rounded-xl font-bold text-slate-900 outline-none border-2 border-transparent focus:border-green-500 appearance-none cursor-pointer ${isUrgent ? 'text-red-600' : ''}`}
                  />
                  <CalendarIcon className="absolute right-3 top-3.5 h-5 w-5 text-green-600 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* URGENT TOGGLE */}
            <div className="flex items-center gap-3 pt-2 border-t mt-2">
              <input 
                type="checkbox" 
                id="urgent-toggle"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="w-6 h-6 accent-red-600"
              />
              <label htmlFor="urgent-toggle" className="font-bold text-red-600">Mark as URGENT</label>
            </div>
          </div>

          {/* 2. ITEMS SECTION */}
          <div className="space-y-4">
            <h3 className="font-black text-lg text-slate-900 ml-1">Items</h3>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
               <div className="grid grid-cols-2 gap-3">
                 <div className="col-span-2">
                   <label className="text-xs font-bold text-gray-400 ml-1">Item Name</label>
                   <input 
                     placeholder="Enter item name" 
                     value={itemName} onChange={(e) => setItemName(e.target.value)}
                     className="w-full bg-gray-50 p-3 rounded-xl font-bold text-slate-900 outline-none border border-gray-200 focus:border-green-500"
                   />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-gray-400 ml-1">Price (AED)</label>
                   <input 
                     type="number"
                     placeholder="0.00" 
                     value={itemPrice} onChange={(e) => setItemPrice(e.target.value)}
                     className="w-full bg-gray-50 p-3 rounded-xl font-bold text-slate-900 outline-none border border-gray-200 focus:border-green-500"
                   />
                   {/* 🟢 FEATURE: VAT Display */}
                   {itemPrice && (
                     <p className="text-[10px] text-blue-600 font-bold mt-1 ml-1">
                       With 5% VAT: {(parseFloat(itemPrice) * 1.05).toFixed(2)}
                     </p>
                   )}
                 </div>
                 <div className="flex items-end">
                   <button 
                     onClick={() => setIsWorkerModalOpen(true)}
                     className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-bold border border-blue-100 hover:bg-blue-100 truncate px-2"
                   >
                     {assignedWorker || "Assign Worker"}
                   </button>
                 </div>
               </div>

               <button 
                onClick={addItem}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg mt-2"
              >
                + Add Item
              </button>
            </div>

            {/* Items List */}
            {items.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-900">{item.name}</h4>
                  <p className="text-xs text-gray-500">Worker: {item.assignedTo}</p>
                  
                  {/* 🟢 ADDED: VAT Display inline as requested in screenshot */}
                  <p className="text-[10px] text-blue-600 font-bold mt-1">
                    With VAT (5%): AED {(item.price * 1.05).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">AED {item.price}</p>
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500 text-xs font-bold">Remove</button>
                </div>
              </div>
            ))}
          </div>

          {/* 3. CALCULATIONS SECTION */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
             <h3 className="font-bold text-slate-900 border-b pb-2 mb-2">Calculations</h3>
             
             <div className="flex justify-between text-sm">
               <span className="text-gray-500">Sum of Original Rates:</span>
               <span className="font-bold text-slate-900">{sumOriginal.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-sm">
               <span className="text-gray-500">Sum of Total VAT (5%):</span>
               <span className="font-bold text-slate-900">{sumVat.toFixed(2)}</span>
             </div>
             
             <div className="flex justify-between text-xl mt-4 pt-4 border-t border-dashed border-gray-200">
               <span className="font-black text-slate-900">Grand Total:</span>
               <span className="font-black text-green-600">AED {grandTotal.toFixed(2)}</span>
             </div>

             <div className="mt-4">
               <label className="text-xs font-bold text-gray-400 ml-1">Advance Payment (AED)</label>
               <input 
                 type="number"
                 placeholder="0.00"
                 value={advancePayment} onChange={(e) => setAdvancePayment(e.target.value)}
                 className="w-full bg-gray-900 text-white p-4 rounded-xl font-black text-lg outline-none"
               />
             </div>
          </div>

        </div>

        {/* BOTTOM BAR */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-6 z-40 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Total to Pay</p>
              <p className="text-2xl font-black text-slate-900">AED {balanceToPay.toFixed(2)}</p>
            </div>
            <button 
              onClick={saveBill}
              disabled={loading}
              className="bg-green-600 text-white px-8 py-3 rounded-xl font-black shadow-lg shadow-green-200 active:scale-95 transition-transform"
            >
              {loading ? 'Saving...' : 'SAVE BILL'}
            </button>
          </div>
        </div>

        {/* WORKER MODAL */}
        {isWorkerModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm transform-gpu">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-slate-900">Select Worker</h2>
                <button onClick={() => setIsWorkerModalOpen(false)} className="p-2 bg-gray-100 rounded-full">
                  <XMarkIcon className="h-6 w-6 text-slate-900" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {workers.map(w => (
                  <button
                    key={w.id}
                    onClick={() => { setAssignedWorker(w.name); setIsWorkerModalOpen(false); }}
                    className="w-full text-left p-4 rounded-xl bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 transition-colors"
                  >
                    <span className="font-black text-slate-900 text-lg">{w.name}</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                {!isAddingWorker ? (
                  <button 
                    onClick={() => setIsAddingWorker(true)}
                    className="w-full py-3 text-green-700 font-bold bg-green-50 rounded-xl border border-green-100 hover:bg-green-100"
                  >
                    + Add New Worker
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      autoFocus
                      className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-bold text-slate-900 outline-none border-2 border-transparent focus:border-green-500"
                      placeholder="Name..."
                      value={newWorkerName}
                      onChange={(e) => setNewWorkerName(e.target.value)}
                    />
                    <button 
                      onClick={addNewWorkerInstant}
                      className="bg-green-600 text-white px-4 rounded-xl font-bold"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}