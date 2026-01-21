"use client";

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { 
  PhotoIcon, 
  PlusIcon, 
  TrashIcon, 
  ShareIcon, 
  XMarkIcon,
  NoSymbolIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

// 🟢 1. Image Compression Utility
const compressImage = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
    };
  });
};

export default function SamplesPage() {
  const [samples, setSamples] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);

  // Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemImage, setNewItemImage] = useState(''); 
  const [loading, setLoading] = useState(false);

  // 1. Fetch Samples
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'samples'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSamples(data);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Favorites
  useEffect(() => {
    const fetchFavs = async () => {
      const snap = await getDocs(collection(db, 'favouriteCustomers'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFavorites(data);
    };
    fetchFavs();
  }, [isShareModalOpen]);

  // 🟢 3. Handle Image with Compression
  const handleImageChange = async (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImage(file);
      setNewItemImage(compressed);
    }
  };

  // 4. Save Logic
  const handleSaveSample = async () => {
    if (!newItemName || !newItemImage) {
        alert("Please add an image and a name.");
        return;
    }
    setLoading(true);
    try {
        await addDoc(collection(db, 'samples'), {
          name: newItemName,
          price: newItemPrice, 
          image: newItemImage, 
          outOfStock: false,
          createdAt: new Date()
        });
        setIsAddModalOpen(false);
        setNewItemName('');
        setNewItemPrice('');
        setNewItemImage('');
    } catch (error) {
        console.error("Save Error:", error);
    } finally {
        setLoading(false);
    }
  };

  const toggleStock = async (e: any, sample: any) => {
    e.stopPropagation();
    const ref = doc(db, 'samples', sample.id);
    await updateDoc(ref, { outOfStock: !sample.outOfStock });
  };

  const deleteSample = async (e: any, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this sample?")) {
      await deleteDoc(doc(db, 'samples', id));
    }
  };

  // 5. Copy Image (Desktop Fallback)
  const copyImageToClipboard = async (base64Image: string) => {
    try {
      const response = await fetch(base64Image);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert("Image Copied! \nNow Open WhatsApp and Press 'Ctrl + V' to paste it.");
    } catch (error) {
      console.error(error);
      alert("Could not copy image automatically. Please save it manually.");
    }
  };

  // 🟢 6. UPDATED: Share with Image Logic (Mobile) + Text (Fallback)
  const sendToCustomer = async (mobile: string, sample: any) => {
    const text = `✨ *New Arrival: ${sample.name}* ✨\n💰 Price: AED ${sample.price}\n\nCheck this out at Al Huzaifa!`;
    
    // 🟢 FIXED: Removed 'navigator.canShare' check to fix TypeScript error
    // We just check if 'navigator.share' exists and we have an image
    if (navigator.share && sample.image) {
        try {
            // Convert base64 to file
            const res = await fetch(sample.image);
            const blob = await res.blob();
            const file = new File([blob], "sample.jpg", { type: "image/jpeg" });

            await navigator.share({
                files: [file],
                title: sample.name,
                text: text
            });
            return; // Stop here if share successful
        } catch (err) {
            console.log("Native share failed/cancelled, falling back to link...", err);
        }
    }

    // Fallback: Send Text Link Only (if desktop or share failed)
    const url = `https://wa.me/${mobile}?text=${encodeURIComponent(text + "\n\n(Please ask staff for photo)")}`;
    window.open(url, '_blank');
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-32">
        <div className="bg-green-700 pt-4 pb-6 px-4 shadow-lg sticky top-0 z-10">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-black text-white">Design Samples</h1>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-white text-green-700 px-4 py-2 rounded-full font-bold text-sm shadow-md flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" /> Add New
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {samples.map(sample => (
            <div key={sample.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group relative">
              <div className="aspect-square bg-gray-100 relative">
                {sample.image ? (
                  <img src={sample.image} alt={sample.name} className="w-full h-full object-cover" />
                ) : (
                  <PhotoIcon className="h-12 w-12 text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
                {sample.outOfStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Out of Stock</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-black text-slate-900 truncate">{sample.name}</h3>
                <p className="text-xs text-gray-500 font-bold mb-3">AED {sample.price}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setSelectedSample(sample); setIsShareModalOpen(true); }}
                    className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-green-100"
                  >
                    <ShareIcon className="h-3 w-3" /> Share
                  </button>
                  <button onClick={(e) => deleteSample(e, sample.id)} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button 
                onClick={(e) => toggleStock(e, sample)}
                className={`absolute top-2 right-2 p-2 rounded-full shadow-md z-10 ${
                  sample.outOfStock ? 'bg-red-100 text-red-600' : 'bg-white text-gray-400'
                }`}
              >
                <NoSymbolIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>

        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-slate-900">Add Sample</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-gray-100 rounded-full">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 relative">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {newItemImage ? (
                    <img src={newItemImage} className="max-h-32 mx-auto rounded-lg" />
                  ) : (
                    <div className="text-gray-400">
                      <PhotoIcon className="h-10 w-10 mx-auto mb-2" />
                      <p className="text-xs font-bold">Tap to Upload Photo</p>
                    </div>
                  )}
                </div>
                <input className="w-full bg-gray-100 p-3 rounded-xl font-bold text-slate-900" placeholder="Item Name" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                <input type="number" className="w-full bg-gray-100 p-3 rounded-xl font-bold text-slate-900" placeholder="Price (AED)" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} />
                <button onClick={handleSaveSample} disabled={loading} className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg shadow-lg">
                  {loading ? 'Saving...' : 'Save Sample'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SHARE MODAL */}
        {isShareModalOpen && selectedSample && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center sm:p-4">
            <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Broadcast Share</h2>
                  <p className="text-xs text-gray-500 font-bold">Sharing: {selectedSample.name}</p>
                </div>
                <button onClick={() => setIsShareModalOpen(false)} className="p-2 bg-gray-100 rounded-full">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* COPY BUTTON FOR DESKTOP USERS */}
              <button 
                onClick={() => copyImageToClipboard(selectedSample.image)}
                className="w-full py-3 mb-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <ClipboardDocumentIcon className="h-5 w-5" /> Copy Image (For Desktop)
              </button>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                 {favorites.length === 0 && <p className="text-center text-gray-400 mt-10">No favorites found.</p>}
                 {favorites.map(fav => (
                   <div key={fav.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl">
                     <div>
                       <p className="font-bold text-slate-900">{fav.customerName}</p>
                       <p className="text-xs text-gray-400">{fav.mobile}</p>
                     </div>
                     <div className="flex items-center gap-2">
                       {/* 🟢 Delete Favorite Customer */}
                       <button 
                         onClick={async () => {
                           if (confirm(`Remove ${fav.customerName} from favorites?`)) {
                             await deleteDoc(doc(db, 'favouriteCustomers', fav.id));
                           }
                         }}
                         className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-gray-50 rounded-lg hover:bg-red-50"
                         title="Remove from favorites"
                       >
                         <TrashIcon className="h-4 w-4" />
                       </button>
                       <button 
                         onClick={() => sendToCustomer(fav.mobile, selectedSample)}
                         className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1 hover:bg-green-200"
                       >
                         <ShareIcon className="h-3 w-3" /> SEND
                       </button>
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}