import { useState } from 'react';

// Nomes das companhias aéreas
const AIRLINES = {
  G3: 'GOL', LA: 'LATAM', AD: 'Azul', JJ: 'LATAM', O6: 'Avianca Brasil',
  AA: 'American Airlines', UA: 'United Airlines', DL: 'Delta Air Lines',
  AF: 'Air France', KL: 'KLM', LH: 'Lufthansa', IB: 'Iberia',
  TP: 'TAP Air Portugal', BA: 'British Airways', EK: 'Emirates',
  QR: 'Qatar Airways', TK: 'Turkish Airlines', CM: 'Copa Airlines',
  AV: 'Avianca', AM: 'Aeromexico', AR: 'Aerolíneas Argentinas',
  AC: 'Air Canada', WS: 'WestJet', FR: 'Ryanair', U2: 'EasyJet',
  VY: 'Vueling', W6: 'Wizz Air', AZ: 'ITA Airways', SK: 'SAS',
  LX: 'Swiss', OS: 'Austrian', SN: 'Brussels Airlines',
};

function getAirlineName(code) {
  return AIRLINES[code] || code;
}

function getAirlineLogo(code) {
  // Retorna as iniciais com cor baseada no código
  const colors = {
    G3: '#F97316', LA: '#E11D48', AD: '#3B82F6', AA: '#6366F1',
    UA: '#0EA5E9', DL: '#8B5CF6', AF: '#EF4444', KL: '#06B6D4',
    LH: '#F59E0B', TP: '#10B981', BA: '#1D4ED8', EK: '#D97706',
  };
  return { initials: code, color: colors[code] || '#6B7280' };
}

function formatDuration(iso) {
  if (!iso) return '';
  const h = iso.match(/(\d+)H/);
  const m = iso.match(/(\d+)M/);
  return `${h ? h[1] + 'h' : ''}${m ? ' ' + m[1] + 'min' : ''}`;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short'
  });
}

