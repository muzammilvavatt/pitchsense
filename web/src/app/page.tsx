"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import AliasSetup from "@/components/AliasSetup";
import Dashboard from "@/components/Dashboard";
import HowItWorksModal from "@/components/HowItWorksModal";

export default function Home() {
  const [alias, setAlias] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAlias(session.user.user_metadata?.alias || 'UnknownUser');
      }
      setLoading(false);
    });

    // Listen for ongoing auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAlias(session.user.user_metadata?.alias || 'UnknownUser');
      } else {
        setAlias(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAlias(null);
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
            <div>
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 uppercase drop-shadow-sm">
                PitchSense
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <HowItWorksModal />
            </div>
          </header>
          <Dashboard alias={alias} onLogout={handleLogout} />
        </>
      )}
    </main>
  );
}
