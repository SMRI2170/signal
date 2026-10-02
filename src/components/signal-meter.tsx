type SignalMeterProps = {
  value: number;
  label?: string;
};

export function SignalMeter({ value, label = "SIGNAL LEVEL" }: SignalMeterProps) {
  const normalizedValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div aria-label={`${label} ${normalizedValue} / 100`} className="scanner-meter" role="img">
      <i style={{ width: `${normalizedValue}%` }} />
    </div>
  );
}
