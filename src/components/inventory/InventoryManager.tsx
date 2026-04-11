import { useState, useEffect, useCallback } from 'react';
import { toast } from '../../lib/toast';

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  sort_order: number;
  current_stock: number | null;
  required_amount: number | null;
  order_amount: number | null;
}

interface Supplier {
  id: number;
  name: string;
  sort_order: number;
  ingredients: Ingredient[];
}

interface Props {
  storeId: number;
}

type FieldValues = Record<number, { current: string; required: string }>;

function calcOrder(current: string, required: string): number {
  const c = Math.max(parseFloat(current) || 0, 0);
  const r = Math.max(parseFloat(required) || 0, 0);
  return Math.max(r - c, 0);
}

function toFixed(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

export default function InventoryManager({ storeId }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [values, setValues] = useState<FieldValues>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [exportMonth, setExportMonth] = useState(today.slice(0, 7));
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/inventory?date=${date}`);
      const json = await res.json() as { suppliers: Supplier[] };
      setSuppliers(json.suppliers);
      // Initialize field values from DB records
      const init: FieldValues = {};
      for (const sup of json.suppliers) {
        for (const ing of sup.ingredients) {
          init[ing.id] = {
            current: ing.current_stock != null ? toFixed(ing.current_stock) : '',
            required: ing.required_amount != null ? toFixed(ing.required_amount) : '',
          };
        }
      }
      setValues(init);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { fetchData(selectedDate); }, [selectedDate, fetchData]);

  const handleInput = (id: number, field: 'current' | 'required', raw: string) => {
    // Allow: empty, digits, one decimal point, no negative
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
    setValues(prev => ({ ...prev, [id]: { ...prev[id], [field]: raw } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      const activeSupplier = suppliers[activeIdx];
      if (!activeSupplier) return;

      const records = activeSupplier.ingredients.map(ing => ({
        ingredient_id: ing.id,
        current_stock: Math.max(parseFloat(values[ing.id]?.current || '0') || 0, 0),
        required_amount: Math.max(parseFloat(values[ing.id]?.required || '0') || 0, 0),
      }));

      await fetch(`/api/stores/${storeId}/inventory/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, records }),
      });
      setSavedMsg('✅ Saved');
      setTimeout(() => setSavedMsg(''), 3000);
      toast('Inventory data saved');
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const downloadCSV = async (from: string, to: string, filename: string) => {
    setExporting(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/inventory/export?from=${from}&to=${to}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('CSV downloaded');
    } catch {
      toast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportDay = () => downloadCSV(selectedDate, selectedDate, `inventory_${selectedDate}.csv`);

  const handleMonthReport = () => {
    const [y, m] = exportMonth.split('-').map(Number);
    const from = `${exportMonth}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${exportMonth}-${String(lastDay).padStart(2, '0')}`;
    setShowMonthPicker(false);
    downloadCSV(from, to, `inventory_monthly_${exportMonth}.csv`);
  };

  const activeSupplier = suppliers[activeIdx];
  const ingredients = activeSupplier?.ingredients ?? [];
  const orderCount = ingredients.filter(ing => calcOrder(values[ing.id]?.current ?? '', values[ing.id]?.required ?? '') > 0).length;

  return (
    <div>
      {/* Top bar: date + action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 font-medium">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a085]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {savedMsg && <span className="text-sm text-[#16a085] font-medium">{savedMsg}</span>}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-[#16a085] hover:bg-[#0e7a65] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            {saving ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '💾'}
            Save
          </button>
          <button
            onClick={handleExportDay}
            disabled={exporting || loading}
            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            📥 Export Data
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMonthPicker(v => !v)}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              📊 Monthly Report
            </button>
            {showMonthPicker && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-10 flex items-center gap-2 whitespace-nowrap">
                <input
                  type="month"
                  value={exportMonth}
                  onChange={e => setExportMonth(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16a085]"
                />
                <button
                  onClick={handleMonthReport}
                  disabled={exporting}
                  className="px-3 py-1.5 bg-[#16a085] text-white text-sm font-medium rounded-lg hover:bg-[#0e7a65] transition-colors"
                >
                  DL
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Supplier tabs */}
      <div className="flex gap-2 mb-4">
        {suppliers.map((sup, idx) => (
          <button
            key={sup.id}
            onClick={() => setActiveIdx(idx)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeIdx === idx
                ? 'bg-[#1a1a2e] text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1a1a2e]'
            }`}
          >
            {sup.name}
          </button>
        ))}
      </div>

      {/* Order summary badge */}
      {!loading && orderCount > 0 && (
        <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 rounded-full text-sm text-red-600 font-medium">
          <span>🚨</span>
          <span>{orderCount} items need to be ordered</span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#16a085] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="bg-[#1a1a2e] text-white">
                  <th className="text-left px-4 py-3 font-medium w-40">Ingredient</th>
                  <th className="text-center px-3 py-3 font-medium w-12">Unit</th>
                  <th className="text-right px-3 py-3 font-medium w-28">Required</th>
                  <th className="text-right px-3 py-3 font-medium w-28">Current Stock</th>
                  <th className="text-right px-4 py-3 font-medium w-24">Order Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ingredients.map((ing, i) => {
                  const v = values[ing.id] ?? { current: '', required: '' };
                  const order = calcOrder(v.current, v.required);
                  const hasOrder = order > 0;
                  return (
                    <tr key={ing.id} className={`transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30`}>
                      <td className="px-4 py-2.5 text-gray-800 font-medium">{ing.name}</td>
                      <td className="px-3 py-2.5 text-center text-gray-500">{ing.unit}</td>
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={v.required}
                          onChange={e => handleInput(ing.id, 'required', e.target.value)}
                          placeholder="0"
                          className="w-full text-right px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a085] focus:border-transparent bg-white"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={v.current}
                          onChange={e => handleInput(ing.id, 'current', e.target.value)}
                          placeholder="0"
                          className="w-full text-right px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a085] focus:border-transparent bg-white"
                        />
                      </td>
                      <td className={`px-4 py-2.5 text-right font-bold tabular-nums rounded-r ${hasOrder ? 'text-red-600 bg-red-50' : 'text-gray-400'}`}>
                        {hasOrder ? toFixed(order) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {ingredients.length === 0 && (
            <div className="text-center py-10 text-gray-400">No ingredients registered yet</div>
          )}
        </div>
      )}
    </div>
  );
}
