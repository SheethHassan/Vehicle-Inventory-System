'use client';

import { useEffect, useState } from 'react';
import type { Vehicle } from '@/types';

const VEHICLE_TYPES = ['Truck', 'Van', 'Pickup', 'SUV', 'Flatbed'];

const EMPTY_FORM = { registration: '', type: '' };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchVehicles() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/vehicles');
    if (!res.ok) {
      setError('Failed to load vehicles');
    } else {
      setVehicles(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => { fetchVehicles(); }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditTarget(null);
    setShowModal(true);
  }

  function openEdit(v: Vehicle) {
    setForm({ registration: v.registration, type: v.type });
    setFormError(null);
    setEditTarget(v);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditTarget(null);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const url = editTarget ? `/api/vehicles/${editTarget.id}` : '/api/vehicles';
    const method = editTarget ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setFormError(data.error ?? 'Something went wrong');
      return;
    }

    closeModal();
    fetchVehicles();
  }

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.registration.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Vehicles
          {searchQuery && (
            <span className="ml-2 text-base font-normal text-gray-400">
              ({filteredVehicles.length} result{filteredVehicles.length !== 1 ? 's' : ''})
            </span>
          )}
        </h1>
        <button
          id="btn-create-vehicle"
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
           Add Vehicle
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4 max-w-sm">
        <input
          id="search-vehicles"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by registration or type..."
          className="w-full border border-gray-300 rounded px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            id="clear-search-vehicles"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {loading && <p className="text-gray-500">Loading vehicles…</p>}
      {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>}

      {!loading && !error && (
        <>
          {filteredVehicles.length === 0 && searchQuery ? (
            <p className="py-10 text-center text-gray-400 text-sm">
              No vehicles match your search.
            </p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Registration', 'Type', 'Added', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVehicles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                        No vehicles yet. Add your first vehicle above.
                      </td>
                    </tr>
                  )}
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900 font-mono">{v.registration}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          {v.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">
                        {new Date(v.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          id={`btn-edit-vehicle-${v.id}`}
                          onClick={() => openEdit(v)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4">
              {editTarget ? `Edit: ${editTarget.registration}` : 'Add New Vehicle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="form-registration" className="block text-sm font-medium text-gray-700 mb-1">
                  Registration
                </label>
                <input
                  id="form-registration"
                  type="text"
                  required
                  value={form.registration}
                  onChange={(e) => setForm({ ...form, registration: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. A 12345"
                />
              </div>
              <div>
                <label htmlFor="form-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  id="form-type"
                  required
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type…</option>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
