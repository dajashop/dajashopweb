import { useEffect, useMemo, useState } from 'react';
import { workforceApi } from '../../../services/dajaPlatform';
import { useAuth } from '../../../hooks/useAuth';
import { useConsent } from '../../../context/ConsentContext';
import { readStoredValue, writeStoredValue } from '../../../services/consentStorage';
import { workforceModel, workDate, workHour, workTime, workNumber, workMinutes, workDuration, workOperation, shiftWorkDate, downloadWorkforceCsv } from '../utils/workforceAnalytics';
import { LineChart, ColumnChart, DonutChart, HorizontalChart, Heatmap, ActivityStrip } from './WorkforceCharts';
import './WorkforceTimeline.css';

const cards = [
  ['metrics', 'Glavni pokazatelji', 12, true], ['hourly', 'Unosi po satima', 8, true],
  ['types', 'Vrste aktivnosti', 4, false], ['growth', 'Napredak tokom dana', 6, true],
  ['timing', 'Vreme po artiklu', 6, true], ['rhythm', 'Ritam unosa', 4, false],
  ['peak', 'Najproduktivniji sati', 4, false], ['quality', 'Kvalitet artikala', 4, true],
  ['comparison', 'Lični napredak', 6, false], ['calendar', 'Kalendar aktivnosti', 6, false],
  ['missing', 'Najčešći nedostaci', 6, false], ['waiting', 'Čekanje na proveru i doradu', 6, false],
  ['groups', 'Učinak po brendu i odeljenju', 6, false], ['trend', 'Trend poslednjih 30 dana', 6, false],
  ['strip', 'Aktivnost kroz dan', 6, false], ['team', 'Poređenje zaposlenih', 12, false],
  ['timeline', 'Timeline', 12, true]
];
const defaults = () => Object.fromEntries(cards.map(([id, , span, visible]) => [id, { span, visible }]));
function normalizeLayout(value) {
  const base = defaults();
  for (const [id] of cards) if (value?.[id]) base[id] = { span: [4, 6, 8, 12].includes(value[id].span) ? value[id].span : base[id].span, visible: typeof value[id].visible === 'boolean' ? value[id].visible : base[id].visible };
  return base;
}
function Metric({ label, value, note }) {
  return <div className="wa-metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}
function Table({ headings, children }) {
  return <div className="wa-table-scroll"><table><thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export default function WorkforceTimeline({ userId, revision, products = [] }) {
  const { user } = useAuth();
  const { preferencesAllowed } = useConsent();
  const storageKey = `daja_workforce_layout:${user?.id || user?.email || 'staff'}`;
  const [layout, setLayout] = useState(defaults);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(() => workDate(Date.now()));
  const [windowSize, setWindowSize] = useState(24);
  const [startHour, setStartHour] = useState(8);
  const [pause, setPause] = useState(30);
  const [selectedHour, setSelectedHour] = useState(null);
  const [tab, setTab] = useState('activity');
  const [group, setGroup] = useState('brands');
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [retry, setRetry] = useState(0);
  const firstHour = windowSize === 24 ? 0 : startHour;
  useEffect(() => {
    let value;
    try { value = JSON.parse(readStoredValue(storageKey, 'preferences') || 'null'); } catch { value = null; }
    setLayout(normalizeLayout(value));
  }, [storageKey, preferencesAllowed]);
  const saveLayout = (next) => { setLayout(next); writeStoredValue(storageKey, JSON.stringify(next), 'preferences'); };
  const updateCard = (id, changes) => saveLayout({ ...layout, [id]: { ...layout[id], ...changes } });
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErrors([]); setData(null); setReport(null); setSelectedHour(null);
    Promise.allSettled([workforceApi.timeline(userId, date), workforceApi.dashboard(userId, { date, startHour: firstHour, hours: windowSize })]).then(([timeline, dashboard]) => {
      if (cancelled) return;
      if (timeline.status === 'fulfilled') setData(timeline.value);
      if (dashboard.status === 'fulfilled') setReport(dashboard.value);
      setErrors([timeline.status === 'rejected' ? `Aktivnosti: ${timeline.reason.message}` : '', dashboard.status === 'rejected' ? `Statistika i merenja: ${dashboard.reason.message}` : ''].filter(Boolean));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId, date, firstHour, windowSize, revision, retry]);
  const model = useMemo(() => workforceModel({ entries: data?.entries, report, products, date, firstHour, hours: windowSize, pause }), [data, report, products, date, firstHour, windowSize, pause]);
  const visibleEvents = model.periodEntries.filter((entry) => selectedHour == null || workHour(entry.occurredAt) === selectedHour);
  const visibleTimings = model.timings.filter((item) => selectedHour == null || workHour(item.finishedAt || item.startedAt) === selectedHour);
  const period = `${date} · ${String(firstHour).padStart(2, '0')}:00–${String(firstHour + windowSize).padStart(2, '0')}:00`;
  const timingLabel = (item) => item.status === 'abandoned' ? 'Odbačen' : item.status === 'open' ? 'Nezavršen' : !item.complete ? 'Nepotpuno merenje' : 'Završen';
  const exportCsv = () => {
    const rows = tab === 'items' ? [['Artikal', 'Vrsta rada', 'Početak', 'Završetak', 'Ukupno sekundi', 'Aktivno sekundi', 'Status merenja', 'Sesije izmena'], ...visibleTimings.map((item) => [item.productName, item.kind, item.startedAt, item.finishedAt, item.elapsedSeconds, item.activeSeconds, timingLabel(item), item.editSessions])]
      : tab === 'hours' ? [['Sat', 'Artikli', 'Ostale akcije', 'Prosečan razmak sekundi'], ...model.hourly.filter((item) => selectedHour == null || item.hour === selectedHour).map((item) => [item.label, item.count, item.other, item.average])]
      : [['Datum', 'Vreme', 'Aktivnost', 'Artikal', 'Razmak od prethodnog unosa u sekundama'], ...visibleEvents.map((entry) => [date, workTime(entry.occurredAt), workOperation(entry), entry.productName, model.gaps.get(entry.id)])];
    downloadWorkforceCsv(rows, `ucinak-${userId}-${date}-${tab}.csv`);
  };
  const notes = {
    quality: 'Trenutno stanje svih artikala zaposlenog', missing: 'Trenutni nedostaci; broj artikala po nedostatku',
    waiting: 'Trenutno čekanje; dorada od poslednjeg vraćanja', calendar: 'Poslednjih 90 dana do izabranog datuma · celi dani',
    trend: 'Poslednjih 30 dana do izabranog datuma · celi dani'
  };
  const renderCard = (id) => {
    const reportCard = ['comparison', 'calendar', 'trend', 'team', 'timing'].includes(id);
    if ((reportCard && !report) || (!reportCard && !data && !['quality', 'missing', 'waiting'].includes(id))) return <div className="wa-empty">Podaci nisu učitani. Pokušaj ponovo.</div>;
    switch (id) {
      case 'metrics': return <div className="wa-metrics">
        <Metric label="Dodati artikli" value={data ? model.periodCreations.length : '—'} note="Izabrani period" />
        <Metric label="Aktivno po artiklu" value={workMinutes(model.activeAverage)} note={`${model.measured.length} potpunih merenja`} />
        <Metric label="Ukupno po artiklu" value={workMinutes(model.elapsedAverage)} note="Uključuje neaktivnost" />
        <Metric label="Najbolji sat" value={data && model.peak?.count ? `${model.peak.label} · ${model.peak.count}` : '—'} note="Broj dodatih artikala" />
      </div>;
      case 'hourly': return <ColumnChart values={model.hourly} selected={selectedHour} onSelect={(h) => { setSelectedHour(selectedHour === h ? null : h); setTab('activity'); }} />;
      case 'types': return <DonutChart values={model.types} />;
      case 'growth': return <LineChart area series={[{ label: 'Ukupno dodatih artikala', values: model.growth }]} />;
      case 'timing': return <><LineChart unit="min" emptyText="Još nema potpunih merenja vremena za ovaj period." series={[
        { label: 'Ukupno vreme', color: '#64748b', values: model.measured.map((item) => ({ label: item.productName, value: Number(item.elapsedSeconds) / 60 })) },
        { label: 'Aktivno vreme', values: model.measured.map((item) => ({ label: item.productName, value: Number(item.activeSeconds) / 60 })) }
      ]} /><details className="wa-info"><summary>Kako se meri vreme?</summary><p>Ukupno vreme ide od otvaranja unosa do završetka čuvanja. Aktivno vreme pauzira kada prozor nije fokusiran ili posle 5 minuta bez interakcije. Stariji artikli nemaju ovo merenje. Nepotpune i nezavršene sesije nisu u proseku.</p></details></>;
      case 'rhythm': return <><ColumnChart values={model.histogram} /><div className="wa-inline-stats"><span>Prosek <b>{workMinutes(model.gapAverage)}</b></span><span>Medijana <b>{workMinutes(model.gapMedian)}</b></span></div><small className="wa-footnote">Razmaci između čuvanja, ne trajanje izrade. Prosek i medijana bez razmaka preko {pause} min.</small></>;
      case 'peak': return <HorizontalChart values={[...model.hourly].filter((item) => item.count).sort((a, b) => b.count - a.count).slice(0, 5)} />;
      case 'quality': return <DonutChart values={model.quality} />;
      case 'comparison': return report ? <><ColumnChart values={[{ label: 'Izabrani dan', count: model.periodCreations.length }, { label: 'Prethodni dan', count: model.previous, color: '#64748b' }, { label: 'Prosek 7 dana', count: model.weekAverage, color: '#8b7fb8' }]} /><small className="wa-footnote">Isti sati svakog dana; prosek uključuje i dane bez unosa. Razlika prema juče: {workNumber(model.periodCreations.length - model.previous)} artikala.</small></> : <div className="wa-empty">Poređenje nije učitano.</div>;
      case 'calendar': return <Heatmap values={model.history} />;
      case 'missing': return <HorizontalChart values={model.missing} />;
      case 'waiting': return <><HorizontalChart values={model.waiting} />{model.unknownWaiting > 0 && <small className="wa-footnote">Bez datuma vraćanja: {model.unknownWaiting} artikala.</small>}</>;
      case 'groups': return <><div className="wa-tabs"><button aria-pressed={group === 'brands'} onClick={() => setGroup('brands')}>Brendovi</button><button aria-pressed={group === 'departments'} onClick={() => setGroup('departments')}>Odeljenja</button></div><HorizontalChart values={model[group]} /></>;
      case 'trend': return <LineChart series={[{ label: 'Artikli po danu', values: model.history.slice(-30).map((item) => ({ label: item.date.slice(5), value: item.count })) }]} />;
      case 'strip': return <ActivityStrip entries={model.periodEntries} gaps={model.gaps} firstHour={firstHour} hours={windowSize} pause={pause} />;
      case 'team': return <><Table headings={['Zaposleni', 'Dodato', 'Odobreno sada', 'Na doradi sada', 'Aktivno / artikal', 'Ukupno / artikal', 'Izmereni unosi']}>
        {(report?.team || []).map((member) => <tr key={member.id} className={member.id === userId ? 'wa-highlight' : ''}><td><b>{member.name}</b></td><td>{member.count}</td><td>{member.approved} <small>{member.count ? `${workNumber(member.approved / member.count * 100)}% unosa` : '—'}</small></td><td>{member.returned}</td><td>{workMinutes(member.activeSeconds)}</td><td>{workMinutes(member.elapsedSeconds)}</td><td>{member.measured}</td></tr>)}
      </Table><small className="wa-footnote">Kvalitet je trenutno stanje artikala dodatih u izabranom periodu. Vreme se računa za potpuna merenja završena u tom periodu. Različiti poslovi i broj merenja utiču na poređenje.</small></>;
      case 'timeline': return <>
        <div className="wa-timeline-tools"><div className="wa-tabs">{[['activity', 'Aktivnosti'], ['hours', 'Po satima'], ['items', 'Po artiklu']].map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div>{selectedHour != null && <button onClick={() => setSelectedHour(null)}>Svi sati · ukloni {String(selectedHour).padStart(2, '0')}:00</button>}</div>
        {tab === 'activity' && <Table headings={['Vreme', 'Aktivnost', 'Artikal', 'Razmak između unosa', 'Od prethodne akcije']}>{visibleEvents.map((entry) => {
          const gap = model.gaps.get(entry.id); const index = model.positions.get(entry.id); const previous = index ? model.all[index - 1] : null;
          return <tr key={entry.id} className={gap > pause * 60 ? 'wa-long-gap' : ''}><td>{workTime(entry.occurredAt)}</td><td>{workOperation(entry)}</td><td>{entry.productName}{entry.deletedAt && <small>Obrisan artikal</small>}</td><td>{gap == null ? '—' : workMinutes(gap)}{gap > pause * 60 && <small>Duži razmak</small>}</td><td>{previous ? workMinutes((new Date(entry.occurredAt) - new Date(previous.occurredAt)) / 1000) : 'Prva aktivnost'}</td></tr>;
        })}</Table>}
        {tab === 'hours' && <Table headings={['Sat', 'Artikli', 'Ostale akcije', 'Prosečan razmak unosa', 'Prva / poslednja akcija']}>{model.hourly.filter((item) => selectedHour == null || item.hour === selectedHour).map((item) => <tr key={item.hour}><td>{item.label}</td><td>{item.count}</td><td>{item.other}</td><td>{item.average == null ? '—' : workMinutes(item.average)}</td><td>{item.events.length ? `${workTime(item.events[0].occurredAt)} / ${workTime(item.events.at(-1).occurredAt)}` : '—'}</td></tr>)}</Table>}
        {tab === 'items' && <Table headings={['Artikal', 'Vrsta', 'Početak', 'Završetak', 'Ukupno', 'Aktivno', 'Sesije izmena', 'Merenje']}>{visibleTimings.map((item) => <tr key={item.id}><td>{item.productName}</td><td>{{ create: 'Prvi unos', edit: 'Izmena', review: 'Kontrola' }[item.kind]}</td><td>{new Date(item.startedAt).toLocaleDateString('sr-RS', { timeZone: 'Europe/Belgrade' })}<small>{workTime(item.startedAt)}</small></td><td>{workTime(item.finishedAt)}</td><td>{workMinutes(item.elapsedSeconds)}<small>{workDuration(item.elapsedSeconds)}</small></td><td>{workMinutes(item.activeSeconds)}<small>{workDuration(item.activeSeconds)}</small></td><td>{item.editSessions}</td><td>{timingLabel(item)}</td></tr>)}</Table>}
        {((tab === 'activity' && !visibleEvents.length) || (tab === 'items' && !visibleTimings.length)) && <div className="wa-empty">{tab === 'items' ? 'Nema zabeleženih sesija rada. Stariji artikli imaju samo istoriju unosa.' : 'Nema aktivnosti za izabrani period.'}</div>}
      </>;
      default: return null;
    }
  };
  return <section className="wa-dashboard">
    <header className="wa-toolbar"><div><h3>Učinak i statistika</h3><p>Europe/Belgrade · {period}</p></div><div className="wa-toolbar-actions"><button aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? 'Završi uređivanje' : 'Uredi raspored'}</button><button disabled={loading || (!data && !report)} onClick={exportCsv}>Preuzmi CSV</button></div></header>
    <div className="wa-controls"><button aria-label="Prethodni dan" onClick={() => setDate(shiftWorkDate(date, -1))}>←</button><label>Dan<input type="date" value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} /></label><button aria-label="Sledeći dan" onClick={() => setDate(shiftWorkDate(date, 1))}>→</button><button onClick={() => setDate(workDate(Date.now()))}>Danas</button>
      <label>Prikaz<select value={windowSize} onChange={(event) => setWindowSize(Number(event.target.value))}><option value={24}>Ceo dan · 24 sata</option><option value={12}>12 sati</option></select></label>
      {windowSize === 12 && <label>Početak<select value={startHour} onChange={(event) => setStartHour(Number(event.target.value))}>{Array.from({ length: 13 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label>}
      <label>Duži razmak<select value={pause} onChange={(event) => setPause(Number(event.target.value))}>{[15, 30, 45, 60].map((value) => <option key={value} value={value}>Preko {value} min</option>)}</select></label>
    </div>
    {editing && <div className="wa-layout-editor"><div className="wa-heading"><h4>Vidljive kartice</h4><button onClick={() => saveLayout(defaults())}>Vrati podrazumevano</button></div><p>Širinu menjaš u zaglavlju kartice. Na telefonu se kartice automatski slažu jedna ispod druge.</p><div>{cards.map(([id, title]) => <label key={id}><input type="checkbox" checked={layout[id].visible} onChange={(event) => updateCard(id, { visible: event.target.checked })} />{title}</label>)}</div>{!preferencesAllowed && <small>Raspored ostaje za ovu posetu. Za pamćenje u pregledaču uključi čuvanje preferencija.</small>}</div>}
    {errors.length > 0 && <div className="wa-error" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}<button onClick={() => setRetry(retry + 1)}>Pokušaj ponovo</button></div>}
    {loading && <p className="wa-loading" role="status">Učitavanje grafikona i merenja…</p>}
    <div className="wa-grid">{cards.filter(([id]) => layout[id].visible).map(([id, title]) => <article key={id} className={`wa-card wa-span-${layout[id].span}`}><header className="wa-card-header"><div><h4>{title}</h4><small>{notes[id] || period}</small></div>{editing && <div className="wa-card-actions"><select aria-label={`Širina kartice ${title}`} value={layout[id].span} onChange={(event) => updateCard(id, { span: Number(event.target.value) })}><option value={12}>Cela · 1/1</option><option value={6}>Polovina · 1/2</option><option value={4}>Trećina · 1/3</option><option value={8}>Dve trećine · 2/3</option></select><button aria-label={`Sakrij ${title}`} onClick={() => updateCard(id, { visible: false })}>×</button></div>}</header><div className="wa-card-content">{loading && !['quality', 'missing', 'waiting'].includes(id) ? <div className="wa-empty">Učitavanje…</div> : renderCard(id)}</div></article>)}</div>
    {!cards.some(([id]) => layout[id].visible) && <div className="wa-empty">Sve kartice su skrivene. Uključi ih kroz „Uredi raspored“.</div>}
  </section>;
}
