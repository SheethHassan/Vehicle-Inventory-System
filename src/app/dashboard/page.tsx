'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Item, TripSummary } from '@/types';

export default function DashboardPage() {
  const [tripsOut, setTripsOut] = useState<TripSummary[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/trips?status=out'), fetch('/api/items')])
      .then(async ([tripsRes, itemsRes]) => {
        if (!tripsRes.ok || !itemsRes.ok) throw new Error('Failed to load dashboard data');
        const trips: TripSummary[] = await tripsRes.json();
        const items: Item[] = await itemsRes.json();
        setTripsOut(trips);
        setLowStockItems(
          items.filter((item) => item.quantity_on_hand < item.reorder_threshold)
        );
      })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading dashboard…</p>;
  if (error) return <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trips currently out */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Trips Currently Out</h2>
            <Link href="/trips" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              View all →
            </Link>
          </div>
          <p className="text-4xl font-bold text-amber-600">{tripsOut.length}</p>
          <p className="text-sm text-gray-500 mt-1">
            {tripsOut.length === 1 ? 'vehicle is' : 'vehicles are'} currently on a trip
          </p>
          {tripsOut.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              {tripsOut.slice(0, 5).map((trip) => (
                <li key={trip.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono font-medium text-gray-800">
                    {trip.vehicle?.registration}
                  </span>
                  <Link
                    href={`/trips/${trip.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Needs restock */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Needs Restock</h2>
            <Link href="/items" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Manage items →
            </Link>
          </div>
          <p className="text-4xl font-bold text-red-600">{lowStockItems.length}</p>
          <p className="text-sm text-gray-500 mt-1">
            {lowStockItems.length === 1 ? 'item is' : 'items are'} below reorder threshold
          </p>
          {lowStockItems.length > 0 ? (
            <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              {lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800">{item.name}</span>
                  <span className="text-red-600 font-semibold">
                    {item.quantity_on_hand} / {item.reorder_threshold} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-green-600 border-t border-gray-100 pt-4">
              All items are adequately stocked.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/trips/new"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Trip
        </Link>
        <Link
          href="/items"
          className="px-4 py-2 rounded text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Manage Inventory
        </Link>
      </div>
    </div>
  );
}
