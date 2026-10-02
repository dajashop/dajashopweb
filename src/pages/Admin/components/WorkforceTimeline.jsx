import { useEffect, useMemo, useState } from 'react';
import { workforceApi } from '../../../services/dajaPlatform';
import './WorkforceTimeline.css';

const zone = 'Europe/Belgrade';
const dayKey = (value) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const time = (value) => new Date(value).toLocaleTimeString('sr-RS', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit' });
const hour = (value) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', hourCycle: 'h23' }).format(new Date(value)));
const number = (value) => value == null ? '—' : value.toLocaleString('sr-RS', { maximumFractionDigits: 1 });
const minutes = (value) => value == null ? '—' : `${number(value)} min`;
const difference = (a, b) => (new Date(a) - new Date(b)) / 60000;
const isCreation = (entry) => entry.id.startsWith('product:');
const operationNames = { created: 'Dodat artikal', create: 'Kreiranje', updated: 'Izmena', update: 'Izmena', deleted: 'Brisanje', delete: 'Brisanje', adjust: 'Promena zalihe', quality_approved: 'Odobrenje', quality_changes_requested: 'Vraćanje na doradu' };
const typeNames = { product: 'Artikal', variant: 'Varijanta', inventory_balance: 'Zaliha' };

function Stat({ label, value, note }) {
  return <div className="wt-stat"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

export default function WorkforceTimeline({ userId, revision }) {
  const [date, setDate] = useState(() => dayKey(Date.now()));
  const [windowSize, setWindowSize] = useState(24);
  const [startHour, setStartHour] = useState(8);
  const [pause, setPause] = useState(30);
  const [selectedHour, setSelectedHour] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setData(null);
    setSelectedHour(null);
    workforceApi.timeline(userId, date).then((result) => {
      if (!cancelled) setData(result);
    }).catch((err) => {
      if (!cancelled) setError(err.message || 'Timeline nije učitan.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, date, revision]);

  const stats = useMemo(() => {
    const entries = [...(data?.entries || [])].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt) || a.id.localeCompare(b.id));
    const creations = entries.filter(isCreation);
    const gaps = new Map();
    creations.forEach((entry, index) => gaps.set(entry.id, index ? difference(entry.occurredAt, creations[index - 1].occurredAt) : null));
    const intervals = [...gaps.values()].filter((value) => value != null);
    const continuous = intervals.filter((value) => value <= pause);
    const sorted = [...continuous].sort((a, b) => a - b);
    const median = sorted.length ? (sorted[Math.floor(sorted.length / 2)] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2 : null;
    const hours = Array.from({ length: 24 }, (_, h) => {
      const events = entries.filter((entry) => hour(entry.occurredAt) === h);
      const added = events.filter(isCreation);
      const localGaps = added.map((entry) => gaps.get(entry.id)).filter((value) => value != null && value <= pause);
      return { hour: h, entries: events, count: added.length, other: events.length - added.length,
        average: localGaps.length ? localGaps.reduce((sum, value) => sum + value, 0) / localGaps.length : null };
    });
    const peak = hours.reduce((best, current) => current.count > best.count ? current : best, hours[0]);
    const span = entries.length > 1 ? difference(entries.at(-1).occurredAt, entries[0].occurredAt) : null;
    return { entries, creations, gaps, hours, peak, median, span, positions: new Map(entries.map((entry, index) => [entry.id, index])),
      average: continuous.length ? continuous.reduce((sum, value) => sum + value, 0) / continuous.length : null,
      fastest: continuous.length ? Math.min(...continuous) : null,
      longest: intervals.length ? Math.max(...intervals) : null,
      breaks: intervals.filter((value) => value > pause),
      activeHours: hours.filter((value) => value.count).length };
  }, [data, pause]);

  const firstHour = windowSize === 24 ? 0 : startHour;
  const hours = stats.hours.slice(firstHour, firstHour + windowSize);
  const visible = stats.entries.filter((entry) => {
    const h = hour(entry.occurredAt);
    return h >= firstHour && h < firstHour + windowSize && (selectedHour == null || h === selectedHour);
  });
  const max = Math.max(1, ...hours.map((value) => Math.max(value.count, value.other)));
  const shiftDay = (delta) => {
    const next = new Date(`${date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + delta);
    setDate(next.toISOString().slice(0, 10));
  };
  const exportCsv = () => {
    const rows = [['Datum', 'Vreme', 'Aktivnost', 'Artikal', 'Tip', 'Minuta od prethodnog unosa', 'Duzi razmak'], ...visible.map((entry) => {
      const gap = stats.gaps.get(entry.id);
      return [date, time(entry.occurredAt), operationNames[entry.operation] || entry.operation, entry.productName,
        typeNames[entry.aggregateType] || entry.aggregateType, gap == null ? '' : gap.toFixed(2), gap > pause ? 'Da' : ''];
    })];
    const csv = '\uFEFF' + rows.map((row) => row.map((cell) => {
      const value = String(cell ?? '');
      const safe = /^[=+@\-\t\r\n]/.test(value) ? `'${value}` : value;
      return `"${safe.replaceAll('"', '""')}"`;
    }).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `ucinak-${userId}-${date}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <section className="wt-panel">
    <div className="wt-heading"><div><h3>Detaljan učinak i timeline</h3><p>Izaberi dan i klikni na sat za njegove unose i izmene. Vreme: Europe/Belgrade.</p></div>
      <button onClick={exportCsv} disabled={!visible.length || loading}>Preuzmi CSV</button></div>
    <div className="wt-controls">
      <button aria-label="Prethodni dan" onClick={() => shiftDay(-1)}>←</button>
      <label>Dan<input type="date" value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} /></label>
      <button aria-label="Sledeći dan" onClick={() => shiftDay(1)}>→</button>
      <button onClick={() => setDate(dayKey(Date.now()))}>Danas</button>
      <label>Prikaz<select value={windowSize} onChange={(event) => { setWindowSize(Number(event.target.value)); setSelectedHour(null); }}><option value={24}>Ceo dan · 24 sata</option><option value={12}>12 sati</option></select></label>
      {windowSize === 12 && <label>Početak<select value={startHour} onChange={(event) => { setStartHour(Number(event.target.value)); setSelectedHour(null); }}>{Array.from({ length: 13 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label>}
      <label>Duži razmak<select value={pause} onChange={(event) => setPause(Number(event.target.value))}>{[15, 30, 45, 60].map((value) => <option key={value} value={value}>Preko {value} min</option>)}</select></label>
    </div>
    {loading ? <p role="status">Učitavanje aktivnosti…</p> : error ? <p role="alert" className="wt-error">{error}</p> : data && <>
      <div className="wt-stats">
        <Stat label="Dodato u danu" value={stats.creations.length} note="Uključuje obrisane artikle" />
        <Stat label="Ostale aktivnosti" value={stats.entries.length - stats.creations.length} note="Izmene, zalihe i druge akcije" />
        <Stat label="Sati sa unosima" value={stats.activeHours} />
        <Stat label="Najproduktivniji sat" value={stats.peak.count ? `${String(stats.peak.hour).padStart(2, '0')}:00 · ${stats.peak.count} art.` : '—'} />
        <Stat label="Prosečan razmak po artiklu" value={minutes(stats.average)} note={`Bez razmaka preko ${pause} min`} />
        <Stat label="Medijana razmaka" value={minutes(stats.median)} note="Tipičan ritam uzastopnih unosa" />
        <Stat label="Najkraći razmak" value={minutes(stats.fastest)} />
        <Stat label="Najduži razmak" value={minutes(stats.longest)} note="Između unosa u istom danu" />
        <Stat label="Duži razmaci" value={stats.breaks.length} note={`${minutes(stats.breaks.reduce((sum, value) => sum + value, 0))} ukupno`} />
        <Stat label="Raspon aktivnosti" value={minutes(stats.span)} note="Od prve do poslednje akcije" />
        <Stat label="Prva aktivnost" value={stats.entries.length ? time(stats.entries[0].occurredAt) : '—'} />
        <Stat label="Poslednja aktivnost" value={stats.entries.length ? time(stats.entries.at(-1).occurredAt) : '—'} />
      </div>
      <p className="wt-note">Minuti po artiklu predstavljaju razmak između sačuvanih unosa, a ne izmereno trajanje izrade. Početak rada nije zabeležen; duži razmak nije dokaz pauze. Raspon aktivnosti nije radno vreme. Statistike iznad važe za ceo izabrani dan.</p>
      <div className="wt-legend"><span><i className="wt-green" /> Dodati artikli</span><span><i className="wt-grey" /> Ostale aktivnosti</span></div>
      <div className="wt-chart-scroll"><div className="wt-chart" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(34px, 1fr))` }}>
        {hours.map((value) => <button key={value.hour} className={`wt-hour ${selectedHour === value.hour ? 'wt-selected' : ''}`} aria-pressed={selectedHour === value.hour}
          aria-label={`${value.hour}:00, ${value.count} artikala, ${value.other} ostalih aktivnosti`}
          title={`${value.hour}:00 — ${value.count} artikala; ${value.other} ostalih aktivnosti; prosečan razmak ${minutes(value.average)}`}
          onClick={() => setSelectedHour(selectedHour === value.hour ? null : value.hour)}>
          <strong>{value.count}</strong><div className="wt-bars"><i className="wt-green" style={{ height: `${Math.max(2, value.count / max * 100)}%` }} /><i className="wt-grey" style={{ height: `${Math.max(2, value.other / max * 100)}%` }} /></div><span>{String(value.hour).padStart(2, '0')}:00</span>
        </button>)}
      </div></div>
      <details className="wt-hour-details"><summary>Detalji po satima · broj artikala, ritam i aktivnosti</summary><div className="wt-table-scroll"><table><thead><tr><th>Sat</th><th>Artikli</th><th>Ostale akcije</th><th>Prosečan razmak unosa</th><th>Prva / poslednja aktivnost</th></tr></thead><tbody>{hours.map((value) => <tr key={value.hour}><td>{String(value.hour).padStart(2, '0')}:00</td><td>{value.count}</td><td>{value.other}</td><td>{minutes(value.average)}</td><td>{value.entries.length ? `${time(value.entries[0].occurredAt)} / ${time(value.entries.at(-1).occurredAt)}` : '—'}</td></tr>)}</tbody></table></div></details>
      <div className="wt-heading"><h4>Timeline · {selectedHour == null ? 'izabrani period' : `${String(selectedHour).padStart(2, '0')}:00–${String(selectedHour + 1).padStart(2, '0')}:00`} · {visible.length} aktivnosti</h4>{selectedHour != null && <button onClick={() => setSelectedHour(null)}>Svi sati</button>}</div>
      <div className="wt-table-scroll wt-timeline"><table><thead><tr><th>Vreme</th><th>Aktivnost</th><th>Artikal</th><th>Minuti od prethodnog unosa</th><th>Razmak od prethodne akcije</th></tr></thead><tbody>{visible.map((entry) => {
        const gap = stats.gaps.get(entry.id);
        const index = stats.positions.get(entry.id);
        const previous = index ? stats.entries[index - 1] : null;
        return <tr key={entry.id} className={gap > pause ? 'wt-break' : ''}><td className="wt-time">{time(entry.occurredAt)}</td><td>{operationNames[entry.operation] || entry.operation}<small>{typeNames[entry.aggregateType] || entry.aggregateType}</small></td><td>{entry.productName}{entry.deletedAt && <small>Artikal je obrisan</small>}</td><td>{isCreation(entry) ? gap == null ? 'Prvi unos u danu' : minutes(gap) : '—'}{gap > pause && <small>Duži razmak</small>}</td><td>{previous ? minutes(difference(entry.occurredAt, previous.occurredAt)) : 'Prva aktivnost'}</td></tr>;
      })}</tbody></table>{!visible.length && <p className="wt-empty">Nema zabeleženih aktivnosti za izabrani period.</p>}</div>
    </>}
  </section>;
}
