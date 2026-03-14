export default function StatusBadge({ status, size = 'sm' }) {
  const config = {
    critical:  { label: 'CRITICAL',  bg: 'bg-red-500/10',     border: 'border-red-500/40',   text: 'text-red-400',     dot: 'bg-red-400' },
    high:      { label: 'HIGH',      bg: 'bg-orange-500/10',  border: 'border-orange-500/40', text: 'text-orange-400',  dot: 'bg-orange-400' },
    warning:   { label: 'WARNING',   bg: 'bg-amber-500/10',   border: 'border-amber-500/40',  text: 'text-amber-400',   dot: 'bg-amber-400' },
    medium:    { label: 'MEDIUM',    bg: 'bg-amber-500/10',   border: 'border-amber-500/40',  text: 'text-amber-400',   dot: 'bg-amber-400' },
    low:       { label: 'LOW',       bg: 'bg-blue-500/10',    border: 'border-blue-500/40',   text: 'text-blue-400',    dot: 'bg-blue-400' },
    healthy:   { label: 'HEALTHY',   bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    success:   { label: 'PASSED',    bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    running:   { label: 'RUNNING',   bg: 'bg-cyan-500/10',    border: 'border-cyan-500/40',   text: 'text-cyan-400',    dot: 'bg-cyan-400 animate-pulse' },
    alert:     { label: 'ALERT',     bg: 'bg-red-500/10',     border: 'border-red-500/40',    text: 'text-red-400',     dot: 'bg-red-400 animate-pulse' },
    warn:      { label: 'WARN',      bg: 'bg-amber-500/10',   border: 'border-amber-500/40',  text: 'text-amber-400',   dot: 'bg-amber-400' },
  };

  const c = config[status] || config.low;
  const pad = size === 'lg' ? 'px-3 py-1.5 text-xs' : 'px-2 py-0.5 text-[10px]';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded ${pad} border font-mono font-semibold tracking-widest ${c.bg} ${c.border} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
