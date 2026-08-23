"use client";

import React, { useState, useEffect } from "react";
import {
  getSpreadsheetConfig,
  getUserSession,
  setUserSession,
} from "@/lib/storage";
import { RegionSelection, SpreadsheetConfig } from "@/types/resku";
import GoogleSheetModal from "@/components/GoogleSheetModal";
import RegencySpreadsheetListModal from "@/components/RegencySpreadsheetListModal";
import Link from "next/link";

interface HeaderProps {
  region?: RegionSelection;
}

export default function Header({ region }: HeaderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<SpreadsheetConfig>(
    getSpreadsheetConfig(region?.regencyCode),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  useEffect(() => {
    // Initial online status
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      const syncSession = () => setUser(getUserSession());
      const syncConfig = () =>
        setConfig(getSpreadsheetConfig(region?.regencyCode));

      syncSession();
      syncConfig();

      window.addEventListener("resku-session-updated", syncSession);
      window.addEventListener("resku-config-updated", syncConfig);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("resku-session-updated", syncSession);
        window.removeEventListener("resku-config-updated", syncConfig);
      };
    }
  }, [region?.regencyCode]);

  const handleLogout = async () => {
    try {
      const { signOut } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase");
      await signOut(auth);
    } catch (e) {
      console.error("SignOut error:", e);
    }
    setUserSession(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("resku-session-updated"));
      window.location.href = "/";
    }
  };

  return (
    <>
      <header className="bg-sky-900 text-white shadow-md border-b border-blue-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
                  ReskuData
                </h1>
              </div>
              <p className="text-[11px] text-blue-200/80 font-medium hidden sm:block">
                Sistem Pendataan Kebencanaan Terpadu
              </p>
            </div>
          </div>

          {/* Right Action Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Connection Indicator Pill */}

            {/* List All Regency Spreadsheets Button */}
            <button
              onClick={() => setIsListModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-800 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm px-3 py-2 rounded-lg shadow-sm border border-blue-600 transition-all active:scale-95"
              title="Lihat Daftar Spreadsheet Setiap Kabupaten"
            >
              <svg
                className="w-4 h-4 text-blue-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span className="hidden sm:inline font-semibold">
                List Spreadsheet
              </span>
            </button>

            {/* Google Spreadsheet CTA */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm px-3 py-2 rounded-lg shadow-sm border border-emerald-500 transition-all active:scale-95"
              title="Buka atau Hubungkan Google Spreadsheet"
            >
              {/* Google Sheets Icon */}
              <svg
                className="w-4 h-4 text-emerald-200"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
              </svg>
              <span className="hidden md:inline font-semibold">
                Akun Google
              </span>
              <span className="inline md:hidden font-semibold">Akun</span>
            </button>

            {/* Volunteer User Info */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-blue-800">
                <div className="text-right hidden lg:block">
                  <p className="text-xs font-bold leading-tight text-white">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-blue-200">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-blue-800 hover:bg-red-700 text-blue-200 hover:text-white p-2 rounded-lg transition-colors"
                  title="Keluar Akun"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
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
        region={region}
      />

      {/* List All Regency Spreadsheets Modal */}
      <RegencySpreadsheetListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
      />
    </>
  );
}
