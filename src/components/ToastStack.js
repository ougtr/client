import { useEffect } from 'react';

const DEFAULT_TIMEOUT = 3200;

const ToastStack = ({ toasts = [], onDismiss }) => {
  useEffect(() => {
    if (!toasts.length || !onDismiss) {
      return undefined;
    }

    const timers = toasts
      .filter((toast) => toast.id)
      .map((toast) => {
        const timeout = Number(toast.timeoutMs) > 0 ? Number(toast.timeoutMs) : DEFAULT_TIMEOUT;
        return window.setTimeout(() => onDismiss(toast.id), timeout);
      });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, onDismiss]);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => {
        const type = toast.type || 'info';
        return (
          <div key={toast.id} className={`toast toast-${type}`}>
            <span className="toast-message">{toast.message}</span>
            <button type="button" className="toast-close" onClick={() => onDismiss?.(toast.id)} aria-label="Fermer">
              x
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastStack;