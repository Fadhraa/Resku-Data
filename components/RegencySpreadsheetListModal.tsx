"use client";

import React, { useEffect, useState } from "react";
import { RegencySpreadsheetItem } from "@/types/resku";
import { getAllRegencySpreadsheets } from "@/lib/storage";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegencySpreadsheetListModal({ isOpen, onClose }: Props) {
  const [items, setItems] = useState<RegencySpreadsheetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSpreadsheets = async () => {
      setIsLoading(true);

      // 1. Get from local storage cache first
      const localItems = getAllRegencySpreadsheets();
      let combinedMap = new Map<string, RegencySpreadsheetItem>();
      localItems.forEach((item) => combinedMap.set(item.regencyCode, item));

      // 2. Fetch from Firestore for cross-device sync
      try {
        const querySnapshot = await getDocs(collection(db, "regency_spreadsheets"));
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as RegencySpreadsheetItem;
          if (data && data.regencyCode) {
            combinedMap.set(data.regencyCode, data);
          }
        });
      } catch (err: any) {
        // Fall back quietly to local storage items if Firestore security rules block unauthenticated reads
        if (process.env.NODE_ENV === "development") {
          console.info("Firestore fallback to local storage:", err?.message || err);
        }
      }

      setItems(Array.from(combinedMap.values()));
      setIsLoading(false);
    };

    fetchSpreadsheets();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Daftar Spreadsheet Kabupaten</h2>
              <p className="text-xs text-blue-100">Buka langsung file Google Spreadsheet tiap wilayah</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <svg className="w-6 h-6 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-xs font-medium">Memuat spreadsheet...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                📊
              </div>
              <p className="text-xs font-semibold text-slate-700">Belum ada spreadsheet kabupaten yang dibuat.</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Spreadsheet baru akan otomatis dibuat di Google Drive saat Anda memilih nama Kabupaten dan mengirimkan form.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.regencyCode}
                className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800">
                      {item.regencyCode}
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 leading-snug">
                      ReskuData - {item.regencyName}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Akun: <span className="font-medium text-slate-700">{item.userEmail || "Google Drive"}</span>
                  </p>
                </div>

                <a
                  href={item.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Buka di Tab Baru
                </a>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
