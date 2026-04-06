import { useState, useEffect, useRef, useMemo } from 'react';

interface Task {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
}

interface Props {
  storeId: number;
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} (${days[d.getDay()]})`;
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
    </svg>
  );
}

export default function DailyTasks({ storeId }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set<number>());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/stores/${storeId}/tasks?date=${today}`)
      .then(r => r.json())
      .then((data: { tasks: Task[] }) => {
        setTasks(data.tasks);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [storeId, today]);

  const addTask = async () => {
    const title = input.trim();
    if (!title || adding) return;

    setAdding(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date: today }),
      });
      const { task } = await res.json() as { task: Task };
      setTasks(prev => [task, ...prev]);
      setInput('');
      inputRef.current?.focus();
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addTask();
  };

  const toggleTask = async (task: Task) => {
    const newCompleted = !task.completed;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t));

    await fetch(`/api/stores/${storeId}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: newCompleted }),
    }).catch(() => {
      // Revert on error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t));
    });
  };

  const deleteTask = async (taskId: number) => {
    setDeletingIds(prev => new Set(prev).add(taskId));
    // Brief visual delay for feedback
    await new Promise(r => setTimeout(r, 150));
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setDeletingIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });

    await fetch(`/api/stores/${storeId}/tasks/${taskId}`, { method: 'DELETE' });
  };

  // Sort: incomplete (newest first) → complete (newest first)
  const sorted = useMemo(() => {
    const incomplete = tasks.filter(t => !t.completed);
    const complete = tasks.filter(t => t.completed);
    return [...incomplete, ...complete];
  }, [tasks]);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="max-w-2xl">
      {/* Date header */}
      <div className="mb-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Today</p>
        <h2 className="text-xl font-bold text-[#1a1a2e]">{formatDate(today)}</h2>
        {!loading && totalCount > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            <span className={`font-semibold ${completedCount === totalCount ? 'text-[#16a085]' : 'text-[#1a1a2e]'}`}>
              {completedCount}
            </span>
            <span> / {totalCount} completed</span>
            {completedCount === totalCount && totalCount > 0 && (
              <span className="ml-2 text-[#16a085] font-medium">🎉 All done!</span>
            )}
          </p>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2 mb-6">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task..."
          maxLength={100}
          className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16a085] focus:border-transparent transition bg-white"
        />
        <button
          onClick={addTask}
          disabled={!input.trim() || adding}
          className="px-5 py-3 bg-[#16a085] hover:bg-[#0e7a65] disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center gap-1.5 flex-shrink-0"
        >
          {adding ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-lg leading-none">+</span>
          )}
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-4 border-[#16a085] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-gray-400 text-sm">Add today's tasks</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Section label: incomplete */}
          {tasks.some(t => !t.completed) && (
            <p className="text-xs font-medium text-gray-400 px-1 mb-1">Incomplete</p>
          )}

          {sorted.map((task, idx) => {
            const isFirstComplete = idx > 0 && task.completed && !sorted[idx - 1]?.completed;
            const isDeleting = deletingIds.has(task.id);

            return (
              <div key={task.id}>
                {/* Divider between incomplete / complete */}
                {isFirstComplete && tasks.some(t => t.completed) && tasks.some(t => !t.completed) && (
                  <p className="text-xs font-medium text-gray-400 px-1 pt-3 pb-1">Completed</p>
                )}

                <div
                  className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3.5 transition-all ${
                    task.completed ? 'border-gray-100 opacity-75' : 'border-gray-200 shadow-sm'
                  } ${isDeleting ? 'scale-95 opacity-40' : ''}`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(task)}
                    className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      task.completed
                        ? 'bg-[#16a085] border-[#16a085]'
                        : 'border-gray-300 hover:border-[#16a085]'
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  {/* Title */}
                  <span
                    className={`flex-1 text-sm transition-colors break-all ${
                      task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}
                  >
                    {task.title}
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={() => deleteTask(task.id)}
                    disabled={isDeleting}
                    className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom summary */}
      {!loading && totalCount > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm text-gray-400 border-t border-gray-100 pt-4">
          <span>{totalCount} tasks</span>
          <span className="text-[#16a085] font-medium">{completedCount} completed</span>
        </div>
      )}
    </div>
  );
}
