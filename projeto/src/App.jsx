import { useState } from 'react';
import AirportInput from './components/AirportInput.jsx';
import FlightResults from './components/FlightResults.jsx';
import Monitor from './components/Monitor.jsx';

const DAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const CLASSES = [
  { value: 'ECONOMY', label: 'Econômica' },
  { value: 'PREMIUM_ECONOMY', label: 'Premium Economy' },
  { value: 'BUSINESS', label: 'Executiva' },
  { value: 'FIRST', label: 'Primeira Classe' },
];
const STOPS_OPTIONS = [
  { value: 0, label: '✈ Somente direto' },
  { value: 1, label: '1 parada ou menos' },
  { value: 2, label: '2 paradas ou menos' },
  { value: 99, label: 'Qualquer opção' },
];

export default function App() {
  const [tab, setTab] = useState('search');
  const [searchMode, setSearchMode] = useState('specific');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Shared
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [adults, setAdults] = useState(1);
  const [travelClass, setTravelClass] = useState('ECONOMY');
  const [isRoundTrip, setIsRoundTrip] = useState(true);

  // Filtro de paradas
  const [maxStops, setMaxStops] = useState(99);

  // Horários
  const [depTimeFrom, setDepTimeFrom] = useState('00:00');
  const [depTimeTo, setDepTimeTo] = useState('23:59');
  const [retTimeFrom, setRetTimeFrom] = useState('00:00');
  const [retTimeTo, setRetTimeTo] = useState('23:59');

  // Mode: Specific
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');

  // Mode: Weekday
  const [depDayOfWeek, setDepDayOfWeek] = useState(4);
  const [retDayOfWeek, setRetDayOfWeek] = useState(0);
  const [wdStart, setWdStart] = useState('');
  const [wdEnd, setWdEnd] = useState('');

  // Mode: Flexible
  const [tripDuration, setTripDuration] = useState(14);
  const [flexStart, setFlexStart] = useState('');
  const [flexEnd, setFlexEnd] = useState('');

  async function handleSearch() {
    if (!origin || !destination) {
      setError('Selecione origem e destino.'); return;
    }
    setError(null);
    setLoading(true);
    setResults(null);

    try {
      let endpoint, body;

      const commonParams = {
        adults,
        travelClass,
        maxStops,
        depTimeFrom,
        depTimeTo,
        retTimeFrom: isRoundTrip ? retTimeFrom : undefined,
        retTimeTo: isRoundTrip ? retTimeTo : undefined,
      };

      if (searchMode === 'specific') {
        if (!departureDate) { setError('Informe a data de ida.'); setLoading(false); return; }
        endpoint = '/api/search/specific';
        body = {
          ...commonParams,
          origin: origin.iataCode,
          destination: destination.iataCode,
          departureDate,
          returnDate: isRoundTrip && returnDate ? returnDate : undefined,
        };
      } else if (searchMode === 'weekday') {
        if (!wdStart || !wdEnd) { setError('Informe o período.'); setLoading(false); return; }
        endpoint = '/api/search/weekday';
        body = {
          ...commonParams,
          origin: origin.iataCode,
          destination: destination.iataCode,
          departureDayOfWeek: depDayOfWeek,
          returnDayOfWeek: isRoundTrip ? retDayOfWeek : undefined,
          startDate: wdStart,
          endDate: wdEnd,
        };
      } else {
        if (!flexStart || !flexEnd) { setError('Informe o período.'); setLoading(false); return; }
        endpoint = '/api/search/flexible';
        body = {
          ...commonParams,
          origin: origin.iataCode,
          destination: destination.iataCode,
          tripDurationDays: tripDuration,
          startDate: flexStart,
          endDate: flexEnd,
        };
      }

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
    } catch (e) {
      setError('Erro na busca: ' + e.message);
    }
    setLoading(false);
  }

  const modes = [
    { id: 'specific', label: '📅 Data exata', desc: 'Escolha datas específicas' },
    { id: 'weekday', label: '📆 Dia da semana', desc: 'Ex: todas as quintas' },
    { id: 'flexible', label: '🗓 Por duração', desc: 'Ex: viagens de 14 dias' },
  ];

  return (
    <div style={appWrap}>
      {/* Header */}
      <header style={header}>
        <div style={headerInner}>
          <div style={logo}>
            <span style={logoIcon}>✈</span>
            <span style={logoText}>AeroFlex</span>
          </div>
          <nav style={navStyle}>
            <button onClick={() => setTab('search')} style={navBtn(tab === 'search')}>Buscar</button>
            <button onClick={() => setTab('monitor')} style={navBtn(tab === 'monitor')}>
              Monitorar
              {tab !== 'monitor' && <span style={notifDot} />}
            </button>
          </nav>
        </div>
      </header>

      <main style={mainStyle}>
        {tab === 'monitor' ? (
          <div style={card} className="fade-up">
            <Monitor />
          </div>
        ) : (
          <>
            <div style={hero}>
              <h1 style={heroTitle}>Encontre as melhores passagens</h1>
              <p style={heroSub}>Busca flexível por datas, dias da semana ou duração da viagem</p>
            </div>

            <div style={card} className="fade-up">
              {/* Modo de busca */}
              <div style={modeRow}>
                {modes.map(m => (
                  <button key={m.id} onClick={() => { setSearchMode(m.id); setResults(null); }}
                    style={modeBtn(searchMode === m.id)}>
                    <span style={{ fontSize: 14 }}>{m.label}</span>
                    <span style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{m.desc}</span>
                  </button>
                ))}
              </div>

              {/* Origem / Destino */}
              <div style={rowFlex}>
                <AirportInput label="Origem" value={origin} onChange={setOrigin} placeholder="De onde parte?" />
                <button style={swapBtn} onClick={() => {
                  const tmp = origin; setOrigin(destination); setDestination(tmp);
                }}>⇄</button>
                <AirportInput label="Destino" value={destination} onChange={setDestination} placeholder="Para onde vai?" />
              </div>

              {/* Passageiros / Classe / Ida e volta */}
              <div style={{ ...rowFlex, gap: 12, marginTop: 12 }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <label style={labelStyle}>Adultos</label>
                  <select value={adults} onChange={e => setAdults(parseInt(e.target.value))} style={selectStyle}>
                    {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n} adulto{n>1?'s':''}</option>)}
                  </select>
                </div>
                <div style={{ flex: 2, minWidth: 160 }}>
                  <label style={labelStyle}>Classe</label>
                  <select value={travelClass} onChange={e => setTravelClass(e.target.value)} style={selectStyle}>
                    {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                  <label style={checkLabel}>
                    <input type="checkbox" checked={isRoundTrip} onChange={e => setIsRoundTrip(e.target.checked)} style={{ marginRight: 6 }} />
                    <span style={{ fontSize: 13 }}>Ida e volta</span>
                  </label>
                </div>
              </div>

              <div style={divider} />

              {/* Filtro de paradas */}
              <div style={{ marginBottom: 16 }}>
                <div style={sectionTitle}>🛑 Paradas</div>
                <div style={stopsRow}>
                  {STOPS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setMaxStops(opt.value)}
                      style={stopsBtn(maxStops === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={divider} />

              {/* Filtro de horário */}
              <div style={{ marginBottom: 16 }}>
                <div style={sectionTitle}>⏰ Horário de partida</div>
                <div style={rowFlex}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={labelStyle}>Ida — a partir de</label>
                    <input type="time" value={depTimeFrom} onChange={e => setDepTimeFrom(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={labelStyle}>Ida — até</label>
                    <input type="time" value={depTimeTo} onChange={e => setDepTimeTo(e.target.value)} style={inputStyle} />
                  </div>
                  {isRoundTrip && (
                    <>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={labelStyle}>Volta — a partir de</label>
                        <input type="time" value={retTimeFrom} onChange={e => setRetTimeFrom(e.target.value)} style={inputStyle} />
                      </div>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={labelStyle}>Volta — até</label>
                        <input type="time" value={retTimeTo} onChange={e => setRetTimeTo(e.target.value)} style={inputStyle} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={divider} />

              {/* Campos específicos por modo */}
              {searchMode === 'specific' && (
                <div style={rowFlex}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Data de ida</label>
                    <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} style={inputStyle} />
                  </div>
                  {isRoundTrip && (
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Data de volta</label>
                      <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} style={inputStyle} min={departureDate} />
                    </div>
                  )}
                </div>
              )}

              {searchMode === 'weekday' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={rowFlex}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Dia de ida</label>
                      <select value={depDayOfWeek} onChange={e => setDepDayOfWeek(parseInt(e.target.value))} style={selectStyle}>
                        {DAYS_PT.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                    {isRoundTrip && (
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Dia de volta</label>
                        <select value={retDayOfWeek} onChange={e => setRetDayOfWeek(parseInt(e.target.value))} style={selectStyle}>
                          {DAYS_PT.map((d, i) => <option key={i} value={i}>{d}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={rowFlex}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Período — início</label>
                      <input type="date" value={wdStart} onChange={e => setWdStart(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Período — fim</label>
                      <input type="date" value={wdEnd} onChange={e => setWdEnd(e.target.value)} style={inputStyle} min={wdStart} />
                    </div>
                  </div>
                  <div style={infoBox}>
                    💡 Serão buscadas todas as <strong>{DAYS_PT[depDayOfWeek]}s</strong> no período informado
                    {isRoundTrip ? ` com retorno no próximo(a) ${DAYS_PT[retDayOfWeek]}` : ''}.
                  </div>
                </div>
              )}

              {searchMode === 'flexible' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ flex: 1, maxWidth: 300 }}>
                    <label style={labelStyle}>Duração da viagem: <strong style={{ color: 'var(--gold)' }}>{tripDuration} dias</strong></label>
                    <input type="range" min={1} max={90} value={tripDuration}
                      onChange={e => setTripDuration(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent)', marginTop: 8 }} />
                  </div>
                  <div style={rowFlex}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Período — início</label>
                      <input type="date" value={flexStart} onChange={e => setFlexStart(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Período — fim</label>
                      <input type="date" value={flexEnd} onChange={e => setFlexEnd(e.target.value)} style={inputStyle} min={flexStart} />
                    </div>
                  </div>
                  <div style={infoBox}>
                    💡 Serão buscadas combinações com <strong>{tripDuration} dias</strong> de diferença ao longo do período.
                  </div>
                </div>
              )}

              {error && <div style={errorBox}>{error}</div>}

              <button onClick={handleSearch} disabled={loading} style={searchBtn}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={spinnerStyle} className="loading-spin" /> Buscando...
                  </span>
                ) : '✈ Buscar passagens'}
              </button>
            </div>

            <FlightResults results={results} loading={loading} />
          </>
        )}
      </main>

      <footer style={footerStyle}>
        <span>AeroFlex — powered by Amadeus API</span>
      </footer>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const appWrap = { minHeight: '100vh', display: 'flex', flexDirection: 'column' };
const header = { background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 };
const headerInner = { maxWidth: 860, margin: '0 auto', padding: '0 20px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const logo = { display: 'flex', alignItems: 'center', gap: 10 };
const logoIcon = { width: 34, height: 34, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 };
const logoText = { fontFamily: 'Syne', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' };
const navStyle = { display: 'flex', gap: 4 };
const navBtn = active => ({ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, position: 'relative', background: active ? 'var(--accent)' : 'transparent', color: active ? '#fff' : 'var(--text2)', transition: 'all 0.2s' });
const notifDot = { position: 'absolute', top: 4, right: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', border: '1px solid var(--bg)' };
const mainStyle = { flex: 1, maxWidth: 860, margin: '0 auto', width: '100%', padding: '0 20px 40px' };
const hero = { padding: '48px 0 28px', textAlign: 'center' };
const heroTitle = { fontSize: 'clamp(24px, 5vw, 38px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 };
const heroSub = { color: 'var(--text2)', marginTop: 10, fontSize: 15 };
const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px 24px 20px', boxShadow: 'var(--shadow)' };
const modeRow = { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' };
const modeBtn = active => ({ flex: 1, minWidth: 130, padding: '10px 14px', borderRadius: 'var(--radius2)', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'rgba(59,130,246,0.1)' : 'var(--bg3)', color: active ? 'var(--accent2)' : 'var(--text2)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', transition: 'all 0.2s' });
const rowFlex = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' };
const swapBtn = { padding: '10px 12px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius2)', color: 'var(--accent2)', cursor: 'pointer', fontSize: 18, alignSelf: 'flex-end' };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 };
const sectionTitle = { fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 };
const stopsRow = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const stopsBtn = active => ({
  padding: '8px 14px', borderRadius: 20, border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
  background: active ? 'rgba(59,130,246,0.15)' : 'var(--bg3)',
  color: active ? 'var(--accent2)' : 'var(--text2)',
  fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s',
});
const inputStyle = { display: 'block', width: '100%', padding: '11px 12px', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius2)', color: 'var(--text)', fontSize: 14, outline: 'none' };
const selectStyle = { display: 'block', width: '100%', padding: '11px 12px', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius2)', color: 'var(--text)', fontSize: 14, outline: 'none', cursor: 'pointer' };
const checkLabel = { display: 'flex', alignItems: 'center', cursor: 'pointer', paddingBottom: 11, color: 'var(--text2)' };
const divider = { height: 1, background: 'var(--border)', margin: '16px 0' };
const infoBox = { background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius2)', padding: '10px 14px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 };
const errorBox = { marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius2)', color: 'var(--red)', fontSize: 13 };
const searchBtn = { marginTop: 18, width: '100%', padding: '14px', fontSize: 16, fontWeight: 700, fontFamily: 'Syne', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 0.2s' };
const spinnerStyle = { width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' };
const footerStyle = { textAlign: 'center', padding: '16px 20px', fontSize: 12, color: 'var(--text3)', borderTop: '1px solid var(--border)' };
