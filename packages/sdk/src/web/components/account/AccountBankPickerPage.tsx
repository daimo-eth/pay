import { useCallback, useMemo, useState } from "react";

import type { AccountRegion, DepositInstitution } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { useCreateDeposit } from "../../hooks/useCreateDeposit.js";
import { PageHeader, ScrollContent } from "../shared.js";
import { openDeeplink } from "./openDeeplink.js";

type AccountBankPickerPageProps = {
  region: AccountRegion;
  sessionId: string;
  clientSecret: string;
  baseUrl: string;
  onBack: () => void;
  onSelect: () => void;
};

/**
 * Bank picker with background deposit creation.
 * Shows skeleton tiles while signing + createDeposit runs.
 * On bank click: opens deeplink in new tab + advances to waiting screen.
 */
export function AccountBankPickerPage({
  region,
  sessionId,
  onBack,
  onSelect,
}: AccountBankPickerPageProps) {
  const client = useDaimoClient();
  const accountFlow = useAccountFlow();
  const [search, setSearch] = useState("");

  const depositAmount = accountFlow?.depositState?.depositAmount ?? "";

  const { isCreating, error } = useCreateDeposit({
    client,
    accountFlow,
    sessionId,
    depositAmount,
    region,
  });

  const institutions = accountFlow?.depositState?.payment?.institutions ?? [];
  const query = search.toLowerCase();

  const filteredFeatured = useMemo(() => {
    const featured = institutions.filter((i) => i.featured ?? i.logo != null);
    return query
      ? featured.filter((i) => i.name.toLowerCase().includes(query))
      : featured;
  }, [institutions, query]);

  const filteredOther = useMemo(() => {
    const other = institutions.filter((i) => !(i.featured ?? i.logo != null));
    return query
      ? other.filter((i) => i.name.toLowerCase().includes(query))
      : other;
  }, [institutions, query]);

  const handleSelect = useCallback(
    (institution: DepositInstitution) => {
      if (!accountFlow?.depositState) return;

      accountFlow.setDepositState({
        ...accountFlow.depositState,
        selectedInstitutionId: getInstitutionKey(institution),
      });

      openDeeplink(institution.deeplink);
      onSelect();
    },
    [accountFlow, onSelect],
  );

  const skeletonBg = "var(--daimo-skeleton, #e5e7eb)";

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title="Select Bank" onBack={onBack} />

      {error && (
        <p className="daimo-px-6 daimo-py-2 daimo-text-sm daimo-text-[var(--daimo-error)] daimo-text-center">
          {error}
        </p>
      )}

      <ScrollContent>
        <div className="daimo-px-6 daimo-pt-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search institutions..."
            className="daimo-w-full daimo-px-3 daimo-py-2 daimo-text-sm daimo-bg-[var(--daimo-surface-secondary)] daimo-text-[var(--daimo-text)] daimo-placeholder-[var(--daimo-placeholder)] daimo-rounded-[var(--daimo-radius-md)] daimo-border-none daimo-outline-none focus:daimo-ring-2 focus:daimo-ring-[var(--daimo-accent)] daimo-transition-shadow"
          />
        </div>

        {/* Featured banks — logo tiles or skeletons */}
        <div className="daimo-grid daimo-grid-cols-3 daimo-gap-2 daimo-px-6 daimo-py-3">
          {isCreating
            ? Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="daimo-flex daimo-items-center daimo-justify-center daimo-min-h-[56px] daimo-rounded-[var(--daimo-radius-md)] daimo-animate-daimo-pulse"
                  style={{
                    backgroundColor: skeletonBg,
                    animationDelay: `${(i % 5) * 80}ms`,
                  }}
                />
              ))
            : filteredFeatured.map((institution) => (
                <button
                  key={getInstitutionKey(institution)}
                  onClick={() => handleSelect(institution)}
                  className="daimo-flex daimo-items-center daimo-justify-center daimo-p-3 daimo-rounded-[var(--daimo-radius-md)] daimo-bg-[var(--daimo-surface-secondary)] hover:daimo-bg-[var(--daimo-surface-hover)] daimo-transition-colors daimo-min-h-[56px]"
                >
                  {institution.logo && (
                    <img
                      src={institution.logo}
                      alt={institution.name}
                      className="daimo-h-8 daimo-max-w-[88px] daimo-object-contain"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        el.parentElement!.innerHTML = `<span class="daimo-text-xs daimo-font-medium daimo-text-[var(--daimo-text)]">${institution.name}</span>`;
                      }}
                    />
                  )}
                  {!institution.logo && (
                    <span className="daimo-text-xs daimo-font-medium daimo-text-[var(--daimo-text)]">
                      {institution.name}
                    </span>
                  )}
                </button>
              ))}
        </div>

        {/* Other banks — text list (hidden while loading) */}
        {!isCreating && filteredOther.length > 0 && (
          <div className="daimo-px-6 daimo-pb-3 daimo-flex daimo-flex-col">
            <p className="daimo-text-xs daimo-text-[var(--daimo-text-muted)] daimo-mb-2">
              Other institutions
            </p>
            {filteredOther.map((institution) => (
              <button
                key={getInstitutionKey(institution)}
                onClick={() => handleSelect(institution)}
                className="daimo-text-left daimo-py-2 daimo-px-3 daimo-text-sm daimo-text-[var(--daimo-text)] daimo-rounded-[var(--daimo-radius-sm)] hover:daimo-bg-[var(--daimo-surface-hover)] daimo-transition-colors"
              >
                {institution.name}
              </button>
            ))}
          </div>
        )}
      </ScrollContent>
    </div>
  );
}

/** Derive a stable institution ID across provider payload variants. */
function getInstitutionKey(institution: DepositInstitution): string {
  if (institution.id) return institution.id;
  if (institution.fiId) {
    return institution.cuId
      ? `${institution.fiId}:${institution.cuId}`
      : institution.fiId;
  }
  return institution.name;
}
