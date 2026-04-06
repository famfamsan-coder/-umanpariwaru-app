import { useState, useEffect, useCallback } from 'react';
import { toast } from '../../lib/toast';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Store { id: number; name: string; }
interface Role { id: number; name: string; sort_order: number; manual_content: string; responsibility_content: string; }
interface ChecklistItem { id: number; type: 'checklist'; title: string; sort_order: number; }
interface TaskItem { id: number; type: 'task'; title: string; sort_order: number; }
type RoleItem = ChecklistItem | TaskItem;
interface RoutineItem { id: number; period: 'morning' | 'evening'; title: string; sort_order: number; }
interface Supplier { id: number; name: string; sort_order: number; }
interface Ingredient { id: number; name: string; unit: string; sort_order: number; }
interface CleaningSpot { id: number; name: string; sort_order: number; }

type TabKey = 'stores' | 'roles' | 'routine' | 'inventory' | 'cleaning' | 'export';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'stores',    label: 'Store Settings',    icon: '🏪' },
  { key: 'roles',     label: 'Role Management',   icon: '👥' },
  { key: 'routine',   label: 'Routine',           icon: '📋' },
  { key: 'inventory', label: 'Inventory Settings', icon: '📦' },
  { key: 'cleaning',  label: 'Cleaning Settings', icon: '🧹' },
  { key: 'export',    label: 'Data Export',       icon: '📊' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const msg = await res.text().catch(() => 'An error occurred');
    toast(msg, 'error');
    throw new Error(msg);
  }
  return res.json();
}

function InlineInput({
  value, onSave, className = '',
}: { value: string; onSave: (v: string) => void; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      className={`border-b border-transparent hover:border-gray-300 focus:border-[#16a085] outline-none bg-transparent transition-colors ${className}`}
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => { if (v.trim() && v.trim() !== value) onSave(v.trim()); else setV(value); }}
    />
  );
}

function DeleteBtn({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={() => { if (window.confirm('Are you sure you want to delete?')) onDelete(); }}
      className="text-red-400 hover:text-red-600 text-sm transition-colors px-1 flex-shrink-0"
      title="Delete"
    >✕</button>
  );
}

