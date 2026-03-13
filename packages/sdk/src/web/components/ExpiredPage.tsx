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
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.expired} />
      <div className="daimo-flex-1 daimo-flex daimo-flex-col daimo-items-center daimo-justify-center daimo-p-6 daimo-gap-6">
        <div
          className="daimo-w-20 daimo-h-20 daimo-rounded-full daimo-flex daimo-items-center daimo-justify-center"
          style={{ backgroundColor: "var(--daimo-error-light)" }}
        >
          <ExpiredIcon />
        </div>
        <p className="daimo-text-[var(--daimo-text-secondary)]">
          {t.paymentSessionExpired}
        </p>
        {onClose && (
          <SecondaryButton onClick={onClose}>{t.close}</SecondaryButton>
        )}
      </div>
      <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-flex-col daimo-items-center">
        <ContactSupportButton subject="Expired session" info={{ sessionId }} />
      </div>
    </div>
  );
}
