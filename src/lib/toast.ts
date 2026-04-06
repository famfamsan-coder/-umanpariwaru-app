export type ToastType = 'success' | 'error' | 'info';

export function toast(msg: string, type: ToastType = 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { msg, type } }));
}
