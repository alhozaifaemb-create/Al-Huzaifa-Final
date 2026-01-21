'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, Timestamp } from 'firebase/firestore';
import { AlertTriangle, ArrowLeft, Calendar } from 'lucide-react';

export default function UrgentBillsPage() {
  const router = useRouter();
  const [urgentBills, setUrgentBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUrgentBills();
  }, []);

  const loadUrgentBills = async () => {
    try {
      const billsRef = collection(db, 'bills');
      const snapshot = await getDocs(billsRef);
      
      const today = new Date();
      const fiveDaysLater = new Date();
      fiveDaysLater.setDate(today.getDate() + 5);
      
      const urgent: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const deliveryDate = data.deliveryDate?.toDate();
        
        if (!deliveryDate) return;

        // Check if delivery date is within 5 days
        const isWithin5Days = deliveryDate <= fiveDaysLater && deliveryDate >= today;
        
        // Check if status is not ready (at least one item not ready)
        const hasUnreadyItems = data.items?.some((item: any) => !item.ready);
        
        if (isWithin5Days && hasUnreadyItems) {
          urgent.push({ id: doc.id, ...data });
        }
      });

      // Sort by delivery date (earliest first)
      urgent.sort((a, b) => {
        const dateA = a.deliveryDate?.toDate() || new Date();
        const dateB = b.deliveryDate?.toDate() || new Date();
        return dateA.getTime() - dateB.getTime();
      });

      setUrgentBills(urgent);
    } catch (error) {
      console.error('Error loading urgent bills:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-red-500 text-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-red-600 rounded transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              <h1 className="text-xl font-bold">URGENT ORDERS</h1>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : urgentBills.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No urgent orders found</p>
              <p className="text-gray-400 text-sm mt-2">
                Orders due within 5 days with unready items will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {urgentBills.map((bill) => {
                const deliveryDate = bill.deliveryDate?.toDate();
                const daysUntil = deliveryDate
                  ? Math.ceil((deliveryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : 0;

                return (
                  <div
                    key={bill.id}
                    onClick={() => router.push(`/bills/${bill.id}`)}
                    className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500 cursor-pointer hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-gray-800">{bill.billNo}</div>
                        <div className="text-sm text-gray-600 mt-1">{bill.customerName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          {daysUntil === 0 ? 'Due Today' : `${daysUntil} day${daysUntil > 1 ? 's' : ''} left`}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 mt-3">
                      {bill.items
                        ?.filter((item: any) => !item.ready)
                        .map((item: any, idx: number) => (
                          <div key={idx} className="text-sm text-gray-700">
                            • {item.itemName}
                          </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Delivery: {deliveryDate?.toLocaleDateString() || 'N/A'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
