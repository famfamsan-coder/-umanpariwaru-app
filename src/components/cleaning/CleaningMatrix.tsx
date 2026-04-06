import { useState, useEffect, useCallback, useMemo } from 'react';

type Status = 'scheduled' | 'completed' | 'incomplete' | 'passed';

interface ScheduleEntry { id: number; status: Status; }
interface Spot {
  id: number;
  name: string;
  sort_order: number;
  schedule: Record<string, ScheduleEntry>;
}
interface Role { id: number; name: string; sort_order: number; }

interface Props { storeId: number; }

const NEXT: Record<Status, Status> = {
  scheduled: 'completed',
  completed:  'incomplete',
  incomplete: 'passed',
  passed:     'scheduled',
};

function cellClass(status: Status | null): string {
  if (!status)           return 'bg-gray-100 text-gray-300 cursor-default';
  if (status === 'completed')  return 'bg-green-500 text-white cursor-pointer';
  if (status === 'incomplete') return 'bg-red-500 text-white cursor-pointer';
  if (status === 'passed')     return 'bg-yellow-400 text-gray-700 cursor-pointer';
  /* scheduled */              return 'bg-white border border-gray-300 text-gray-400 cursor-pointer';
}
function cellLabel(status: Status | null): string {
  if (!status)           return '';
  if (status === 'completed')  return '✓';
  if (status === 'incomplete') return '✗';
  if (status === 'passed')     return '→';
  return 'O';
}

