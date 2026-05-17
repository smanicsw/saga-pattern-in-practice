import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal" role="dialog">
        <header className="modal-header">
          <h2>{title}</h2>
          <button
            aria-label="Close"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
