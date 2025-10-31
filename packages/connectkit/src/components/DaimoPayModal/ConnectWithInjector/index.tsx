import { AnimatePresence, Variants } from "framer-motion";
import React, { useEffect, useState } from "react";
import {
  ConnectingAnimation,
  ConnectingContainer,
  Container,
  Content,
  RetryButton,
  RetryIconContainer,
} from "./styles";

import Alert from "../../Common/Alert";
import Button from "../../Common/Button";
import {
  ModalBody,
  ModalContent,
  ModalContentContainer,
  ModalH1,
  ModalHeading,
  PageContent,
} from "../../Common/Modal/styles";
import Tooltip from "../../Common/Tooltip";

import SquircleSpinner from "../../Spinners/SquircleSpinner";

import {
  AlertIcon,
  ExternalLinkIcon,
  RetryIconCircle,
  TickIcon,
} from "../../../assets/icons";
import { useConnect } from "../../../hooks/useConnect";
import useLocales from "../../../hooks/useLocales";
import { usePayContext } from "../../../hooks/usePayContext";
import { detectBrowser } from "../../../utils";
import { useWallet } from "../../../wallets/useWallets";
import BrowserIcon from "../../Common/BrowserIcon";
import CircleSpinner from "../../Spinners/CircleSpinner";

export const states = {
  CONNECTED: "connected",
  CONNECTING: "connecting",
  EXPIRING: "expiring",
  FAILED: "failed",
  REJECTED: "rejected",
  NOTCONNECTED: "notconnected",
  UNAVAILABLE: "unavailable",
};

const contentVariants: Variants = {
  initial: {
    willChange: "transform,opacity",
    position: "relative",
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    position: "relative",
    opacity: 1,
    scale: 1,
    transition: {
      ease: [0.16, 1, 0.3, 1],
      duration: 0.4,
      delay: 0.05,
      position: { delay: 0 },
    },
  },
  exit: {
    position: "absolute",
    opacity: 0,
    scale: 0.95,
    transition: {
      ease: [0.16, 1, 0.3, 1],
      duration: 0.3,
    },
  },
};