export default function FlightResults({ results, loading }) {
  const [expanded, setExpanded] = useState(null);

  if (loading) return (
    <div style={loadingWrap}>
      <div style={spinnerStyle} className="loading-spin" />
      <p style={{ color: 'var(--text2)', marginTop: 16 }}>Buscando os melhores voos...</p>
    </div>
  );

  if (!results) return null;

  if (results.length === 0) return (
    <div style={emptyWrap}>
      <div style={{ fontSize: 40 }}>🔍</div>
      <p style={{ color: 'var(--text2)', marginTop: 12 }}>Nenhum voo encontrado.</p>
      <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 6 }}>Tente ajustar os filtros de horário ou datas.</p>
    </div>
  );

  const sorted = [...results].sort((a, b) => a.price - b.price);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div style={{ marginTop: 24 }} className="fade-up">

      {/* ── TOP 3 destaque ── */}
      <div style={sectionHeader}>
        <span style={sectionTitle}>🏆 Top 3 Melhores Preços</span>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>
          {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={top3Grid}>
        {top3.map((flight, i) => {
          const seg = flight.itineraries[0]?.segments[0];
          const airline = getAirlineLogo(seg?.carrierCode || '');
          const allCarriers = flight.itineraries.flatMap(it =>
            it.segments.map(s => s.carrierCode)
          );
          const uniqueCarriers = [...new Set(allCarriers)];

          return (
            <div key={i} style={{
              ...top3Card,
              border: i === 0 ? '1px solid rgba(245,158,11,0.5)' : '1px solid var(--border)',
              boxShadow: i === 0 ? '0 0 20px rgba(245,158,11,0.1)' : 'none',
            }}
              onClick={() => setExpanded(expanded === `top-${i}` ? null : `top-${i}`)}
            >
              {i === 0 && <div style={bestBadge}>⭐ MELHOR PREÇO</div>}
              {i === 1 && <div style={{ ...bestBadge, background: 'var(--surface2)', color: 'var(--text2)' }}>2º LUGAR</div>}
              {i === 2 && <div style={{ ...bestBadge, background: 'var(--surface2)', color: 'var(--text2)' }}>3º LUGAR</div>}

              {/* Airline badge */}
              <div style={airlineBadge}>
                <div style={{ ...airlineCircle, background: airline.color }}>
                  {airline.initials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {getAirlineName(seg?.carrierCode || '')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {uniqueCarriers.map(c => `${c}${flight.itineraries[0]?.segments.find(s => s.carrierCode === c)?.flightNumber || ''}`).join(', ')}
                  </div>
                </div>
              </div>

              {/* Route */}
              {flight.itineraries.map((it, j) => {
                const first = it.segments[0];
                const last = it.segments[it.segments.length - 1];
                const stops = it.segments.length - 1;
                return (
                  <div key={j} style={top3Route}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={bigTime}>{formatTime(first.departure.at)}</div>
                      <div style={airportLabel}>{first.departure.iataCode}</div>
                    </div>
                    <div style={top3Line}>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{formatDuration(it.duration)}</div>
                      <div style={lineBar}>
                        {stops > 0 && Array.from({ length: stops }).map((_, k) => (
                          <div key={k} style={stopDot} title={it.segments[k].arrival.iataCode} />
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: stops === 0 ? 'var(--green)' : 'var(--orange)' }}>
                        {stops === 0 ? '✈ Direto' : `${stops} parada${stops > 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={bigTime}>{formatTime(last.arrival.at)}</div>
                      <div style={airportLabel}>{last.arrival.iataCode}</div>
                    </div>
                  </div>
                );
              })}

              {/* Date */}
              <div style={top3Dates}>
                <span>📅 {formatDate(flight.departureDate)}</span>
                {flight.returnDate && <span>↩ {formatDate(flight.returnDate)}</span>}
              </div>

              {/* Price */}
              <div style={top3Price}>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>por pessoa</span>
                <span style={{
                  ...priceText,
                  color: i === 0 ? 'var(--gold)' : 'var(--text)',
                  fontSize: i === 0 ? 26 : 22,
                }}>
                  R$ {flight.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Expanded detail */}
              {expanded === `top-${i}` && (
                <div style={detailPanel}>
                  {flight.itineraries.map((it, j) => (
                    <div key={j} style={{ marginBottom: j < flight.itineraries.length - 1 ? 14 : 0 }}>
                      <div style={detailHeader}>{j === 0 ? '✈ IDA' : '✈ VOLTA'} · {formatDuration(it.duration)}</div>
                      {it.segments.map((seg, k) => (
                        <div key={k} style={segRow}>
                          <div style={{ minWidth: 44, textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{formatTime(seg.departure.at)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                              {new Date(seg.departure.at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </div>
                          </div>
                          <div style={segLineCol}>
                            <div style={segDot} />
                            <div style={segConnector} />
                            <div style={segDot} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, color: 'var(--accent2)', fontSize: 14 }}>{seg.departure.iataCode}</span>
                              <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
                                {getAirlineName(seg.carrierCode)} · {seg.carrierCode}{seg.flightNumber}
                                {seg.aircraft ? ` · ${seg.aircraft}` : ''}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>⏱ {formatDuration(seg.duration)}</div>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--accent2)', fontSize: 14 }}>{seg.arrival.iataCode}</span>
                              <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>{formatTime(seg.arrival.at)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {flight.seats && (
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--orange)' }}>
                      ⚠ {flight.seats} assento{flight.seats > 1 ? 's' : ''} disponível{flight.seats > 1 ? 'is' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Outros resultados ── */}
      {rest.length > 0 && (
        <>
          <div style={{ ...sectionHeader, marginTop: 28 }}>
            <span style={sectionTitle}>Outros voos encontrados</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rest.map((flight, i) => {
              const idx = `rest-${i}`;
              const seg0 = flight.itineraries[0]?.segments[0];
              const allCarriers = flight.itineraries.flatMap(it => it.segments.map(s => s.carrierCode));
              const uniqueCarriers = [...new Set(allCarriers)];

              return (
                <div key={i} style={listCard} onClick={() => setExpanded(expanded === idx ? null : idx)}>
                  <div style={listCardInner}>
                    {/* Airline */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
                      <div style={{ ...airlineCircle, width: 32, height: 32, fontSize: 10, background: getAirlineLogo(seg0?.carrierCode || '').color }}>
                        {seg0?.carrierCode}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {getAirlineName(seg0?.carrierCode || '')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {uniqueCarriers.map(c => {
                            const s = flight.itineraries[0]?.segments.find(sg => sg.carrierCode === c);
                            return `${c}${s?.flightNumber || ''}`;
                          }).join(', ')}
                        </div>
                      </div>
                    </div>

                    {/* Itineraries */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {flight.itineraries.map((it, j) => {
                        const first = it.segments[0];
                        const last = it.segments[it.segments.length - 1];
                        const stops = it.segments.length - 1;
                        return (
                          <div key={j} style={itinRow}>
                            <div style={{ textAlign: 'center', minWidth: 48 }}>
                              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{formatTime(first.departure.at)}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{first.departure.iataCode}</div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{formatDuration(it.duration)}</div>
                              <div style={{ width: '100%', height: 1, background: 'var(--border2)', position: 'relative' }}>
                                {stops > 0 && Array.from({ length: stops }).map((_, k) => (
                                  <div key={k} style={{ ...stopDot, position: 'absolute', top: -3, left: `${((k + 1) / (stops + 1)) * 100}%` }} />
                                ))}
                              </div>
                              <div style={{ fontSize: 10, color: stops === 0 ? 'var(--green)' : 'var(--orange)' }}>
                                {stops === 0 ? 'Direto' : `${stops} parada${stops > 1 ? 's' : ''}`}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', minWidth: 48 }}>
                              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{formatTime(last.arrival.at)}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{last.arrival.iataCode}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dates + Price */}
                    <div style={{ textAlign: 'right', minWidth: 120 }}>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
                        {formatDate(flight.departureDate)}
                        {flight.returnDate && ` · ${formatDate(flight.returnDate)}`}
                      </div>
                      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>
                        R$ {flight.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>por pessoa · {expanded === idx ? '▲' : '▼'}</div>
                    </div>
                  </div>

                  {expanded === idx && (
                    <div style={detailPanel}>
                      {flight.itineraries.map((it, j) => (
                        <div key={j} style={{ marginBottom: j < flight.itineraries.length - 1 ? 14 : 0 }}>
                          <div style={detailHeader}>{j === 0 ? '✈ IDA' : '✈ VOLTA'} · {formatDuration(it.duration)}</div>
                          {it.segments.map((seg, k) => (
                            <div key={k} style={segRow}>
                              <div style={{ minWidth: 44, textAlign: 'right' }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{formatTime(seg.departure.at)}</div>
                                <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                                  {new Date(seg.departure.at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </div>
                              </div>
                              <div style={segLineCol}>
                                <div style={segDot} />
                                <div style={segConnector} />
                                <div style={segDot} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: 4 }}>
                                  <span style={{ fontWeight: 700, color: 'var(--accent2)', fontSize: 14 }}>{seg.departure.iataCode}</span>
                                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>
                                    {getAirlineName(seg.carrierCode)} · {seg.carrierCode}{seg.flightNumber}
                                    {seg.aircraft ? ` · ${seg.aircraft}` : ''}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>⏱ {formatDuration(seg.duration)}</div>
                                <div>
                                  <span style={{ fontWeight: 700, color: 'var(--accent2)', fontSize: 14 }}>{seg.arrival.iataCode}</span>
                                  <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>{formatTime(seg.arrival.at)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {flight.seats && (
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--orange)' }}>
                              ⚠ {flight.seats} assento{flight.seats > 1 ? 's' : ''} disponível{flight.seats > 1 ? 'is' : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const loadingWrap = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' };
const spinnerStyle = { width: 36, height: 36, border: '3px solid var(--surface2)', borderTopColor: 'var(--accent)', borderRadius: '50%' };
const emptyWrap = { textAlign: 'center', padding: '60px 0' };
const sectionHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 };
const sectionTitle = { fontFamily: 'Syne', fontWeight: 700, fontSize: 16 };
const top3Grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 };
const top3Card = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  padding: 16, cursor: 'pointer', position: 'relative',
  transition: 'border-color 0.2s', overflow: 'hidden',
};
const bestBadge = {
  display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
  background: 'var(--gold)', color: '#000', padding: '3px 8px',
  borderRadius: 4, marginBottom: 10,
};
const airlineBadge = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 };
const airlineCircle = {
  width: 38, height: 38, borderRadius: 10,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'Syne', fontWeight: 800, fontSize: 12, color: '#fff',
  flexShrink: 0,
};
const top3Route = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 };
const top3Line = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 };
const bigTime = { fontFamily: 'Syne', fontWeight: 800, fontSize: 20 };
const airportLabel = { fontSize: 11, color: 'var(--text3)', marginTop: 2 };
const lineBar = {
  width: '100%', height: 1, background: 'var(--border2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
};
const stopDot = { width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', flexShrink: 0 };
const top3Dates = { display: 'flex', gap: 10, fontSize: 11, color: 'var(--text3)', marginBottom: 10, flexWrap: 'wrap' };
const top3Price = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderTop: '1px solid var(--border)', paddingTop: 10 };
const priceText = { fontFamily: 'Syne', fontWeight: 800 };
const detailPanel = { marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', background: 'var(--bg2)', margin: '14px -16px -16px', padding: '14px 16px 16px' };
const detailHeader = { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 10 };
const segRow = { display: 'flex', gap: 10, marginBottom: 8 };
const segLineCol = { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, gap: 2 };
const segDot = { width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)', flexShrink: 0 };
const segConnector = { width: 1, height: 24, background: 'var(--border2)' };
const listCard = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer',
  transition: 'border-color 0.2s',
};
const listCardInner = { display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', flexWrap: 'wrap' };
const itinRow = { display: 'flex', alignItems: 'center', gap: 8 };
