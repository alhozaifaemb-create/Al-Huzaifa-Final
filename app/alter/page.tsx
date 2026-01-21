"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { 
  ScissorsIcon, 
  PlusIcon, 
  TrashIcon, 
  ShareIcon, 
  XMarkIcon, 
  CheckCircleIcon,
  MagnifyingGlassIcon,
  UserIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

export default function AlterPage() {
  const [alterations, setAlterations] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form State
  const [searchBill, setSearchBill] = useState('');
  const [foundBill, setFoundBill] = useState<any>(null);
  const [problemDesc, setProblemDesc] = useState('');
  
  // Loading State
  const [loading, setLoading] = useState(false);

  // 1. Fetch Alterations List
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'alterations'), (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      // Sort by "Not Ready" first
      data.sort((a: any, b: any) => (a.isReady === b.isReady ? 0 : a.isReady ? 1 : -1));
      setAlterations(data);
    });
    return () => unsubscribe();
  }, []);

  // 2. Search Bill Function (Auto-Fill or Manual Fallback)
  const handleSearchBill = async () => {
    // If search is empty, allow manual entry immediately
    if (!searchBill) {
        setFoundBill({ customerName: '', mobile: '', billNo: 'Manual' });
        return;
    }

    setLoading(true);
    
    try {
      const q = query(collection(db, 'bills'));
      const snapshot = await getDocs(q);
      const found = snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }))
        .find((b: any) => b.billNo?.toString() === searchBill || b.mobile === searchBill);

      if (found) {
        setFoundBill(found);
      } else {
        // Fallback for Manual Entry
        setFoundBill({ customerName: '', mobile: '', billNo: searchBill });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Save Alteration
  const handleSave = async () => {
    if (!foundBill?.customerName || !problemDesc) {
      alert("Please enter Customer Name and Problem details.");
      return;
    }

    await addDoc(collection(db, 'alterations'), {
      billNo: foundBill.billNo || 'N/A',
      customerName: foundBill.customerName,
      mobile: foundBill.mobile || '',
      problem: problemDesc,
      isReady: false,
      createdAt: new Date()
    });

    // Reset Form
    setIsAddModalOpen(false);
    setSearchBill('');
    setFoundBill(null);
    setProblemDesc('');
  };

  // 4. Toggle Ready Status
  const toggleReady = async (e: any, item: any) => {
    e.stopPropagation();
    const ref = doc(db, 'alterations', item.id);
    await updateDoc(ref, { isReady: !item.isReady });
  };

  // 5. Delete
  const handleDelete = async (e: any, id: string) => {
    e.stopPropagation();
    if (confirm("Remove this alteration?")) {
      await deleteDoc(doc(db, 'alterations', id));
    }
  };

  // 6. WhatsApp Share (The "Polite Message")
  const handleShare = (item: any) => {
    if (!item.mobile) {
      alert("No mobile number found for this customer.");
      return;
    }

    const text = `Dear ${item.customerName},\n\nYour alteration for Bill #${item.billNo} is now completed and ready for pickup.\n\nThank you,\nAl Huzaifa Tailoring`;
    const url = `https://wa.me/${item.mobile}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-32">
        
        {/* 🟢 HEADER */}
        <div className="bg-green-700 pt-4 pb-6 px-4 shadow-lg sticky top-0 z-10">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-black text-white">Alterations</h1>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-white text-green-700 px-4 py-2 rounded-full font-bold text-sm shadow-md flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" /> Add New
            </button>
          </div>
        </div>

        {/* 📋 LIST */}
        <div className="max-w-5xl mx-auto p-4 space-y-4">
          {alterations.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <ScissorsIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No active alterations.</p>
            </div>
          )}

          {alterations.map(item => (
            <div 
              key={item.id} 
              className={`rounded-2xl shadow-sm border p-4 transition-all relative ${
                item.isReady ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
              }`}
            >
              {/* Top Row */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Bill #{item.billNo}</span>
                  <h3 className="text-lg font-black text-slate-900">{item.customerName}</h3>
                </div>
                
                {/* Ready Checkbox */}
                <button 
                  onClick={(e) => toggleReady(e, item)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                    item.isReady 
                      ? 'bg-green-600 text-white border-green-600' 
                      : 'bg-white text-gray-400 border-gray-200 hover:border-green-500'
                  }`}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  {item.isReady ? 'READY' : 'Mark Ready'}
                </button>
              </div>

              {/* Problem Description */}
              <div className="bg-gray-100/50 p-3 rounded-xl mb-3">
                <p className="text-sm font-bold text-slate-700">
                  <span className="text-gray-400 mr-2">Fix:</span>
                  {item.problem}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-2">
                <button 
                  onClick={() => handleShare(item)}
                  className="flex items-center gap-2 text-green-700 font-bold text-sm hover:underline"
                >
                  <ShareIcon className="h-4 w-4" /> Notify Customer
                </button>

                <button 
                  onClick={(e) => handleDelete(e, item.id)}
                  className="p-2 text-gray-300 hover:text-red-500"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ➕ ADD MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">New Alteration</h2>
                <button onClick={() => { setIsAddModalOpen(false); setFoundBill(null); setSearchBill(''); }} className="p-2 bg-gray-100 rounded-full">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {!foundBill ? (
                // STEP 1: Search Bill or Manual Entry
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 font-medium">Search Bill No (or click Search for manual):</p>
                  <div className="flex gap-2">
                    <input 
                      className="w-full bg-gray-100 p-3 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Bill No (e.g. 1045)"
                      value={searchBill}
                      onChange={e => setSearchBill(e.target.value)}
                    />
                    <button 
                      onClick={handleSearchBill}
                      disabled={loading}
                      className="bg-slate-900 text-white p-3 rounded-xl"
                    >
                      {loading ? '...' : <MagnifyingGlassIcon className="h-6 w-6" />}
                    </button>
                  </div>
                  {/* Manual Add Trigger */}
                  <button 
                    onClick={() => setFoundBill({ customerName: '', mobile: '', billNo: 'Manual' })}
                    className="w-full text-center text-xs font-bold text-green-600 hover:underline mt-2"
                  >
                    + Skip Search / Add New Customer
                  </button>
                </div>
              ) : (
                // STEP 2: Enter/Edit Details
                <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-green-600 font-bold uppercase">Customer Details</span>
                        <span className="text-[10px] bg-white px-2 py-1 rounded text-green-800 font-bold">{foundBill.billNo}</span>
                    </div>
                    
                    {/* 🟢 FIXED: Input fields allow editing even if manual */}
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-green-100">
                        <UserIcon className="h-5 w-5 text-gray-400" />
                        <input 
                            className="flex-1 font-bold text-slate-900 outline-none"
                            placeholder="Customer Name"
                            value={foundBill.customerName}
                            onChange={(e) => setFoundBill({ ...foundBill, customerName: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-green-100">
                        <PhoneIcon className="h-5 w-5 text-gray-400" />
                        <input 
                            className="flex-1 font-bold text-slate-900 outline-none"
                            placeholder="Mobile Number"
                            value={foundBill.mobile}
                            onChange={(e) => setFoundBill({ ...foundBill, mobile: e.target.value })}
                        />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Problem / Fix</label>
                    <textarea 
                      className="w-full bg-gray-100 p-3 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-green-500 min-h-[100px]"
                      placeholder="e.g. Tighten waist by 2 inches..."
                      value={problemDesc}
                      onChange={e => setProblemDesc(e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={handleSave}
                    className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg shadow-lg active:scale-95 transition-transform"
                  >
                    Save Alteration
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}