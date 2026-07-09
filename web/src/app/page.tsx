"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AliasSetup from "@/components/AliasSetup";
import Dashboard from "@/components/Dashboard";
import HowItWorksModal from "@/components/HowItWorksModal";

export default function Home() {
  const [alias, setAlias] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    // Check if the user already has an alias configured
    const storedAlias = localStorage.getItem("pitchsense_alias");
    if (storedAlias) {
      setAlias(storedAlias);
    }
    const avatarStr = localStorage.getItem("pitchsense_avatar_url");
    if (avatarStr) setAvatarUrl(avatarStr);
    
    // Listen for global avatar updates from the Profile page
    const handleAvatarUpdate = (e: any) => {
      setAvatarUrl(e.detail);
    };
    window.addEventListener("avatarUpdate", handleAvatarUpdate);
    
    setLoading(false);
    
    return () => window.removeEventListener("avatarUpdate", handleAvatarUpdate);
  }, []);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAlias(session.user.user_metadata?.alias || 'UnknownUser');
        setAvatarUrl(session.user.user_metadata?.avatar_url || null);
      }
      setLoading(false);
    });

    // Listen for ongoing auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAlias(session.user.user_metadata?.alias || 'UnknownUser');
        setAvatarUrl(session.user.user_metadata?.avatar_url || null);
      } else {
        setAlias(null);
        setAvatarUrl(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAlias(null);
    setAvatarUrl(null);
    localStorage.removeItem("pitchsense_alias");
    localStorage.removeItem("pitchsense_avatar_url");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {showAuth && !alias ? (
        <div className="relative">
          <button 
            onClick={() => setShowAuth(false)}
            className="absolute top-4 left-4 z-50 text-slate-400 hover:text-white flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700"
          >
            ← Back to App
          </button>
          <AliasSetup onAliasSet={(newAlias, newAvatar) => {
            setAlias(newAlias);
            if (newAvatar !== undefined) setAvatarUrl(newAvatar);
            setShowAuth(false);
          }} />
        </div>
      ) : (
        <>
          <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="bg-slate-800 p-2 rounded-xl shadow-lg border border-slate-700 group-hover:scale-105 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16l-4-3 1.5-5h5L16 13z" />
                  <path d="M8 13l-6 2" />
                  <path d="M16 13l6 2" />
                  <path d="M9.5 8L6 3" />
                  <path d="M14.5 8l3.5-5" />
                  <path d="M12 16v6" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white flex items-center gap-1">
                PitchSense<span className="text-emerald-500">.</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <HowItWorksModal />
            </div>
          </header>
          <Dashboard
            alias={alias || "Guest"}
            avatarUrl={avatarUrl}
            onLogout={handleLogout}
            isGuest={!alias}
            onLoginClick={() => setShowAuth(true)}
          />
        </>
      )}
    </main>
  );
}
