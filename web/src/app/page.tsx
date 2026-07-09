"use client";

import { useState, useEffect } from "react";
import AliasSetup from "@/components/AliasSetup";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [alias, setAlias] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if alias is stored in local storage
    const storedAlias = localStorage.getItem("pitchsense_alias");
    if (storedAlias) {
      setAlias(storedAlias);
    }
    setLoading(false);
  }, []);

  const handleSetAlias = (newAlias: string) => {
    localStorage.setItem("pitchsense_alias", newAlias);
    setAlias(newAlias);
  };

  const handleLogout = () => {
    localStorage.removeItem("pitchsense_alias");
    setAlias(null);
  };

  if (loading) return null; // Or a sleek loader

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {!alias ? (
        <AliasSetup onSetAlias={handleSetAlias} />
      ) : (
        <Dashboard alias={alias} onLogout={handleLogout} />
      )}
    </main>
  );
}
