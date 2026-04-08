import { t } from "../../hooks/locale.js";
import { CenteredContent, PageHeader } from "../shared.js";

export function AccountReadyPage() {
  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountReadyTitle} onBack={null} />
      <CenteredContent>
        <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-4 daimo-px-6 daimo-text-center">
          <div className="daimo-flex daimo-h-16 daimo-w-16 daimo-items-center daimo-justify-center daimo-rounded-full daimo-bg-[var(--daimo-surface-secondary)]">
            <div className="daimo-h-7 daimo-w-7 daimo-rounded-full daimo-bg-[var(--daimo-accent)]" />
          </div>
          <div className="daimo-flex daimo-flex-col daimo-gap-2">
            <h2 className="daimo-text-xl daimo-font-semibold daimo-text-[var(--daimo-text)]">
              {t.accountReadyHeading}
            </h2>
            <p className="daimo-text-sm daimo-leading-relaxed daimo-text-[var(--daimo-text-secondary)]">
              {t.accountReadyDescription}
            </p>
          </div>
        </div>
      </CenteredContent>
    </div>
  );
}
