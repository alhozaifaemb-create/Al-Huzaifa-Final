'use client';

import { useState, useEffect } from 'react';
import { useBillingStore } from '@/store/billingStore';
// 🟢 FIX: Imports for Auth and Database
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDoc,
  Timestamp,
  query, // 🆕 Added for Privacy
  where, // 🆕 Added for Privacy
  onSnapshot, // 🆕 Added for Speed/Lag Fix
  getDocs 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; // 🆕 Added for stability
import { 
  Plus, 
  Trash2, 
  Check, 
  Share2, 
  Save, 
  X,
  Phone,
  Calendar,
  User,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

// WhatsApp message generator
const generateWhatsAppLink = (phone: string, message: string) => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
};

// Generate bill number
const generateBillNo = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BILL-${year}-${random}`;
};

export default function BillCreationPage() {
  const {
    customerName,
    mobile,
    orderDate,
    deliveryDate,
    items,
    advancePayment,
    delivered,
    fullPayment,
    calculations,
    setCustomerName,
    setMobile,
    setOrderDate,
    setDeliveryDate,
    addItem,
    removeItem,
    updateItem,
    toggleItemReady,
    assignItemToWorker,
    setAdvancePayment,
    toggleDelivered,
    toggleFullPayment,
    resetStore,
  } = useBillingStore();

  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedBillNo, setSavedBillNo] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null); // 🆕 User state to handle privacy

  // 1. AUTH LISTENER: Get current user once
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. PRIVACY & LAG FIX: Load ONLY your workers in real-time
  useEffect(() => {
    if (!user) return; // Wait for user to be logged in before fetching

    const workersRef = collection(db, 'workers');
    const q = query(workersRef, where('userId', '==', user.uid));
    
    // onSnapshot is faster and prevents the "lag" feel
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Permission Error:', error);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. SAVE LOGIC: WhatsApp Bug Fix & Privacy Stamp
  const handleSaveBill = async () => {
    if (!customerName || items.length === 0 || calculations.grandTotal === 0) {
      alert('Please fill customer name and add at least one item with rate > 0');
      return;
    }

    if (!user) {
      alert("System Error: You must be logged in to save bills.");
      return;
    }

    setSaving(true);
    try {
      const billNo = generateBillNo();
      
      const billData = {
        userId: user.uid, // 🟢 PRIVATE STAMP: Required by rules
        billNo,
        customerName,
        mobile,
        orderDate: Timestamp.fromDate(orderDate),
        deliveryDate: Timestamp.fromDate(deliveryDate),
        items: items.map((item: any) => ({
          id: item.id,
          itemName: item.itemName,
          originalRate: item.originalRate,
          vat: item.vat,
          totalWithVat: item.totalWithVat,
          ready: item.ready || false,
          assignedWorkerId: item.assignedWorkerId || null,
          assignedAt: item.assignedAt ? Timestamp.fromDate(item.assignedAt) : null,
        })),
        calculations: {
          sumOriginalRates: calculations.sumOriginalRates,
          sumTotalVat: calculations.sumTotalVat,
          grandTotal: calculations.grandTotal,
          advancePayment,
          pendingAmount: calculations.pendingAmount,
        },
        status: {
          delivered: delivered || false,
          fullPayment: fullPayment || false,
        },
        isFavourite: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user.uid,
      };

      // 🟢 BUG FIX: Wait for Save to COMPLETELY finish before opening WhatsApp
      // This prevents the browser from cutting off the database connection
      const docRef = await addDoc(collection(db, 'bills'), billData);
      
      if (docRef.id) {
          setSavedBillNo(billNo);
          
          // Generate WhatsApp message
          const message = `Thank you for choosing Al Huzaifa Tailoring and Emb\nشكراً لاختيارك الحذيفة للخياطة والتطريز\n\nBill No: ${billNo}\nTotal: AED ${calculations.grandTotal.toFixed(2)}\nAdvance: AED ${advancePayment.toFixed(2)}\nPending: AED ${calculations.pendingAmount.toFixed(2)}`;
          
          if (mobile) {
            const whatsappLink = generateWhatsAppLink(mobile, message);
            window.open(whatsappLink, '_blank');
          }

          // Reset store after a delay
          setTimeout(() => {
            resetStore();
            setSavedBillNo(null);
          }, 3000);
      }

    } catch (error) {
      console.error('Error saving bill:', error);
      alert('Permission Denied: Ensure you are logged in and using your own data.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignWorker = async (workerId: string) => {
    if (!selectedItemId) return;

    try {
      assignItemToWorker(selectedItemId, workerId);

      const workerRef = doc(db, 'workers', workerId);
      const workerDoc = await getDoc(workerRef);
      
      if (workerDoc.exists()) {
        const workerData = workerDoc.data();
        const selectedItem = items.find((item: any) => item.id === selectedItemId);
        
        if (selectedItem) {
          const assignedItem = {
            billId: '', 
            itemId: selectedItemId,
            billNo: savedBillNo || 'DRAFT',
            itemName: selectedItem.itemName,
            deliveryDate: Timestamp.fromDate(deliveryDate),
            workerRate: 0,
            sentToWorker: false,
            receivedFromWorker: false,
            assignedAt: Timestamp.now(),
          };

          await updateDoc(workerRef, {
            assignedItems: [...(workerData.assignedItems || []), assignedItem],
            updatedAt: Timestamp.now(),
          });
        }
      }

      setShowWorkerModal(false);
      setSelectedItemId(null);
    } catch (error) {
      console.error('Error assigning worker:', error);
    }
  };

  const handleItemReady = (itemId: string) => {
    toggleItemReady(itemId);
    
    const allReady = items.every((item: any) => item.ready || item.id === itemId);
    if (allReady && mobile && savedBillNo) {
      const message = `Your Kandura is ready with Bill No ${savedBillNo}. Balance is AED ${calculations.pendingAmount.toFixed(2)}. Please visit Al Huzaifa Tailoring and Emb to collect it. Thank you.\n\nكندورتك جاهزة برقم الفاتورة ${savedBillNo}. المبلغ المتبقي ${calculations.pendingAmount.toFixed(2)} درهم. يرجى زيارة الحذيفة للخياطة والتطريز لاستلامها. شكراً.`;
      const whatsappLink = generateWhatsAppLink(mobile, message);
      window.open(whatsappLink, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-white p-4 shadow-md">
        <h1 className="text-xl font-bold text-center">AL HUZAIFA TAILORING & EMB</h1>
        <div className="flex justify-center gap-4 mt-2 text-sm">
          <a href="tel:0554999723" className="flex items-center gap-1">
            <Phone className="w-4 h-4" />
            0554999723
          </a>
          <a href="tel:0504999723" className="flex items-center gap-1">
            <Phone className="w-4 h-4" />
            0504999723
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Success Message */}
        {savedBillNo && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            Bill {savedBillNo} saved successfully! WhatsApp message sent.
          </div>
        )}

        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Customer Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter customer name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Mobile Number
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0501234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Order Date
              </label>
              <input
                type="date"
                value={format(orderDate, 'yyyy-MM-dd')}
                onChange={(e) => setOrderDate(new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Delivery Date
              </label>
              <input
                type="date"
                value={format(deliveryDate, 'yyyy-MM-dd')}
                onChange={(e) => setDeliveryDate(new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Items</h2>
            <button
              onClick={addItem}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name
                    </label>
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) =>
                        updateItem(item.id, { itemName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter item name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Original Rate (AED)
                    </label>
                    <input
                      type="number"
                      value={item.originalRate || ''}
                      onChange={(e) =>
                        updateItem(item.id, {
                          originalRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* VAT and Total Display */}
                {item.originalRate > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-sm bg-gray-50 p-2 rounded">
                    <div>
                      <span className="text-gray-600">Rate:</span>
                      <span className="ml-2 font-medium">
                        AED {item.originalRate.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">VAT (5%):</span>
                      <span className="ml-2 font-medium">
                        AED {item.vat.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <span className="ml-2 font-semibold text-primary">
                        AED {item.totalWithVat.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Item Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.ready}
                        onChange={() => handleItemReady(item.id)}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">Ready</span>
                    </label>

                    <button
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setShowWorkerModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                      title="Assign to Worker"
                    >
                      <Share2 className="w-4 h-4" />
                      Assign Worker
                    </button>
                  </div>

                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calculations Section */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Calculations</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sum of Original Rates:</span>
              <span className="font-medium">AED {calculations.sumOriginalRates.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sum of Total VAT (5%):</span>
              <span className="font-medium">AED {calculations.sumTotalVat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span className="text-gray-800">Grand Total:</span>
              <span className="text-primary">AED {calculations.grandTotal.toFixed(2)}</span>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Advance Payment (AED)
              </label>
              <input
                type="number"
                value={advancePayment || ''}
                onChange={(e) => setAdvancePayment(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span className="text-gray-800">Pending Amount:</span>
              <span className="text-red-600">AED {calculations.pendingAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Status Checkboxes */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Status</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={delivered}
                onChange={toggleDelivered}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-gray-700">Delivered</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={fullPayment}
                onChange={toggleFullPayment}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-gray-700">Full Payment Received</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveBill}
          disabled={saving || !customerName || calculations.grandTotal === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary-dark transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Bill'}
        </button>
      </div>

      {/* Worker Selection Modal */}
      {showWorkerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Worker</h3>
              <button
                onClick={() => {
                  setShowWorkerModal(false);
                  setSelectedItemId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {workers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No workers found. Please add workers first.
                </p>
              ) : (
                workers.map((worker) => (
                  <button
                    key={worker.id}
                    onClick={() => handleAssignWorker(worker.id)}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-primary hover:text-white transition"
                  >
                    <div className="font-medium">{worker.name}</div>
                    {worker.contact && (
                      <div className="text-sm opacity-75">{worker.contact}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}