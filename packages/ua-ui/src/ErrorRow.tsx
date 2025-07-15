interface ErrorRowProps {
  error: Error;
}

export function ErrorRow({ error }: ErrorRowProps) {
  return (
    <div className="error-row">
      Error: {error.message}
    </div>
  );
} 