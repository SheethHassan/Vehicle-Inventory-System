'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { TripSummary } from '@/types';

type Tab = 'out' | 'returned';

export default function TripsPage() {
  const [tab, setTab] = useState<Tab>('out');
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchTrips(status: Tab) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/trips?status=${status}`);
    if (!res.ok) {
      setError('Failed to load trips');
    } else {
      setTrips(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => { fetchTrips(tab); }, [tab]);

  function formatDate(d: string) {
    return new Date(d).toLocaleString();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
        <Link
          href="/trips/new"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Trip
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(['out', 'returned'] as Tab[]).map((t) => (
          <button
            key={t}
            id={`tab-${t}`}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'out' ? 'Currently Out' : 'History'}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-500">Loading trips…</p>}
      {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Vehicle', 'Departed', tab === 'returned' ? 'Returned' : 'Duration', 'Items', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trips.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    {tab === 'out' ? 'No trips currently out.' : 'No completed trips yet.'}
                  </td>
                </tr>
              )}
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 font-mono">{trip.vehicle?.registration}</div>
                    <div className="text-xs text-gray-400">{trip.vehicle?.type}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(trip.departed_at)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {tab === 'returned'
                      ? trip.returned_at ? formatDate(trip.returned_at) : '—'
                      : getDuration(trip.departed_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-sm">{trip.line_count} item{trip.line_count !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={trip.status} />
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <Link
                      href={`/trips/${trip.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View
                    </Link>
                    {trip.status === 'out' && (
                      <Link
                        href={`/trips/${trip.id}/return`}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Return
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'out') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        Out
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
      Returned
    </span>
  );
}

function getDuration(departedAt: string): string {
  const ms = Date.now() - new Date(departedAt).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
