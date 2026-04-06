import { useState, useEffect } from 'react';

interface ToastItem {
  id: number;
  msg: string;
  type: 'success' | 'error' | 'info';
}

function toastClass(type: ToastItem['type']): string {
  if (type === 'success') return 'bg-[#16a085] text-white';
  if (type === 'error')   return 'bg-red-500 text-white';
  return 'bg-[#1a1a2e] text-white';
}

function toastIcon(type: ToastItem['type']): string {
  if (type === 'success') return '✓';
  if (type === 'error')   return '✕';
  return 'ℹ';
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { msg, type } = (e as CustomEvent<{ msg: string; type: ToastItem['type'] }>).detail;
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs
            transition-all duration-300 pointer-events-auto ${toastClass(t.type)}`}
          style={{ animation: 'slideUp 0.25s ease-out' }}
        >
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
            {toastIcon(t.type)}
          </span>
          {t.msg}
        </div>
      ))}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
