'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Package, ArrowLeft, CheckCircle } from 'lucide-react';

export default function UndeliveredBillsPage() {
  const router = useRouter();
  const [undeliveredBills, setUndeliveredBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUndeliveredBills();
  }, []);

  const loadUndeliveredBills = async () => {
    try {
      const billsRef = collection(db, 'bills');
      const snapshot = await getDocs(billsRef);
      
      const undelivered: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if all items are ready AND bill is not delivered
        const allItemsReady = data.items?.every((item: any) => item.ready) || false;
        const isNotDelivered = !data.status?.delivered;
        
        if (allItemsReady && isNotDelivered) {
          undelivered.push({ id: doc.id, ...data });
        }
      });

      // Sort by delivery date
      undelivered.sort((a, b) => {
        const dateA = a.deliveryDate?.toDate() || new Date();
        const dateB = b.deliveryDate?.toDate() || new Date();
        return dateA.getTime() - dateB.getTime();
      });

      setUndeliveredBills(undelivered);
    } catch (error) {
      console.error('Error loading undelivered bills:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-yellow-500 text-white p-4 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-yellow-600 rounded transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6" />
              <h1 className="text-xl font-bold">UNDELIVERED ORDERS</h1>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : undeliveredBills.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No undelivered orders</p>
              <p className="text-gray-400 text-sm mt-2">
                All ready orders have been delivered
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {undeliveredBills.map((bill) => {
                const deliveryDate = bill.deliveryDate?.toDate();
                const pendingAmount = bill.calculations?.pendingAmount || 0;

                return (
                  <div
                    key={bill.id}
                    onClick={() => router.push(`/bills/${bill.id}`)}
                    className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500 cursor-pointer hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-gray-800">{bill.billNo}</div>
                        <div className="text-sm text-gray-600 mt-1">{bill.customerName}</div>
                        <div className="text-xs text-gray-500 mt-1">{bill.mobile}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded mb-1">
                          Ready
                        </div>
                        {pendingAmount > 0 && (
                          <div className="text-xs text-red-600 font-semibold">
                            Pending: AED {pendingAmount.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Items:</span>{' '}
                        {bill.items?.map((item: any) => item.itemName).join(', ') || 'N/A'}
                      </div>
                      {deliveryDate && (
                        <div className="text-xs text-gray-500 mt-2">
                          Delivery Date: {deliveryDate.toLocaleDateString()}
                        </div>
                      )}
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
