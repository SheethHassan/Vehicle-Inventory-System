'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import type { TripDetail } from '@/types';

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/trips/${id}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error('Trip not found');
        if (!res.ok) throw new Error('Failed to load trip');
        return res.json();
      })
      .then(setTrip)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-gray-500">Loading trip…</p>;
  if (error) return <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>;
  if (!trip) return null;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Trip — {trip.vehicle?.registration}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {trip.vehicle?.type} · Departed {new Date(trip.departed_at).toLocaleString()}
            {trip.returned_at && ` · Returned ${new Date(trip.returned_at).toLocaleString()}`}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <StatusBadge status={trip.status} />
          {trip.status === 'out' && (
            <Link
              href={`/trips/${trip.id}/return`}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Process Return
            </Link>
          )}
        </div>
      </div>

      {/* Lines table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Item', 'SKU', 'Taken', 'Returned', 'Used'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {trip.lines.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {line.item_name}
                  <span className="ml-1 text-xs text-gray-400">({line.item_unit})</span>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-gray-600">{line.item_sku}</td>
                <td className="px-4 py-3 text-gray-700">{line.qty_taken}</td>
                <td className="px-4 py-3 text-gray-700">{line.qty_returned}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${line.qty_used > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {line.qty_used}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Link href="/trips" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to Trips
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'out') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        Currently Out
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-200">
      Returned
    </span>
  );
}
