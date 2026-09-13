import { useFridge } from "../context/useFridge";

export default function Toast() {
  const { toast } = useFridge();

  if (!toast) return null;

  return (
    <div className="toast-notification">
      <span className="toast-icon">{toast.icon}</span>
      <span className="toast-message">{toast.message}</span>
    </div>
  );
}
