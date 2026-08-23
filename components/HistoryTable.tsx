'use client';

import React, { useState, useEffect } from 'react';
import { LogEntry } from '@/types/resku';
import { getLogs } from '@/lib/storage';
import { syncAllPendingEntries, syncEntryToGoogleSheets } from '@/lib/google-sheets';

export default function HistoryTable() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refreshLogs = () => {
    setLogs(getLogs().slice(0, 5));
  };

  useEffect(() => {
    refreshLogs();
    window.addEventListener('resku-storage-updated', refreshLogs);
    return () => {
      window.removeEventListener('resku-storage-updated', refreshLogs);
    };
  }, []);

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    setSyncFeedback(null);
    const result = await syncAllPendingEntries();
    setIsSyncingAll(false);
    refreshLogs();

    if (result.syncedCount > 0) {
      setSyncFeedback(`Berhasil menyinkronkan ${result.syncedCount} data offline ke Google Sheet!`);
    } else {
      setSyncFeedback('Semua data sudah tersinkronisasi.');
    }

    setTimeout(() => setSyncFeedback(null), 3500);
  };

  const handleRetrySingle = async (item: LogEntry) => {
    await syncEntryToGoogleSheets(item);
    refreshLogs();
  };

  const pendingCount = logs.filter((l) => l.status === 'PENDING_OFFLINE' || l.status === 'ERROR').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base font-display">
              Riwayat Input Terakhir Sesi Ini
            </h3>
            <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-slate-200">
              {logs.length} Entri
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Status sinkronisasi real-time ke Google Spreadsheet
          </p>
        </div>

        {/* Sync Action Button */}
        <button
          onClick={handleSyncAll}
          disabled={isSyncingAll}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${
            pendingCount > 0
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm animate-pulse'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
          }`}
        >
          {isSyncingAll ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Menyinkronkan...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{pendingCount > 0 ? `Sinkronkan (${pendingCount} Offline)` : 'Cek Sync Ulang'}</span>
            </>
          )}
        </button>
      </div>

      {syncFeedback && (
        <div className="bg-blue-600 text-white text-xs font-bold p-2.5 rounded-lg text-center animate-slide-up">
          {syncFeedback}
        </div>
      )}

      {/* Table List */}
      {logs.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          Belum ada entri data yang diinput pada sesi ini.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-x-auto">
          {logs.map((item) => (
            <div key={item.id} className="py-3 group transition-colors">
              <div className="flex items-center justify-between gap-3">
                
                {/* Left Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                        item.type === 'HOUSING_CASUALTY'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {item.type === 'HOUSING_CASUALTY' ? 'Sheet 1 (Permukiman)' : 'Sheet 2 (Fasilitas)'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-600 truncate mt-0.5">
                    {item.subtitle} • <span className="text-slate-500">{item.regionSummary}</span>
                  </p>
                </div>

                {/* Right Status Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'SYNCED' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="hidden sm:inline">Tersimpan ke Sheet</span>
                      <span className="inline sm:hidden">Sheet OK</span>
                    </span>
                  )}

                  {item.status === 'PENDING_OFFLINE' && (
                    <button
                      onClick={() => handleRetrySingle(item)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300 transition-colors"
                      title="Klik untuk mencoba mengunggah data ini ke Google Sheets"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      <span>Pending Sync</span>
                    </button>
                  )}

                  {item.status === 'SYNCING' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                      <svg className="w-3 h-3 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Syncing...</span>
                    </span>
                  )}

                  {item.status === 'ERROR' && (
                    <button
                      onClick={() => handleRetrySingle(item)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-full border border-red-300 transition-colors"
                    >
                      <span>Retry</span>
                    </button>
                  )}

                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

              </div>

              {/* Expanded JSON Inspector */}
              {expandedId === item.id && (
                <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto animate-slide-up">
                  <pre>{JSON.stringify(item.payload, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
