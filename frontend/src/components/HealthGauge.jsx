import { motion } from 'framer-motion';

export default function HealthGauge({ score = 0, loading = false, placeholder = false }) {
  const getTheme = s => {
    if (s >= 80) return { stroke: '#3fb950', color: '#3fb950', label: 'Healthy'  };
    if (s >= 60) return { stroke: '#d29922', color: '#d29922', label: 'Moderate' };
    if (s >= 40) return { stroke: '#e07b39', color: '#e07b39', label: 'Degraded' };
    return              { stroke: '#f85149', color: '#f85149', label: 'At Risk'  };
  };

  const { stroke, color, label } = getTheme(score);
  const radius = 68;
  const circ   = Math.PI * radius;
  const filled = (placeholder || loading) ? 0 : (score / 100) * circ;

  const bars = [
    { label: 'Security',  val: placeholder ? 0 : Math.round(score * 0.72), color: '#f85149' },
    { label: 'Quality',   val: placeholder ? 0 : Math.round(score * 0.92), color: '#a78bfa' },
    { label: 'Coverage',  val: placeholder ? 0 : Math.round(score * 0.82), color: '#388bfd' },
  ];

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: '100%',
    }}>
      <div style={{
        fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase',
        letterSpacing: '0.08em', fontFamily: 'monospace', marginBottom: 16,
      }}>
        {placeholder ? 'Portfolio Health' : 'Overall Health Score'}
      </div>

      {/* Gauge SVG */}
      <div style={{ position: 'relative', width: 200, height: 112, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 8 }}>
        <svg width="200" height="112" viewBox="0 0 200 112">
          {/* Track */}
          <path d={`M 12 98 A ${radius} ${radius} 0 0 1 188 98`}
            fill="none" stroke="var(--bg-3)" strokeWidth="10" strokeLinecap="round" />
          {/* Fill */}
          {!placeholder && !loading && (
            <motion.path
              d={`M 12 98 A ${radius} ${radius} 0 0 1 188 98`}
              fill="none" stroke={stroke} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${filled} ${circ}`}
              initial={{ strokeDasharray: `0 ${circ}` }}
              animate={{ strokeDasharray: `${filled} ${circ}` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            />
          )}
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((t, i) => {
            const angle = (-180 + (t / 100) * 180) * (Math.PI / 180);
            const x1 = 100 + (radius - 6) * Math.cos(angle);
            const y1 = 98  + (radius - 6) * Math.sin(angle);
            const x2 = 100 + (radius + 4) * Math.cos(angle);
            const y2 = 98  + (radius + 4) * Math.sin(angle);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border-2)" strokeWidth="1.5" />;
          })}
        </svg>

        {/* Center value */}
        <div style={{ position: 'absolute', bottom: 4, textAlign: 'center' }}>
          {loading ? (
            <div style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: 'auto' }} />
          ) : placeholder ? (
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-3)' }}>—</div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
              <div style={{ fontSize: 34, fontWeight: 700, color, lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </motion.div>
          )}
        </div>
      </div>

      {placeholder ? (
        <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', fontFamily: 'monospace', marginTop: 8, padding: '0 8px' }}>
          Open a repo → Run AI Analysis to calculate health scores
        </p>
      ) : (
        /* Score breakdown bars */
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 8 }}>
          {bars.map(({ label: l, val, color: bc }) => (
            <div key={l}>
              <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', background: bc, borderRadius: 2 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${val}%` }}
                  transition={{ duration: 0.9, delay: 0.5 }}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: bc }}>{val}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{l}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}