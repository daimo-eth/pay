import { useCallback, useMemo, useState } from "react";

import type { AccountRegion, DepositInstitution } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { useCreateDeposit } from "../../hooks/useCreateDeposit.js";
import { ErrorPage } from "../ErrorPage.js";
import { PageHeader, ScrollContent, TextInput } from "../shared.js";
import { openDeeplink } from "./openDeeplink.js";

type AccountBankPickerPageProps = {
  region: AccountRegion;
  sessionId: string;
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
    const featured = institutions.filter((i) => i.featured ?? i.logoURI != null);
    return query
      ? featured.filter((i) => i.name.toLowerCase().includes(query))
      : featured;
  }, [institutions, query]);

  const filteredOther = useMemo(() => {
    const other = institutions.filter((i) => !(i.featured ?? i.logoURI != null));
    return query
      ? other.filter((i) => i.name.toLowerCase().includes(query))
      : other;
  }, [institutions, query]);

  const handleSelect = useCallback(
    (institution: DepositInstitution) => {
      if (!accountFlow?.depositState) return;

      accountFlow.setDepositState({
        ...accountFlow.depositState,
        selectedInstitutionId: institution.id,
      });

      openDeeplink(institution.deeplink);
      onSelect();
    },
    [accountFlow, onSelect],
  );

  const skeletonBg = "var(--daimo-skeleton, #e5e7eb)";

  if (error) {
    return (
      <ErrorPage
        message={t.errorDepositFailed}
        retryText={t.tryAgain}
        onRetry={() => window.location.reload()}
        hideSupport
      />
    );
  }

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountSelectBank} onBack={onBack} />

      <ScrollContent>
        <div className="daimo-px-6 daimo-pt-3">
          <TextInput
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.accountSearchInstitutions}
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
            : filteredFeatured.map((inst) => (
                <InstitutionTile
                  key={inst.id}
                  institution={inst}
                  onSelect={handleSelect}
                />
              ))}
        </div>

        {/* Other banks — text list (hidden while loading) */}
        {!isCreating && filteredOther.length > 0 && (
          <div className="daimo-px-6 daimo-pb-3 daimo-flex daimo-flex-col">
            <p className="daimo-text-xs daimo-text-[var(--daimo-text-muted)] daimo-mb-2">
              {t.accountOtherInstitutions}
            </p>
            {filteredOther.map((inst) => (
              <InstitutionRow
                key={inst.id}
                institution={inst}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </ScrollContent>
    </div>
  );
}

type InstitutionProps = {
  institution: DepositInstitution;
  onSelect: (inst: DepositInstitution) => void;
};

/** Featured institution as a logo tile. Falls back to name text if logo fails. */
function InstitutionTile({ institution, onSelect }: InstitutionProps) {
  return (
    <button
      onClick={() => onSelect(institution)}
      className="daimo-flex daimo-items-center daimo-justify-center daimo-p-3 daimo-rounded-[var(--daimo-radius-md)] daimo-bg-[var(--daimo-surface-secondary)] hover:daimo-bg-[var(--daimo-surface-hover)] daimo-transition-colors daimo-min-h-[56px]"
    >
      {institution.logoURI ? (
        <img
          src={institution.logoURI}
          alt={institution.name}
          className="daimo-h-8 daimo-max-w-[88px] daimo-object-contain"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
            if (el.parentElement) el.parentElement.textContent = institution.name;
          }}
        />
      ) : (
        <span className="daimo-text-xs daimo-font-medium daimo-text-[var(--daimo-text)]">
          {institution.name}
        </span>
      )}
    </button>
  );
}

/** Non-featured institution as a text row. */
function InstitutionRow({ institution, onSelect }: InstitutionProps) {
  return (
    <button
      onClick={() => onSelect(institution)}
      className="daimo-text-left daimo-py-2 daimo-px-3 daimo-text-sm daimo-text-[var(--daimo-text)] daimo-rounded-[var(--daimo-radius-sm)] hover:daimo-bg-[var(--daimo-surface-hover)] daimo-transition-colors"
    >
      {institution.name}
    </button>
  );
}
