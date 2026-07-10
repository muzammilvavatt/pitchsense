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
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:0ms]"></div>
          <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:150ms]"></div>
          <div className="w-2 h-2 rounded-full bg-[#AEFC00] animate-bounce [animation-delay:300ms]"></div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen max-w-[1600px] mx-auto">
      {showAuth && !alias ? (
        <div className="relative p-4 md:p-8">
          <button 
            onClick={() => setShowAuth(false)}
            className="mb-6 btn-ghost px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
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
          <header className="hidden md:flex items-center justify-between px-8 py-6 border-b border-[var(--border-subtle)] sticky top-0 z-50 bg-[var(--bg-base)]/80 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#AEFC00] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16l-4-3 1.5-5h5L16 13z" />
                  <path d="M8 13l-6 2" />
                  <path d="M16 13l6 2" />
                  <path d="M9.5 8L6 3" />
                  <path d="M14.5 8l3.5-5" />
                  <path d="M12 16v6" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">PitchSense</span>
              <span className="lime-badge ml-1">BETA</span>
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
