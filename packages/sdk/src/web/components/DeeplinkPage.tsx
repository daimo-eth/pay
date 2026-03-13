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
      <div className="flex flex-col flex-1 min-h-0">
        <PageHeader title={node.title} onBack={onBack ?? undefined} />
        <CenteredContent>
          <div className="w-full max-w-[200px] sm:max-w-[260px]">
            <QRCode
              value={node.url}
              image={
                node.icon ? (
                  <img
                    src={resolveIconUrl(node.icon, baseUrl)}
                    alt={node.title}
                    className="w-full h-full object-contain rounded-[25%]"
                  />
                ) : undefined
              }
            />
          </div>
          <p className="text-[var(--daimo-text-secondary)] text-center max-w-xs text-sm">
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
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={node.title} onBack={onBack ?? undefined} />
      <CenteredContent>
        {node.icon && <PageLogo icon={node.icon} alt={node.title} baseUrl={baseUrl} />}
        <p className="text-[var(--daimo-text-secondary)] text-center max-w-xs">
          {t.continueIn} {node.title} {t.toCompleteYourPayment}
        </p>
        <PrimaryButton onClick={openDeeplink} icon={<ExternalLinkIcon />}>
          {t.openIn} {node.title}
        </PrimaryButton>
      </CenteredContent>
    </div>
  );
}
