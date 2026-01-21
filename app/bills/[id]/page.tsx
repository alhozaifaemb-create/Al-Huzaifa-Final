'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, deleteDoc, getDoc, setDoc, getDocs, collection, where, query, writeBatch } from 'firebase/firestore'; 
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { 
  ArrowLeft, Trash2, Share2, Printer, Heart, User, MapPin, 
  CheckCircle, CheckCircle2, Image as ImageIcon, Phone
} from 'lucide-react';

export default function BillDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [bill, setBill] = useState<any>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. FETCH BILL & WORKERS
  useEffect(() => {
    if (!id) return;
    const unsubscribeBill = onSnapshot(doc(db, 'bills', id as string), (doc) => {
      setBill(doc.exists() ? { id: doc.id, ...doc.data() } : null);
      setLoading(false);
    });
    const fetchWorkers = async () => {
      const snap = await getDocs(collection(db, 'workers'));
      setWorkers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchWorkers();
    return () => unsubscribeBill();
  }, [id]);

  const formatDate = (val: any) => {
    if (!val) return '---';
    if (typeof val === 'string') return val;
    if (val?.seconds) return new Date(val.seconds * 1000).toLocaleDateString();
    return '---';
  };

  // 2. TOGGLES & ACTIONS
  const toggleStatus = async (field: string) => {
    if (!bill) return;
    await updateDoc(doc(db, 'bills', bill.id), { [field]: !bill[field] });
  };

  const toggleFavorite = async () => {
    if (!bill) return;
    const newStatus = !bill.isFavorite;
    await updateDoc(doc(db, 'bills', bill.id), { isFavorite: newStatus });
    
    if (newStatus) {
      const customerId = bill.mobile.trim().replace(/\s/g, ''); 
      if (!customerId) return;
      const favRef = doc(db, 'favouriteCustomers', customerId);
      const favSnap = await getDoc(favRef);
      if (!favSnap.exists()) {
        await setDoc(favRef, {
          customerName: bill.customerName, mobile: bill.mobile, createdAt: new Date(), measurementProfiles: []
        });
      }
    }
  };

  // 3. ITEM UPDATES
  const handleItemUpdate = async (index: number, field: string, value: any) => {
    if (!bill) return;
    const newItems = [...bill.items];
    newItems[index] = { ...newItems[index], [field]: value };
    await updateDoc(doc(db, 'bills', bill.id), { items: newItems });
  };

  // 4. SHARES & PRINTS
  const shareInvoice = () => {
    let msg = `*AL HUZAIFA TAILORING*\nOrder #${bill.billNo}\nCustomer: ${bill.customerName}\nDue: ${bill.deliveryDate}\n\n*ITEMS:*\n`;
    bill.items.forEach((item: any, i: number) => { 
        const p = Number(item.price || 0);
        const totalItem = p * 1.05;
        msg += `${i+1}. ${item.name} - AED ${totalItem.toFixed(2)} (Inc. VAT)\n`; 
    });
    msg += `\nTotal: AED ${bill.totalAmount}\nAdvance: AED ${bill.advancePayment || 0}\n*Balance: AED ${bill.totalAmount - (bill.advancePayment || 0)}*`;
    window.open(`https://wa.me/${bill.mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareSample = async (base64Image: string) => {
    if (!base64Image) return;
    if (navigator.share) {
      try {
        const res = await fetch(base64Image);
        const blob = await res.blob();
        const file = new File([blob], "sample.jpg", { type: "image/jpeg" });
        await navigator.share({
          files: [file],
          title: 'Sample Design',
          text: `Sample for Order #${bill.billNo}`
        });
      } catch (err) { console.log("Share failed", err); }
    } else { alert("Sharing not supported on this device."); }
  };

  // 🟢 PROFESSIONAL WHATSAPP NOTIFY (Fixed Phone Number Issue)
  const sendCustomerReadyMsg = () => {
    // 1. Clean the phone number (Remove +, spaces, dashes)
    const rawMobile = bill.mobile || bill.customerMobile || '';
    const cleanMobile = rawMobile.replace(/[^0-9]/g, ''); 

    if (!cleanMobile) return alert("No mobile number found for this customer!");

    const shopLocation = "https://maps.app.goo.gl/MdLo7UhY8bq5LfT89?g_st=iwb"; 
    const balanceDue = bill.totalAmount - (bill.advancePayment || bill.advance || 0);
    
    const message = `Dear ${bill.customerName},

Your clothes with Bill No: #${bill.billNo} is ready for pickup. Please visit Al Huzaifa Tailoring & Emb to collect it.
Balance Due: AED ${balanceDue}

ملابسك التي تحمل رقم الفاتورة جاهزة للاستلام

Location 📍
${shopLocation}

Al Mujarah St.
Near Darwish Masjid
Sharjah, UAE.`;
    
    window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDelete = async () => {
    if(confirm("Delete this bill and all associated records?")) {
      setLoading(true);
      try {
        const batch = writeBatch(db);
        const billRef = doc(db, "bills", id as string);
        batch.delete(billRef);
        if (bill.billNo) {
            const q = query(collection(db, 'alterations'), where('billNo', '==', bill.billNo));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => batch.delete(doc.ref));
        }
        await batch.commit();
        router.replace('/bills');
      } catch (error) { console.error(error); alert("Failed to delete."); setLoading(false); }
    }
  };

  // 🟢 Calculate VAT Helper
  const calculateVAT = (price: number) => {
    return (price * 0.05).toFixed(2);
  };

  if (loading || !bill) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <Layout>
      {/* 🟢 1. SCREEN VIEW (CLEAN DASHBOARD) */}
      <div className="print:hidden max-w-5xl mx-auto pb-24">
        
        {/* Header Actions */}
        <div className="bg-white sticky top-0 z-10 px-4 py-4 shadow-sm flex justify-between items-center mb-6">
           <div className="flex items-center gap-3">
             <button onClick={() => router.back()} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
             <h1 className="text-lg font-black text-slate-900">Order #{bill.billNo}</h1>
           </div>
           <div className="flex gap-2">
             <button onClick={() => window.print()} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100" title="Print Invoice"><Printer className="w-5 h-5" /></button>
             <button onClick={toggleFavorite} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100" title="Add to Favorites"><Heart className={`w-5 h-5 ${bill.isFavorite ? 'fill-current' : ''}`} /></button>
             <button onClick={shareInvoice} className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100" title="Share WhatsApp"><Share2 className="w-5 h-5" /></button>
             <button onClick={handleDelete} className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-500" title="Delete Bill"><Trash2 className="w-5 h-5" /></button>
           </div>
        </div>

        <div className="space-y-6 px-4">
           
           {/* Customer Card */}
           <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="bg-green-600 p-6 text-white flex justify-between items-start">
                 <div>
                   <span className="bg-green-500/50 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Bill #{bill.billNo}</span>
                   <h1 className="text-3xl font-black mt-2">{bill.customerName}</h1>
                   <p className="text-green-100 font-medium">{bill.mobile}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] uppercase opacity-70 font-bold">Delivery Date</p>
                    <p className="text-xl font-black">{bill.deliveryDate}</p>
                 </div>
             </div>

             <div className="p-6">
                {/* Status Toggles */}
                <div className="flex gap-4 mb-8">
                   <button onClick={() => toggleStatus('fullPayment')} className={`flex-1 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${bill.fullPayment ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                      {bill.fullPayment ? <CheckCircle className="w-5 h-5"/> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                      <span>{bill.fullPayment ? 'PAID' : 'MARK PAID'}</span>
                   </button>
                   <button onClick={() => toggleStatus('delivered')} className={`flex-1 py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${bill.delivered ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                      {bill.delivered ? <CheckCircle className="w-5 h-5"/> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                      <span>{bill.delivered ? 'DELIVERED' : 'MARK DONE'}</span>
                   </button>
                </div>

                {/* Item List with Worker Assign */}
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-3">Order Items</h3>
                <div className="space-y-4">
                   {bill.items?.map((item: any, index: number) => {
                     const p = Number(item.price || 0);
                     const v = Number(calculateVAT(p));
                     return (
                      <div key={index} className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                         <div className="flex justify-between items-start mb-3">
                           <div>
                               <h4 className="text-lg font-black text-slate-800">{item.name}</h4>
                               <p className="text-green-600 font-bold">AED {p.toFixed(2)}</p>
                               <p className="text-[10px] text-blue-500 font-bold mt-1">VAT 5%: AED {v.toFixed(2)}</p>
                           </div>
                           <button onClick={() => handleItemUpdate(index, 'completed', !item.completed)} className={`p-2 rounded-full transition-colors ${item.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                             <CheckCircle2 className="w-6 h-6" />
                           </button>
                         </div>
                         
                         {/* Worker Assignment */}
                         <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-2">
                           <User className="w-4 h-4 text-gray-400" />
                           <select value={item.assignedTo || ''} onChange={(e) => handleItemUpdate(index, 'assignedTo', e.target.value)} className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer">
                             <option value="">Assign Worker...</option>
                             {workers.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                           </select>
                         </div>

                         {/* Image Share */}
                         {item.image && (
                           <button onClick={() => shareSample(item.image)} className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 bg-blue-100/50 py-2 rounded-lg hover:bg-blue-100">
                             <ImageIcon className="w-3 h-3" /> View/Share Sample
                           </button>
                         )}
                      </div>
                   )})}
                </div>
             </div>
           </div>

           {/* Financial Summary Card (Black) */}
           <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg">
               <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 font-bold text-sm">Total Amount</span>
                  <span className="text-xl font-black">AED {bill.totalAmount}</span>
               </div>
               <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                  <span className="text-green-400 font-bold text-sm">Advance Paid</span>
                  <span className="font-bold text-green-400">- AED {bill.advancePayment || bill.advance || 0}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-white font-black uppercase tracking-widest text-sm">Balance Due</span>
                  <span className="text-3xl font-black text-red-500">AED {bill.totalAmount - (bill.advancePayment || bill.advance || 0)}</span>
               </div>
           </div>

           {/* Notify Button */}
           <button onClick={sendCustomerReadyMsg} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 hover:bg-green-700 transition-colors">
               <MapPin className="w-5 h-5" /> Notify: Ready for Pickup
           </button>

        </div>
      </div>


      {/* 🟢 2. PRINT VIEW (MODERN GREEN INVOICE) */}
      <div className="hidden print:block bg-white p-8 min-h-screen">
        
        {/* INVOICE HEADER */}
        <div className="border-b-4 border-green-700 pb-6 mb-8">
          <div className="flex justify-between items-start">
             <div>
                <h1 className="text-4xl font-black text-green-800 uppercase tracking-tighter">Al Huzaifa</h1>
                <h2 className="text-lg font-bold text-blue-900 tracking-widest uppercase mb-4">Tailoring & Embroidery</h2>
                
                <div className="text-sm font-bold text-gray-600 space-y-1">
                   <p className="flex items-center"><MapPin className="w-3 h-3 mr-1"/> Al Mujarrah St, Near Darwish Masjid, SHARJAH</p>
                   <p className="flex items-center"><Phone className="w-3 h-3 mr-1"/> 055-4999723, 050-4999723</p>
                   <p className="text-xs text-gray-400 mt-1">TRN: 105087007800003</p>
                </div>
             </div>
             
             <div className="text-right">
                <div className="inline-block bg-green-50 px-6 py-4 rounded-xl border border-green-100">
                   <p className="text-xs text-green-600 font-bold uppercase mb-1">Tax Invoice #</p>
                   <p className="text-4xl font-black text-green-800">{bill.billNo}</p>
                </div>
             </div>
          </div>
        </div>

        {/* CUSTOMER INFO GRID */}
        <div className="flex justify-between items-end mb-12">
           <div>
              <p className="text-xs text-gray-400 font-bold uppercase mb-1">Bill To</p>
              <h3 className="text-2xl font-black text-slate-900">{bill.customerName}</h3>
              <p className="font-bold text-slate-600">{bill.mobile}</p>
           </div>
           <div className="text-right space-y-2">
              <div className="flex justify-end gap-8 text-sm">
                 <span className="text-gray-400 font-bold">Date:</span>
                 <span className="font-black text-slate-900">{formatDate(bill.createdAt || bill.date)}</span>
              </div>
              <div className="flex justify-end gap-8 text-sm">
                 <span className="text-gray-400 font-bold">Delivery:</span>
                 <span className="font-black text-red-600">{bill.deliveryDate}</span>
              </div>
           </div>
        </div>

        {/* MODERN TABLE */}
        <table className="w-full mb-12">
           <thead>
              <tr className="border-b-2 border-slate-900">
                 <th className="py-3 text-left font-black text-slate-900 uppercase text-xs tracking-wider w-1/2">Item Description</th>
                 <th className="py-3 text-right font-black text-slate-900 uppercase text-xs tracking-wider">Rate</th>
                 <th className="py-3 text-right font-black text-gray-400 uppercase text-xs tracking-wider">VAT (5%)</th>
                 <th className="py-3 text-right font-black text-green-700 uppercase text-xs tracking-wider">Total</th>
              </tr>
           </thead>
           <tbody className="text-sm">
              {(bill.items || []).map((item: any, idx: number) => {
                 const rate = Number(item.price || 0);
                 const vat = rate * 0.05;
                 const total = rate + vat;
                 return (
                    <tr key={idx} className="border-b border-gray-100">
                       <td className="py-4 font-bold text-slate-800">{item.name}</td>
                       <td className="py-4 text-right font-bold text-gray-600">{rate.toFixed(2)}</td>
                       <td className="py-4 text-right font-bold text-gray-400">{vat.toFixed(2)}</td>
                       <td className="py-4 text-right font-black text-slate-900">{total.toFixed(2)}</td>
                    </tr>
                 );
              })}
           </tbody>
        </table>

        {/* TOTALS SECTION */}
        <div className="flex justify-end">
           <div className="w-1/2 space-y-3">
              <div className="flex justify-between text-sm font-bold text-gray-500">
                 <span>Subtotal</span>
                 <span>AED {bill.totalOriginal?.toFixed(2) || (bill.totalAmount / 1.05).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-500">
                 <span>VAT (5%)</span>
                 <span>AED {bill.totalVat?.toFixed(2) || (bill.totalAmount * 0.05).toFixed(2)}</span>
              </div>
              <div className="my-2 border-t border-gray-200"></div>
              
              <div className="flex justify-between text-lg font-black text-slate-900">
                 <span>Grand Total</span>
                 <span>AED {bill.totalAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-green-600">
                 <span>Advance Paid</span>
                 <span>- AED {(bill.advancePayment || bill.advance || 0).toFixed(2)}</span>
              </div>

              <div className={`mt-4 p-4 rounded-xl flex justify-between items-center ${(bill.totalAmount - (bill.advancePayment || bill.advance || 0)) > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                 <span className="font-bold uppercase text-xs tracking-wider">Balance Due</span>
                 <span className="text-2xl font-black">AED {(bill.totalAmount - (bill.advancePayment || bill.advance || 0)).toFixed(2)}</span>
              </div>
           </div>
        </div>

        {/* FOOTER */}
        <div className="fixed bottom-0 left-0 right-0 p-8 text-center print:block hidden">
           <p className="font-black text-slate-900 text-sm mb-1">Thank you for your business!</p>
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Al Huzaifa Tailoring & Embroidery</p>
        </div>

      </div>
    </Layout>
  );
}