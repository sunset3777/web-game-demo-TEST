export default function Bar({ value, max, tone }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return <div className={`bar ${tone || ""}`}><span style={{ width: `${w.toFixed(1)}%` }} /></div>;
}
