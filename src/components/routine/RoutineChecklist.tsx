import { useState, useEffect, useCallback } from 'react';

type Period = 'morning' | 'evening';

interface RoutineItem {
  id: number;
  title: string;
  sort_order: number;
  checked: boolean;
  checked_at: string | null;
}

interface RoleGroup {
  role_id: number;
  role_name: string;
  role_sort_order: number;
  items: RoutineItem[];
}

interface Props {
  storeId: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} (${days[d.getDay()]})`;
}

export default function RoutineChecklist({ storeId }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [period, setPeriod] = useState<Period>('morning');
  const [groups, setGroups] = useState<RoleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(new Set<number>());
  // Wide screen detection for multi-column layout
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const check = () => setIsWide(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/routine?period=${p}&date=${today}`);
      const json = await res.json() as { roles: RoleGroup[] };
      setGroups(json.roles);
    } finally {
      setLoading(false);
    }
  }, [storeId, today]);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  const toggle = async (item: RoutineItem) => {
    if (toggling.has(item.id)) return;
    const newChecked = !item.checked;

    setGroups(prev => prev.map(g => ({
      ...g,
      items: g.items.map(i => i.id === item.id ? { ...i, checked: newChecked } : i),
    })));
    setToggling(prev => new Set(prev).add(item.id));

    try {
      await fetch(`/api/stores/${storeId}/routine/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routineItemId: item.id, date: today, checked: newChecked }),
      });
    } catch {
      setGroups(prev => prev.map(g => ({
        ...g,
        items: g.items.map(i => i.id === item.id ? { ...i, checked: item.checked } : i),
      })));
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    }
  };

  const totalChecked = groups.reduce((s, g) => s + g.items.filter(i => i.checked).length, 0);
  const totalItems = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Period toggle */}
        <div className="inline-flex rounded-xl bg-gray-100 p-1 gap-1">
          {(['morning', 'evening'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                period === p
                  ? p === 'morning'
                    ? 'bg-amber-400 text-white shadow-sm'
                    : 'bg-[#1a1a2e] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{p === 'morning' ? '☀️' : '🌙'}</span>
              {p === 'morning' ? 'Morning' : 'Evening'}
            </button>
          ))}
        </div>

        <div className="text-right">
          <p className="text-sm font-medium text-[#1a1a2e]">{formatDate(today)}</p>
          {!loading && totalItems > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              Total: <span className={`font-bold ${totalChecked === totalItems ? 'text-[#16a085]' : 'text-gray-600'}`}>{totalChecked}</span>/{totalItems} done
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#16a085] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">{period === 'morning' ? '☀️' : '🌙'}</p>
          <p>No routine items registered.</p>
        </div>
      ) : (
        /* ── Multi-column grid on wide screens, stacked on mobile ── */
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: isWide
              ? `repeat(${groups.length}, minmax(0, 1fr))`
              : '1fr',
          }}
        >
          {groups.map(group => {
            const checkedCount = group.items.filter(i => i.checked).length;
            const total = group.items.length;
            const allDone = checkedCount === total && total > 0;
            const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

            return (
              <div
                key={group.role_id}
                className={`bg-white rounded-xl border-2 flex flex-col transition-all ${
                  allDone ? 'border-[#16a085]' : 'border-gray-200'
                }`}
              >
                {/* Role header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl border-b ${
                  allDone ? 'bg-[#16a085]/10 border-[#16a085]/20' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {allDone ? (
                      <span className="w-5 h-5 rounded-full bg-[#16a085] flex items-center justify-center text-white text-[10px] flex-shrink-0">✓</span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-[#1a1a2e] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {group.role_sort_order}
                      </span>
                    )}
                    <span className={`font-bold text-xs truncate ${allDone ? 'text-[#16a085]' : 'text-[#1a1a2e]'}`}>
                      {group.role_name}
                    </span>
                  </div>
                  {/* Progress */}
                  <span className={`text-xs font-bold tabular-nums flex-shrink-0 ml-1 ${allDone ? 'text-[#16a085]' : 'text-gray-500'}`}>
                    {checkedCount}/{total}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-gray-100">
                  <div
                    className={`h-full transition-all duration-500 ${allDone ? 'bg-[#16a085]' : 'bg-amber-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Items */}
                <div className="flex flex-col divide-y divide-gray-100 flex-1">
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggle(item)}
                      disabled={toggling.has(item.id)}
                      className={`flex items-center gap-2 px-3 py-2 text-left transition-colors last:rounded-b-xl ${
                        item.checked ? 'bg-[#16a085]/5' : 'hover:bg-gray-50 active:bg-gray-100'
                      } ${toggling.has(item.id) ? 'opacity-60' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        item.checked ? 'bg-[#16a085] border-[#16a085]' : 'border-gray-300'
                      }`}>
                        {item.checked && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      {/* Title */}
                      <span className={`text-xs leading-tight flex-1 transition-colors ${
                        item.checked ? 'line-through text-gray-400' : 'text-gray-700'
                      }`}>
                        {item.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
