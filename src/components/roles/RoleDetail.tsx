import { useState, useEffect } from 'react';

type Tab = 'manual' | 'checklist' | 'responsibility' | 'tasks';

interface Item {
  id: number;
  title: string;
  sort_order: number;
  checked: number;
}

interface RoleData {
  id: number;
  name: string;
  manual_content: string | null;
  responsibility_content: string | null;
  checklist_items: Item[];
  task_items: Item[];
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'manual', label: 'Manual', icon: '📖' },
  { key: 'checklist', label: 'Checklist', icon: '☑️' },
  { key: 'responsibility', label: 'Responsibility', icon: '🎯' },
  { key: 'tasks', label: 'Tasks', icon: '📋' },
];

interface Props {
  roleId: number;
  storeId: number;
}

export default function RoleDetail({ roleId, storeId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [data, setData] = useState<RoleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stores/${storeId}/roles/${roleId}`)
      .then(r => r.json())
      .then((json: RoleData) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [roleId, storeId]);

  const toggle = async (itemId: number, itemType: 'checklist' | 'task') => {
    setToggling(itemId);
    const today = new Date().toISOString().split('T')[0];

    try {
      const res = await fetch(`/api/stores/${storeId}/roles/${roleId}/checklist/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, itemType, date: today }),
      });
      const { checked } = await res.json() as { checked: boolean };

      setData(prev => {
        if (!prev) return prev;
        const update = (items: Item[]) =>
          items.map(item => item.id === itemId ? { ...item, checked: checked ? 1 : 0 } : item);
        return {
          ...prev,
          checklist_items: itemType === 'checklist' ? update(prev.checklist_items) : prev.checklist_items,
          task_items: itemType === 'task' ? update(prev.task_items) : prev.task_items,
        };
      });
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#16a085] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-400">Data not found</div>;
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#16a085] text-[#16a085]'
                : 'border-transparent text-gray-500 hover:text-[#1a1a2e]'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Manual */}
      {activeTab === 'manual' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {data.manual_content ? (
            <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
              {data.manual_content}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-6">No manual registered yet</p>
          )}
        </div>
      )}

      {/* Checklist */}
      {activeTab === 'checklist' && (
        <div className="space-y-2">
          {data.checklist_items.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No checklist items yet</p>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                {data.checklist_items.filter(i => i.checked).length} / {data.checklist_items.length} completed
              </p>
              {data.checklist_items.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id, 'checklist')}
                  disabled={toggling === item.id}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    item.checked
                      ? 'bg-[#16a085]/10 border-[#16a085]/30'
                      : 'bg-white border-gray-200 hover:border-[#16a085]/40 active:scale-[0.99]'
                  } ${toggling === item.id ? 'opacity-60' : ''}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    item.checked ? 'bg-[#16a085] border-[#16a085]' : 'border-gray-300'
                  }`}>
                    {item.checked && <span className="text-white text-xs leading-none">✓</span>}
                  </div>
                  <span className={`text-sm transition-colors ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.title}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Responsibility */}
      {activeTab === 'responsibility' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {data.responsibility_content ? (
            <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
              {data.responsibility_content}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-6">No responsibility content registered yet</p>
          )}
        </div>
      )}

      {/* Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-2">
          {data.task_items.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No task items yet</p>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                {data.task_items.filter(i => i.checked).length} / {data.task_items.length} completed
              </p>
              {data.task_items.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id, 'task')}
                  disabled={toggling === item.id}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    item.checked
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-gray-200 hover:border-amber-300 active:scale-[0.99]'
                  } ${toggling === item.id ? 'opacity-60' : ''}`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    item.checked ? 'bg-amber-500 border-amber-500' : 'border-gray-300'
                  }`}>
                    {item.checked && <span className="text-white text-xs leading-none">✓</span>}
                  </div>
                  <span className={`text-sm transition-colors ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {item.title}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
