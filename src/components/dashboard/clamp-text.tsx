interface ClampTextProps {
  value: string;
  head?: number;
  tail?: number;
  className?: string;
}

export function ClampText({ value, head = 18, tail = 8, className }: ClampTextProps) {
  const str = String(value ?? "");
  if (str.length <= head + tail + 3) {
    return <span className={className}>{str}</span>;
  }
  return (
    <span className={className}>
      {str.slice(0, head)}…{str.slice(-tail)}
    </span>
  );
}