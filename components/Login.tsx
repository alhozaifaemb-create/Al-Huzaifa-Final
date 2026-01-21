'use client';

import { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail // 🆕 Added for Forgot Password
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Eye, EyeOff, Mail } from 'lucide-react'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // 🆕 For success messages
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 🆕 Forgot Password Logic
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Reset link sent! Check your email inbox.');
      setError('');
    } catch (err: any) {
      setError('Failed to send reset email. Check if the email is correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError('Google Sign-In failed. Try again.');
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
      console.error(err.code);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password. Try again or reset password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Please Sign Up.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already exists. Please Login instead.');
      } else {
        setError('Authentication failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F4F7] p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-green-800 tracking-tight uppercase">
            {isSignUp ? 'Create Account' : 'Al Huzaifa'}
          </h1>
          <p className="text-xs font-bold text-gray-400 tracking-widest mt-2 uppercase">
            {isSignUp ? 'Join the Team' : 'Premium Tailoring System'}
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-500 text-sm font-bold p-3 rounded-lg text-center border border-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 bg-green-50 text-green-600 text-sm font-bold p-3 rounded-lg text-center border border-green-100">
            {message}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-slate-700 font-bold py-4 rounded-xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
          <span>{isSignUp ? 'Sign up with Google' : 'Sign in with Google'}</span>
        </button>

        <div className="relative flex py-6 items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-300 text-xs font-bold uppercase">Or Email</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-xl bg-gray-50 border-2 border-gray-100 font-bold text-slate-900 focus:border-green-500 focus:bg-white outline-none transition-all"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-400 uppercase">Password</label>
              {/* 🆕 FORGOT PASSWORD LINK */}
              {!isSignUp && (
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-[10px] font-black text-green-700 hover:underline uppercase"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 pr-12 rounded-xl bg-gray-50 border-2 border-gray-100 font-bold text-slate-900 focus:border-green-500 focus:bg-white outline-none transition-all"
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
            className="w-full bg-[#1E8449] text-white font-black py-4 rounded-xl shadow-lg shadow-green-200 hover:bg-[#145A32] transition-all active:scale-95 disabled:opacity-70 uppercase tracking-wide mt-2"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Secure Login')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 font-medium">
            {isSignUp ? 'Already have an account?' : 'New to Al Huzaifa?'}
            <button 
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
              className="ml-2 text-green-700 font-black hover:underline focus:outline-none"
            >
              {isSignUp ? 'Login here' : 'Create Account'}
            </button>
          </p>
        </div>
        
        <p className="text-[10px] text-gray-300 font-bold text-center mt-8 uppercase tracking-widest">
          Protected System • Authorized Personnel Only
        </p>

      </div>
    </div>
  );
}