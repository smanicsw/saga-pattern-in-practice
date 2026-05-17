import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export function Message({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <div className={`message message-${tone}`}>
      {tone === "danger" ? <AlertCircle size={18} /> : null}
      <span>{children}</span>
    </div>
  );
}
