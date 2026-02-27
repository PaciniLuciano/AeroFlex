import { useState, useRef, useEffect } from 'react';
import { AIRPORTS_BR } from '../airports-br.js';

export default function AirportInput({ label, value, onChange, placeholder }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeout = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (value) {
      setQuery(`${value.iataCode} — ${value.cityName || value.name}`);
      setSelected(true);
    }
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleType(e) {
    const v = e.target.value;
    setQuery(v);
    setSelected(false);
    onChange(null);
    clearTimeout(timeout.current);

    if (v.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const term = v.toLowerCase();
    const localResults = AIRPORTS_BR.filter(a =>
      a.iataCode.toLowerCase().includes(term) ||
      a.cityName.toLowerCase().includes(term) ||
      a.name.toLowerCase().includes(term)
    ).slice(0, 5);

    setSuggestions(localResults);
    setOpen(localResults.length > 0);

    setLoading(true);
    timeout.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/airports?keyword=${encodeURIComponent(v)}`);
        const data = await r.json();
        const apiResults = (data.airports || [])
          .filter(a => a.countryCode !== 'BR')
          .slice(0, 5);
        const combined = [...localResults, ...apiResults].slice(0, 8);
        setSuggestions(combined);
        setOpen(combined.length > 0);
      } catch (err) {
        console.log(err);
      }
      setLoading(false);
    }, 400);
  }

  function select(airport) {
    onChange(airport);
    setSelected(true);
    setQuery(`${airport.iataCode} — ${airport.cityName || airport.name}`);
    setOpen(false);
    setSuggestions([]);
  }

  function handleClear() {
    setQuery('');
    setSelected(false);
    onChange(null);
    setSuggestions([]);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 180 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ ...inputWrap, borderColor: selected ? 'rgba(16,185,129,0.5)' : 'var(--border2)' }}>
        <span style={iconStyle}>{loading ? '⟳' : '✈'}</span>
        <input
          value={query}
          onChange={handleType}
          placeholder={placeholder || 'Cidade ou aeroporto...'}
          style={inputStyle}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        />
        {selected && (
          <span onClick={handleClear} style={clearBtn}>✕</span>
        )}
        {selected && (
          <span style={{ paddingRight: 10, color: 'var(--green)' }}>✓</span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div style={dropdownStyle}>
          {suggestions.map(a => (
            <div
              key={a.iataCode}
              onClick={() => select(a)}
              style={itemStyle}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={iataStyle}>{a.iataCode}</span>
              <div style={{ flex: 1, marginLeft: 10 }}>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>
                  {a.cityName || a.name}
                  {a.countryCode === 'BR' ? ' 🇧🇷' : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {a.name} · {a.countryName}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'var(--text3)', marginBottom: 6,
};
const inputWrap = {
  display: 'flex', alignItems: 'center',
  background: 'var(--surface)', border: '1px solid',
  borderRadius: 'var(--radius2)', overflow: 'hidden',
  transition: 'border-color 0.2s',
};
const iconStyle = {
  padding: '0 10px', color: 'var(--accent)',
  fontSize: 16, userSelect: 'none',
};
const inputStyle = {
  flex: 1, padding: '11px 8px 11px 0',
  background: 'transparent', border: 'none',
  outline: 'none', color: 'var(--text)', fontSize: 14,
};
const clearBtn = {
  padding: '0 8px', cursor: 'pointer',
  color: 'var(--text3)', fontSize: 14,
};
const dropdownStyle = {
  position: 'absolute', top: '100%', left: 0, right: 0,
  zIndex: 100, background: 'var(--bg3)',
  border: '1px solid var(--border2)',
  borderRadius: 'var(--radius2)', marginTop: 4,
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  maxHeight: 280, overflowY: 'auto',
};
const itemStyle = {
  display: 'flex', alignItems: 'center',
  padding: '10px 14px', cursor: 'pointer',
  transition: 'background 0.15s', background: 'transparent',
};
const iataStyle = {
  fontFamily: 'Syne', fontWeight: 700,
  color: 'var(--accent2)', fontSize: 15, minWidth: 40,
};