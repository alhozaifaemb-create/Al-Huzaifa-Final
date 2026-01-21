'use client';

import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function Login() {
  const [loading, setLoading] = useState(false);

  const startApp = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Failed to start system. Check internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F4F7] p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-center border border-white">
        <div className="bg-green-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="text-green-700 w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">AL HUZAIFA</h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-8">Premium Tailoring System</p>
        
        <button
          onClick={startApp}
          disabled={loading}
          className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Starting...' : 'ENTER SYSTEM'}
          {!loading && <ArrowRight size={20} />}
        </button>
        
        <p className="mt-8 text-[9px] text-gray-300 font-bold uppercase tracking-widest">Authorized Personnel Only • v2.0</p>
      </div>
    </div>
  );
}