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

  if (loading) {
    return (
      <p style={{ color: 'var(--color-text-muted)' }}>Loading dashboard…</p>
    );
  }

  if (error) {
    return (
      <p
        style={{
          color: 'var(--color-danger)',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
        }}
      >
        {error}
      </p>
    );
  }

  return (
    <div>
      <h1
        className="text-2xl font-bold mb-6"
        style={{ color: 'var(--color-text-base)' }}
      >
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Trips currently out */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-base)' }}>
              Trips Currently Out
            </h2>
            <Link
              href="/trips"
              className="text-sm font-medium"
              style={{ color: 'var(--color-accent)' }}
            >
              View all →
            </Link>
          </div>
          <p className="text-4xl font-bold" style={{ color: 'var(--color-warning)' }}>
            {tripsOut.length}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {tripsOut.length === 1 ? 'vehicle is' : 'vehicles are'} currently on a trip
          </p>
          {tripsOut.length > 0 && (
            <ul
              className="mt-4 space-y-2 pt-4"
              style={{ borderTop: '1px solid var(--color-card-border)' }}
            >
              {tripsOut.slice(0, 5).map((trip) => (
                <li key={trip.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono font-medium" style={{ color: 'var(--color-text-base)' }}>
                    {trip.vehicle?.registration}
                  </span>
                  <Link
                    href={`/trips/${trip.id}`}
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Needs restock */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-base)' }}>
              Needs Restock
            </h2>
            <Link
              href="/items"
              className="text-sm font-medium"
              style={{ color: 'var(--color-accent)' }}
            >
              Manage items 
            </Link>
          </div>
          <p className="text-4xl font-bold" style={{ color: 'var(--color-danger)' }}>
            {lowStockItems.length}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {lowStockItems.length === 1 ? 'item is' : 'items are'} below reorder threshold
          </p>
          {lowStockItems.length > 0 ? (
            <ul
              className="mt-4 space-y-2 pt-4"
              style={{ borderTop: '1px solid var(--color-card-border)' }}
            >
              {lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium" style={{ color: 'var(--color-text-base)' }}>
                    {item.name}
                  </span>
                  <span className="font-semibold" style={{ color: 'var(--color-danger)' }}>
                    {item.quantity_on_hand} / {item.reorder_threshold} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p
              className="mt-4 text-sm pt-4"
              style={{ borderTop: '1px solid var(--color-card-border)', color: 'var(--color-success)' }}
            >
              All items are adequately stocked.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/trips/new" className="btn-primary">
           New Trip
        </Link>
        <Link href="/items" className="btn-outline">
          Manage Inventory
        </Link>
      </div>
    </div>
  );
}
