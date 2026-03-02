import { SecondaryButton } from "./buttons.js";
import { ExpiredIcon } from "./icons.js";
import { t } from "../hooks/locale.js";
import { ContactSupportButton, PageHeader } from "./shared.js";

type ExpiredPageProps = {
  sessionId: string;
  onClose?: () => void;
};

/**
 * Expired page shown when a payment session times out.
 */
export function ExpiredPage({ sessionId, onClose }: ExpiredPageProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={t.expired} />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--daimo-error-light)" }}
        >
          <ExpiredIcon />
        </div>
        <p className="text-[var(--daimo-text-secondary)]">
          {t.paymentSessionExpired}
        </p>
        {onClose && (
          <SecondaryButton onClick={onClose}>{t.close}</SecondaryButton>
        )}
      </div>
      <div className="px-6 pb-6 flex flex-col items-center">
        <ContactSupportButton subject="Expired session" info={{ sessionId }} />
      </div>
    </div>
  );
}
