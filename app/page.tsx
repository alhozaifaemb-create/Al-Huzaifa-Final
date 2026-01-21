'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore'; 
import { 
  AlertTriangle, 
  Package, 
  Search, 
  Loader2, 
  TrendingUp, 
  Users, 
  ChevronRight, 
  Scissors,
  AlertCircle
} from 'lucide-react'; 
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [stats, setStats] = useState({
    totalActiveOrders: 0,
    revenueToday: 0,
    revenueMonthly: 0,
    revenueYearly: 0,
  });
  
  const [urgentPreview, setUrgentPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatsAndUrgent();
  }, []);

  const loadStatsAndUrgent = async () => {
    try {
      const billsRef = collection(db, 'bills');
      const snapshot = await getDocs(billsRef);
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const isSameDay = (d1: Date, d2: Date) => 
        d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

      let activeOrders = 0;
      let todayRevenue = 0;
      let monthlyRevenue = 0;
      let yearlyRevenue = 0;
      let urgentList: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const amount = Number(data.totalAmount) || 0;
        
        let billDate = new Date();
        if (data.createdAt?.toDate) {
             billDate = data.createdAt.toDate();
        } else if (data.date) {
             billDate = new Date(data.date);
        }

        const isDelivered = data.status === 'Delivered' || data.delivered === true;
        // 🟢 FIX: Check if all items are finished
        const allItemsDone = data.items?.every((i: any) => i.completed === true) || false;

        if (!isDelivered) {
          activeOrders++;
          
          // 🟢 URGENT LOGIC: Only show if NOT all items are done
          if (!allItemsDone) {
              if (data.isUrgent) {
                  urgentList.push({ id: doc.id, ...data });
              } else if (data.deliveryDate) {
                const delivery = new Date(data.deliveryDate);
                const diffTime = delivery.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Show if passed due date or within 5 days
                if (diffDays <= 5) {
                  urgentList.push({ id: doc.id, ...data });
                }
              }
          }
        }

        if (billDate.getFullYear() === currentYear) {
          yearlyRevenue += amount;
          if (billDate.getMonth() === currentMonth) {
            monthlyRevenue += amount;
            if (isSameDay(billDate, now)) {
              todayRevenue += amount;
            }
          }
        }
      });

      setStats({
        totalActiveOrders: activeOrders,
        revenueToday: todayRevenue,
        revenueMonthly: monthlyRevenue,
        revenueYearly: yearlyRevenue
      });

      setUrgentPreview(urgentList.slice(0, 5));

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    try {
      const billsRef = collection(db, 'bills');
      const snapshot = await getDocs(billsRef);
      
      const queryLower = query.toLowerCase().trim();
      const results: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const customerName = (data.customerName || '').toLowerCase();
        const mobile = (data.mobile || '').toLowerCase();
        const billNo = (data.billNo || '').toString().toLowerCase();
        
        if (
          customerName.includes(queryLower) ||
          mobile.includes(queryLower) ||
          billNo.includes(queryLower)
        ) {
          results.push({ id: doc.id, ...data });
        }
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) performSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  return (
    <Layout>
      <div className="min-h-screen bg-[#F2F4F7] font-sans pb-24">
        
        {/* 1. MODERN HEADER */}
        <div className="pt-8 px-6 pb-4 bg-white sticky top-0 z-10 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">Welcome Back</p>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Al Huzaifa</h1>
            </div>
            <div className="bg-green-100 p-2 rounded-full">
              <Scissors className="w-5 h-5 text-green-700" />
            </div>
          </div>
        </div>

        <div className="px-5 mt-6 space-y-6">

          {/* 2. HERO REVENUE CARD (Premium Dark Gradient) */}
          <div className="bg-gradient-to-br from-[#1E8449] to-[#145A32] rounded-[2rem] p-6 text-white shadow-xl shadow-green-200 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <p className="text-green-100 text-sm font-medium mb-1">Total Revenue (Yearly)</p>
              <h2 className="text-4xl font-black tracking-tighter">AED {stats.revenueYearly.toLocaleString()}</h2>
              
              <div className="mt-6 flex gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex-1 border border-white/10">
                  <p className="text-xs text-green-200">This Month</p>
                  <p className="text-lg font-bold">AED {stats.revenueMonthly.toLocaleString()}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex-1 border border-white/10">
                  <p className="text-xs text-green-200">Today</p>
                  <p className="text-lg font-bold">AED {stats.revenueToday.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. BENTO GRID STATS */}
          <div className="grid grid-cols-2 gap-4">
            {/* Active Orders Widget */}
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col justify-between h-32">
              <div className="bg-blue-50 w-10 h-10 rounded-full flex items-center justify-center text-blue-600">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-800">{loading ? '...' : stats.totalActiveOrders}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase">Active Orders</p>
              </div>
            </div>

            {/* Urgent Orders Widget (Clickable) */}
            <button 
              onClick={() => router.push('/bills?filter=urgent')}
              className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col justify-between h-32 relative overflow-hidden group text-left transition hover:scale-[1.02]"
            >
              <div className="absolute right-0 top-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110"></div>
              <div className="bg-red-50 w-10 h-10 rounded-full flex items-center justify-center text-red-500 relative z-10">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-black text-red-500">
                    {urgentPreview.length}{urgentPreview.length >= 5 ? '+' : ''}
                </h3>
                <p className="text-xs font-bold text-gray-400 uppercase">Urgent Due</p>
              </div>
            </button>
          </div>

          {/* 4. SEARCH BAR (Modernized) */}
          <div className="bg-white rounded-2xl shadow-sm p-2 flex items-center border border-gray-200 relative">
             <Search className="text-gray-400 ml-2" size={20} />
             <input
               type="text"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder="Search Bill No, Name..."
               className="w-full p-3 outline-none font-bold text-slate-900 bg-transparent"
             />
             {searchLoading && <Loader2 className="animate-spin text-green-600 mr-2" size={20} />}
             
             {/* Search Dropdown Results */}
             {searchResults.length > 0 && (
               <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                 {searchResults.map((bill) => (
                   <div
                     key={bill.id}
                     onClick={() => router.push(`/bills/${bill.id}`)}
                     className="p-4 border-b hover:bg-gray-50 cursor-pointer flex justify-between"
                   >
                     <div>
                       <p className="font-bold text-slate-900">{bill.customerName}</p>
                       <p className="text-xs text-gray-500">#{bill.billNo}</p>
                     </div>
                     <p className="font-bold text-green-600">AED {bill.totalAmount}</p>
                   </div>
                 ))}
               </div>
             )}
          </div>

          {/* 5. QUICK ACTIONS LIST (iOS Style) */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4 px-1">Quick Actions</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              
              <button 
                onClick={() => router.push('/bills?filter=undelivered')} 
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800 text-sm">Undelivered Items</p>
                    <p className="text-xs text-gray-400">Check pending deliveries</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>

              <button 
                onClick={() => router.push('/bills')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800 text-sm">All Bills</p>
                    <p className="text-xs text-gray-400">View full history</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>

            </div>
          </div>

          {/* 6. URGENT PREVIEW LIST (Clean Design) */}
          {urgentPreview.length > 0 && (
            <div>
              <h3 className="font-black text-slate-900 mb-3 flex items-center gap-2 px-1">
                <AlertTriangle className="text-red-500" size={20} />
                Urgent Due (Next 5 Days)
              </h3>
              <div className="space-y-3">
                {urgentPreview.map((bill) => {
                  const pendingItems = bill.items
                    ?.filter((i: any) => !i.completed)
                    .map((i: any) => i.name)
                    .join(', ') || 'Ready for Delivery';

                  return (
                    <Link key={bill.id} href={`/bills/${bill.id}`}>
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 flex justify-between items-center active:bg-gray-50">
                        <div>
                          <p className="font-black text-slate-900 text-lg">#{bill.billNo}</p>
                          <p className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded-md inline-block mt-1">Due: {bill.deliveryDate}</p>
                        </div>
                        <div className="text-right w-1/2">
                          <p className="font-bold text-slate-700 text-sm truncate">{pendingItems}</p>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Tap to view</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}