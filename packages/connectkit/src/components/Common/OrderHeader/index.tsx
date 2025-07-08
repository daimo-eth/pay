import { getAddressContraction } from "@rozoai/intent-common";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import React from "react";
import { useAccount } from "wagmi";
import {
  Arbitrum,
  Base,
  Ethereum,
  Optimism,
  Polygon,
  Solana,
  Tron,
} from "../../../assets/chains";
import { USDC } from "../../../assets/coins";
import defaultTheme from "../../../constants/defaultTheme";
import { ROUTES } from "../../../constants/routes";
import { useRozoPay } from "../../../hooks/useDaimoPay";
import { usePayContext } from "../../../hooks/usePayContext";
import styled from "../../../styles/styled";
import { formatUsd } from "../../../utils/format";

/** Shows payment amount. */
export const OrderHeader = ({
  minified = false,
  show = "all",
  excludeLogos = [],
}: {
  minified?: boolean;
  show?: "evm" | "solana" | "zkp2p" | "all";
  excludeLogos?: string[];
}) => {
  const { paymentState, route } = usePayContext();
  const { isConnected: isEthConnected, address, connector } = useAccount();
  const {
    connected: isSolanaConnected,
    publicKey,
    wallet: solanaWallet,
  } = useWallet();
  const { senderEnsName } = paymentState;
  const { order } = useRozoPay();

  const ethWalletDisplayName =
    senderEnsName ?? (address ? getAddressContraction(address) : "wallet");
  const solWalletDisplayName = getAddressContraction(
    publicKey?.toBase58() ?? "",
  );
  const orderUsd = order?.destFinalCallTokenAmount.usd;

  const titleAmountContent = (() => {
    if (paymentState.isDepositFlow) {
      return route === ROUTES.SELECT_TOKEN ? (
        // TODO: make this match `ModalH1` font size for mobile
        <span style={{ fontSize: "19px", lineHeight: "22px" }}>
          Your balances
        </span>
      ) : null;
    } else {
      return orderUsd != null ? (
        <span>{formatUsd(orderUsd, "nearest")}</span>
      ) : null;
    }
  })();

  const renderIcon = (
    icon: React.ReactNode | string | undefined,
    name?: string,
    size = 32,
  ): JSX.Element | null => {
    if (!icon) {
      return null;
    }

    return (
      <LogoContainer $size={size} $zIndex={1} style={{ borderRadius: "22.5%" }}>
        {typeof icon === "string" ? (
          <img
            src={icon}
            alt={name || "wallet"}
            style={{ maxWidth: "100%", maxHeight: "100%" }}
          />
        ) : (
          icon
        )}
      </LogoContainer>
    );
  };

  let walletIcon = renderIcon(connector?.icon);
  let solanaIcon = renderIcon(
    solanaWallet?.adapter.icon || <Solana />,
    solanaWallet?.adapter.name,
  );

  if (minified) {
    if (titleAmountContent != null) {
      if (show === "zkp2p") {
        return (
          <MinifiedContainer>
            <MinifiedTitleAmount>{titleAmountContent}</MinifiedTitleAmount>
          </MinifiedContainer>
        );
      }

      return (
        <MinifiedContainer>
          <MinifiedTitleAmount>{titleAmountContent}</MinifiedTitleAmount>
          {show === "evm" && isEthConnected && (
            <>
              <SubtitleContainer>
                <Subtitle>{ethWalletDisplayName}</Subtitle>
                {walletIcon}
              </SubtitleContainer>
            </>
          )}
          {show === "solana" && isSolanaConnected && (
            <>
              <SubtitleContainer>
                <Subtitle>{solWalletDisplayName}</Subtitle>
                {solanaIcon}
              </SubtitleContainer>
            </>
          )}
          {show === "all" && (
            <>
              <CoinLogos $size={32} $exclude={excludeLogos} />
            </>
          )}
        </MinifiedContainer>
      );
    } else {
      return (
        <MinifiedContainer>
          <CoinLogos $exclude={excludeLogos} />
          <Subtitle>1000+ tokens accepted</Subtitle>
        </MinifiedContainer>
      );
    }
  } else {
    return (
      <>
        {titleAmountContent && <TitleAmount>{titleAmountContent}</TitleAmount>}
        <AnyChainAnyCoinContainer>
          <CoinLogos $exclude={excludeLogos} />
          <Subtitle>1000+ tokens accepted</Subtitle>
        </AnyChainAnyCoinContainer>
      </>
    );
  }
};

function CoinLogos({ $size = 24, $exclude = [] }: { $size?: number, $exclude?: string[] }) {
  const logos = [
    <Ethereum key="eth" />,
    <Tron key="tron" />,
    <USDC key="usdc" />,
    <Optimism key="optimism" />,
    <Arbitrum key="arbitrum" />,
    <Base key="base" />,
    <Polygon key="polygon" />,
    <Solana key="solana" />,
  ];

  const logoBlock = (element: React.ReactElement, index: number) => (
    <LogoContainer
      key={index}
      $marginLeft={index !== 0 ? -($size / 3) : 0}
      $zIndex={logos.length - index}
      $size={$size}
      transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 0.98] }}
    >
      {element}
    </LogoContainer>
  );

  return (
    <Logos>{logos.filter((element) => !$exclude.includes(element?.key ?? "")).map((element, index) => logoBlock(element, index))}</Logos>
  );
}

const TitleAmount = styled(motion.h1) <{
  $error?: boolean;
  $valid?: boolean;
}>`
  margin-bottom: 24px;
  padding: 0;
  line-height: 66px;
  font-size: 64px;
  font-weight: var(--ck-modal-h1-font-weight, 600);
  color: ${(props) => {
    if (props.$error) return "var(--ck-body-color-danger)";
    if (props.$valid) return "var(--ck-body-color-valid)";
    return "var(--ck-body-color)";
  }};
  @media only screen and (max-width: ${defaultTheme.mobileWidth}px) {
    font-size: 64px;
  }
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const Subtitle = styled(motion.div)`
  font-size: 18px;
  font-weight: 500;
  line-height: 21px;
  color: var(--ck-body-color-muted);
`;

const MinifiedTitleAmount = styled(motion.div)`
  font-size: 32px;
  font-weight: var(--ck-modal-h1-font-weight, 600);
  line-height: 36px;
  color: var(--ck-body-color);
  display: flex;
  align-items: center;
  justify-content: start;
  gap: 8px;
`;

const MinifiedContainer = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 24px;
`;

const AnyChainAnyCoinContainer = styled(motion.div)`
  display: flex;
  vertical-align: middle;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  margin-bottom: 24px;
`;

const LogoContainer = styled(motion.div) <{
  $marginLeft?: number;
  $zIndex?: number;
  $size: number;
}>`
  display: block;
  overflow: hidden;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: ${(props) => props.$marginLeft || 0}px;
  z-index: ${(props) => props.$zIndex || 2};
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 9999px;
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
`;

const Logos = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SubtitleContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`;
