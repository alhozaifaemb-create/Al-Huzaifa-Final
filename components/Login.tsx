'use client';

import { useState } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Reset link sent! Check your email (including Spam).');
      setError('');
    } catch (err: any) {
      setError('Failed to send reset email. Verify your email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth Error Code:", err.code);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Account not found. Please Create Account.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Please Login.');
      } else {
        setError('Login failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F4F7] p-4 font-sans">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-gray-100 relative overflow-hidden">
        
        {/* Design Decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-50 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-60"></div>

        <div className="text-center mb-10 relative z-10">
          <div className="bg-green-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <ShieldCheck className="text-green-700 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
            {isSignUp ? 'Create Account' : 'Al Huzaifa'}
          </h1>
          <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] mt-2 uppercase">
            {isSignUp ? 'Tailoring Management' : 'Premium Tailoring System'}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-500 text-xs font-bold p-4 rounded-2xl text-center border border-red-100 animate-in fade-in zoom-in duration-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 bg-green-50 text-green-600 text-xs font-bold p-4 rounded-2xl text-center border border-green-100">
            {message}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-5 relative z-10">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 pl-12 rounded-2xl bg-gray-50 border-2 border-gray-50 font-bold text-slate-900 focus:border-green-500 focus:bg-white outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                placeholder="shop@alhuzaifa.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 px-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase">Password</label>
              {!isSignUp && (
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-[10px] font-black text-green-700 hover:text-green-800 uppercase tracking-tighter"
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 pl-12 pr-12 rounded-2xl bg-gray-50 border-2 border-gray-50 font-bold text-slate-900 focus:border-green-500 focus:bg-white outline-none transition-all placeholder:font-normal placeholder:text-gray-300"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-70 uppercase text-xs tracking-widest mt-4"
          >
            {loading ? 'Authenticating...' : (isSignUp ? 'Create My Account' : 'Secure Login')}
          </button>
        </form>

        <div className="mt-8 text-center relative z-10">
          <p className="text-xs text-gray-500 font-bold">
            {isSignUp ? 'HAVE AN ACCOUNT?' : 'NEW USER?'}
            <button 
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              className="ml-2 text-green-700 font-black border-b-2 border-green-700/20 hover:border-green-700 transition-all focus:outline-none uppercase"
            >
              {isSignUp ? 'Login Now' : 'Create Account'}
            </button>
          </p>
        </div>
        
        <p className="text-[9px] text-gray-300 font-bold text-center mt-10 uppercase tracking-[0.3em] opacity-50">
          Authorized Personnel Only • Secure v1.5
        </p>

      </div>
    </div>
  );
}