const ConnectWithInjector: React.FC<{
  switchConnectMethod: (id?: string) => void;
  forceState?: typeof states;
}> = ({ switchConnectMethod, forceState }) => {
  const { connect } = useConnect({
    mutation: {
      onMutate: (connector?: any) => {
        if (connector.connector) {
          setStatus(states.CONNECTING);
        } else {
          setStatus(states.UNAVAILABLE);
        }
      },
      onError(err?: any) {
        console.error(err);
      },
      onSettled(data?: any, error?: any) {
        if (error) {
          setShowTryAgainTooltip(true);
          setTimeout(() => setShowTryAgainTooltip(false), 3500);
          if (error.code) {
            // https://github.com/MetaMask/eth-rpc-errors/blob/main/src/error-constants.ts
            switch (error.code) {
              case -32002:
                setStatus(states.NOTCONNECTED);
                break;
              case 4001:
                setStatus(states.REJECTED);
                break;
              default:
                setStatus(states.FAILED);
                break;
            }
          } else {
            // Sometimes the error doesn't respond with a code
            if (error.message) {
              switch (error.message) {
                case "User rejected request":
                  setStatus(states.REJECTED);
                  break;
                default:
                  setStatus(states.FAILED);
                  break;
              }
            }
          }
        } else if (data) {
        }
        setTimeout(triggerResize, 100);
      },
    },
  });

  const { triggerResize } = usePayContext();
  const context = usePayContext();
  const { pendingConnectorId, paymentState } = context;
  const walletFromConnectors = useWallet(pendingConnectorId ?? "");
  // Fall back to selectedWallet for wallets from walletConfigs (e.g. unique payment options)
  const wallet = walletFromConnectors || paymentState.selectedWallet;

  const walletInfo = {
    name: wallet?.name,
    shortName: wallet?.shortName ?? wallet?.name,
    icon: wallet?.iconConnector ?? wallet?.icon,
    iconShape: wallet?.iconShape ?? "circle",
    iconShouldShrink: wallet?.iconShouldShrink,
  };

  const [showTryAgainTooltip, setShowTryAgainTooltip] = useState(false);

  const browser = detectBrowser();

  const extensionUrl = wallet?.downloadUrls?.[browser];

  const suggestedExtension = wallet?.downloadUrls
    ? {
        name: Object.keys(wallet?.downloadUrls)[0],
        label:
          Object.keys(wallet?.downloadUrls)[0]?.charAt(0).toUpperCase() +
          Object.keys(wallet?.downloadUrls)[0]?.slice(1), // Capitalise first letter, but this might be better suited as a lookup table
        url: wallet?.downloadUrls[Object.keys(wallet?.downloadUrls)[0]],
      }
    : undefined;

  const hasConnector =
    wallet && "connector" in wallet && wallet.connector != null;
  const isInstalled = wallet && "isInstalled" in wallet && wallet.isInstalled;

  const [status, setStatus] = useState(
    forceState
      ? forceState
      : !isInstalled
        ? states.UNAVAILABLE
        : states.CONNECTING,
  );

  const locales = useLocales({
    CONNECTORNAME: walletInfo.name,
    CONNECTORSHORTNAME: walletInfo.shortName ?? walletInfo.name,
    SUGGESTEDEXTENSIONBROWSER: suggestedExtension?.label ?? "your browser",
  });

  const runConnect = async () => {
    if (isInstalled && hasConnector) {
      connect({ connector: (wallet as any).connector });
    } else {
      setStatus(states.UNAVAILABLE);
    }
  };

  useEffect(() => {
    if (status === states.UNAVAILABLE) return;

    // UX: Give user time to see the UI before opening the extension
    const connectTimeout = setTimeout(runConnect, 600);
    return () => {
      clearTimeout(connectTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Timeout functionality if necessary
  let expiryTimeout: any;
  useEffect(() => {
    if (status === states.EXPIRING) {
      expiryTimeout = setTimeout(
        () => {
          if (expiryTimer <= 0) {
            setStatus(states.FAILED);
            setExpiryTimer(expiryDefault);
          } else {
            setExpiryTimer(expiryTimer - 1);
          }
        },
        expiryTimer === 9 ? 1500 : 1000 // Google: Chronostasis
      );
    }
    return () => {
      clearTimeout(expiryTimeout);
    };
  }, [status, expiryTimer]);
  */

  if (!wallet) {
    return (
      <PageContent>
        <Container>
          <ModalHeading>{locales.invalidState_heading}</ModalHeading>
          <ModalContent>
            <Alert>{locales.invalidState_description}</Alert>
          </ModalContent>
        </Container>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <Container>
        <ConnectingContainer>
          <ConnectingAnimation
            $shake={status === states.FAILED || status === states.REJECTED}
            $circle={walletInfo.iconShape === "circle"}
          >
            <AnimatePresence>
              {(status === states.FAILED || status === states.REJECTED) && (
                <RetryButton
                  aria-label={locales.retry}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.1 }}
                  onClick={runConnect}
                >
                  <RetryIconContainer>
                    <Tooltip
                      open={
                        showTryAgainTooltip &&
                        (status === states.FAILED || status === states.REJECTED)
                      }
                      message={locales.tryAgainQuestion}
                      xOffset={-6}
                    >
                      <RetryIconCircle />
                    </Tooltip>
                  </RetryIconContainer>
                </RetryButton>
              )}
            </AnimatePresence>
            {walletInfo.iconShape === "circle" ? (
              <CircleSpinner
                logo={
                  status === states.UNAVAILABLE ? (
                    <div
                      style={{
                        transform: "scale(1.14)",
                        position: "relative",
                        width: "100%",
                      }}
                    >
                      {walletInfo.icon}
                    </div>
                  ) : (
                    <>{walletInfo.icon}</>
                  )
                }
                smallLogo={walletInfo.iconShouldShrink}
                loading={status === states.CONNECTING}
                unavailable={status === states.UNAVAILABLE}
              />
            ) : (
              <SquircleSpinner
                logo={
                  status === states.UNAVAILABLE ? (
                    <div
                      style={{
                        transform: "scale(1.14)",
                        position: "relative",
                        width: "100%",
                      }}
                    >
                      {walletInfo.icon}
                    </div>
                  ) : (
                    <>{walletInfo.icon}</>
                  )
                }
                loading={status === states.CONNECTING}
                //unavailable={status === states.UNAVAILABLE}
              />
            )}
            {/* </Tooltip> */}
          </ConnectingAnimation>
        </ConnectingContainer>
        <ModalContentContainer>
          <AnimatePresence initial={false}>
            {status === states.FAILED && (
              <Content
                key={states.FAILED}
                initial={"initial"}
                animate={"animate"}
                exit={"exit"}
                variants={contentVariants}
              >
                <ModalContent>
                  <ModalH1 $error>
                    <AlertIcon />
                    {locales.injectionScreen_failed_h1}
                  </ModalH1>
                  <ModalBody>{locales.injectionScreen_failed_p}</ModalBody>
                </ModalContent>
              </Content>
            )}
            {status === states.REJECTED && (
              <Content
                key={states.REJECTED}
                initial={"initial"}
                animate={"animate"}
                exit={"exit"}
                variants={contentVariants}
              >
                <ModalContent style={{ paddingBottom: 28 }}>
                  <ModalH1>{locales.injectionScreen_rejected_h1}</ModalH1>
                  <ModalBody>{locales.injectionScreen_rejected_p}</ModalBody>
                </ModalContent>
              </Content>
            )}
            {(status === states.CONNECTING || status === states.EXPIRING) && (
              <Content
                key={states.CONNECTING}
                initial={"initial"}
                animate={"animate"}
                exit={"exit"}
                variants={contentVariants}
              >
                <ModalContent style={{ paddingBottom: 28 }}>
                  <ModalH1>
                    {hasConnector &&
                    (wallet as any).connector?.id === "injected"
                      ? locales.injectionScreen_connecting_injected_h1
                      : locales.injectionScreen_connecting_h1}
                  </ModalH1>
                  <ModalBody>
                    {hasConnector &&
                    (wallet as any).connector?.id === "injected"
                      ? locales.injectionScreen_connecting_injected_p
                      : locales.injectionScreen_connecting_p}
                  </ModalBody>
                  <Button icon={<ExternalLinkIcon />} onClick={runConnect}>
                    Connect {walletInfo.name}
                  </Button>
                </ModalContent>
              </Content>
            )}
            {status === states.CONNECTED && (
              <Content
                key={states.CONNECTED}
                initial={"initial"}
                animate={"animate"}
                exit={"exit"}
                variants={contentVariants}
              >
                <ModalContent>
                  <ModalH1 $valid>
                    <TickIcon /> {locales.injectionScreen_connected_h1}
                  </ModalH1>
                  <ModalBody>{locales.injectionScreen_connected_p}</ModalBody>
                </ModalContent>
              </Content>
            )}
            {status === states.NOTCONNECTED && (
              <Content
                key={states.NOTCONNECTED}
                initial={"initial"}
                animate={"animate"}
                exit={"exit"}
                variants={contentVariants}
              >
                <ModalContent>
                  <ModalH1>{locales.injectionScreen_notconnected_h1}</ModalH1>
                  <ModalBody>
                    {locales.injectionScreen_notconnected_p}
                  </ModalBody>
                </ModalContent>
              </Content>
            )}
            {status === states.UNAVAILABLE && (
              <Content
                key={states.UNAVAILABLE}
                initial={"initial"}
                animate={"animate"}
                exit={"exit"}
                variants={contentVariants}
              >
                {!extensionUrl ? (
                  <>
                    <ModalContent style={{ paddingBottom: 12 }}>
                      <ModalH1>
                        {locales.injectionScreen_unavailable_h1}
                      </ModalH1>
                      <ModalBody>
                        {locales.injectionScreen_unavailable_p}
                      </ModalBody>
                    </ModalContent>

                    {!isInstalled && suggestedExtension && (
                      <Button
                        href={suggestedExtension?.url}
                        icon={
                          <BrowserIcon browser={suggestedExtension?.name} />
                        }
                      >
                        Install on {suggestedExtension?.label}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <ModalContent style={{ paddingBottom: 18 }}>
                      <ModalH1>{locales.injectionScreen_install_h1}</ModalH1>
                      <ModalBody>{locales.injectionScreen_install_p}</ModalBody>
                    </ModalContent>
                    {!isInstalled && extensionUrl && (
                      <Button href={extensionUrl} icon={<BrowserIcon />}>
                        {locales.installTheExtension}
                      </Button>
                    )}
                  </>
                )}
              </Content>
            )}
          </AnimatePresence>
        </ModalContentContainer>
      </Container>
    </PageContent>
  );
};

export default ConnectWithInjector;
