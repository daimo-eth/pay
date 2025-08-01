import React from "react";
import {
  FloatWrapper,
  Graphic,
  GraphicBackground,
  Logo,
  LogoGraphic,
  LogoGroup,
  LogoInner,
  LogoPosition,
  RotateWrapper,
} from "./styles";

import Logos from "../../../assets/logos";
import wave from "../../../assets/wave";
import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";

import useLocales from "../../../hooks/useLocales";
import { usePayContext } from "../../../hooks/usePayContext";
import Button from "../../Common/Button";

const Introduction: React.FC = () => {
  const context = usePayContext();
  const locales = useLocales({});
  const ctaUrl =
    context.options?.walletOnboardingUrl ?? locales.onboardingScreen_ctaUrl;
  return (
    <PageContent>
      <Graphic>
        <LogoGroup>
          <Logo>
            <LogoPosition>
              <LogoInner>
                <FloatWrapper>
                  <RotateWrapper>
                    <LogoGraphic>
                      <Logos.Base />
                    </LogoGraphic>
                  </RotateWrapper>
                </FloatWrapper>
              </LogoInner>
            </LogoPosition>
          </Logo>
          <Logo>
            <LogoPosition>
              <LogoInner>
                <FloatWrapper>
                  <RotateWrapper>
                    <LogoGraphic>
                      <Logos.MetaMask />
                    </LogoGraphic>
                  </RotateWrapper>
                </FloatWrapper>
              </LogoInner>
            </LogoPosition>
          </Logo>
          <Logo>
            <LogoPosition>
              <LogoInner>
                <FloatWrapper>
                  <RotateWrapper>
                    <LogoGraphic>
                      <Logos.Rainbow />
                    </LogoGraphic>
                  </RotateWrapper>
                </FloatWrapper>
              </LogoInner>
            </LogoPosition>
          </Logo>
          <Logo>
            <LogoPosition>
              <LogoInner>
                <FloatWrapper>
                  <RotateWrapper>
                    <LogoGraphic>
                      <Logos.Phantom />
                    </LogoGraphic>
                  </RotateWrapper>
                </FloatWrapper>
              </LogoInner>
            </LogoPosition>
          </Logo>
          <Logo>
            <LogoPosition>
              <LogoInner>
                <FloatWrapper>
                  <RotateWrapper>
                    <LogoGraphic>
                      <Logos.Trust />
                    </LogoGraphic>
                  </RotateWrapper>
                </FloatWrapper>
              </LogoInner>
            </LogoPosition>
          </Logo>
        </LogoGroup>
        <GraphicBackground>{wave}</GraphicBackground>
      </Graphic>
      <ModalContent style={{ paddingBottom: 18 }}>
        <ModalH1 $small>{locales.onboardingScreen_h1}</ModalH1>
        <ModalBody>{locales.onboardingScreen_p}</ModalBody>
      </ModalContent>
      <Button href={ctaUrl} arrow>
        {locales.onboardingScreen_ctaText}
      </Button>
    </PageContent>
  );
};

export default Introduction;
