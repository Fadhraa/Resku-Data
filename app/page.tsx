"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { getUserSession, setUserSession } from "@/lib/storage";

export default function LandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-redirect if user is already logged in
  useEffect(() => {
    // 1. Check local session
    const localSession = getUserSession();
    if (localSession?.isLoggedIn) {
      router.replace("/dashboard");
      return;
    }

    // 2. Check Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUserSession({
          name: firebaseUser.displayName || "Relawan Posko",
          email: firebaseUser.email || "",
          photoUrl: firebaseUser.photoURL || "",
        });
        router.replace("/dashboard");
      } else {
        setIsCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Login mulus 1-klik dengan Google Auth & Drive Scopes
      const { GoogleAuthProvider } = await import("firebase/auth");
      const { googleDriveProvider } = await import("@/lib/firebase");
      const result = await signInWithPopup(auth, googleDriveProvider);
      const user = result.user;

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const googleToken = credential?.accessToken;

      if (googleToken && typeof window !== "undefined") {
        localStorage.setItem("resku_google_access_token", googleToken);
      }

      // Simpan data sesi relawan ke storage lokal
      setUserSession({
        name: user.displayName || "Relawan Posko",
        email: user.email || "",
        photoUrl: user.photoURL || "",
      });

      // Redirect langsung ke dashboard pendataan
      router.replace("/dashboard");
    } catch (error: any) {
      console.error("Firebase Google Auth Error:", error);

      if (error?.code === "auth/popup-closed-by-user") {
        setErrorMessage("Login dibatalkan oleh pengguna.");
      } else if (error?.code === "auth/unauthorized-domain") {
        setErrorMessage(
          "Domain ini belum ditambahkan ke Authorized Domains di Firebase Console.",
        );
      } else {
        setErrorMessage(
          `Gagal login dengan akun Google: ${error?.message || "Terjadi kesalahan"}`,
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="w-8 h-8 animate-spin text-blue-600"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span className="text-xs font-semibold text-slate-500">
            Memeriksa Sesi Login...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Main Hero & Auth Section */}
      <main className="max-w-4xl mx-auto w-full px-4 py-12 my-auto text-center space-y-10">
        {/* Auth Card */}
        <div className="max-w-md mx-auto bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col gap-4">
          <span className="font-extrabold text-2xl tracking-wider text-sky-900 font-display">
            ReskuData
          </span>

          <div className="text-center space-y-1">
            <p className="text-xs text-slate-500">
              Silahkan masuk dengan akun google untuk membuat/mengakses
              spreadsheet pendataan
            </p>
          </div>

          {/* Error Alert if any */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-xl text-left">
              {errorMessage}
            </div>
          )}

          {/* Primary CTA: Clean Fast Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 px-5 rounded-xl border border-slate-400 hover:text-white hover:bg-slate-800 text-black font-extrabold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 animate-spin text-slate-700"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Proses Login...</span>
              </div>
            ) : (
              <>
                {/* Official Google Icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="font-extrabold">Masuk dengan Akun Google</span>
              </>
            )}
          </button>

          {/* Privacy Note */}
          <div className="pt-2 text-center border-t border-slate-100">
            <p className="text-[11px] text-slate-500 leading-normal">
              <strong>Catatan Privasi:</strong> Data formulir akan disinkronkan
              ke spreadsheet pendataan resmi.
            </p>
          </div>
          <span className="text-slate-400 text-xs">
            Developer: fadhradzaki.s@gmail.com
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full px-4 py-6 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        <p>
          © 2026 ReskuData — Platform Pendataan Bencana Kabupaten Manggarai
          Timur. Hak Cipta Dilindungi.
        </p>
      </footer>
    </div>
  );
}
