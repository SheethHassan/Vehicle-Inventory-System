'use client';

import { useEffect, useState } from 'react';
import type { Item } from '@/types';

type ModalMode = 'create' | 'edit' | null;

const EMPTY_FORM = {
  sku: '',
  name: '',
  unit: '',
  quantity_on_hand: 0,
  reorder_threshold: 5,
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchItems() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/items');
    if (!res.ok) {
      setError('Failed to load items');
    } else {
      setItems(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => { fetchItems(); }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditTarget(null);
    setModalMode('create');
  }

  function openEdit(item: Item) {
    setForm({
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      quantity_on_hand: item.quantity_on_hand,
      reorder_threshold: item.reorder_threshold,
    });
    setFormError(null);
    setEditTarget(item);
    setModalMode('edit');
  }

  function closeModal() {
    setModalMode(null);
    setEditTarget(null);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const url = modalMode === 'edit' ? `/api/items/${editTarget!.id}` : '/api/items';
    const method = modalMode === 'edit' ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        quantity_on_hand: Number(form.quantity_on_hand),
        reorder_threshold: Number(form.reorder_threshold),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setFormError(data.error ?? 'Something went wrong');
      return;
    }

    closeModal();
    fetchItems();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    const res = await fetch(`/api/items/${deleteTarget.id}`, { method: 'DELETE' });
    const data = await res.json();
    setDeleting(false);

    if (!res.ok) {
      setDeleteError(data.error ?? 'Failed to delete item');
      return;
    }

    setDeleteTarget(null);
    fetchItems();
  }

  const isLowStock = (item: Item) => item.quantity_on_hand < item.reorder_threshold;

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Items
          {searchQuery && (
            <span className="ml-2 text-base font-normal text-gray-400">
              ({filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''})
            </span>
          )}
        </h1>
        <button
          id="btn-create-item"
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
           Add Item
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4 max-w-sm">
        <input
          id="search-items"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or SKU..."
          className="w-full border border-gray-300 rounded px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            id="clear-search-items"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {loading && <p className="text-gray-500">Loading items…</p>}
      {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>}

      {!loading && !error && (
        <>
          {/* Empty search result — shown outside the table */}
          {filteredItems.length === 0 && searchQuery ? (
            <p className="py-10 text-center text-gray-400 text-sm">
              No items match your search.
            </p>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['SKU', 'Name', 'Unit', 'Stock', 'Reorder At', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        No items yet. Add your first item above.
                      </td>
                    </tr>
                  )}
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-gray-700">{item.sku}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.quantity_on_hand}</td>
                      <td className="px-4 py-3 text-gray-600">{item.reorder_threshold}</td>
                      <td className="px-4 py-3">
                        {isLowStock(item) ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            ⚠ Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          id={`btn-edit-item-${item.id}`}
                          onClick={() => openEdit(item)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          id={`btn-delete-item-${item.id}`}
                          onClick={() => { setDeleteTarget(item); setDeleteError(null); }}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
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

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4">
              {modalMode === 'create' ? 'Add New Item' : `Edit: ${editTarget?.name}`}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="SKU" id="form-sku">
                <input
                  id="form-sku"
                  type="text"
                  required
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. SKU-001"
                />
              </Field>
              <Field label="Name" id="form-name">
                <input
                  id="form-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Safety Helmets"
                />
              </Field>
              <Field label="Unit" id="form-unit">
                <input
                  id="form-unit"
                  type="text"
                  required
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. pcs, box, liter"
                />
              </Field>
              <Field label="Quantity on Hand" id="form-qty">
                <input
                  id="form-qty"
                  type="number"
                  min={0}
                  required
                  value={form.quantity_on_hand}
                  onChange={(e) => setForm({ ...form, quantity_on_hand: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>
              <Field label="Reorder Threshold" id="form-reorder">
                <input
                  id="form-reorder"
                  type="number"
                  min={0}
                  required
                  value={form.reorder_threshold}
                  onChange={(e) => setForm({ ...form, reorder_threshold: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : modalMode === 'create' ? 'Create Item' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold mb-2 text-gray-900">Delete Item</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
