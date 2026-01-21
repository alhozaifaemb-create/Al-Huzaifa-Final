"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, query, orderBy } from 'firebase/firestore'; // Added query, orderBy, deleteDoc
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { 
  HeartIcon, 
  MagnifyingGlassIcon, 
  UserIcon, 
  PhoneIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  TagIcon, // Added TagIcon for bills
  TrashIcon, // Added TrashIcon for delete
  PencilIcon // Added PencilIcon for editing measurements
} from '@heroicons/react/24/outline';
import Link from 'next/link'; // Added for clicking bill numbers

export default function FavouritePage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [allBills, setAllBills] = useState<any[]>([]); // New State for Bills
  const [searchTerm, setSearchTerm] = useState('');
  
  // Expanded Customer State
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  
  // Measurement Modal State
  const [isMeasureModalOpen, setIsMeasureModalOpen] = useState(false);
  const [selectedCustomerForMeasure, setSelectedCustomerForMeasure] = useState<any>(null);
  const [isEditingMeasurement, setIsEditingMeasurement] = useState(false); // New state
  const [editingProfileIndex, setEditingProfileIndex] = useState<number | null>(null); // New state
  
  // Form State
  const [profileName, setProfileName] = useState('');
  const [measurements, setMeasurements] = useState<any>({
    length: '', shoulder: '', chest: '', waist: '', 
    hip: '', sleeves: '', neck: '', armhole: '', 
    cuff: '', bottom: ''
  });

  // 1. Fetch Favorites
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'favouriteCustomers'), (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      setCustomers(data);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Bills (To match phone numbers) - NEW ADDITION
  useEffect(() => {
    const q = query(collection(db, 'bills'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        billNo: doc.data().billNo, 
        mobile: doc.data().mobile 
      }));
      setAllBills(data);
    });
    return () => unsubscribe();
  }, []);

  // 3. Add Measurement Profile
  const handleSaveMeasurement = async () => {
    if (!selectedCustomerForMeasure || !profileName) return;

    const newProfileData = {
      name: profileName,
      ...measurements,
      createdAt: new Date()
    };

    try {
      const customerRef = doc(db, 'favouriteCustomers', selectedCustomerForMeasure.id);
      
      if (isEditingMeasurement && editingProfileIndex !== null) {
        // EDITING existing profile
        const updatedProfiles = [...(selectedCustomerForMeasure.measurementProfiles || [])];
        updatedProfiles[editingProfileIndex] = newProfileData;
        await updateDoc(customerRef, { measurementProfiles: updatedProfiles });
      } else {
        // ADDING new profile
        await updateDoc(customerRef, {
          measurementProfiles: arrayUnion(newProfileData)
        });
      }

      setIsMeasureModalOpen(false);
      setIsEditingMeasurement(false);
      setEditingProfileIndex(null);
      setProfileName('');
      setMeasurements({
        length: '', shoulder: '', chest: '', waist: '', 
        hip: '', sleeves: '', neck: '', armhole: '', 
        cuff: '', bottom: ''
      });
    } catch (error) {
      console.error("Error saving measurements:", error);
      alert("Error saving. Make sure this customer is saved in Favorites database first.");
    }
  };

  const openMeasureModal = (e: any, customer: any, profile: any = null, index: number | null = null) => {
    e.stopPropagation();
    setSelectedCustomerForMeasure(customer);
    setIsMeasureModalOpen(true);
    
    if (profile) {
      setIsEditingMeasurement(true);
      setEditingProfileIndex(index);
      setProfileName(profile.name);
      // Exclude 'name' and 'createdAt' when setting measurements
      const { name, createdAt, ...restMeasurements } = profile;
      setMeasurements(restMeasurements);
    } else {
      setIsEditingMeasurement(false);
      setEditingProfileIndex(null);
      setProfileName('');
      setMeasurements({
        length: '', shoulder: '', chest: '', waist: '', 
        hip: '', sleeves: '', neck: '', armhole: '', 
        cuff: '', bottom: ''
      });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCustomerId(expandedCustomerId === id ? null : id);
  };

  // 4. Delete Customer from VIP List
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this customer from VIPs?")) return;
    
    try {
      const customerRef = doc(db, 'favouriteCustomers', id);
      await deleteDoc(customerRef);
      // The list will update automatically via the onSnapshot listener
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Failed to delete customer. Please try again.");
    }
  };

  const filteredCustomers = customers.filter((c: any) => 
    c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile?.includes(searchTerm)
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-32">
        
        {/* HEADER */}
        <div className="bg-green-700 pt-4 pb-6 px-4 shadow-lg sticky top-0 z-10">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-black text-white mb-4">VIP Customers</h1>
            
            <div className="relative group">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Name or Mobile..."
                className="w-full pl-10 pr-4 py-3 bg-white rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 text-slate-900 font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* CUSTOMER LIST */}
        <div className="max-w-5xl mx-auto p-4 space-y-4">
          {filteredCustomers.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <HeartIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No favorites found.</p>
              <p className="text-xs">Save a customer to see them here!</p>
            </div>
          )}

          {filteredCustomers.map((customer: any) => {
            // 🟢 FIND BILLS FOR THIS CUSTOMER
            const customerBills = allBills.filter(bill => 
              bill.mobile && customer.mobile && 
              bill.mobile.trim() === customer.mobile.trim()
            );

            return (
              <div 
                key={customer.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all"
              >
                {/* Card Header (Click to Expand) */}
                <div 
                  onClick={() => toggleExpand(customer.id)}
                  className="p-5 flex justify-between items-start cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-red-50 p-3 rounded-full text-red-500 mt-1">
                      <HeartIcon className="h-6 w-6 fill-current" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{customer.customerName}</h3>
                      <p className="text-gray-500 font-bold text-sm flex items-center gap-1 mb-2">
                        <PhoneIcon className="h-3 w-3" /> {customer.mobile}
                      </p>
                      
                      {/* 🟢 BILL NUMBERS LIST */}
                      {customerBills.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {customerBills.map((bill) => (
                            <Link 
                              href={`/bills/${bill.id}`} 
                              key={bill.id}
                              onClick={(e) => e.stopPropagation()} // Stop expand when clicking bill
                              className="bg-green-100 text-green-800 text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 hover:bg-green-200 transition-colors"
                            >
                              <TagIcon className="h-3 w-3" />
                              #{bill.billNo}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 italic">No previous bills found</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(customer.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      title="Remove from VIPs"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    
                    {/* Expand/Collapse Icon */}
                    {expandedCustomerId === customer.id ? (
                      <ChevronUpIcon className="h-6 w-6 text-gray-400 mt-2" />
                    ) : (
                      <ChevronDownIcon className="h-6 w-6 text-gray-400 mt-2" />
                    )}
                  </div>
                </div>

                {/* EXPANDED SECTION */}
                {expandedCustomerId === customer.id && (
                  <div className="bg-gray-50 border-t border-gray-100 p-4 animate-in slide-in-from-top-2">
                    
                    {/* List of Saved Profiles */}
                    <div className="mb-4 space-y-3">
                      {customer.measurementProfiles && customer.measurementProfiles.length > 0 ? (
                        customer.measurementProfiles.map((profile: any, index: number) => (
                          <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-2">
                              <span className="font-black text-slate-900 flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-green-600" /> {profile.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => openMeasureModal(e, customer, profile, index)}
                                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                                  title="Edit Measurement Profile"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <span className="text-xs text-gray-400 font-bold">
                                   {profile.createdAt?.seconds ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : 'Saved'}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2 text-center">
                              {Object.entries(profile).map(([key, value]) => {
                                if (key === 'name' || key === 'createdAt') return null;
                                return (
                                  <div key={key} className="bg-gray-50 rounded p-1">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">{key}</p>
                                    <p className="text-sm font-black text-slate-900">{String(value || '-')}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-400 text-sm italic py-2">No measurements saved yet.</p>
                      )}
                    </div>

                    {/* Add New Button */}
                    <button 
                      onClick={(e) => openMeasureModal(e, customer)}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                      <CustomRulerIcon className="h-5 w-5" /> Add New Measurements
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ADD MEASUREMENT MODAL */}
        {isMeasureModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center sm:p-4 transform-gpu">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl h-[90vh] sm:h-auto overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900">{isEditingMeasurement ? 'Edit Measurement' : 'New Measurement'}</h2>
                <button onClick={() => setIsMeasureModalOpen(false)} className="p-2 bg-gray-100 rounded-full">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Profile Name */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase ml-1">Profile Name (e.g. Self, Son)</label>
                  <input 
                    className="w-full bg-gray-100 p-4 rounded-xl font-black text-lg text-slate-900 outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter Name..."
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>

                {/* Measurements Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(measurements).map((key) => (
                    <div key={key}>
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">{key}</label>
                      <input 
                        type="number"
                        className="w-full bg-white border-2 border-gray-100 p-3 rounded-xl font-bold text-slate-900 outline-none focus:border-green-500 focus:ring-0 transition-all"
                        placeholder="0.0"
                        value={measurements[key]}
                        onChange={(e) => setMeasurements({...measurements, [key]: e.target.value})}
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleSaveMeasurement}
                  className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg shadow-lg shadow-green-200 mt-4 active:scale-95 transition-transform"
                >
                  {isEditingMeasurement ? 'Update Measurement' : 'Save Measurement'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

// CUSTOM ICONS
function XMarkIcon({className}: {className?: string}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CustomRulerIcon({className}: {className?: string}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
    </svg>
  );
}