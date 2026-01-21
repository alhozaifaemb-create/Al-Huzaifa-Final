"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import Layout from '@/components/Layout';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Trash2, 
  X, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Filter 
} from 'lucide-react'; 

function BillsContent() {
  const [bills, setBills] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]); 
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tab State
  const [activeTab, setActiveTab] = useState('All'); 

  // Modal State
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [selectedBillForAssign, setSelectedBillForAssign] = useState<any>(null);
  
  // Instant Add Worker State
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. LISTEN FOR HOME PAGE CLICKS
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'urgent') setActiveTab('Urgent');
    if (filterParam === 'undelivered') setActiveTab('Undelivered');
  }, [searchParams]);

  // 2. Fetch Data (Real-time)
  useEffect(() => {
    const q = query(collection(db, 'bills'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const billsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBills(billsData);
    });

    const unsubscribeWorkers = onSnapshot(collection(db, 'workers'), (snapshot) => {
      const workerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorkers(workerList);
    });

    return () => { unsubscribe(); unsubscribeWorkers(); };
  }, []);

  // 3. Search & Filter Logic
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      // A. Search Logic
      const matchesSearch = 
        bill.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.billNo?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.mobile?.includes(searchTerm);

      if (!matchesSearch) return false;

      const isDelivered = bill.delivered === true || bill.status === 'Delivered';
      // 🟢 FIX: Check if all items in bill are marked completed
      const allItemsReady = bill.items?.length > 0 && bill.items.every((i: any) => i.completed);

      // B. Tab Logic
      if (activeTab === 'Undelivered') return !isDelivered;
      if (activeTab === 'Done') return isDelivered;
      
      if (activeTab === 'Urgent') {
        if (isDelivered) return false;
        // 🟢 FIX: If all items are ready, it's NOT Urgent anymore (it's just undelivered)
        if (allItemsReady) return false; 

        if (bill.isUrgent) return true; 
        if (bill.deliveryDate) {
           const now = new Date();
           const delivery = new Date(bill.deliveryDate);
           const diffTime = delivery.getTime() - now.getTime();
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
           // Show if late or within 5 days
           return diffDays <= 5;
        }
        return false;
      }
      
      return true;
    });
  }, [bills, searchTerm, activeTab]);

  // 4. Actions
  const toggleFullPayment = async (e: any, bill: any) => {
    e.stopPropagation();
    const billRef = doc(db, 'bills', bill.id);
    await updateDoc(billRef, { fullPayment: !bill.fullPayment });
  };

  const toggleDelivered = async (e: any, bill: any) => {
    e.stopPropagation();
    const billRef = doc(db, 'bills', bill.id);
    await updateDoc(billRef, { delivered: !bill.delivered });
  };

  const deleteBill = async (e: any, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this bill permanently?")) {
      await deleteDoc(doc(db, 'bills', id));
    }
  };

  // 5. Worker Assignment Logic
  const openAssignModal = (e: any, bill: any) => {
    e.stopPropagation(); 
    setSelectedBillForAssign(bill);
    setIsWorkerModalOpen(true);
    setIsAddingWorker(false);
  };

  const assignWorkerToBill = async (workerName: string) => {
    if (!selectedBillForAssign) return;
    try {
      const billRef = doc(db, 'bills', selectedBillForAssign.id);
      
      // 1. Get current items
      const currentItems = selectedBillForAssign.items || [];
      
      // 2. Update every item to have this worker assigned
      const updatedItems = currentItems.map((item: any) => ({
        ...item,
        assignedTo: workerName
      }));

      // 3. Save BOTH the main assignment AND the updated items array
      await updateDoc(billRef, { 
        assignedTo: workerName,
        items: updatedItems 
      });

      setIsWorkerModalOpen(false); 
      setSelectedBillForAssign(null);
    } catch (error) {
      console.error("Error assigning worker:", error);
    }
  };

  const addNewWorkerInstant = async () => {
    if (!newWorkerName) return;
    try {
      await addDoc(collection(db, 'workers'), {
        name: newWorkerName,
        createdAt: new Date()
      });
      assignWorkerToBill(newWorkerName);
      setNewWorkerName('');
    } catch (error) {
      console.error("Error adding worker:", error);
    }
  };

  return (
      <div className="min-h-screen bg-[#F2F4F7] font-sans pb-32">
        
        {/* 1. MODERN HEADER (Clean White) */}
        <div className="bg-white sticky top-0 z-10 px-4 pt-4 pb-2 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Orders History</h1>
            <div className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {filteredBills.length} Items
            </div>
          </div>

          {/* Search Bar (Gray Pill) */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search Name, Bill No..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-100 text-slate-900 font-bold rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
            />
          </div>

          {/* Scrollable Filter Chips (Modern Tabs) */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['All', 'Undelivered', 'Urgent', 'Done'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  activeTab === tab 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* 2. BILLS LIST (Clean Cards) */}
        <div className="max-w-5xl mx-auto p-4 space-y-3">
          {filteredBills.length === 0 && (
             <div className="text-center py-20 text-gray-400 font-medium flex flex-col items-center">
               <Filter className="w-12 h-12 mb-2 opacity-20" />
               No bills found in {activeTab}
             </div>
          )}

          {filteredBills.map((bill) => {
             // Determine Status Colors
             const isDelivered = bill.delivered === true || bill.status === 'Delivered';
             const isUrgent = bill.isUrgent || (bill.deliveryDate && new Date(bill.deliveryDate) < new Date() && !isDelivered);
             const isPaid = bill.fullPayment;

             return (
              <div 
                key={bill.id}
                onClick={() => router.push(`/bills/${bill.id}`)}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform duration-100 relative overflow-hidden"
              >
                {/* Status Strip on Left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isDelivered ? 'bg-green-500' : isUrgent ? 'bg-red-500' : 'bg-amber-400'}`}></div>

                <div className="pl-3">
                  {/* Top Row: Bill No & Date */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-black text-gray-400">#{bill.billNo || '---'}</span>
                       {/* Status Badge */}
                       {isDelivered && <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Done</span>}
                       {isUrgent && !isDelivered && <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">URGENT</span>}
                       {!isDelivered && !isUrgent && <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3"/> Pending</span>}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                       {bill.createdAt?.seconds ? format(new Date(bill.createdAt.seconds * 1000), 'dd MMM') : 'Date'}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">{bill.customerName}</h3>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">{bill.items?.length || 0} Items • {bill.mobile}</p>
                    </div>
                    <div className="text-right">
                       {/* 🟢 Strikethrough for Paid Bills */}
                       <p className={`text-xl font-black ${isPaid ? 'text-green-600 line-through' : 'text-slate-900'}`}>AED {bill.totalAmount}</p>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                    
                    {/* Worker Assign Button (Styled as Pill) */}
                    <button 
                      onClick={(e) => openAssignModal(e, bill)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        bill.assignedTo 
                          ? 'bg-slate-100 text-slate-700' 
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {bill.assignedTo || "Assign Worker"}
                    </button>

                    {/* Quick Toggles */}
                    <div className="flex items-center gap-3">
                       {/* Paid Toggle */}
                       <label className="flex items-center gap-1.5 cursor-pointer p-1" onClick={(e) => e.stopPropagation()}>
                         <div className={`w-4 h-4 rounded border flex items-center justify-center ${isPaid ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                           {isPaid && <CheckCircle2 className="w-3 h-3 text-white" />}
                         </div>
                         <span className="text-[10px] font-bold text-gray-500 uppercase">Paid</span>
                         {/* Hidden Checkbox for Logic */}
                         <input type="checkbox" checked={isPaid || false} onChange={(e) => toggleFullPayment(e, bill)} className="hidden" />
                       </label>

                       {/* 🟢 Delivered Toggle */}
                       <label className="flex items-center gap-1.5 cursor-pointer p-1" onClick={(e) => e.stopPropagation()}>
                         <div className={`w-4 h-4 rounded border flex items-center justify-center ${isDelivered ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                           {isDelivered && <CheckCircle2 className="w-3 h-3 text-white" />}
                         </div>
                         <span className="text-[10px] font-bold text-gray-500 uppercase">Delivered</span>
                         {/* Hidden Checkbox for Logic */}
                         <input type="checkbox" checked={isDelivered || false} onChange={(e) => toggleDelivered(e, bill)} className="hidden" />
                       </label>

                       {/* Delete */}
                       <button 
                         onClick={(e) => deleteBill(e, bill.id)}
                         className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. FLOATING ADD BUTTON (Modern) */}
        <button
          onClick={() => router.push('/bills/create')}
          className="fixed bottom-24 right-5 w-14 h-14 bg-slate-900 rounded-full text-white shadow-xl shadow-slate-400/50 flex items-center justify-center hover:scale-110 transition-all active:scale-95 z-50"
        >
          <Plus className="h-6 w-6" strokeWidth={3} />
        </button>

        {/* 4. WORKER MODAL (Preserved Logic, Clean UI) */}
        {isWorkerModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-slate-900">Assign Worker</h2>
                <button onClick={() => setIsWorkerModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {workers.map(worker => (
                  <button
                    key={worker.id}
                    onClick={() => assignWorkerToBill(worker.name)}
                    className="w-full flex justify-between items-center p-4 rounded-xl hover:bg-green-50 font-bold text-slate-700 border border-gray-100 hover:border-green-200 transition-all group"
                  >
                    <span>{worker.name}</span>
                    <span className="w-2 h-2 rounded-full bg-gray-200 group-hover:bg-green-500"></span>
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                {!isAddingWorker ? (
                  <button 
                    onClick={() => setIsAddingWorker(true)}
                    className="w-full py-3 text-green-700 font-bold bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                  >
                    + Add New Worker
                  </button>
                ) : (
                  <div className="flex gap-2">
                    {/* 🟢 FIXED: Changed bg to white and text to black for better visibility */}
                    <input 
                      autoFocus
                      className="flex-1 bg-white border border-gray-300 px-4 py-3 rounded-xl font-bold text-black outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter Name..."
                      value={newWorkerName}
                      onChange={(e) => setNewWorkerName(e.target.value)}
                    />
                    <button 
                      onClick={addNewWorkerInstant}
                      className="bg-green-600 text-white px-4 rounded-xl font-bold hover:bg-green-700"
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
  );
}

// WRAPPER to handle search params safely in Next.js
export default function BillsPage() {
  return (
    <Layout>
      <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
        <BillsContent />
      </Suspense>
    </Layout>
  );
}