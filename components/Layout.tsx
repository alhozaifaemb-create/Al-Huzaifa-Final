'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore'; 
import { db, auth } from '@/lib/firebase'; 
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useSwipeable } from 'react-swipeable'; 
import { 
  Home, FileText, Heart, User, Image, Scissors, 
  Menu, X, LogOut, ChevronRight 
} from 'lucide-react';
import { XMarkIcon } from '@heroicons/react/24/outline'; 

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // 🟢 1. User State for Filtering
  const [user, setUser] = useState<any>(null);

  // 🟢 State for real-time stats
  const [totalBills, setTotalBills] = useState(0);
  const [urgentBills, setUrgentBills] = useState(0);
  const [totalWorkers, setTotalWorkers] = useState(0);

  // 🟢 2. Listen for User Login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      try {
        await signOut(auth);
        window.location.reload(); 
      } catch (error) {
        console.error("Error logging out:", error);
      }
    }
  };

  // 🟢 3. Real-time Listeners (FILTERED BY USER ID)
  useEffect(() => {
    if (!user) {
        // If not logged in, reset stats to 0
        setTotalBills(0);
        setUrgentBills(0);
        setTotalWorkers(0);
        return;
    }

    // Bills Count (Filtered)
    const billsRef = collection(db, 'bills');
    const qBills = query(billsRef, where('userId', '==', user.uid));

    const unsubscribeBills = onSnapshot(qBills, (snapshot) => {
      setTotalBills(snapshot.size);
    });

    // Urgent Bills Count (Filtered)
    const unsubscribeUrgentBills = onSnapshot(qBills, (snapshot) => {
      const now = new Date();
      let urgentCount = 0;
      snapshot.docs.forEach(doc => {
        const bill = doc.data();
        const deliveryDate = bill.deliveryDate ? new Date(bill.deliveryDate) : null;
        const isDelivered = bill.delivered === true || bill.status === 'Delivered';

        if (!isDelivered) {
          if (bill.isUrgent) {
            urgentCount++;
          } else if (deliveryDate) {
            const diffTime = deliveryDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 5) {
              urgentCount++;
            }
          }
        }
      });
      setUrgentBills(urgentCount);
    });

    // Workers Count (Workers are usually shared, but can be filtered if needed)
    // keeping workers global for now unless you want them private too
    const unsubscribeWorkers = onSnapshot(collection(db, 'workers'), (snapshot) => {
      setTotalWorkers(snapshot.size);
    });

    return () => { unsubscribeBills(); unsubscribeUrgentBills(); unsubscribeWorkers(); };
  }, [user]); // 🟢 Re-run when user changes

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Bills', href: '/bills', icon: FileText },
    { name: 'Alter', href: '/alter', icon: Scissors },
    { name: 'Favourite', href: '/favourite', icon: Heart },
    { name: 'Worker Card', href: '/workers', icon: User },
    { name: 'Samples', href: '/samples', icon: Image },
  ];

  // SWIPE LOGIC
  const handleSwipe = (direction: 'LEFT' | 'RIGHT') => {
    const currentIndex = navigation.findIndex(item => item.href === pathname);
    
    // Stop swipe if menu is open OR we are on a detail page
    if (currentIndex === -1 || isSidebarOpen) return; 

    if (direction === 'LEFT') {
      if (currentIndex < navigation.length - 1) {
        router.push(navigation[currentIndex + 1].href);
      }
    } else {
      if (currentIndex > 0) {
        router.push(navigation[currentIndex - 1].href);
      }
    }
  };

  // GESTURE HANDLERS
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleSwipe('LEFT'),
    onSwipedRight: () => handleSwipe('RIGHT'),
    trackMouse: true,
    preventScrollOnSwipe: true,
    delta: 10,
    swipeDuration: 500,
  });

  return (
    <div {...swipeHandlers} className="min-h-screen bg-gray-50 selection:bg-green-100 font-sans relative overflow-x-hidden">
      
      {/* SIDEBAR BACKDROP */}
      <div 
        className={`fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* SLIDE-OUT SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-3/4 max-w-xs bg-white z-[100] shadow-2xl transform transform-gpu transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full bg-white relative">
          
          {/* HEADER: User Profile */}
          <div className="p-6 bg-gradient-to-br from-green-800 to-green-600 text-white relative overflow-hidden">
            
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 z-[110] p-2 bg-black/20 text-white rounded-full hover:bg-black/40 active:scale-95 transition-all"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex items-center space-x-4 mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold border-2 border-white/30 backdrop-blur-sm">
                IB
              </div>
              <div>
                <h2 className="text-xl font-bold">Ibrahim</h2>
                <p className="text-green-100 text-xs opacity-90">Owner • Al Huzaifa</p>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="flex justify-between mt-2 pt-4 border-t border-white/10 relative z-10">
              <div className="text-center">
                <p className="text-xl font-bold">{totalBills}</p>
                <p className="text-[10px] text-green-100 uppercase tracking-wide">Bills</p>
              </div>
              <div className="h-8 w-[1px] bg-white/20"></div>
              <div className="text-center">
                <p className="text-xl font-bold">{urgentBills}</p>
                <p className="text-[10px] text-green-100 uppercase tracking-wide">Urgent</p>
              </div>
              <div className="h-8 w-[1px] bg-white/20"></div>
              <div className="text-center">
                <p className="text-xl font-bold">{totalWorkers}</p>
                <p className="text-[10px] text-green-100 uppercase tracking-wide">Staff</p>
              </div>
            </div>

          </div>

          {/* SCROLLABLE MENU ITEMS */}
          <div className="flex-1 overflow-y-auto py-2">
            
            <div className="px-6 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Menu</div>
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  router.push(item.href);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-6 py-3 space-x-4 transition-colors ${
                  pathname === item.href ? 'bg-green-50 text-green-700 border-r-4 border-green-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`w-5 h-5 ${pathname === item.href ? 'fill-current' : ''}`} />
                <span className="font-medium text-sm">{item.name}</span>
                {pathname === item.href && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </button>
            ))}

            <div className="mt-6 px-6 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Preferences</div>
            
            <div className="flex items-center justify-between px-6 py-3 text-gray-600 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-4">
                <span className="text-lg">🌙</span>
                <span className="font-medium text-sm">Dark Mode</span>
              </div>
              <div className="w-10 h-5 bg-gray-300 rounded-full relative">
                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3 text-gray-600 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-4">
                <span className="text-lg">🌐</span>
                <span className="font-medium text-sm">Language</span>
              </div>
              <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded">ENG</span>
            </div>

            <div className="flex items-center justify-between px-6 py-3 text-gray-600 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-4">
                <span className="text-lg">🔗</span>
                <span className="font-medium text-sm">Share App</span>
              </div>
            </div>

          </div>

          {/* FOOTER: Logout */}
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <button 
              className="flex items-center justify-center space-x-2 text-white bg-red-500 hover:bg-red-600 w-full px-4 py-3 rounded-xl transition-all shadow-lg shadow-red-200"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              <span className="font-bold text-sm">Log Out</span>
            </button>
            <p className="text-[10px] text-center text-gray-400 mt-4">
              Al Huzaifa Digital v1.2.0 <br/> Powered by Neurolearn
            </p>
          </div>
        </div>
      </aside>

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100/50 shadow-sm transition-all duration-300">
        <div className="px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-600"
          >
            <Menu className="w-6 h-6" />
          </button>

          <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-green-800 to-green-600">
            AL HUZAIFA
          </h1>

          <div className="w-8"></div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="pb-32 px-4 pt-4 w-full max-w-7xl mx-auto">
        {children}
      </main>

      {/* FLOATING NAVIGATION */}
      <nav className="fixed bottom-6 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none print:hidden">
        <div className="bg-slate-900/90 backdrop-blur-xl text-white shadow-2xl shadow-green-900/20 rounded-2xl flex justify-between items-center px-2 py-3 border border-white/10 w-full max-w-md pointer-events-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href === '/bills' && pathname?.startsWith('/bills')) ||
              (item.href === '/' && pathname === '/');
            
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`relative flex flex-col items-center justify-center w-full transition-all duration-300 ${
                  isActive ? 'text-green-400 scale-110' : 'text-gray-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-3 w-1 h-1 bg-green-400 rounded-full shadow-[0_0_10px_#4ade80]"></span>
                )}
                <Icon className={`w-6 h-6 ${isActive ? 'fill-green-400/20 stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                {isActive && (
                  <span className="text-[9px] font-bold mt-1 tracking-wide">
                    {item.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}