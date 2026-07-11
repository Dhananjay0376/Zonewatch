/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Mail, Lock, Shield, Eye, EyeOff } from 'lucide-react';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('auth/invalid-credential') || message.includes('auth/user-not-found') || message.includes('auth/wrong-password')) {
        setError('Invalid email or password. Please try again.');
      } else if (message.includes('auth/email-already-in-use')) {
        setError('An account with this email address already exists.');
      } else if (message.includes('auth/weak-password')) {
        setError('Password must be at least 6 characters long.');
      } else if (message.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError('An authentication error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('auth/popup-closed-by-user')) {
        setError('Failed to authenticate with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pitch-dark text-pale-mint flex items-center justify-center p-4 relative overflow-hidden font-display">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-moss-dark/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-emerald-950/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Glassmorphic Login Container */}
      <div className="w-full max-w-md bg-pitch-black/60 border border-moss-dark/60 rounded-2xl p-8 backdrop-blur-md relative z-10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-moss-deep/40 rounded-xl border border-moss-dark/50 mb-3 shadow-[0_0_15px_rgba(55,85,52,0.4)]">
            <Shield className="w-8 h-8 text-pale-mint" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-pale-mint">🏟️ ZoneWatch</h1>
          <p className="text-xs text-sage-soft font-mono uppercase tracking-[0.15em] mt-1">Volunteer Copilot &bull; FIFA 2026</p>
        </div>

        {/* Auth Error Banner */}
        {error && (
          <div 
            className="mb-5 p-3.5 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-mono leading-relaxed"
            role="alert"
          >
            <span className="font-bold text-rose-400">Error:</span> {error}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email field */}
          <div className="space-y-1.5">
            <label htmlFor="email-input" className="text-[10px] font-mono uppercase tracking-wider text-sage-soft">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sage-soft">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="volunteer@stadium.fifa.com"
                className="w-full bg-pitch-dark border border-moss-dark/50 rounded-lg py-2.5 pl-10 pr-4 text-sm text-pale-mint placeholder-moss-dark focus:outline-none focus:border-pale-mint transition-colors font-sans"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label htmlFor="password-input" className="text-[10px] font-mono uppercase tracking-wider text-sage-soft">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sage-soft">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-pitch-dark border border-moss-dark/50 rounded-lg py-2.5 pl-10 pr-10 text-sm text-pale-mint placeholder-moss-dark focus:outline-none focus:border-pale-mint transition-colors font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sage-soft hover:text-pale-mint cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-lg bg-pale-mint text-pitch-dark font-extrabold text-xs uppercase tracking-widest hover:bg-pale-mint/85 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(227,238,212,0.25)]"
          >
            {loading ? "AUTHENTICATING..." : isSignUp ? "Create Account" : "Access Dashboard"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-moss-dark/30" />
          </div>
          <span className="relative px-3 bg-pitch-black text-[9px] font-mono text-sage-soft uppercase">
            Or continue with
          </span>
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-moss-deep border border-moss-dark text-pale-mint font-bold text-xs uppercase tracking-wider hover:bg-moss-dark transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {/* Custom Google Icon SVG */}
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12.24 10.285V13.4h6.887c-.648 2.41-2.519 4.167-5.236 4.167-3.43 0-6.21-2.78-6.21-6.21s2.78-6.21 6.21-6.21c1.5 0 2.85.54 3.9 1.425l2.62-2.62C18.6 2.505 15.585 1.5 12.24 1.5 6.645 1.5 2.1 6.045 2.1 11.64s4.545 10.14 10.14 10.14c5.79 0 10.14-4.065 10.14-10.14 0-.69-.075-1.35-.225-1.95H12.24z" />
          </svg>
          Google Identity
        </button>

        {/* Switch Sign-in/Sign-up Mode */}
        <div className="mt-6 text-center text-xs font-mono text-sage-soft">
          <span>
            {isSignUp ? "Already registered?" : "New stadium volunteer?"}
          </span>{" "}
          <button
            onClick={() => {
              setIsSignUp(prev => !prev);
              setError(null);
            }}
            className="text-pale-mint hover:underline font-bold focus:outline-none cursor-pointer"
          >
            {isSignUp ? "Access Dashboard" : "Register Account"}
          </button>
        </div>

      </div>
    </div>
  );
}
