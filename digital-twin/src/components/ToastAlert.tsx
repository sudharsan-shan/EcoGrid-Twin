import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useSimStore } from '../store/simStore';
import { useTwinData } from '../hooks/useTwinData';

export const ToastAlert: React.FC = () => {
  const { alerts } = useTwinData();
  const toastMessage = useSimStore((s) => s.toastMessage);
  const setToastMessage = useSimStore((s) => s.setToastMessage);

  const [visible, setVisible] = useState(false);
  const [currentText, setCurrentText] = useState<string | null>(null);

  // Trigger toast on new alert or message
  useEffect(() => {
    if (toastMessage) {
      setCurrentText(toastMessage);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    } else if (alerts.length > 0) {
      const topAlert = alerts[0];
      setCurrentText(`${topAlert.title}: ${topAlert.message}`);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, alerts, setToastMessage]);

  if (!visible || !currentText) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className="toast-box">
        <AlertCircle size={18} color="var(--color-red)" />
        <span style={{ fontSize: '12px', flex: 1, color: 'var(--text-primary)' }}>
          {currentText}
        </span>
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
