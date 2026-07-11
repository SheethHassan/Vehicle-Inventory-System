'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Item, Vehicle, CreateTripLineInput } from '@/types';

interface TripLine extends CreateTripLineInput {
  localId: number; // client-only key for React list rendering
  stockError?: string;
}

let lineCounter = 0;
function newLine(): TripLine {
  return { localId: ++lineCounter, item_id: '', qty_taken: 1 };
}

export default function NewTripPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState('');
  const [lines, setLines] = useState<TripLine[]>([newLine()]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Item search state per line
  const [searches, setSearches] = useState<Record<number, string>>({});
  const [dropdownOpen, setDropdownOpen] = useState<Record<number, boolean>>({});

  useEffect(() => {
    Promise.all([fetch('/api/vehicles'), fetch('/api/items')])
      .then(async ([vRes, iRes]) => {
        if (!vRes.ok || !iRes.ok) throw new Error('Failed to load data');
        setVehicles(await vRes.json());
        setItems(await iRes.json());
      })
      .catch(() => setFetchError('Failed to load vehicles and items'))
      .finally(() => setLoadingData(false));
  }, []);

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(localId: number) {
    setLines((prev) => prev.filter((l) => l.localId !== localId));
    setSearches((prev) => { const s = { ...prev }; delete s[localId]; return s; });
    setDropdownOpen((prev) => { const d = { ...prev }; delete d[localId]; return d; });
  }

  function updateLine(localId: number, patch: Partial<TripLine>) {
    setLines((prev) =>
      prev.map((l) => (l.localId === localId ? { ...l, ...patch, stockError: undefined } : l))
    );
  }

  function selectItem(localId: number, item: Item) {
    updateLine(localId, { item_id: item.id });
    setSearches((prev) => ({ ...prev, [localId]: item.name }));
    setDropdownOpen((prev) => ({ ...prev, [localId]: false }));
  }

  const getFilteredItems = useCallback(
    (localId: number) => {
      const q = (searches[localId] ?? '').toLowerCase();
      if (!q) return items;
      return items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q)
      );
    },
    [searches, items]
  );

  function getItem(id: string) {
    return items.find((i) => i.id === id);
  }

  // Client-side stock validation (mirrors server-side check)
  function validateLines(): boolean {
    let valid = true;
    setLines((prev) =>
      prev.map((l) => {
        const item = getItem(l.item_id);
        if (item && l.qty_taken > item.quantity_on_hand) {
          valid = false;
          return {
            ...l,
            stockError: `Only ${item.quantity_on_hand} ${item.unit} available`,
          };
        }
        return l;
      })
    );
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!vehicleId) {
      setSubmitError('Please select a vehicle');
      return;
    }
    if (lines.some((l) => !l.item_id)) {
      setSubmitError('Please select an item for every line');
      return;
    }

    // Client-side validation before hitting the server
    if (!validateLines()) {
      setSubmitError('One or more items exceed available stock — see errors below');
      return;
    }

    setSubmitting(true);

    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: vehicleId,
        lines: lines.map(({ item_id, qty_taken }) => ({ item_id, qty_taken })),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(data.error ?? 'Failed to create trip');
      return;
    }

    router.push('/trips');
  }

  if (loadingData) return <p className="text-gray-500">Loading…</p>;
  if (fetchError) return <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3">{fetchError}</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Trip</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <label htmlFor="select-vehicle" className="block text-sm font-semibold text-gray-700 mb-2">
            Vehicle
          </label>
          <select
            id="select-vehicle"
            required
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a vehicle…</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration} ({v.type})
              </option>
            ))}
          </select>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-700">Items to Load</h2>
            <button
              type="button"
              onClick={addLine}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + Add row
            </button>
          </div>

          {lines.map((line, idx) => {
            const selectedItem = getItem(line.item_id);
            const filtered = getFilteredItems(line.localId);
            return (
              <div key={line.localId} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <div className="flex gap-2 items-start">
                  {/* Item search */}
                  <div className="flex-1 relative">
                    <label className="block text-xs text-gray-500 mb-1">Item #{idx + 1}</label>
                    <input
                      id={`item-search-${line.localId}`}
                      type="text"
                      placeholder="Search by name or SKU…"
                      value={searches[line.localId] ?? ''}
                      onChange={(e) => {
                        setSearches((prev) => ({ ...prev, [line.localId]: e.target.value }));
                        setDropdownOpen((prev) => ({ ...prev, [line.localId]: true }));
                        if (!e.target.value) updateLine(line.localId, { item_id: '' });
                      }}
                      onFocus={() => setDropdownOpen((prev) => ({ ...prev, [line.localId]: true }))}
                      onBlur={() => setTimeout(() => setDropdownOpen((prev) => ({ ...prev, [line.localId]: false })), 150)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {dropdownOpen[line.localId] && filtered.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
                        {filtered.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex justify-between"
                              onMouseDown={() => selectItem(line.localId, item)}
                            >
                              <span>{item.name}</span>
                              <span className="text-xs text-gray-400 ml-2">
                                {item.sku} · {item.quantity_on_hand} {item.unit} avail.
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {selectedItem && (
                      <p className="text-xs text-gray-500 mt-1">
                        Stock: <span className="font-semibold">{selectedItem.quantity_on_hand} {selectedItem.unit}</span>
                      </p>
                    )}
                    {line.stockError && (
                      <p className="text-xs text-red-600 mt-1">⚠ {line.stockError}</p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="w-28">
                    <label className="block text-xs text-gray-500 mb-1">Qty</label>
                    <input
                      id={`line-qty-${line.localId}`}
                      type="number"
                      min={1}
                      value={line.qty_taken}
                      onChange={(e) => updateLine(line.localId, { qty_taken: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Remove line */}
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line.localId)}
                      className="mt-5 text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                      title="Remove line"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {submitError}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/trips')}
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            id="btn-submit-trip"
            type="submit"
            disabled={submitting}
            className="px-6 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {submitting ? 'Creating Trip…' : 'Create Trip'}
          </button>
        </div>
      </form>
    </div>
  );
}
