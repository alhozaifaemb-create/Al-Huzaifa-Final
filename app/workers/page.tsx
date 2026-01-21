'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { 
  UserGroupIcon, 
  MagnifyingGlassIcon, 
  PlusIcon, 
  TrashIcon, 
  XMarkIcon,
  FunnelIcon,
  ChevronLeftIcon,
  PencilIcon,
  PaperAirplaneIcon, 
  PrinterIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [allBills, setAllBills] = useState<any[]>([]); 
  const [searchTerm, setSearchTerm] = useState('');
  
  // Worker Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerMobile, setNewWorkerMobile] = useState('');
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editWorkerName, setEditWorkerName] = useState('');
  const [editWorkerMobile, setEditWorkerMobile] = useState('');
  
  // Manual Item Modal
  const [isManualItemModalOpen, setIsManualItemModalOpen] = useState(false);
  const [manualBillNo, setManualBillNo] = useState('');
  const [manualItemName, setManualItemName] = useState('');
  const [manualDeliveryDate, setManualDeliveryDate] = useState('');
  const [manualWorkerRate, setManualWorkerRate] = useState('');
  const [manualMoneyPaid, setManualMoneyPaid] = useState('');

  // Edit Item Modal
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editingItemData, setEditingItemData] = useState<any>(null);
  const [editingItemBillId, setEditingItemBillId] = useState<string | null>(null); // Null if manual item
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null); // Null if manual item
  
  // Ledger State
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);

  // 1. REAL-TIME DATA
  useEffect(() => {
    const unsubWorkers = onSnapshot(collection(db, 'workers'), (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const q = query(collection(db, 'bills'), orderBy('createdAt', 'desc'));
    const unsubBills = onSnapshot(q, (snapshot) => {
      setAllBills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubWorkers(); unsubBills(); };
  }, []);

  // 2. WORKER CRUD
  const handleAddWorker = async () => {
    if (!newWorkerName) return;
    await addDoc(collection(db, 'workers'), { 
        name: newWorkerName, 
        mobile: newWorkerMobile, 
        manualItems: [], // Initialize empty array for manual items
        createdAt: new Date() 
    });
    setIsAddModalOpen(false); setNewWorkerName(''); setNewWorkerMobile('');
  };

  const handleDeleteWorker = async (e: any, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this worker?')) await deleteDoc(doc(db, 'workers', id));
  };

  const openEditModal = (e: any, worker: any) => {
    e.stopPropagation();
    setEditingWorkerId(worker.id); setEditWorkerName(worker.name); setEditWorkerMobile(worker.mobile);
    setIsEditModalOpen(true);
  };

  const handleUpdateWorker = async () => {
    if (!editWorkerName || !editingWorkerId) return;
    await updateDoc(doc(db, 'workers', editingWorkerId), { name: editWorkerName, mobile: editWorkerMobile });
    setIsEditModalOpen(false); setEditingWorkerId(null);
  };

  // 3. MERGE DATA (Bills + Manual Items)
  const getWorkerItems = () => {
    if (!selectedWorker) return [];
    
    // A. Get Items from Bills
    let billItems: any[] = [];
    allBills.forEach(bill => {
      bill.items?.forEach((item: any, index: number) => {
        if (item.assignedTo === selectedWorker.name) {
          billItems.push({
            ...item,
            billId: bill.id,
            billNo: bill.billNo,         
            deliveryDate: bill.deliveryDate, 
            itemIndex: index,
            isManual: false
          });
        }
      });
    });

    // B. Get Manual Items from Worker Doc
    const manualItems = (selectedWorker.manualItems || []).map((item: any) => ({
        ...item,
        isManual: true,
        sentToWorker: true // Default true for manual
    }));

    // C. Combine & Filter
    const allItems = [...billItems, ...manualItems];

    return allItems.filter(item => {
      const name = item.name ? item.name.toLowerCase() : '';
      const matchesSearch = name.includes(ledgerSearch.toLowerCase()) || 
                            item.billNo?.toString().includes(ledgerSearch);
      const matchesUrgent = showUrgentOnly ? !item.workerDone : true;
      return matchesSearch && matchesUrgent;
    });
  };

  // 4. TOTALS
  const totals = useMemo(() => {
    const items = getWorkerItems();
    const totalWork = items.reduce((sum, i) => sum + Number(i.workerRate || 0), 0);
    const totalPaid = items.reduce((sum, i) => sum + Number(i.moneyPaid || 0), 0);
    return { totalWork, totalPaid, balance: totalWork - totalPaid, count: items.length };
  }, [allBills, selectedWorker, ledgerSearch, showUrgentOnly]);

  // 5. ACTIONS
  
  // Add Manual Item
  const handleAddManualItem = async () => {
    if (!selectedWorker || !manualItemName || !manualBillNo) return alert("Bill No and Item Name are required.");
    
    const newManualItem = {
      id: Date.now().toString(),
      billNo: manualBillNo,
      name: manualItemName,
      deliveryDate: manualDeliveryDate,
      workerRate: parseFloat(manualWorkerRate || '0'),
      moneyPaid: parseFloat(manualMoneyPaid || '0'),
      assignedTo: selectedWorker.name,
      isManual: true,
      workerDone: false,
      createdAt: new Date().toISOString()
    };

    try {
      const workerRef = doc(db, 'workers', selectedWorker.id);
      await updateDoc(workerRef, {
        manualItems: arrayUnion(newManualItem)
      });
      setIsManualItemModalOpen(false);
      // Clear form
      setManualBillNo(''); setManualItemName(''); setManualDeliveryDate(''); setManualWorkerRate(''); setManualMoneyPaid('');
    } catch (error) {
      console.error(error);
      alert("Error adding manual item");
    }
  };

  // Open Edit Item Modal
  const openEditItemModal = (item: any, billId: string | null = null, itemIndex: number | null = null) => {
    setEditingItemData({ ...item });
    setEditingItemBillId(billId);
    setEditingItemIndex(itemIndex);
    setIsEditItemModalOpen(true);
  };

  // Save Edits (Handles both Manual and Bill items)
  const handleUpdateAnyItem = async () => {
    if (!editingItemData) return;
    try {
        if (editingItemData.isManual) {
            // Update Manual Item inside Worker Doc
            const workerRef = doc(db, 'workers', selectedWorker.id);
            const updatedManualItems = (selectedWorker.manualItems || []).map((item: any) => 
                item.id === editingItemData.id ? { ...editingItemData } : item
            );
            await updateDoc(workerRef, { manualItems: updatedManualItems });
        } else {
            // Update Bill Item
            if (!editingItemBillId || editingItemIndex === null) return;
            const bill = allBills.find(b => b.id === editingItemBillId);
            if (!bill) return;

            const updatedItems = [...bill.items];
            updatedItems[editingItemIndex] = { ...editingItemData };

            await updateDoc(doc(db, 'bills', editingItemBillId), { items: updatedItems });
        }
        setIsEditItemModalOpen(false);
        setEditingItemData(null);
    } catch (error) {
        console.error(error);
        alert("Failed to update item");
    }
  };

  // Delete/Unassign Item
  const deleteItem = async (item: any) => {
    if(!confirm("Delete this item?")) return;
    
    try {
        if (item.isManual) {
            // Remove from manualItems array
            const workerRef = doc(db, 'workers', selectedWorker.id);
            const updatedManualItems = (selectedWorker.manualItems || []).filter((i: any) => i.id !== item.id);
            await updateDoc(workerRef, { manualItems: updatedManualItems });
        } else {
            // Unassign from Bill
            const bill = allBills.find(b => b.id === item.billId);
            if (!bill) return;
            const updatedItems = [...bill.items];
            // Reset fields
            updatedItems[item.itemIndex] = { 
                ...updatedItems[item.itemIndex], 
                assignedTo: 'Unassigned', 
                workerRate: 0, 
                moneyPaid: 0,
                workerDone: false 
            };
            await updateDoc(doc(db, 'bills', item.billId), { items: updatedItems });
        }
    } catch (error) {
        console.error(error);
    }
  };

  // WHATSAPP
  const notifyWorkerWhatsApp = () => {
    const pendingItems = getWorkerItems().filter(i => !i.workerDone);
    if (pendingItems.length === 0) return alert("No pending tasks!");

    let message = `*Tasks for ${selectedWorker.name}* 🧵\n\n`;
    pendingItems.forEach((item, idx) => {
      message += `${idx + 1}. *Bill #${item.billNo}* - ${item.name}\n`;
      message += `   📅 Due: ${item.deliveryDate || 'N/A'}\n`;
      message += `   💰 Rate: ${item.workerRate || 0}\n\n`;
    });

    const url = `https://wa.me/${selectedWorker.mobile || ''}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-32">
        
        {!selectedWorker ? (
          <>
            <div className="bg-green-700 pt-4 pb-6 px-4 shadow-lg sticky top-0 z-10 print:hidden">
              <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                  <h1 className="text-2xl font-black text-white">Worker Cards</h1>
                  <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-green-700 px-4 py-2 rounded-full font-bold text-sm shadow-md flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" /> Add Worker
                  </button>
                </div>
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-500 absolute left-3 top-3" />
                  <input type="text" placeholder="Search Workers..." className="w-full pl-10 pr-4 py-3 bg-white rounded-xl shadow-sm outline-none font-bold text-slate-900" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto p-4 grid gap-4 print:hidden">
              {workers.filter(w => w.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(worker => (
                <div key={worker.id} onClick={() => setSelectedWorker(worker)} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-full text-green-700"><UserGroupIcon className="h-6 w-6" /></div>
                    <div><h3 className="text-xl font-black text-slate-900">{worker.name}</h3><p className="text-gray-500 font-medium">{worker.mobile || 'No Mobile'}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => openEditModal(e, worker)} className="p-2 text-gray-400 bg-gray-50 rounded-lg hover:text-blue-600"><PencilIcon className="h-5 w-5" /></button>
                    <button onClick={(e) => handleDeleteWorker(e, worker.id)} className="p-2 text-gray-400 bg-gray-50 rounded-lg hover:text-red-600"><TrashIcon className="h-5 w-5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="animate-in fade-in duration-200">
            {/* PRINT HEADER */}
            <div className="hidden print:block text-center mb-8 pt-4">
               <h1 className="text-3xl font-black uppercase tracking-wider">AL HUZAIFA TAILORING & EMB</h1>
               <p className="text-sm font-bold">Worker Ledger Report</p>
               <hr className="my-4 border-gray-300"/>
               <div className="flex justify-between items-end px-4">
                  <div className="text-left">
                     <p className="text-xs text-gray-500 uppercase font-bold">Worker Name</p>
                     <h2 className="text-2xl font-black">{selectedWorker.name}</h2>
                     <p>{selectedWorker.mobile}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs text-gray-500 uppercase font-bold">Date</p>
                     <p className="font-bold">{new Date().toLocaleDateString()}</p>
                  </div>
               </div>
            </div>

            {/* SCREEN HEADER */}
            <div className="bg-white sticky top-0 z-20 shadow-md border-b border-gray-200 print:hidden">
              <div className="max-w-6xl mx-auto p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                      <button onClick={() => setSelectedWorker(null)} className="flex items-center text-gray-500 font-bold text-xs mb-1"><ChevronLeftIcon className="h-4 w-4 mr-1"/> Back</button>
                      <h2 className="text-3xl font-black text-slate-900">{selectedWorker.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded-md text-gray-600">{totals.count} Items</span>
                        {totals.count > 50 && (
                            <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-md flex items-center gap-1">
                                <ExclamationTriangleIcon className="h-3 w-3"/> Limit Full!
                            </span>
                        )}
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => window.print()} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"><PrinterIcon className="h-6 w-6" /></button>
                      <button onClick={notifyWorkerWhatsApp} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md active:scale-95"><PaperAirplaneIcon className="h-5 w-5 -rotate-45" /> Notify</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100"><p className="text-[10px] text-blue-600 font-bold uppercase">Total Work</p><p className="text-lg font-black text-slate-900">AED {totals.totalWork}</p></div>
                  <div className="bg-green-50 p-3 rounded-xl border border-green-100"><p className="text-[10px] text-green-600 font-bold uppercase">Taken</p><p className="text-lg font-black text-slate-900">AED {totals.totalPaid}</p></div>
                  <div className="bg-gray-800 p-3 rounded-xl"><p className="text-[10px] text-gray-400 font-bold uppercase">Payable</p><p className="text-lg font-black text-white">AED {totals.balance}</p></div>
                </div>
                <div className="flex gap-2"><div className="relative flex-1"><MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" /><input className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg font-bold outline-none text-slate-900" placeholder="Search Item..." value={ledgerSearch} onChange={(e) => setLedgerSearch(e.target.value)} /></div>
                <button onClick={() => setShowUrgentOnly(!showUrgentOnly)} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border ${showUrgentOnly ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-600 border-gray-200'}`}><FunnelIcon className="h-4 w-4" /> {showUrgentOnly ? 'Urgent' : 'Filter'}</button></div>
              </div>
            </div>

            {/* MAIN LIST */}
            <div className="max-w-6xl mx-auto p-4 space-y-3 print:hidden">
              {getWorkerItems().map((item, idx) => (
                <div key={idx} className={`bg-white rounded-xl shadow-sm border p-4 transition-all relative ${item.workerDone ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                  
                  {/* EDIT & DELETE BUTTONS */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={() => openEditItemModal(item, item.billId, item.itemIndex)} className="p-1.5 text-blue-400 hover:text-blue-600 bg-blue-50 rounded-md"><PencilIcon className="h-3.5 w-3.5"/></button>
                    <button onClick={() => deleteItem(item)} className="p-1.5 text-gray-300 hover:text-red-500 bg-gray-50 rounded-md"><TrashIcon className="h-3.5 w-3.5"/></button>
                  </div>

                  <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                    <div className="col-span-1 mb-2 md:mb-0"><span className="md:hidden text-xs text-gray-400 font-bold mr-2">BILL:</span><span className="font-black text-slate-900">#{item.billNo}</span></div>
                    <div className="col-span-3 mb-3 md:mb-0"><div className="font-bold text-slate-800 text-lg leading-tight">{item.name} {item.isManual && <span className="bg-gray-100 text-gray-500 text-[9px] px-1 rounded ml-1">MANUAL</span>}</div></div>
                    <div className="col-span-2 mb-2 md:mb-0"><label className="md:hidden text-xs text-gray-400 font-bold block mb-1">Delivery</label><div className="text-sm font-black text-red-500">{item.deliveryDate || '---'}</div></div>
                    <div className="col-span-2 mb-2 md:mb-0"><label className="md:hidden text-xs text-gray-400 font-bold block mb-1">Rate</label><div className="font-black text-slate-900 bg-gray-50 px-2 py-1 rounded inline-block">AED {item.workerRate || 0}</div></div>
                    <div className="col-span-1 flex items-center"><label className="md:hidden text-xs text-gray-400 font-bold mr-2">Sent</label>{item.sentToWorker ? <span className="text-blue-600 font-bold text-xs">Yes</span> : <span className="text-gray-300 text-xs">No</span>}</div>
                    <div className="col-span-1 flex items-center"><label className="md:hidden text-xs text-gray-400 font-bold mr-2">Done</label>{item.workerDone ? <span className="text-green-600 font-bold text-xs">Yes</span> : <span className="text-gray-300 text-xs">No</span>}</div>
                    <div className="col-span-2 mt-2 md:mt-0"><label className="md:hidden text-xs text-gray-400 font-bold block mb-1">Paid</label><div className="font-black text-green-700 bg-green-50 px-2 py-1 rounded inline-block">AED {item.moneyPaid || 0}</div></div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* FLOATING ADD BUTTON */}
            <button onClick={() => setIsManualItemModalOpen(true)} className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 z-40 print:hidden"><PlusIcon className="h-8 w-8"/></button>

            {/* PRINT LIST */}
            <div className="hidden print:block p-4">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-2">Bill #</th>
                            <th className="py-2">Item Name</th>
                            <th className="py-2">Delivery</th>
                            <th className="py-2 text-right">Rate</th>
                            <th className="py-2 text-right">Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        {getWorkerItems().map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                                <td className="py-2 font-bold">{item.billNo}</td>
                                <td className="py-2">{item.name}</td>
                                <td className="py-2">{item.deliveryDate}</td>
                                <td className="py-2 text-right font-bold">{item.workerRate || 0}</td>
                                <td className="py-2 text-right">{item.moneyPaid || 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-8 flex justify-end">
                    <div className="w-1/2 border-t border-black pt-2">
                        <div className="flex justify-between mb-1"><span>Total Work:</span><span className="font-bold">AED {totals.totalWork}</span></div>
                        <div className="flex justify-between mb-1"><span>Total Paid:</span><span className="font-bold">AED {totals.totalPaid}</span></div>
                        <div className="flex justify-between text-xl font-black mt-2"><span>Balance Due:</span><span>AED {totals.balance}</span></div>
                    </div>
                </div>
            </div>

          </div>
        )}

        {/* MODALS */}
        {isAddModalOpen && <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm print:hidden transform-gpu"><div className="bg-white rounded-3xl w-full max-w-sm p-6"><h2 className="text-xl font-black text-slate-900 mb-4">Add New Worker</h2><input className="w-full bg-white border-2 border-gray-200 p-3 rounded-xl mb-3 font-bold text-black placeholder-gray-400" placeholder="Name" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} /><input className="w-full bg-white border-2 border-gray-200 p-3 rounded-xl mb-6 font-bold text-black placeholder-gray-400" placeholder="Mobile" value={newWorkerMobile} onChange={e => setNewWorkerMobile(e.target.value)} /><div className="flex gap-2"><button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-600 font-bold">Cancel</button><button onClick={handleAddWorker} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold">Save</button></div></div></div>}
        
        {isEditModalOpen && <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm print:hidden transform-gpu"><div className="bg-white rounded-3xl w-full max-w-sm p-6"><h2 className="text-xl font-black text-slate-900 mb-4">Edit Worker</h2><input className="w-full bg-white border-2 border-gray-200 p-3 rounded-xl mb-3 font-bold text-black" value={editWorkerName} onChange={e => setEditWorkerName(e.target.value)} /><input className="w-full bg-white border-2 border-gray-200 p-3 rounded-xl mb-6 font-bold text-black" value={editWorkerMobile} onChange={e => setEditWorkerMobile(e.target.value)} /><div className="flex gap-2"><button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-600 font-bold">Cancel</button><button onClick={handleUpdateWorker} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Update</button></div></div></div>}

        {/* MANUAL ITEM MODAL */}
        {isManualItemModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm print:hidden transform-gpu">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              <h2 className="text-xl font-black text-slate-900 mb-4">Add Manual Work</h2>
              <div className="space-y-3">
                <input placeholder="Bill No." className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={manualBillNo} onChange={e => setManualBillNo(e.target.value)} />
                <input placeholder="Item Name" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={manualItemName} onChange={e => setManualItemName(e.target.value)} />
                <input type="date" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={manualDeliveryDate} onChange={e => setManualDeliveryDate(e.target.value)} />
                <div className="flex gap-2">
                    <input type="number" placeholder="Rate" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={manualWorkerRate} onChange={e => setManualWorkerRate(e.target.value)} />
                    <input type="number" placeholder="Paid" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={manualMoneyPaid} onChange={e => setManualMoneyPaid(e.target.value)} />
                </div>
                <button onClick={handleAddManualItem} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold mt-2">Save Item</button>
                <button onClick={() => setIsManualItemModalOpen(false)} className="w-full py-3 text-gray-400 font-bold">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT ITEM MODAL */}
        {isEditItemModalOpen && editingItemData && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm print:hidden transform-gpu">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              <h2 className="text-xl font-black text-slate-900 mb-4">Edit Item</h2>
              <div className="space-y-3">
                <div><label className="text-xs font-bold text-gray-400">Name</label><input className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={editingItemData.name} onChange={e => setEditingItemData({...editingItemData, name: e.target.value})} /></div>
                <div className="flex gap-2">
                    <div><label className="text-xs font-bold text-gray-400">Rate</label><input type="number" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={editingItemData.workerRate} onChange={e => setEditingItemData({...editingItemData, workerRate: parseFloat(e.target.value)})} /></div>
                    <div><label className="text-xs font-bold text-gray-400">Paid</label><input type="number" className="w-full bg-gray-50 p-3 rounded-xl font-bold" value={editingItemData.moneyPaid} onChange={e => setEditingItemData({...editingItemData, moneyPaid: parseFloat(e.target.value)})} /></div>
                </div>
                <div className="flex justify-between items-center py-2">
                    <label className="font-bold text-slate-700">Completed?</label>
                    <input type="checkbox" checked={editingItemData.workerDone || false} onChange={e => setEditingItemData({...editingItemData, workerDone: e.target.checked})} className="w-6 h-6 accent-green-600"/>
                </div>
                <button onClick={handleUpdateAnyItem} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold mt-2">Update</button>
                <button onClick={() => setIsEditItemModalOpen(false)} className="w-full py-3 text-gray-400 font-bold">Cancel</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}