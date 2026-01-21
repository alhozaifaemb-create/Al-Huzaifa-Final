'use client';

import { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. EMAIL LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auto-redirect happens in Layout.tsx
    } catch (err: any) {
      console.error(err);
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // 2. GOOGLE LOGIN
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    
    try {
      await signInWithPopup(auth, provider);
      // Auto-redirect happens in Layout.tsx
    } catch (err: any) {
      console.error(err);
      setError('Google Sign-In failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl border border-gray-100">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-green-800 uppercase tracking-tighter">Al Huzaifa</h1>
          <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">Premium Tailoring System</p>
        </div>

        {/* Error Message */}
        {error && (
            <div className="mb-4 bg-red-50 text-red-500 text-sm font-bold p-3 rounded-lg text-center border border-red-100">
              {error}
            </div>
        )}

        {/* GOOGLE LOGIN BUTTON */}
        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-slate-700 font-bold py-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 mb-6"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
          <span>Sign in with Google</span>
        </button>

        <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-300 text-xs font-bold uppercase">Or Email</span>
            <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-xl bg-gray-50 border-2 border-gray-100 font-bold text-slate-900 focus:border-green-500 focus:bg-white outline-none transition-all"
              placeholder="admin@alhuzaifa.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-xl bg-gray-50 border-2 border-gray-100 font-bold text-slate-900 focus:border-green-500 focus:bg-white outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-green-700 text-white font-black py-4 rounded-xl shadow-lg shadow-green-700/20 active:scale-95 transition-all hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'SECURE LOGIN'}
          </button>
        </form>
        
        <p className="text-center text-[10px] text-gray-300 font-bold uppercase mt-8">
          Protected System • Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}