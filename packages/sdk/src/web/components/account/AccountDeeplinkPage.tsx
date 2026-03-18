import type { AccountRegion } from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { useAccountFlow } from "../../hooks/useAccountFlow.js";
import { useDepositPoller } from "../../hooks/useDepositPoller.js";
import { isDesktopBrowser } from "../../isDesktopBrowser.js";
import { QRCode } from "../QRCode.js";
import { CenteredContent, PageHeader, resolveIconUrl } from "../shared.js";

type AccountDeeplinkPageProps = {
  region: AccountRegion;
  sessionId: string;
  clientSecret: string;
  baseUrl: string;
  onBack: () => void;
  onAdvance: () => void;
};

/** Waiting screen — bank was already opened. Polls deposit status. */
export function AccountDeeplinkPage({
  sessionId,
  clientSecret,
  baseUrl,
  onBack,
  onAdvance,
}: AccountDeeplinkPageProps) {
  const client = useDaimoClient();
  const accountFlow = useAccountFlow();

  const depositState = accountFlow?.depositState;
  const bankUrl = depositState?.payment?.qrUrl;
  const desktop = isDesktopBrowser();

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
      <PageHeader title="Bank Transfer" onBack={onBack} />
      <CenteredContent>
        <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-4">
          {desktop && bankUrl && (
            <div className="daimo-w-full daimo-max-w-[200px]">
              <QRCode
                value={bankUrl}
                image={
                  <img
                    src={resolveIconUrl("/payment-logos/interac.svg", baseUrl)}
                    alt="Interac"
                    className="daimo-w-full daimo-h-full daimo-object-contain"
                  />
                }
              />
            </div>
          )}
          <p className="daimo-text-sm daimo-text-[var(--daimo-text-secondary)] daimo-text-center daimo-max-w-xs">
            {depositState?.payment?.instructions}
          </p>
        </div>
      </CenteredContent>
    </div>
  );
}
