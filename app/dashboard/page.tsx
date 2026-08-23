'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import RegionSelector from '@/components/RegionSelector';
import FormHousing from '@/components/FormHousing';
import FormFacility from '@/components/FormFacility';
import HistoryTable from '@/components/HistoryTable';
import { RegionSelection } from '@/types/resku';

export default function DashboardPage() {
  // Global Regional Context State (Default: Manggarai Timur, NTT -> Borong -> Rana Loba)
  const [region, setRegion] = useState<RegionSelection>({
    provinceCode: '53',
    provinceName: 'NUSA TENGGARA TIMUR',
    regencyCode: '5319',
    regencyName: 'KABUPATEN MANGGARAI TIMUR',
    districtCode: '531901',
    districtName: 'BORONG',
    villageCode: '5319011001',
    villageName: 'RANA LOBA',
    isManual: false,
  });

  // Active Tab Control: 'HOUSING' | 'FACILITY'
  const [activeTab, setActiveTab] = useState<'HOUSING' | 'FACILITY'>('HOUSING');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 flex flex-col font-sans">
      
      {/* A. Sticky Top Bar & User Info */}
      <Header />

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 space-y-5">
        
        {/* B. Global Context Selector (Header Form) */}
        <section className="animate-slide-up">
          <RegionSelector value={region} onChange={setRegion} />
        </section>

        {/* C. Form Switcher (Segmented Tab Control) */}
        <section className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 gap-1">
          
          <button
            type="button"
            onClick={() => setActiveTab('HOUSING')}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'HOUSING'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Permukiman & Jiwa</span>
            <span className="hidden sm:inline text-[10px] opacity-80 font-normal">(Sheet 1)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FACILITY')}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'FACILITY'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Fasilitas Umum</span>
            <span className="hidden sm:inline text-[10px] opacity-80 font-normal">(Sheet 2)</span>
          </button>

        </section>

        {/* D & E. Active Form Module */}
        <section className="animate-slide-up">
          {activeTab === 'HOUSING' ? (
            <FormHousing region={region} onSuccess={handleFormSuccess} />
          ) : (
            <FormFacility region={region} onSuccess={handleFormSuccess} />
          )}
        </section>

        {/* F. Section Riwayat & Feedback Cepat (Bottom Card) */}
        <section className="animate-slide-up pt-2">
          <HistoryTable key={refreshTrigger} />
        </section>

      </main>

      {/* Footer info */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ReskuData (Matim 2026 Edition) • Format Resmi BPBD</span>
          <span className="text-[11px] text-slate-400">Offline-First Synchronizer Active</span>
        </div>
      </footer>

    </div>
  );
}
