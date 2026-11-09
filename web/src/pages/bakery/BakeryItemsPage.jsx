import React, { useState } from 'react';
import {
  Package,
  Edit3,
  Trash2,
  Save,
  X,
  PlusCircle,
  Clock,
  RefreshCw,
  Euro,
  CheckCircle2,
  Send,
  FileText,
  Lock,
} from 'lucide-react';

export default function BakeryItemsPage({
  user,
  bakeryHistory,
  loadingHistory,
  onRefreshHistory,
  onUpdateItem,
  onDeleteItem,
  onNavigatePage,
}) {
  const pulses = bakeryHistory?.pulses || [];

  // Inline edit state
  const [editingPulseId, setEditingPulseId] = useState(null);
  const [editForm, setEditForm] = useState({
    item_name: '',
    description: '',
    quantity: 5,
    quantity_remaining: 5,
    cost_price: '0.85',
    extend_minutes: 0,
  });
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const startEditing = (item) => {
    setEditingPulseId(item.pulse_id);
    setEditForm({
      item_name: item.item_name || '',
      description: item.description || '',
      quantity: item.quantity ?? 5,
      quantity_remaining: item.quantity_remaining ?? 5,
      cost_price: String(item.cost_price ?? 0.85),
      extend_minutes: 0,
    });
  };

  const cancelEditing = () => {
    setEditingPulseId(null);
  };

  const handleSaveEdit = async (e, pulseId) => {
    e.preventDefault();
    setSavingId(pulseId);
    try {
      await onUpdateItem(pulseId, {
        item_name: editForm.item_name,
        description: editForm.description,
        quantity: parseInt(editForm.quantity, 10),
        quantity_remaining: parseInt(editForm.quantity_remaining, 10),
        cost_price: parseFloat(editForm.cost_price) || 0,
        extend_minutes: parseInt(editForm.extend_minutes, 10) || 0,
      });
      setEditingPulseId(null);
    } finally {
      setSavingId(null);
    }
  };

  const handleConfirmDelete = async (item) => {
    setDeletingId(item.pulse_id);
    try {
      await onDeleteItem(item.pulse_id, item.item_name);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="bakery-page-wrapper"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}
    >
      {/* Page Header */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div className="badge badge-amber" style={{ marginBottom: '6px' }}>
            <Package size={13} /> Bakery Items &amp; Internal Tax Pricing Manager
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Manage Bakery Food Items, Prices &amp; Inventory ({pulses.length})
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
            Update item names, descriptions, quantities, or delete items. Set your{' '}
            <strong>internal unit production cost (€)</strong> for your Cerfa 60% tax report (hidden
            from students — students always see meals as 100% free).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRefreshHistory}
            disabled={loadingHistory}
          >
            <RefreshCw size={14} className={loadingHistory ? 'spin' : ''} />
            Refresh Items
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onNavigatePage('/bakery/tax')}
          >
            <FileText size={14} />
            Cerfa Tax Report
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigatePage('/bakery/pulse')}
          >
            <PlusCircle size={14} />
            Add / Broadcast New Item
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {loadingHistory ? (
          <div className="loading-card" style={{ padding: '32px', textAlign: 'center' }}>
            <RefreshCw size={26} className="spin" color="#F59E0B" />
            <p style={{ marginTop: '10px', color: '#64748B' }}>
              Loading your bakery items from PostgreSQL...
            </p>
          </div>
        ) : pulses.length === 0 ? (
          <div className="empty-feed-card" style={{ padding: '36px', textAlign: 'center' }}>
            <Package size={40} color="#94A3B8" />
            <h4 style={{ marginTop: '10px', color: '#0F172A' }}>No Bakery Items Found</h4>
            <p style={{ color: '#64748B', maxWidth: '460px', margin: '6px auto 16px' }}>
              Post your first surplus item to manage its details, stock quantities, and internal Cerfa tax price here.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigatePage('/bakery/pulse')}
            >
              <Send size={14} /> Post Surplus Item
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pulses.map((item) => {
              const isEditing = editingPulseId === item.pulse_id;
              const unitCost = Number(item.cost_price ?? 0.85);
              const totalCostValue = unitCost * (item.quantity || 0);
              const taxWriteOff = totalCostValue * 0.6;

              return (
                <div
                  key={item.pulse_id}
                  className="glass-card"
                  style={{
                    padding: '18px 22px',
                    borderLeft: `4px solid ${item.is_active ? '#10B981' : '#94A3B8'}`,
                    background: isEditing ? '#FFFBEB' : '#FFFFFF',
                  }}
                >
                  {!isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                              🥖 {item.item_name}
                            </h3>
                            <span className={`badge ${item.is_active ? 'badge-emerald' : 'badge-indigo'}`}>
                              {item.is_active
                                ? `Active (${item.quantity_remaining}/${item.quantity} left)`
                                : `Inactive (${item.quantity_remaining}/${item.quantity} left)`}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.86rem', color: '#475569', margin: '6px 0 0' }}>
                            {item.description || 'No description provided.'}
                          </p>
                        </div>

                        {/* Action Buttons: Edit & Delete */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => startEditing(item)}
                          >
                            <Edit3 size={14} />
                            Edit Item &amp; Tax Price
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                            disabled={deletingId === item.pulse_id}
                            onClick={() => handleConfirmDelete(item)}
                          >
                            <Trash2 size={14} />
                            {deletingId === item.pulse_id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      {/* Internal Bakery Tax Cost Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                          padding: '10px 14px',
                          background: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          fontSize: '0.82rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0F172A' }}>
                            <Lock size={13} color="#D97706" />
                            <strong>Internal Unit Cost (Bakery Only):</strong>{' '}
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                color: '#B45309',
                                fontSize: '0.9rem',
                              }}
                            >
                              €{unitCost.toFixed(2)} / unit
                            </span>
                          </span>
                          <span style={{ color: '#475569' }}>
                            <strong>Total Base Value:</strong> €{totalCostValue.toFixed(2)}
                          </span>
                          <span style={{ color: '#059669', fontWeight: 700 }}>
                            ✓ 60% Cerfa Tax Credit: €{taxWriteOff.toFixed(2)}
                          </span>
                        </div>

                        <div style={{ color: '#64748B', fontSize: '0.77rem' }}>
                          <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          Expires:{' '}
                          {new Date(item.expires_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Inline Edit Form for the Selected Item */
                    <form onSubmit={(e) => handleSaveEdit(e, item.pulse_id)}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '14px',
                        }}
                      >
                        <strong style={{ fontSize: '1rem', color: '#92400E' }}>
                          ✏️ Editing Item: {item.item_name}
                        </strong>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={cancelEditing}
                        >
                          <X size={14} /> Cancel
                        </button>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
                          gap: '14px',
                          alignItems: 'end',
                          marginBottom: '14px',
                        }}
                      >
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ whiteSpace: 'nowrap' }}>
                            Item / Package Name
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={editForm.item_name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, item_name: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label
                            className="form-label"
                            style={{ whiteSpace: 'nowrap' }}
                            title="Used strictly for your Cerfa 60% tax deduction report. Students always see €0 (Free)."
                          >
                            🔒 Unit Cost (€ Tax Only)
                          </label>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            className="form-input font-mono"
                            value={editForm.cost_price}
                            onChange={(e) =>
                              setEditForm({ ...editForm, cost_price: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ whiteSpace: 'nowrap' }}>
                            Total Quantity Posted
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            className="form-input"
                            value={editForm.quantity}
                            onChange={(e) =>
                              setEditForm({ ...editForm, quantity: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ whiteSpace: 'nowrap' }}>
                            Quantity Remaining
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="200"
                            className="form-input"
                            value={editForm.quantity_remaining}
                            onChange={(e) =>
                              setEditForm({ ...editForm, quantity_remaining: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ whiteSpace: 'nowrap' }}>
                            Extend Expiry Time
                          </label>
                          <select
                            className="form-select"
                            value={editForm.extend_minutes}
                            onChange={(e) =>
                              setEditForm({ ...editForm, extend_minutes: e.target.value })
                            }
                          >
                            <option value="0">Keep current expiry</option>
                            <option value="30">+30 minutes</option>
                            <option value="60">+1 hour (60 mins)</option>
                            <option value="120">+2 hours (120 mins)</option>
                            <option value="1440">+24 hours</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <label className="form-label">Description / Storage Notes</label>
                        <textarea
                          className="form-input"
                          rows={2}
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({ ...editForm, description: e.target.value })
                          }
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', color: '#065F46', fontWeight: 700 }}>
                          Estimated 60% Cerfa Tax Deduction for this item: €
                          {(
                            (parseFloat(editForm.cost_price) || 0) *
                            (parseInt(editForm.quantity, 10) || 0) *
                            0.6
                          ).toFixed(2)}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={savingId === item.pulse_id}
                          >
                            <Save size={14} />
                            {savingId === item.pulse_id ? 'Saving...' : 'Save Item & Tax Price'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

