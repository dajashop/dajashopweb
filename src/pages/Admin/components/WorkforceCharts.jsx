import { workNumber } from '../utils/workforceAnalytics';

const palette = ['#059669', '#64748b', '#e0a34a', '#8b7fb8', '#4389b5'];
function Empty({ text = 'Nema podataka za izabrani period.' }) {
  return <div className="wa-empty">{text}</div>;
}
export function LineChart({ series, area = false, unit = '', emptyText }) {
  const length = Math.max(0, ...series.map((row) => row.values.length));
  const finite = series.flatMap((row) => row.values.map((point) => point.value)).filter((value) => value != null && Number.isFinite(Number(value)));
  if (!length || !finite.length) return <Empty text={emptyText} />;
  const max = Math.max(1, ...finite.map(Number));
  const x = (index) => 44 + index / Math.max(1, length - 1) * 560;
  const y = (value) => 177 - Number(value) / max * 142;
  return <div className="wa-plot"><svg viewBox="0 0 640 220" role="img" aria-label={series.map((row) => row.label).join(', ')}>
    {[0, .25, .5, .75, 1].map((ratio) => <g key={ratio}><line x1="44" x2="604" y1={y(max * ratio)} y2={y(max * ratio)} stroke="#eceff1" /><text x="37" y={y(max * ratio) + 4} textAnchor="end">{workNumber(max * ratio)}</text></g>)}
    {series.map((row, si) => {
      const color = row.color || palette[si];
      const segments = [];
      let segment = [];
      row.values.forEach((point, index) => {
        if (point.value == null) { if (segment.length) segments.push(segment); segment = []; }
        else segment.push({ ...point, index });
      });
      if (segment.length) segments.push(segment);
      return <g key={row.label}>{segments.map((points, index) => <g key={index}>
        {area && <path d={`M ${x(points[0].index)},177 L ${points.map((point) => `${x(point.index)},${y(point.value)}`).join(' L ')} L ${x(points.at(-1).index)},177 Z`} fill={color} opacity=".1" />}
        <polyline points={points.map((point) => `${x(point.index)},${y(point.value)}`).join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((point) => <circle key={point.index} cx={x(point.index)} cy={y(point.value)} r="3.5" fill={color} tabIndex="0"><title>{row.label} · {point.label}: {workNumber(point.value)} {unit}</title></circle>)}
      </g>)}</g>;
    })}
    {[...new Set([0, Math.floor((length - 1) / 2), length - 1])].map((index) => <text key={index} x={x(index)} y="202" textAnchor={index === 0 ? 'start' : index === length - 1 ? 'end' : 'middle'}>{series[0]?.values[index]?.label}</text>)}
  </svg><div className="wa-legend">{series.map((row, index) => <span key={row.label}><i style={{ background: row.color || palette[index] }} />{row.label}</span>)}</div></div>;
}
export function ColumnChart({ values, onSelect, selected }) {
  if (!values.length) return <Empty />;
  const max = Math.max(1, ...values.map((item) => Number(item.count)));
  return <div className="wa-columns" role="group" aria-label="Broj artikala po periodu">
    {values.map((item, index) => {
      const content = <><b>{workNumber(item.count)}</b><span className="wa-column-track"><i style={{ height: `${Math.max(1, Number(item.count) / max * 100)}%`, background: item.color || palette[0] }} /></span><small>{item.label}</small></>;
      const title = `${item.label}: ${workNumber(item.count)}`;
      return onSelect ? <button key={index} title={title} className={`wa-column ${selected === item.hour ? 'is-selected' : ''}`} aria-pressed={selected === item.hour} onClick={() => onSelect(item.hour)}>{content}</button> : <div key={index} title={title} className="wa-column">{content}</div>;
    })}
  </div>;
}
export function DonutChart({ values }) {
  const total = values.reduce((sum, item) => sum + Number(item.count), 0);
  if (!total) return <Empty />;
  let offset = 0;
  return <div className="wa-donut"><svg viewBox="0 0 200 200" role="img" aria-label={values.map((item) => `${item.label}: ${item.count}`).join(', ')}>
    <circle cx="100" cy="100" r="68" fill="none" stroke="#f0f2f4" strokeWidth="20" />
    {values.map((item, index) => {
      const percent = Number(item.count) / total * 100;
      const start = offset; offset += percent;
      return <circle key={item.label} cx="100" cy="100" r="68" pathLength="100" fill="none" stroke={palette[index % palette.length]} strokeWidth="20" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-start} transform="rotate(-90 100 100)"><title>{item.label}: {item.count} ({workNumber(percent)}%)</title></circle>;
    })}
    <text x="100" y="102" textAnchor="middle" className="wa-donut-total">{total}</text><text x="100" y="123" textAnchor="middle">Ukupno</text>
  </svg><div className="wa-donut-legend">{values.map((item, index) => <div key={item.label}><i style={{ background: palette[index % palette.length] }} /><span>{item.label}</span><b>{item.count}</b><small>{workNumber(Number(item.count) / total * 100)}%</small></div>)}</div></div>;
}
export function HorizontalChart({ values }) {
  if (!values.length || !values.some((item) => item.count > 0)) return <Empty />;
  const max = Math.max(1, ...values.map((item) => Number(item.count)));
  return <div className="wa-horizontal">{values.map((item, index) => <div key={item.label} title={`${item.label}: ${workNumber(item.count)}`}><header><span>{item.label}</span><b>{workNumber(item.count)}</b></header><div className="wa-horizontal-track"><i style={{ width: `${Number(item.count) / max * 100}%`, background: item.color || palette[index % palette.length] }} /></div></div>)}</div>;
}
export function Heatmap({ values }) {
  if (!values.length) return <Empty />;
  const max = Math.max(1, ...values.map((item) => Number(item.count)));
  const offset = (new Date(`${values[0].date}T12:00:00Z`).getUTCDay() + 6) % 7;
  const weeks = Math.ceil((values.length + offset) / 7);
  return <div className="wa-calendar"><div className="wa-heatmap" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gridAutoFlow: 'column' }}>{Array.from({ length: offset }, (_, index) => <div key={`blank-${index}`} aria-hidden="true" />)}{values.map((item) => <div key={item.date} title={`${item.date}: ${item.count} artikala`} tabIndex="0" style={{ background: item.count ? `rgba(5,150,105,${.18 + Number(item.count) / max * .82})` : '#f0f2f4' }}><span className="sr-only">{item.date}: {item.count} artikala</span></div>)}</div><div className="wa-calendar-range"><span>{values[0]?.date}</span><span>{values.at(-1)?.date}</span></div><small>Kolone su nedelje, redovi ponedeljak–nedelja. Tamnije polje označava više unosa.</small></div>;
}
export function ActivityStrip({ entries, gaps, firstHour, hours, pause }) {
  if (!entries.length) return <Empty />;
  const position = (value) => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Belgrade', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value));
    const get = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
    return Math.max(0, Math.min(100, ((get('hour') + get('minute') / 60 + get('second') / 3600 - firstHour) / hours) * 100));
  };
  return <div className="wa-activity"><div className="wa-activity-track">{entries.map((entry) => {
    const gap = gaps.get(entry.id);
    const end = position(entry.occurredAt);
    const start = gap != null ? position(new Date(new Date(entry.occurredAt).getTime() - gap * 1000)) : end;
    return <span key={entry.id}>{gap > pause * 60 && <i className="wa-activity-gap" style={{ left: `${start}%`, width: `${Math.max(0, end - start)}%` }} title={`Duži razmak: ${workNumber(gap / 60)} min`} />}<i className="wa-activity-point" style={{ left: `${end}%`, background: entry.id.startsWith('product:') ? palette[0] : palette[1] }} title={`${entry.productName} · ${new Date(entry.occurredAt).toLocaleTimeString('sr-RS', { timeZone: 'Europe/Belgrade' })}`} tabIndex="0" /></span>;
  })}</div><div className="wa-calendar-range"><span>{String(firstHour).padStart(2, '0')}:00</span><span>{String(firstHour + hours).padStart(2, '0')}:00</span></div><div className="wa-legend"><span><i style={{ background: palette[0] }} />Unos</span><span><i style={{ background: palette[1] }} />Ostale akcije</span><span><i style={{ background: '#fcebc9' }} />Duži razmak</span></div></div>;
}
