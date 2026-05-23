"use client";

import { useEffect, useState, useCallback } from "react";
import { use } from "react";

type ReservationDetails = {
  id: string;
  status: string;
  quantity: number;
  expiresAt: string;
  product: { name: string; description: string };
  warehouse: { name: string; location: string };
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ProductIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  const emoji = n.includes("iphone") ? "📱" : n.includes("macbook") ? "💻" : n.includes("ipad") ? "📲" : "📦";
  return <span className="text-4xl">{emoji}</span>;
}

export default function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"pending" | "confirmed" | "released" | "expired">("pending");

  useEffect(() => {
    async function fetchReservation() {
      try {
        const res = await fetch(`/api/reservations/${id}`);
        if (!res.ok) { setError("Reservation not found."); setLoading(false); return; }
        const data: ReservationDetails = await res.json();
        setReservation(data);
        const secondsLeft = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
        setTimeLeft(secondsLeft);
        if (data.status === "CONFIRMED") setStatus("confirmed");
        else if (data.status === "RELEASED") setStatus("released");
        else if (secondsLeft === 0) setStatus("expired");
        else setStatus("pending");
      } catch { setError("Failed to load reservation."); }
      finally { setLoading(false); }
    }
    fetchReservation();
  }, [id]);

  useEffect(() => {
    if (status !== "pending") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); setStatus("expired"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const confirmReservation = useCallback(async () => {
    setActionLoading(true); setError("");
    const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) { if (res.status === 410) setStatus("expired"); setError(data.error); return; }
    setStatus("confirmed");
  }, [id]);

  const releaseReservation = useCallback(async () => {
    setActionLoading(true); setError("");
    const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setStatus("released");
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500">Loading reservation...</p>
      </div>
    </div>
  );

  if (status === "confirmed") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-500 mb-2">
          Your purchase of <span className="font-semibold text-gray-800">{reservation?.product.name}</span> is confirmed.
        </p>
        <p className="text-sm text-gray-400 mb-8">Dispatching from {reservation?.warehouse.name}</p>
        <a href="/" className="inline-block bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-700 transition">
          Back to Store
        </a>
      </div>
    </div>
  );

  if (status === "released") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">↩️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reservation Cancelled</h1>
        <p className="text-gray-500 mb-8">
          Your hold on <span className="font-semibold text-gray-800">{reservation?.product.name}</span> has been released. The stock is available again.
        </p>
        <a href="/" className="inline-block bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-700 transition">
          Back to Store
        </a>
      </div>
    </div>
  );

  if (status === "expired") return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⏰</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Hold Expired</h1>
        <p className="text-gray-500 mb-8">
          Your 10-minute hold on <span className="font-semibold text-gray-800">{reservation?.product.name}</span> has expired. The stock is available again.
        </p>
        <a href="/" className="inline-block bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-700 transition">
          Try Again
        </a>
      </div>
    </div>
  );

  const urgency = timeLeft < 60;
  const pct = (timeLeft / 600) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-gray-700 transition text-sm">← Back</a>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">Checkout</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Product summary */}
          <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              {reservation && <ProductIcon name={reservation.product.name} />}
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Reserving</p>
              <p className="font-bold text-gray-900 text-lg">{reservation?.product.name}</p>
              <p className="text-sm text-gray-400">{reservation?.product.description}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Qty</p>
              <p className="font-bold text-gray-900 text-xl">{reservation?.quantity}</p>
            </div>
          </div>

          {/* Warehouse */}
          <div className="px-8 py-4 border-b border-gray-100 flex items-center gap-3">
            <span className="text-lg">🏭</span>
            <div>
              <p className="text-xs text-gray-400">Dispatching from</p>
              <p className="text-sm font-medium text-gray-700">{reservation?.warehouse.name}</p>
            </div>
          </div>

          {/* Timer */}
          <div className={`px-8 py-6 border-b border-gray-100 ${urgency ? "bg-red-50" : "bg-blue-50"}`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-sm font-medium ${urgency ? "text-red-600" : "text-blue-600"}`}>
                {urgency ? "⚠ Expiring soon!" : "⏱ Time remaining"}
              </p>
              <p className={`text-3xl font-mono font-bold ${urgency ? "text-red-700" : "text-blue-700"}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-1000 ${urgency ? "bg-red-500" : "bg-blue-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-8 mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-600 text-sm font-medium">⚠ {error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="px-8 py-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={confirmReservation}
              disabled={actionLoading}
              className="flex-1 bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 disabled:cursor-wait active:scale-95"
            >
              {actionLoading ? "Processing..." : "✓ Confirm Purchase"}
            </button>
            <button
              onClick={releaseReservation}
              disabled={actionLoading}
              className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold py-3 rounded-xl transition disabled:opacity-60 disabled:cursor-wait active:scale-95"
            >
              Cancel
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 pb-6">
            Your hold expires at {reservation ? new Date(reservation.expiresAt).toLocaleTimeString() : ""}
          </p>
        </div>
      </div>
    </div>
  );
}