'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Toast } from 'react-bootstrap';

type Tone = 'success' | 'danger' | 'info';
type Item = { id: number; tone: Tone; message: string };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);

  const notify = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, tone, message }]);
  }, []);

  const icon = { success: 'bi-check-circle-fill text-success', danger: 'bi-exclamation-octagon-fill text-danger', info: 'bi-info-circle-fill text-primary' };

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toast-stack d-flex flex-column gap-2" aria-live="polite">
        {items.map((t) => (
          <Toast key={t.id} onClose={() => setItems((l) => l.filter((x) => x.id !== t.id))} delay={4500} autohide>
            <Toast.Body className="d-flex gap-2 align-items-start">
              <i className={`bi ${icon[t.tone]} mt-1`} />
              <span className="flex-grow-1">{t.message}</span>
              <button type="button" className="btn-close btn-sm" aria-label="Close" onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} />
            </Toast.Body>
          </Toast>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
