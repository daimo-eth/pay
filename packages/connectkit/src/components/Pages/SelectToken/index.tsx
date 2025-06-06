import defaultTheme from "../../../constants/defaultTheme";
import useIsMobile from "../../../hooks/useIsMobile";
import { usePayContext } from "../../../hooks/usePayContext";
import { useTokenOptions } from "../../../hooks/useTokenOptions";
import { ModalContent, ModalH1, PageContent } from "../../Common/Modal/styles";
import { OptionsList } from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import SelectAnotherMethodButton from "../../Common/SelectAnotherMethodButton";

export default function SelectToken() {
  const { isMobile } = useIsMobile();
  const isMobileFormat =
    isMobile || window?.innerWidth < defaultTheme.mobileWidth;

  const { paymentState } = usePayContext();
  const { tokenMode } = paymentState;
  const { optionsList, isLoading } = useTokenOptions(tokenMode);

  const isAnotherMethodButtonVisible =
    optionsList.length > 0 && tokenMode !== "all";

  return (
    <PageContent>
      <OrderHeader minified showEth={true} />

      {!isLoading && optionsList.length === 0 && (
        <ModalContent
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 16,
            paddingBottom: 16,
          }}
        >
          <ModalH1>Insufficient balance.</ModalH1>
          <SelectAnotherMethodButton />
        </ModalContent>
      )}
      <OptionsList
        requiredSkeletons={4}
        isLoading={isLoading}
        options={optionsList}
        scrollHeight={
          isAnotherMethodButtonVisible && isMobileFormat ? 225 : 300
        }
        orDivider={isAnotherMethodButtonVisible}
        hideBottomLine={!isAnotherMethodButtonVisible}
      />
      {isAnotherMethodButtonVisible && <SelectAnotherMethodButton />}
    </PageContent>
  );
}
