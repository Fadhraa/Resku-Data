'use client';

import React, { useState, useEffect } from 'react';
import { getSpreadsheetConfig, getUserSession, setUserSession } from '@/lib/storage';
import { SpreadsheetConfig } from '@/types/resku';
import GoogleSheetModal from '@/components/GoogleSheetModal';
import Link from 'next/link';

export default function Header() {
  const [isOnline, setIsOnline] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<SpreadsheetConfig>(getSpreadsheetConfig());
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Initial online status
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      const syncSession = () => setUser(getUserSession());
      const syncConfig = () => setConfig(getSpreadsheetConfig());

      syncSession();
      syncConfig();

      window.addEventListener('resku-session-updated', syncSession);
      window.addEventListener('resku-config-updated', syncConfig);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('resku-session-updated', syncSession);
        window.removeEventListener('resku-config-updated', syncConfig);
      };
    }
  }, []);

  const handleLogout = () => {
    setUserSession(null);
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-blue-900 text-white shadow-md border-b border-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 border border-blue-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white font-display">ReskuData</span>
                <span className="bg-blue-800 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-700">
                  MATIM 2026
                </span>
              </div>
              <p className="text-[11px] text-blue-200 hidden sm:block">Pendataan Bencana Terintegrasi Google Spreadsheet</p>
            </div>
          </Link>

          {/* Right Actions & User */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Connection Status Pill */}
            <div
              className={`hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isOnline
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                  : 'bg-amber-950/80 text-amber-300 border-amber-600/80 animate-pulse'
              }`}
              title={isOnline ? 'Terhubung ke server & Google Sheets' : 'Bekerja Offline (Data disimpan secara lokal)'}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE QUEUE'}</span>
            </div>

            {/* Google Spreadsheet CTA */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm px-3 py-2 rounded-lg shadow-sm border border-emerald-500 transition-all active:scale-95"
              title="Buka atau Hubungkan Google Spreadsheet"
            >
              {/* Google Sheets Icon */}
              <svg className="w-4 h-4 text-emerald-200" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
              </svg>
              <span className="hidden md:inline font-semibold">Buka Spreadsheet Saya</span>
              <span className="inline md:hidden font-semibold">Sheet</span>
            </button>

            {/* Volunteer User Info */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-blue-800">
                <div className="text-right hidden lg:block">
                  <p className="text-xs font-bold leading-tight text-white">{user.name}</p>
                  <p className="text-[10px] text-blue-200">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-blue-800 hover:bg-red-700 text-blue-200 hover:text-white p-2 rounded-lg transition-colors"
                  title="Keluar Akun"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : null}

          </div>
        </div>
      </header>

      {/* Spreadsheet Modal */}
      <GoogleSheetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={config}
      />
    </>
  );
}
