import type { NavNodeDeeplink } from "../api/navTree.js";

import { isDesktopBrowser } from "../isDesktopBrowser.js";
import { ExternalLinkIcon, PrimaryButton } from "./buttons.js";
import { t } from "../hooks/locale.js";
import { CenteredContent, PageHeader, PageLogo, resolveIconUrl } from "./shared.js";
import { QRCode } from "./QRCode.js";

type DeeplinkPageProps = {
  node: NavNodeDeeplink;
  onBack: (() => void) | null;
  baseUrl: string;
};

/** Mobile wallet deeplink page. Opens directly on mobile; shows as QR code on desktop. */
export function DeeplinkPage({ node, onBack, baseUrl }: DeeplinkPageProps) {
  const desktop = isDesktopBrowser();

  if (desktop) {
    return (
      <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
        <PageHeader title={node.title} onBack={onBack ?? undefined} />
        <CenteredContent>
          <div className="daimo-w-full daimo-max-w-[200px] sm:daimo-max-w-[260px]">
            <QRCode
              value={node.url}
              image={
                node.icon ? (
                  <img
                    src={resolveIconUrl(node.icon, baseUrl)}
                    alt={node.title}
                    className="daimo-w-full daimo-h-full daimo-object-contain daimo-rounded-[25%]"
                  />
                ) : undefined
              }
            />
          </div>
          <p className="daimo-text-[var(--daimo-text-secondary)] daimo-text-center daimo-max-w-xs daimo-text-sm">
            {t.scanWithPhone}
          </p>
        </CenteredContent>
      </div>
    );
  }

  const openDeeplink = () => {
    if (node.url) {
      window.open(node.url, "_blank");
    }
  };

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={node.title} onBack={onBack ?? undefined} />
      <CenteredContent>
        {node.icon && <PageLogo icon={node.icon} alt={node.title} baseUrl={baseUrl} />}
        <p className="daimo-text-[var(--daimo-text-secondary)] daimo-text-center daimo-max-w-xs">
          {t.continueIn} {node.title} {t.toCompleteYourPayment}
        </p>
        <PrimaryButton onClick={openDeeplink} icon={<ExternalLinkIcon />}>
          {t.openIn} {node.title}
        </PrimaryButton>
      </CenteredContent>
    </div>
  );
}
