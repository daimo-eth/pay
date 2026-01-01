import React, { useEffect, useRef } from "react";
import styled from "../../../styles/styled";
import { ModalBody } from "../Modal/styles";

const Container = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: transparent;
`;

const InputField = styled.input`
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  outline: none;
  font-size: 30px;
  font-weight: var(--ck-modal-h1-font-weight, 600);
  color: var(--ck-body-color);
  width: ${(props) => {
    const length = props.value?.length ?? 0;
    // Placeholder is "0.00", 3ch for digits + 0.55ch for decimal point
    if (length === 0) return "3.55ch";
    // Reduce width when decimal or commas are present since they're smaller than normal chars
    const numPunctuations = (props.value?.match(/[.,]/g) || []).length;
    const adjustedLength = length - numPunctuations * 0.55;
    return `${Math.min(adjustedLength, 10)}ch`;
  }};
  min-width: 1ch;
  max-width: 10ch;
`;

const Currency = styled(ModalBody)<{ $small?: boolean }>`
  font-size: ${(props) => (props.$small ? "16px" : "24px")};
`;

const AmountInputField: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currency?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}> = ({ value, onChange, currency = "$", onKeyDown }) => {
  // Focus the input when the component mounts so the user can start typing immediately
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, [value]);

  return (
    <Container>
      {currency === "$" && <Currency>{currency}</Currency>}
      <InputField
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={onChange}
        placeholder="0.00"
        onKeyDown={onKeyDown}
      />
      {currency !== "$" && <Currency $small>{currency}</Currency>}
    </Container>
  );
};

export default AmountInputField;
