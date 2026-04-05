import type { AccountRegion } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { t } from "../../hooks/locale.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { useDepositPoller } from "../../hooks/useDepositPoller.js";
import { isDesktop, type DaimoPlatform } from "../../platform.js";
import { PrimaryButton } from "../buttons.js";
import { ExternalLinkIcon } from "../icons.js";
import { QRCode } from "../QRCode.js";
import { CenteredContent, PageHeader, resolveIconUrl } from "../shared.js";
import { openDeeplink } from "./openDeeplink.js";

type AccountDeeplinkPageProps = {
  region: AccountRegion;
  sessionId: string;
  clientSecret: string;
  baseUrl: string;
  platform: DaimoPlatform;
  icon?: string;
  onBack: () => void;
  onAdvance: () => void;
};

/** Waiting screen — bank was already opened. Polls deposit status. */
export function AccountDeeplinkPage({
  sessionId,
  clientSecret,
  baseUrl,
  platform,
  icon,
  onBack,
  onAdvance,
}: AccountDeeplinkPageProps) {
  const client = useDaimoClient();
  const accountFlow = useAccountFlow();

  const depositState = accountFlow?.depositState;
  const bankUrl = depositState?.payment?.qrUrl;
  const desktop = isDesktop(platform);

  // Find the selected institution's deeplink for the "Open" button
  const selectedInstitution = depositState?.payment?.institutions.find(
    (inst) => inst.id === depositState?.selectedInstitutionId,
  );

  useDepositPoller({
    client,
    sessionId,
    clientSecret,
    onUpdate(deposit) {
      if (
        deposit.status !== "initiated" &&
        deposit.status !== "awaiting_payment"
      ) {
        onAdvance();
      }
    },
  });

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.accountBankTransfer} onBack={onBack} />
      <CenteredContent>
        <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-4">
          {desktop && bankUrl && (
            <div className="daimo-w-full daimo-max-w-[200px]">
              <QRCode
                value={bankUrl}
                image={
                  icon ? (
                    <img
                      src={resolveIconUrl(icon, baseUrl)}
                      alt=""
                      className="daimo-w-full daimo-h-full daimo-object-contain"
                    />
                  ) : undefined
                }
              />
            </div>
          )}
          <p className="daimo-text-sm daimo-text-[var(--daimo-text-secondary)] daimo-text-center daimo-max-w-xs">
            {depositState?.payment?.instructions}
          </p>
          {selectedInstitution && (
            <PrimaryButton
              onClick={() => openDeeplink(selectedInstitution.deeplink, platform)}
              icon={<ExternalLinkIcon size={14} />}
            >
              {t.open} {selectedInstitution.name}
            </PrimaryButton>
          )}
        </div>
      </CenteredContent>
    </div>
  );
}
