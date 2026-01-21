// Zustand Store for Billing State Management
// Optimized for performance with 50+ items
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Item structure
const createItem = (id) => ({
  id,
  itemName: '',
  originalRate: 0,
  vat: 0,
  totalWithVat: 0,
  ready: false,
  assignedWorkerId: null,
  assignedAt: null,
});

// Initial state
const initialState = {
  // Customer Info
  customerName: '',
  mobile: '',
  orderDate: new Date(),
  deliveryDate: new Date(),
  
  // Items
  items: [createItem(crypto.randomUUID())],
  
  // Payment
  advancePayment: 0,
  
  // Status
  delivered: false,
  fullPayment: false,
  
  // Calculations (computed)
  calculations: {
    sumOriginalRates: 0,
    sumTotalVat: 0,
    grandTotal: 0,
    pendingAmount: 0,
  },
};

// Calculate totals (optimized function)
const calculateTotals = (items, advancePayment) => {
  const sumOriginalRates = items.reduce((sum, item) => sum + (item.originalRate || 0), 0);
  const sumTotalVat = items.reduce((sum, item) => sum + (item.vat || 0), 0);
  const grandTotal = sumOriginalRates + sumTotalVat;
  const pendingAmount = Math.max(0, grandTotal - (advancePayment || 0));
  
  return {
    sumOriginalRates,
    sumTotalVat,
    grandTotal,
    pendingAmount,
  };
};

// Calculate VAT for a single item (5%)
const calculateItemVat = (rate) => {
  return rate * 0.05;
};

export const useBillingStore = create(
  devtools(
    (set, get) => ({
        ...initialState,
        
        // Update customer info
        setCustomerName: (name) => set({ customerName: name }),
        setMobile: (mobile) => set({ mobile }),
        setOrderDate: (date) => set({ orderDate: date }),
        setDeliveryDate: (date) => set({ deliveryDate: date }),
        
        // Item management
        addItem: () => {
          const newItem = createItem(crypto.randomUUID());
          set((state) => {
            const newItems = [...state.items, newItem];
            return {
              items: newItems,
              calculations: calculateTotals(newItems, state.advancePayment),
            };
          });
        },
        
        removeItem: (itemId) => {
          set((state) => {
            const newItems = state.items.filter((item) => item.id !== itemId);
            // Ensure at least one item exists
            if (newItems.length === 0) {
              newItems.push(createItem(crypto.randomUUID()));
            }
            return {
              items: newItems,
              calculations: calculateTotals(newItems, state.advancePayment),
            };
          });
        },
        
        updateItem: (itemId, updates) => {
          set((state) => {
            const newItems = state.items.map((item) => {
              if (item.id === itemId) {
                const updatedItem = { ...item, ...updates };
                
                // Auto-calculate VAT when rate changes
                if (updates.originalRate !== undefined) {
                  updatedItem.vat = calculateItemVat(updatedItem.originalRate);
                  updatedItem.totalWithVat = updatedItem.originalRate + updatedItem.vat;
                }
                
                return updatedItem;
              }
              return item;
            });
            
            return {
              items: newItems,
              calculations: calculateTotals(newItems, state.advancePayment),
            };
          });
        },
        
        toggleItemReady: (itemId) => {
          set((state) => {
            const newItems = state.items.map((item) =>
              item.id === itemId ? { ...item, ready: !item.ready } : item
            );
            return { items: newItems };
          });
        },
        
        assignItemToWorker: (itemId, workerId) => {
          set((state) => {
            const newItems = state.items.map((item) => {
              if (item.id === itemId) {
                return {
                  ...item,
                  assignedWorkerId: workerId,
                  assignedAt: new Date(),
                };
              }
              return item;
            });
            return { items: newItems };
          });
        },
        
        // Payment management
        setAdvancePayment: (amount) => {
          set((state) => ({
            advancePayment: amount,
            calculations: calculateTotals(state.items, amount),
          }));
        },
        
        // Status toggles
        toggleDelivered: () => {
          set((state) => ({ delivered: !state.delivered }));
        },
        
        toggleFullPayment: () => {
          set((state) => ({ fullPayment: !state.fullPayment }));
        },
        
        // Reset store (after saving bill)
        resetStore: () => {
          set({
            ...initialState,
            items: [createItem(crypto.randomUUID())],
            orderDate: new Date(),
            deliveryDate: new Date(),
          });
        },
        
        // Load bill data into store (for editing)
        loadBill: (billData) => {
          set({
            customerName: billData.customerName || '',
            mobile: billData.mobile || '',
            orderDate: billData.orderDate?.toDate() || new Date(),
            deliveryDate: billData.deliveryDate?.toDate() || new Date(),
            items: billData.items || [createItem(crypto.randomUUID())],
            advancePayment: billData.calculations?.advancePayment || 0,
            delivered: billData.status?.delivered || false,
            fullPayment: billData.status?.fullPayment || false,
            calculations: billData.calculations || calculateTotals(billData.items || [], billData.calculations?.advancePayment || 0),
          });
        },
      }),
    { name: 'BillingStore' }
  )
);
