import { useState, useEffect, useRef } from 'react';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function Monitor() {
  const [monitors, setMonitors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('flightMonitors') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: '', origin: '', destination: '', departureDate: '', returnDate: '', adults: 1, alertPrice: '', travelClass: 'ECONOMY'
  });
  const intervals = useRef({});

  useEffect(() => {
    localStorage.setItem('flightMonitors', JSON.stringify(monitors));
  }, [monitors]);

  // Start polling for each active monitor
  useEffect(() => {
    monitors.forEach(m => {
      if (!m.active || intervals.current[m.id]) return;
      checkPrice(m.id);
      intervals.current[m.id] = setInterval(() => checkPrice(m.id), 5 * 60 * 1000); // every 5 min
    });

    // Cleanup removed monitors
    Object.keys(intervals.current).forEach(id => {
      if (!monitors.find(m => m.id === id && m.active)) {
        clearInterval(intervals.current[id]);
        delete intervals.current[id];
      }
    });

    return () => Object.values(intervals.current).forEach(clearInterval);
  }, [monitors.map(m => m.id + m.active).join()]);

  async function checkPrice(id) {
    const m = monitors.find(mm => mm.id === id);
    if (!m) return;

    setMonitors(prev => prev.map(mm =>
      mm.id === id ? { ...mm, checking: true } : mm
    ));

    try {
      const r = await fetch('/api/monitor/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: m.origin, destination: m.destination,
          departureDate: m.departureDate, returnDate: m.returnDate || undefined,
          adults: m.adults, travelClass: m.travelClass,
        }),
      });
      const data = await r.json();

      setMonitors(prev => prev.map(mm => {
        if (mm.id !== id) return mm;
        const history = [...(mm.history || []), {
          price: data.price, at: new Date().toISOString()
        }].slice(-20); // keep last 20

        const alert = m.alertPrice && data.price && data.price <= parseFloat(m.alertPrice);
        if (alert && !mm.alerted) {
          showNotification(mm, data.price);
        }

        return {
          ...mm, checking: false,
          currentPrice: data.price,
          lastChecked: new Date().toISOString(),
          history,
          alerted: alert,
          priceChange: mm.currentPrice ? data.price - mm.currentPrice : 0,
        };
      }));
    } catch {
      setMonitors(prev => prev.map(mm =>
        mm.id === id ? { ...mm, checking: false, error: true } : mm
      ));
    }
  }

  function showNotification(monitor, price) {
    if (Notification.permission === 'granted') {
      new Notification(`✈ Alerta de preço — ${monitor.label || monitor.origin + '→' + monitor.destination}`, {
        body: `Preço caiu para R$ ${price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}!`,
        icon: '/favicon.ico',
      });
    }
  }

  async function requestNotifPermission() {
    if ('Notification' in window) {
      await Notification.requestPermission();
    }
  }

  function addMonitor() {
    if (!form.origin || !form.destination || !form.departureDate) return;
    if (monitors.length >= 5) return alert('Máximo de 5 monitoramentos simultâneos.');

    const m = {
      id: Date.now().toString(),
      ...form,
      active: true,
      currentPrice: null,
      history: [],
      lastChecked: null,
      alerted: false,
      checking: false,
    };
    setMonitors(prev => [...prev, m]);
    setShowForm(false);
    setForm({ label: '', origin: '', destination: '', departureDate: '', returnDate: '', adults: 1, alertPrice: '', travelClass: 'ECONOMY' });
    requestNotifPermission();
  }

  function toggleActive(id) {
    setMonitors(prev => prev.map(m => m.id === id ? { ...m, active: !m.active, alerted: false } : m));
  }

  function removeMonitor(id) {
    setMonitors(prev => prev.filter(m => m.id !== id));
  }

  const field = (label, el) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={labelStyle}>{label}</label>
      {el}
    </div>
  );

  return (
    <div>
      <div style={topBar}>
        <div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700 }}>Monitoramento</h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
            {monitors.length}/5 voos ativos · verificação a cada 5 min
          </p>
        </div>
        {monitors.length < 5 && (
          <button onClick={() => setShowForm(!showForm)} style={addBtn}>
            {showForm ? '✕ Cancelar' : '+ Adicionar voo'}
          </button>
        )}
      </div>

      {showForm && (
        <div style={formCard} className="fade-up">
          <h3 style={{ fontFamily: 'Syne', fontSize: 15, marginBottom: 16, color: 'var(--accent2)' }}>Novo monitoramento</h3>
          <div style={formGrid}>
            {field('Nome (opcional)', <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Viagem ao Rio" style={inp} />)}
            {field('Origem (IATA)', <input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value.toUpperCase() }))} placeholder="GRU" maxLength={3} style={inp} />)}
            {field('Destino (IATA)', <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value.toUpperCase() }))} placeholder="GIG" maxLength={3} style={inp} />)}
            {field('Data de ida', <input type="date" value={form.departureDate} onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))} style={inp} />)}
            {field('Data de volta', <input type="date" value={form.returnDate} onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))} style={inp} />)}
            {field('Adultos', <input type="number" min={1} max={9} value={form.adults} onChange={e => setForm(f => ({ ...f, adults: parseInt(e.target.value) }))} style={inp} />)}
            {field('Alertar se ≤ R$', <input type="number" value={form.alertPrice} onChange={e => setForm(f => ({ ...f, alertPrice: e.target.value }))} placeholder="Ex: 500" style={inp} />)}
            {field('Classe', (
              <select value={form.travelClass} onChange={e => setForm(f => ({ ...f, travelClass: e.target.value }))} style={inp}>
                <option value="ECONOMY">Econômica</option>
                <option value="PREMIUM_ECONOMY">Premium Economy</option>
                <option value="BUSINESS">Executiva</option>
                <option value="FIRST">Primeira Classe</option>
              </select>
            ))}
          </div>
          <button onClick={addMonitor} style={saveBtn}>Iniciar monitoramento</button>
        </div>
      )}

      {monitors.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛎</div>
          <p>Nenhum voo monitorado ainda.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Adicione até 5 voos para acompanhar o preço em tempo real.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {monitors.map(m => (
          <div key={m.id} style={{ ...monitorCard, opacity: m.active ? 1 : 0.55 }}>
            <div style={monitorTop}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>
                    {m.origin} → {m.destination}
                  </span>
                  {m.label && <span style={labelBadge}>{m.label}</span>}
                  {m.active && m.checking && <span style={checkingBadge}>⟳ verificando...</span>}
                  {!m.active && <span style={pausedBadge}>pausado</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                  {formatDate(m.departureDate)}{m.returnDate ? ` → ${formatDate(m.returnDate)}` : ''} · {m.adults} adulto{m.adults > 1 ? 's' : ''}
                  {m.alertPrice && ` · alerta: R$ ${parseFloat(m.alertPrice).toLocaleString('pt-BR')}`}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                {m.currentPrice ? (
                  <div>
                    <div style={{
                      fontFamily: 'Syne', fontWeight: 800, fontSize: 22,
                      color: m.alerted ? 'var(--green)' : 'var(--gold)',
                    }}>
                      R$ {m.currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    {m.priceChange !== 0 && (
                      <div style={{ fontSize: 12, color: m.priceChange < 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {m.priceChange < 0 ? '▼' : '▲'} R$ {Math.abs(m.priceChange).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    {m.alerted && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>🎉 Alerta disparado!</div>}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text3)', fontSize: 13 }}>aguardando...</div>
                )}
              </div>
            </div>

            {m.history && m.history.length > 1 && (
              <div style={historyBar}>
                <MiniChart history={m.history} />
              </div>
            )}

            <div style={monitorActions}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                {m.lastChecked ? `Última verificação: ${new Date(m.lastChecked).toLocaleTimeString('pt-BR')}` : 'Não verificado ainda'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => checkPrice(m.id)} style={actionBtn} title="Verificar agora">⟳</button>
                <button onClick={() => toggleActive(m.id)} style={actionBtn}>{m.active ? '⏸ Pausar' : '▶ Retomar'}</button>
                <button onClick={() => removeMonitor(m.id)} style={{ ...actionBtn, color: 'var(--red)' }}>✕ Remover</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniChart({ history }) {
  const prices = history.map(h => h.price).filter(Boolean);
  if (prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 200, h = 40;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />
      {prices.map((p, i) => {
        const x = (i / (prices.length - 1)) * w;
        const y = h - ((p - min) / range) * (h - 8) - 4;
        return <circle key={i} cx={x} cy={y} r="2.5" fill="var(--accent2)" />;
      })}
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const labelStyle = { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)' };
const inp = {
  padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border2)',
  borderRadius: 'var(--radius2)', color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%',
};
const topBar = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 };
const addBtn = {
  padding: '9px 16px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius2)',
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const formCard = {
  background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
  padding: 20, marginBottom: 20,
};
const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 };
const saveBtn = {
  padding: '10px 20px', background: 'var(--green)', border: 'none', borderRadius: 'var(--radius2)',
  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
const monitorCard = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
  padding: '16px 20px', transition: 'opacity 0.2s',
};
const monitorTop = { display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 10 };
const labelBadge = {
  fontSize: 11, padding: '2px 8px', background: 'var(--bg3)', borderRadius: 99,
  color: 'var(--text2)', border: '1px solid var(--border)',
};
const checkingBadge = { fontSize: 11, color: 'var(--accent)', animation: 'pulse 1.5s infinite' };
const pausedBadge = { fontSize: 11, color: 'var(--text3)', padding: '2px 6px', background: 'var(--bg3)', borderRadius: 4 };
const historyBar = { marginBottom: 12, paddingTop: 4 };
const monitorActions = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  paddingTop: 10, borderTop: '1px solid var(--border)',
};
const actionBtn = {
  padding: '5px 10px', background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: 6, color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
};