function AddRow({
  placeholder, onAdd, extraFields,
}: {
  placeholder: string;
  onAdd: (values: Record<string, string>) => void;
  extraFields?: { key: string; placeholder: string; type?: string }[];
}) {
  const [main, setMain] = useState('');
  const [extras, setExtras] = useState<Record<string, string>>({});

  const handleAdd = () => {
    if (!main.trim()) return;
    onAdd({ name: main.trim(), ...extras });
    setMain('');
    setExtras({});
  };

  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      <input
        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#16a085]"
        placeholder={placeholder}
        value={main}
        onChange={e => setMain(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
      />
      {extraFields?.map(f => (
        <input
          key={f.key}
          type={f.type ?? 'text'}
          className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#16a085]"
          placeholder={f.placeholder}
          value={extras[f.key] ?? ''}
          onChange={e => setExtras(prev => ({ ...prev, [f.key]: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        />
      ))}
      <button
        onClick={handleAdd}
        className="px-4 py-1.5 bg-[#1a1a2e] text-white text-sm rounded-lg hover:bg-[#16a085] transition-colors"
      >Add</button>
    </div>
  );
}

// ─── Section: Stores ─────────────────────────────────────────────────────────
function StoresSection() {
  const [stores, setStores] = useState<Store[]>([]);

  const load = useCallback(async () => {
    const data = await apiFetch('/api/admin/stores');
    setStores(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addStore = async (values: Record<string, string>) => {
    try {
      await apiFetch('/api/admin/stores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name }),
      });
      load();
      toast('Store added');
    } catch { /* apiFetch already shows toast */ }
  };

  const updateStore = async (id: number, name: string) => {
    try {
      await apiFetch(`/api/admin/stores/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setStores(prev => prev.map(s => s.id === id ? { ...s, name } : s));
      toast('Saved');
    } catch { /* apiFetch already shows toast */ }
  };

  const deleteStore = async (id: number) => {
    try {
      await apiFetch(`/api/admin/stores/${id}`, { method: 'DELETE' });
      setStores(prev => prev.filter(s => s.id !== id));
      toast('Deleted');
    } catch { /* apiFetch already shows toast */ }
  };

  return (
    <div>
      <h2 className="text-base font-bold text-[#1a1a2e] mb-3">Store List</h2>
      <div className="space-y-2">
        {stores.map(store => (
          <div key={store.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <InlineInput
              value={store.name}
              onSave={v => updateStore(store.id, v)}
              className="font-medium text-gray-800 flex-1"
            />
            <DeleteBtn onDelete={() => deleteStore(store.id)} />
          </div>
        ))}
      </div>
      <AddRow placeholder="Add store name" onAdd={addStore} />
    </div>
  );
}

// ─── Section: Roles ──────────────────────────────────────────────────────────
function RolesSection() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [roleDetail, setRoleDetail] = useState<{ checklist_items: RoleItem[]; task_items: RoleItem[] } | null>(null);

  useEffect(() => {
    apiFetch('/api/admin/stores').then((data: Store[]) => {
      setStores(data);
      if (data.length) setSelectedStore(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    apiFetch(`/api/admin/roles?storeId=${selectedStore}`).then((data: Role[]) => {
      setRoles(data);
      if (data.length) setSelectedRole(data[0].id);
      else setSelectedRole(null);
    });
  }, [selectedStore]);

  const loadRoleDetail = useCallback(async (roleId: number) => {
    const data = await apiFetch(`/api/admin/roles/${roleId}`);
    const checklist = (data.checklist_items ?? []).map((i: ChecklistItem) => ({ ...i, type: 'checklist' as const }));
    const tasks = (data.task_items ?? []).map((i: TaskItem) => ({ ...i, type: 'task' as const }));
    setRoleDetail({ checklist_items: checklist, task_items: tasks });
  }, []);

  useEffect(() => {
    if (!selectedRole) { setRoleDetail(null); return; }
    loadRoleDetail(selectedRole);
  }, [selectedRole, loadRoleDetail]);

  const addRole = async (values: Record<string, string>) => {
    if (!selectedStore) return;
    await apiFetch('/api/admin/roles', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: selectedStore, name: values.name }),
    });
    const data = await apiFetch(`/api/admin/roles?storeId=${selectedStore}`);
    setRoles(data);
  };

  const updateRole = async (id: number, field: string, value: string) => {
    await apiFetch(`/api/admin/roles/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    setRoles(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const deleteRole = async (id: number) => {
    await apiFetch(`/api/admin/roles/${id}`, { method: 'DELETE' });
    setRoles(prev => prev.filter(r => r.id !== id));
    if (selectedRole === id) { setSelectedRole(null); setRoleDetail(null); }
  };

  const moveRole = async (id: number, dir: -1 | 1) => {
    const idx = roles.findIndex(r => r.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= roles.length) return;
    const newRoles = [...roles];
    [newRoles[idx], newRoles[swapIdx]] = [newRoles[swapIdx], newRoles[idx]];
    setRoles(newRoles);
    await Promise.all([
      apiFetch(`/api/admin/roles/${newRoles[idx].id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: idx + 1 }),
      }),
      apiFetch(`/api/admin/roles/${newRoles[swapIdx].id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: swapIdx + 1 }),
      }),
    ]);
  };

  const addItem = async (type: 'checklist' | 'task', values: Record<string, string>) => {
    if (!selectedRole) return;
    const newItem = await apiFetch('/api/admin/items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: selectedRole, type, title: values.name }),
    });
    setRoleDetail(prev => {
      if (!prev) return prev;
      if (type === 'checklist') return { ...prev, checklist_items: [...prev.checklist_items, { ...newItem, type: 'checklist' as const }] };
      return { ...prev, task_items: [...prev.task_items, { ...newItem, type: 'task' as const }] };
    });
  };

  const updateItem = async (type: 'checklist' | 'task', id: number, title: string) => {
    await apiFetch(`/api/admin/items/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title }),
    });
    setRoleDetail(prev => {
      if (!prev) return prev;
      if (type === 'checklist') return { ...prev, checklist_items: prev.checklist_items.map(i => i.id === id ? { ...i, title } : i) };
      return { ...prev, task_items: prev.task_items.map(i => i.id === id ? { ...i, title } : i) };
    });
  };

  const deleteItem = async (type: 'checklist' | 'task', id: number) => {
    await apiFetch(`/api/admin/items/${id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    setRoleDetail(prev => {
      if (!prev) return prev;
      if (type === 'checklist') return { ...prev, checklist_items: prev.checklist_items.filter(i => i.id !== id) };
      return { ...prev, task_items: prev.task_items.filter(i => i.id !== id) };
    });
  };

  const activeRole = roles.find(r => r.id === selectedRole);

  return (
    <div className="space-y-5">
      {/* Store selector */}
      <div className="flex gap-2 flex-wrap">
        {stores.map(s => (
          <button key={s.id} onClick={() => setSelectedStore(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedStore === s.id ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Role list */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Roles</h3>
        <div className="space-y-2">
          {roles.map((role, idx) => (
            <div key={role.id}
              className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${selectedRole === role.id ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              onClick={() => setSelectedRole(role.id)}
            >
              <div className="flex flex-col gap-0.5">
                <button onClick={e => { e.stopPropagation(); moveRole(role.id, -1); }} disabled={idx === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
                <button onClick={e => { e.stopPropagation(); moveRole(role.id, 1); }} disabled={idx === roles.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
              </div>
              <InlineInput
                value={role.name}
                onSave={v => updateRole(role.id, 'name', v)}
                className="flex-1 font-medium text-gray-800 text-sm"
              />
              <DeleteBtn onDelete={() => deleteRole(role.id)} />
            </div>
          ))}
        </div>
        <AddRow placeholder="Add role name" onAdd={addRole} />
      </div>

      {/* Selected role detail */}
      {activeRole && roleDetail && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
          <h3 className="font-semibold text-[#1a1a2e]">{activeRole.name} — Detail Settings</h3>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Manual</label>
            <textarea
              key={`manual-${activeRole.id}`}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-[#16a085] resize-y"
              rows={4}
              defaultValue={activeRole.manual_content}
              onBlur={e => { if (e.target.value !== activeRole.manual_content) updateRole(activeRole.id, 'manual_content', e.target.value); }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Responsibility</label>
            <textarea
              key={`resp-${activeRole.id}`}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-[#16a085] resize-y"
              rows={3}
              defaultValue={activeRole.responsibility_content}
              onBlur={e => { if (e.target.value !== activeRole.responsibility_content) updateRole(activeRole.id, 'responsibility_content', e.target.value); }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Checklist</label>
            <div className="space-y-1">
              {roleDetail.checklist_items.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs flex-shrink-0">☑</span>
                  <InlineInput value={item.title} onSave={v => updateItem('checklist', item.id, v)} className="flex-1 text-sm text-gray-700" />
                  <DeleteBtn onDelete={() => deleteItem('checklist', item.id)} />
                </div>
              ))}
            </div>
            <AddRow placeholder="Add checklist item" onAdd={v => addItem('checklist', v)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Tasks</label>
            <div className="space-y-1">
              {roleDetail.task_items.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs flex-shrink-0">◆</span>
                  <InlineInput value={item.title} onSave={v => updateItem('task', item.id, v)} className="flex-1 text-sm text-gray-700" />
                  <DeleteBtn onDelete={() => deleteItem('task', item.id)} />
                </div>
              ))}
            </div>
            <AddRow placeholder="Add task" onAdd={v => addItem('task', v)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section: Routine ────────────────────────────────────────────────────────
function RoutineSection() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [items, setItems] = useState<RoutineItem[]>([]);

  useEffect(() => {
    apiFetch('/api/admin/stores').then((data: Store[]) => {
      setStores(data);
      if (data.length) setSelectedStore(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    apiFetch(`/api/admin/roles?storeId=${selectedStore}`).then((data: Role[]) => {
      setRoles(data);
      if (data.length) setSelectedRole(data[0].id);
      else setSelectedRole(null);
    });
  }, [selectedStore]);

  useEffect(() => {
    if (!selectedRole) { setItems([]); return; }
    apiFetch(`/api/admin/routine-items?roleId=${selectedRole}`).then(setItems);
  }, [selectedRole]);

  const addItem = async (period: 'morning' | 'evening', values: Record<string, string>) => {
    if (!selectedRole || !selectedStore) return;
    const newItem = await apiFetch('/api/admin/routine-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: selectedRole, storeId: selectedStore, period, title: values.name }),
    });
    setItems(prev => [...prev, newItem]);
  };

  const updateItem = async (id: number, title: string) => {
    await apiFetch(`/api/admin/routine-items/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setItems(prev => prev.map(i => i.id === id ? { ...i, title } : i));
  };

  const deleteItem = async (id: number) => {
    await apiFetch(`/api/admin/routine-items/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const morning = items.filter(i => i.period === 'morning');
  const evening = items.filter(i => i.period === 'evening');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {stores.map(s => (
          <button key={s.id} onClick={() => setSelectedStore(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedStore === s.id ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {roles.map(r => (
          <button key={r.id} onClick={() => setSelectedRole(r.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedRole === r.id ? 'bg-[#16a085] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {r.name}
          </button>
        ))}
      </div>

      {selectedRole && (
        <div className="grid sm:grid-cols-2 gap-4">
          {(['morning', 'evening'] as const).map(period => (
            <div key={period} className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="font-semibold text-sm text-[#1a1a2e] mb-3">{period === 'morning' ? '☀ Morning' : '🌙 Evening'}</h3>
              <div className="space-y-1.5">
                {(period === 'morning' ? morning : evening).map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <InlineInput value={item.title} onSave={v => updateItem(item.id, v)} className="flex-1 text-sm text-gray-700" />
                    <DeleteBtn onDelete={() => deleteItem(item.id)} />
                  </div>
                ))}
              </div>
              <AddRow placeholder="Add item" onAdd={v => addItem(period, v)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Inventory ──────────────────────────────────────────────────────
function InventorySection() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    apiFetch('/api/admin/stores').then((data: Store[]) => {
      setStores(data);
      if (data.length) setSelectedStore(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    apiFetch(`/api/admin/suppliers?storeId=${selectedStore}`).then((data: Supplier[]) => {
      setSuppliers(data);
      setSelectedSupplier(data[0]?.id ?? null);
    });
  }, [selectedStore]);

  useEffect(() => {
    if (!selectedSupplier) { setIngredients([]); return; }
    apiFetch(`/api/admin/ingredients?supplierId=${selectedSupplier}`).then(setIngredients);
  }, [selectedSupplier]);

  const addSupplier = async (values: Record<string, string>) => {
    if (!selectedStore) return;
    const newSupplier = await apiFetch('/api/admin/suppliers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: selectedStore, name: values.name }),
    });
    setSuppliers(prev => [...prev, newSupplier]);
    setSelectedSupplier(newSupplier.id);
  };

  const updateSupplier = async (id: number, name: string) => {
    await apiFetch(`/api/admin/suppliers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const deleteSupplier = async (id: number) => {
    await apiFetch(`/api/admin/suppliers/${id}`, { method: 'DELETE' });
    setSuppliers(prev => prev.filter(s => s.id !== id));
    if (selectedSupplier === id) setSelectedSupplier(null);
  };

  const addIngredient = async (values: Record<string, string>) => {
    if (!selectedSupplier) return;
    const newItem = await apiFetch('/api/admin/ingredients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplierId: selectedSupplier, name: values.name, unit: values.unit ?? '' }),
    });
    setIngredients(prev => [...prev, newItem]);
  };

  const updateIngredient = async (id: number, field: string, value: string) => {
    await apiFetch(`/api/admin/ingredients/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const deleteIngredient = async (id: number) => {
    await apiFetch(`/api/admin/ingredients/${id}`, { method: 'DELETE' });
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {stores.map(s => (
          <button key={s.id} onClick={() => setSelectedStore(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedStore === s.id ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.name}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Supplier</h3>
        <div className="flex gap-2 flex-wrap mb-2">
          {suppliers.map(sup => (
            <div key={sup.id}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${selectedSupplier === sup.id ? 'border-[#1a1a2e] bg-[#1a1a2e]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              onClick={() => setSelectedSupplier(sup.id)}>
              <InlineInput value={sup.name} onSave={v => updateSupplier(sup.id, v)} className="font-medium text-gray-800" />
              <DeleteBtn onDelete={() => deleteSupplier(sup.id)} />
            </div>
          ))}
        </div>
        <AddRow placeholder="Add supplier" onAdd={addSupplier} />
      </div>

      {selectedSupplier && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Ingredient List</h3>
          <div className="space-y-2">
            {ingredients.map(ing => (
              <div key={ing.id} className="flex items-center gap-3 flex-wrap">
                <InlineInput value={ing.name} onSave={v => updateIngredient(ing.id, 'name', v)} className="flex-1 min-w-[120px] text-sm text-gray-800 font-medium" />
                <InlineInput value={ing.unit} onSave={v => updateIngredient(ing.id, 'unit', v)} className="w-16 text-sm text-gray-500 text-center" />
                <DeleteBtn onDelete={() => deleteIngredient(ing.id)} />
              </div>
            ))}
          </div>
          <AddRow
            placeholder="Ingredient name"
            extraFields={[{ key: 'unit', placeholder: 'Unit' }]}
            onAdd={addIngredient}
          />
        </div>
      )}
    </div>
  );
}

// ─── Section: Cleaning ───────────────────────────────────────────────────────
function CleaningSection() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [spots, setSpots] = useState<CleaningSpot[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];
  const [activeMonth, setActiveMonth] = useState(todayStr.slice(0, 7));
  const [scheduled, setScheduled] = useState<Record<number, Set<string>>>({});

  useEffect(() => {
    apiFetch('/api/admin/stores').then((data: Store[]) => {
      setStores(data);
      if (data.length) setSelectedStore(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedStore) return;
    apiFetch(`/api/admin/roles?storeId=${selectedStore}`).then((data: Role[]) => {
      setRoles(data);
      if (data.length) setSelectedRole(data[0].id);
      else setSelectedRole(null);
    });
  }, [selectedStore]);

  useEffect(() => {
    if (!selectedRole) { setSpots([]); return; }
    apiFetch(`/api/admin/cleaning-spots?roleId=${selectedRole}`).then(setSpots);
  }, [selectedRole]);

  useEffect(() => {
    if (!selectedRole || !selectedStore) return;
    fetch(`/api/stores/${selectedStore}/cleaning?month=${activeMonth}&roleId=${selectedRole}`)
      .then(r => r.json())
      .then(data => {
        const map: Record<number, Set<string>> = {};
        for (const spot of (data.spots ?? [])) {
          map[spot.id] = new Set(Object.keys(spot.schedule));
        }
        setScheduled(map);
      });
  }, [selectedRole, selectedStore, activeMonth]);

  const addSpot = async (values: Record<string, string>) => {
    if (!selectedRole || !selectedStore) return;
    const newSpot = await apiFetch('/api/admin/cleaning-spots', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: selectedRole, storeId: selectedStore, name: values.name }),
    });
    setSpots(prev => [...prev, newSpot]);
  };

  const updateSpot = async (id: number, name: string) => {
    await apiFetch(`/api/admin/cleaning-spots/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSpots(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const deleteSpot = async (id: number) => {
    await apiFetch(`/api/admin/cleaning-spots/${id}`, { method: 'DELETE' });
    setSpots(prev => prev.filter(s => s.id !== id));
  };

  const toggleSchedule = async (spotId: number, date: string) => {
    const isOn = scheduled[spotId]?.has(date) ?? false;
    setScheduled(prev => {
      const s = new Set(prev[spotId] ?? []);
      if (isOn) s.delete(date); else s.add(date);
      return { ...prev, [spotId]: s };
    });
    await apiFetch('/api/admin/cleaning-schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spotId, date, status: isOn ? null : 'scheduled' }),
    });
  };

  const copyPrevMonth = async () => {
    if (!selectedRole || !selectedStore) return;
    try {
      const [y, m] = activeMonth.split('-').map(Number);
      const fromMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
      const result = await apiFetch('/api/admin/cleaning-schedule/copy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRole, fromMonth, toMonth: activeMonth }),
      });
      toast(`${result.inserted} items copied`);
      const data = await apiFetch(`/api/stores/${selectedStore}/cleaning?month=${activeMonth}&roleId=${selectedRole}`);
      const map: Record<number, Set<string>> = {};
      for (const spot of (data.spots ?? [])) {
        map[spot.id] = new Set(Object.keys(spot.schedule));
      }
      setScheduled(map);
    } catch { /* apiFetch already shows toast */ }
  };

  const [y, mo] = activeMonth.split('-').map(Number);
  const dayCount = new Date(y, mo, 0).getDate();
  const days = Array.from({ length: dayCount }, (_, i) => {
    const d = i + 1;
    return { d, date: `${activeMonth}-${String(d).padStart(2, '0')}`, dow: new Date(y, mo - 1, d).getDay() };
  });
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const prevMonth = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
  const nextMonth = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {stores.map(s => (
          <button key={s.id} onClick={() => setSelectedStore(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedStore === s.id ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {roles.map(r => (
          <button key={r.id} onClick={() => setSelectedRole(r.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedRole === r.id ? 'bg-[#16a085] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {r.name}
          </button>
        ))}
      </div>

      {selectedRole && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Cleaning Spot</h3>
          <div className="space-y-1.5">
            {spots.map(spot => (
              <div key={spot.id} className="flex items-center gap-2">
                <InlineInput value={spot.name} onSave={v => updateSpot(spot.id, v)} className="flex-1 text-sm text-gray-700" />
                <DeleteBtn onDelete={() => deleteSpot(spot.id)} />
              </div>
            ))}
          </div>
          <AddRow placeholder="Add cleaning spot" onAdd={addSpot} />
        </div>
      )}

      {selectedRole && spots.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveMonth(prevMonth)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold">‹</button>
              <span className="font-semibold text-[#1a1a2e] text-sm">{y}/{mo} Schedule Settings</span>
              <button onClick={() => setActiveMonth(nextMonth)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold">›</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copyPrevMonth} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:border-[#1a1a2e] transition-colors text-gray-600">
                Copy from previous month
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="border-collapse text-xs" style={{ minWidth: `${130 + days.length * 32}px` }}>
              <thead>
                <tr className="bg-[#1a1a2e]">
                  <th className="sticky left-0 z-20 bg-[#1a1a2e] text-white text-left px-2 py-2 font-medium border-r border-white/20" style={{ minWidth: '120px', width: '120px' }}>Cleaning Spot</th>
                  {days.map(({ d, date, dow }) => (
                    <th key={date} className={`text-center py-1 font-medium select-none ${date === todayStr ? 'bg-[#16a085] text-white' : dow === 0 ? 'text-red-300' : dow === 6 ? 'text-blue-300' : 'text-white/80'}`} style={{ minWidth: '32px', width: '32px' }}>
                      <div className="text-[10px]">{d}</div>
                      <div className="text-[9px] opacity-70">{DOW[dow]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spots.map((spot, si) => (
                  <tr key={spot.id} className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="sticky left-0 z-10 px-2 py-1 font-medium text-gray-700 border-r border-gray-200 truncate text-xs"
                      style={{ minWidth: '120px', width: '120px', backgroundColor: si % 2 === 0 ? 'white' : 'rgb(249,250,251)' }}>
                      {spot.name}
                    </td>
                    {days.map(({ date }) => {
                      const on = scheduled[spot.id]?.has(date) ?? false;
                      return (
                        <td key={date} onClick={() => toggleSchedule(spot.id, date)}
                          className="text-center p-0 cursor-pointer" style={{ minWidth: '32px', width: '32px', height: '32px' }}>
                          <div className={`flex items-center justify-center w-full h-full text-xs font-bold rounded-sm transition-colors ${on ? 'bg-[#16a085] text-white' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'}`}
                            style={{ height: '32px' }}>
                            {on ? 'O' : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Tap a cell to toggle the cleaning schedule. Only scheduled days will appear on the staff screen.</p>
        </div>
      )}
    </div>
  );
}

// ─── Section: Export ─────────────────────────────────────────────────────────
function ExportSection() {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7);

  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>('');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    apiFetch('/api/admin/stores').then((data: Store[]) => setStores(data));
  }, []);

  const getQuickMonths = () => {
    const months: { label: string; value: string }[] = [];
    const d = new Date();
    const monthLabels = ['This Month', 'Last Month', '2 months ago', '3 months ago'];
    for (let i = 0; i < 4; i++) {
      const y = d.getFullYear();
      const m = d.getMonth() - i;
      const date = new Date(y, m, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({ label: monthLabels[i], value: key });
    }
    return months;
  };

  const setMonth = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    setFrom(`${monthStr}-01`);
    setTo(`${monthStr}-${String(lastDay).padStart(2, '0')}`);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (storeId) params.set('storeId', storeId);
      const res = await fetch(`/api/admin/export?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_${storeId ? `store${storeId}_` : 'all_stores_'}${from}_${to}.csv`;
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

  return (
    <div className="space-y-5 max-w-lg">
      <h2 className="text-base font-bold text-[#1a1a2e]">Inventory Data Export</h2>

      {/* Store selector */}
      <div>
        <label className="text-sm font-semibold text-gray-500 block mb-1.5">Target Store</label>
        <select
          value={storeId}
          onChange={e => setStoreId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#16a085]"
        >
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
      </div>

      {/* Quick month buttons */}
      <div>
        <label className="text-sm font-semibold text-gray-500 block mb-1.5">Quick Select</label>
        <div className="flex gap-2 flex-wrap">
          {getQuickMonths().map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setMonth(value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                from === `${value}-01` ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a1a2e]'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => { setFrom(today); setTo(today); }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              from === today && to === today ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a1a2e]'
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold text-gray-500 block mb-1.5">Start Date</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#16a085]" />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-500 block mb-1.5">End Date</label>
          <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#16a085]" />
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-500">
        <strong className="text-gray-700">Output includes: </strong>
        Date / {storeId ? stores.find(s => String(s.id) === storeId)?.name ?? 'Selected Store' : 'All Stores'} / Supplier / Ingredient name / Unit / Current stock / Required qty / Order qty
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full py-3 bg-[#16a085] hover:bg-[#0e7a65] disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {exporting
          ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Exporting...</>
          : <>📥 Download CSV</>
        }
      </button>
    </div>
  );
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [tab, setTab] = useState<TabKey>('stores');

  return (
    <div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-[#1a1a2e] text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1a1a2e]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {tab === 'stores'    && <StoresSection />}
        {tab === 'roles'     && <RolesSection />}
        {tab === 'routine'   && <RoutineSection />}
        {tab === 'inventory' && <InventorySection />}
        {tab === 'cleaning'  && <CleaningSection />}
        {tab === 'export'    && <ExportSection />}
      </div>
    </div>
  );
}