function prevMonthStr(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
}
function nextMonthStr(m: string) {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
}
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CleaningMatrix({ storeId }: Props) {
  const todayStr = new Date().toISOString().split('T')[0];
  const initialMonth = todayStr.slice(0, 7);

  const [activeMonth, setActiveMonth] = useState(initialMonth);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRoleIdx, setActiveRoleIdx] = useState(0);
  const [spots, setSpots] = useState<Spot[]>([]);
  // Local schedule map: spotId → date → entry
  const [localSchedule, setLocalSchedule] = useState<Record<number, Record<string, ScheduleEntry>>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(new Set<string>()); // "spotId:date"

  // Generate all days for the active month
  const days = useMemo(() => {
    const [y, m] = activeMonth.split('-').map(Number);
    const count = new Date(y, m, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const d = i + 1;
      const date = `${activeMonth}-${String(d).padStart(2, '0')}`;
      const dow = new Date(y, m - 1, d).getDay();
      return { d, date, dow };
    });
  }, [activeMonth]);

  const fetchData = useCallback(async (month: string, roleId: number | null) => {
    setLoading(true);
    try {
      const rid = roleId ?? '';
      const res = await fetch(`/api/stores/${storeId}/cleaning?month=${month}&roleId=${rid}`);
      const json = await res.json() as { roles: Role[]; spots: Spot[]; };

      if (json.roles.length && !roleId) {
        // Initial load: set roles then re-fetch with first role
        setRoles(json.roles);
        setActiveRoleIdx(0);
        return;
      }
      setRoles(json.roles);
      setSpots(json.spots);

      // Initialize local schedule from API data
      const map: Record<number, Record<string, ScheduleEntry>> = {};
      for (const spot of json.spots) {
        map[spot.id] = { ...spot.schedule };
      }
      setLocalSchedule(map);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  // Initial load: get roles first
  useEffect(() => {
    fetchData(activeMonth, null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when month or role changes
  useEffect(() => {
    if (!roles.length) return;
    const roleId = roles[activeRoleIdx]?.id;
    if (roleId) fetchData(activeMonth, roleId);
  }, [activeMonth, activeRoleIdx, roles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCellTap = async (spot: Spot, date: string) => {
    const entry = localSchedule[spot.id]?.[date];
    if (!entry) return; // unset — not tappable

    const key = `${spot.id}:${date}`;
    if (toggling.has(key)) return;

    const nextStatus = NEXT[entry.status];

    // Optimistic update
    setLocalSchedule(prev => ({
      ...prev,
      [spot.id]: { ...prev[spot.id], [date]: { ...entry, status: nextStatus } },
    }));
    setToggling(prev => new Set(prev).add(key));

    try {
      await fetch(`/api/stores/${storeId}/cleaning/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      // Revert
      setLocalSchedule(prev => ({
        ...prev,
        [spot.id]: { ...prev[spot.id], [date]: entry },
      }));
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const [y, m] = activeMonth.split('-').map(Number);

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setActiveMonth(prevMonthStr(activeMonth))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600 font-bold text-lg"
        >‹</button>
        <h2 className="text-lg font-bold text-[#1a1a2e]">{y}/{String(m).padStart(2, '0')}</h2>
        <button
          onClick={() => setActiveMonth(nextMonthStr(activeMonth))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600 font-bold text-lg"
        >›</button>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {roles.map((role, idx) => (
          <button
            key={role.id}
            onClick={() => setActiveRoleIdx(idx)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeRoleIdx === idx
                ? 'bg-[#1a1a2e] text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#1a1a2e]'
            }`}
          >
            {role.name}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {[
          { status: 'scheduled' as Status, label: 'O  Scheduled' },
          { status: 'completed' as Status, label: '✓ Completed' },
          { status: 'incomplete' as Status, label: '✗ Incomplete' },
          { status: 'passed' as Status, label: '→ Passed' },
        ].map(({ status, label }) => (
          <span key={status} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cellClass(status)}`}>
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">— Not set</span>
      </div>

      {/* Matrix */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#16a085] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : spots.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No cleaning spots registered yet</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs" style={{ minWidth: `${160 + days.length * 44}px` }}>
              {/* Header row */}
              <thead>
                <tr className="bg-[#1a1a2e]">
                  {/* Sticky spot-name column */}
                  <th
                    className="sticky left-0 z-20 bg-[#1a1a2e] text-white text-left px-3 py-2.5 font-medium border-r border-white/20"
                    style={{ minWidth: '140px', width: '140px' }}
                  >
                    Location
                  </th>
                  {days.map(({ d, date, dow }) => (
                    <th
                      key={date}
                      className={`text-center py-1.5 font-medium select-none ${
                        date === todayStr
                          ? 'bg-[#16a085] text-white'
                          : dow === 0 ? 'text-red-300' : dow === 6 ? 'text-blue-300' : 'text-white/80'
                      }`}
                      style={{ minWidth: '44px', width: '44px' }}
                    >
                      <div>{d}</div>
                      <div className="text-[10px] opacity-70">{DOW[dow]}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {spots.map((spot, si) => (
                  <tr key={spot.id} className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    {/* Sticky spot name */}
                    <td
                      className="sticky left-0 z-10 px-3 py-1 font-medium text-gray-700 border-r border-gray-200 truncate"
                      style={{
                        minWidth: '140px',
                        width: '140px',
                        backgroundColor: si % 2 === 0 ? 'white' : 'rgb(249,250,251)',
                      }}
                    >
                      {spot.name}
                    </td>

                    {/* Day cells */}
                    {days.map(({ date }) => {
                      const entry = localSchedule[spot.id]?.[date] ?? null;
                      const status = entry?.status ?? null;
                      const key = `${spot.id}:${date}`;
                      const isBusy = toggling.has(key);

                      return (
                        <td
                          key={date}
                          onClick={() => handleCellTap(spot, date)}
                          className={`text-center p-0 transition-all select-none ${isBusy ? 'opacity-60' : ''}`}
                          style={{ minWidth: '44px', width: '44px', height: '44px' }}
                        >
                          <div
                            className={`flex items-center justify-center w-full h-full text-xs font-bold mx-auto rounded-sm ${cellClass(status)}`}
                            style={{ height: '44px' }}
                          >
                            {cellLabel(status)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status summary */}
      {!loading && spots.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
          {(['completed', 'incomplete', 'passed', 'scheduled'] as Status[]).map(s => {
            const count = spots.reduce((acc, spot) => {
              return acc + Object.values(localSchedule[spot.id] ?? {}).filter(e => e.status === s).length;
            }, 0);
            return (
              <div key={s} className={`rounded-xl p-2 border ${
                s === 'completed'  ? 'bg-green-50 border-green-200 text-green-700' :
                s === 'incomplete' ? 'bg-red-50 border-red-200 text-red-700' :
                s === 'passed'     ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                <div className="font-bold text-lg">{count}</div>
                <div className="text-xs">{cellLabel(s)} {s === 'scheduled' ? 'Scheduled' : s === 'completed' ? 'Completed' : s === 'incomplete' ? 'Incomplete' : 'Passed'}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
