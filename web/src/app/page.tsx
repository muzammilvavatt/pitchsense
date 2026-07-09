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
      {!alias ? (
        <AliasSetup onAliasSet={setAlias} />
      ) : (
        <>
          <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="bg-gradient-to-tr from-yellow-500 to-amber-300 p-2 rounded-xl shadow-lg shadow-yellow-600/20 group-hover:scale-105 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-light tracking-[0.2em] text-white uppercase drop-shadow-md">
                PITCH<span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-300">SENSE</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <HowItWorksModal />
            </div>
          </header>
          <Dashboard alias={alias} avatarUrl={avatarUrl} onLogout={handleLogout} />
        </>
      )}
    </main>
  );
}
