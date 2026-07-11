'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';
import type { TripDetail, TripLineDetail } from '@/types';

interface ReturnFormLine extends TripLineDetail {
  newQtyReturned: number; // the amount being returned in THIS submission
  inputError?: string;
}

export default function ReturnTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [formLines, setFormLines] = useState<ReturnFormLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/trips/${id}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error('Trip not found');
        if (!res.ok) throw new Error('Failed to load trip');
        return res.json() as Promise<TripDetail>;
      })
      .then((data) => {
        setTrip(data);
        // Initialize form: default newQtyReturned to 0 for all lines
        setFormLines(
          data.lines.map((l) => ({ ...l, newQtyReturned: 0 }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function updateQty(itemId: string, value: number) {
    setFormLines((prev) =>
      prev.map((l) =>
        l.item_id === itemId
          ? { ...l, newQtyReturned: value, inputError: undefined }
          : l
      )
    );
  }

  function validate(): boolean {
    let valid = true;
    setFormLines((prev) =>
      prev.map((l) => {
        const maxCanReturn = l.qty_taken - l.qty_returned;
        if (l.newQtyReturned < 0) {
          valid = false;
          return { ...l, inputError: 'Cannot be negative' };
        }
        if (l.newQtyReturned > maxCanReturn) {
          valid = false;
          return { ...l, inputError: `Max returnable: ${maxCanReturn}` };
        }
        return l;
      })
    );
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      setSubmitError('Fix errors below before submitting');
      return;
    }

    setSubmitting(true);

    const res = await fetch(`/api/trips/${id}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: formLines.map((l) => ({
          item_id: l.item_id,
          qty_returned: l.newQtyReturned,
        })),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(data.error ?? 'Failed to process return');
      return;
    }

    router.push(`/trips/${id}`);
  }

  if (loading) return <p className="text-gray-500">Loading trip…</p>;
  if (error) return <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>;
  if (!trip) return null;

  if (trip.status === 'returned') {
    return (
      <div className="max-w-2xl">
        <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          This trip has already been fully returned.
        </p>
        <Link href={`/trips/${id}`} className="mt-4 inline-block text-blue-600 hover:text-blue-800 text-sm">
          ← View Trip
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Return — {trip.vehicle?.registration}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Departed {new Date(trip.departed_at).toLocaleString()} · Partial returns are allowed.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Taken</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Already Returned</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Returning Now</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Used (computed)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {formLines.map((line) => {
                const alreadyReturned = line.qty_returned;
                const maxCanReturn = line.qty_taken - alreadyReturned;
                // Live-computed qty_used = qty_taken - alreadyReturned - newQtyReturned
                const liveUsed = line.qty_taken - alreadyReturned - line.newQtyReturned;

                return (
                  <tr key={line.item_id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{line.item_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{line.item_sku} · {line.item_unit}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{line.qty_taken}</td>
                    <td className="px-4 py-3 text-gray-500">{alreadyReturned}</td>
                    <td className="px-4 py-3">
                      <input
                        id={`return-qty-${line.item_id}`}
                        type="number"
                        min={0}
                        max={maxCanReturn}
                        value={line.newQtyReturned}
                        onChange={(e) => updateQty(line.item_id, Number(e.target.value))}
                        className={`w-20 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          line.inputError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {line.inputError && (
                        <p className="text-xs text-red-600 mt-1">{line.inputError}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${liveUsed > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {liveUsed < 0 ? '—' : liveUsed}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 mb-4">
            {submitError}
          </p>
        )}

        <div className="flex gap-3">
          <Link
            href={`/trips/${id}`}
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            id="btn-submit-return"
            type="submit"
            disabled={submitting}
            className="px-6 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {submitting ? 'Processing…' : 'Submit Return'}
          </button>
        </div>
      </form>
    </div>
  );
}
