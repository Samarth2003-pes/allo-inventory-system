"use client";

import { useEffect, useState } from "react";

export default function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {

    const interval = setInterval(() => {

      setTimeLeft((prev) => {

        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });

    }, 1000);

    return () => clearInterval(interval);

  }, []);

  async function confirmReservation() {

    const resolvedParams = await params;

    const res = await fetch(
      `/api/reservations/${resolvedParams.id}/confirm`,
      {
        method: "POST",
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    alert("Reservation confirmed!");
    window.location.href = "/";
  }

  async function releaseReservation() {

    const resolvedParams = await params;

    const res = await fetch(
      `/api/reservations/${resolvedParams.id}/release`,
      {
        method: "POST",
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    alert("Reservation cancelled!");
    window.location.href = "/";
  }

  return (
    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Reservation Checkout
      </h1>

      <p className="text-xl mb-6">
        Time Left:
        {" "}
        {timeLeft}
        {" "}
        seconds
      </p>

      <div className="flex gap-4">

        <button
          onClick={confirmReservation}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Confirm Purchase
        </button>

        <button
          onClick={releaseReservation}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Cancel Reservation
        </button>

      </div>

    </div>
  );
}