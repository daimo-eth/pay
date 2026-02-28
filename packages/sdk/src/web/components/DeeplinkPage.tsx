import type { NavNodeDeeplink } from "../api/navTree.js";

import { ExternalLinkIcon, PrimaryButton } from "./buttons.js";
import { t } from "../hooks/locale.js";
import { PageContent, PageHeader, PageLogo } from "./shared.js";

type DeeplinkPageProps = {
  node: NavNodeDeeplink;
  onBack: (() => void) | null;
};

export function DeeplinkPage({ node, onBack }: DeeplinkPageProps) {
  const openDeeplink = () => {
    if (node.url) {
      window.open(node.url, "_blank");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={node.title} onBack={onBack ?? undefined} />
      <PageContent>
        {node.icon && <PageLogo icon={node.icon} alt={node.title} />}
        <p className="text-[var(--daimo-text-secondary)] text-center max-w-xs">
          {t.continueIn} {node.title} {t.toCompleteYourPayment}
        </p>
        <PrimaryButton onClick={openDeeplink} icon={<ExternalLinkIcon />}>
          {t.openIn} {node.title}
        </PrimaryButton>
      </PageContent>
    </div>
  );
}
