export const workforceZone = 'Europe/Belgrade';
export const workDate = (value) => new Intl.DateTimeFormat('en-CA', { timeZone: workforceZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
export const workHour = (value) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: workforceZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date(value)));
export const workTime = (value) => value ? new Date(value).toLocaleTimeString('sr-RS', { timeZone: workforceZone, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
export const workNumber = (value) => value == null ? '—' : Number(value).toLocaleString('sr-RS', { maximumFractionDigits: 1 });
export const workMinutes = (seconds) => seconds == null ? 'Nema merenja' : `${workNumber(Number(seconds) / 60)} min`;
export const workDuration = (seconds) => {
  if (seconds == null) return '—';
  const value = Math.max(0, Math.round(Number(seconds)));
  const h = Math.floor(value / 3600);
  return `${h ? `${h} h ` : ''}${Math.floor(value / 60) % 60} min ${value % 60} s`;
};
export const shiftWorkDate = (date, delta) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + delta);
  return value.toISOString().slice(0, 10);
};
export const creationEntry = (entry) => entry.id.startsWith('product:');
export const workOperation = (entry) => creationEntry(entry) ? 'Dodat artikal' : ({ create: 'Kreiranje', created: 'Kreiranje', update: 'Izmena', updated: 'Izmena', delete: 'Brisanje', deleted: 'Brisanje', adjust: 'Promena zalihe', quality_approved: 'Odobrenje', quality_changes_requested: 'Vraćanje na doradu' }[entry.operation] || entry.operation);
const average = (values) => values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : null;
export function workforceModel({ entries = [], report, products = [], date, firstHour, hours, pause }) {
  const inPeriod = (value) => value && workDate(value) === date && workHour(value) >= firstHour && workHour(value) < firstHour + hours;
  const all = [...entries].sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt) || a.id.localeCompare(b.id));
  const creations = all.filter(creationEntry);
  const gaps = new Map(creations.map((entry, index) => [entry.id, index ? (new Date(entry.occurredAt) - new Date(creations[index - 1].occurredAt)) / 1000 : null]));
  const periodEntries = all.filter((entry) => inPeriod(entry.occurredAt));
  const periodCreations = periodEntries.filter(creationEntry);
  const intervals = periodCreations.map((entry) => gaps.get(entry.id)).filter((value) => value != null);
  const continuous = intervals.filter((value) => value <= pause * 60).sort((a, b) => a - b);
  const hourly = Array.from({ length: hours }, (_, index) => {
    const h = firstHour + index;
    const events = periodEntries.filter((entry) => workHour(entry.occurredAt) === h);
    const added = events.filter(creationEntry);
    const values = added.map((entry) => gaps.get(entry.id)).filter((value) => value != null && value <= pause * 60);
    return { label: `${String(h).padStart(2, '0')}:00`, hour: h, count: added.length, other: events.length - added.length, events, average: average(values) };
  });
  const peak = hourly.reduce((best, item) => item.count > best.count ? item : best, hourly[0]);
  let cumulative = 0;
  const growth = hourly.map((item) => ({ label: item.label, value: (cumulative += item.count) }));
  const timings = (report?.timings || []).filter((item) => inPeriod(item.finishedAt || item.startedAt));
  const measured = timings.filter((item) => item.kind === 'create' && item.status === 'completed' && item.complete);
  const quality = [{ label: 'Odobreni', count: 0 }, { label: 'Na proveri', count: 0 }, { label: 'Na doradi', count: 0 }, { label: 'Obrisani', count: 0 }];
  const missing = new Map();
  const waiting = ['Do 1 dana', '1–3 dana', '3–7 dana', 'Preko 7 dana'].map((label) => ({ label, count: 0 }));
  let unknownWaiting = 0;
  products.forEach((product) => {
    quality[product.deletedAt ? 3 : product.qualityReviewStatus === 'approved' ? 0 : product.qualityReviewStatus === 'changes_requested' ? 2 : 1].count++;
    if (product.deletedAt) return;
    product.qualityChecks?.filter((check) => !check.complete).forEach((check) => {
      const label = check.label.replace(/\s*\(.*\)$/, '');
      missing.set(label, (missing.get(label) || 0) + 1);
    });
    if (!['pending', 'changes_requested'].includes(product.qualityReviewStatus)) return;
    const since = product.qualityReviewStatus === 'changes_requested' ? product.lastReturnedAt : product.createdAt;
    if (!since) { unknownWaiting++; return; }
    const days = Math.max(0, (Date.now() - new Date(since).getTime()) / 86400000);
    waiting[days < 1 ? 0 : days < 3 ? 1 : days < 7 ? 2 : 3].count++;
  });
  const groups = (field) => {
    const values = new Map();
    products.filter((product) => inPeriod(product.createdAt)).forEach((product) => {
      const label = product[field] || 'Neraspoređeno';
      values.set(label, (values.get(label) || 0) + 1);
    });
    return [...values].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  };
  const types = [{ label: 'Kreiranja', count: periodCreations.length }, { label: 'Izmene', count: 0 }, { label: 'Zalihe', count: 0 }, { label: 'Druge akcije', count: 0 }];
  periodEntries.filter((entry) => !creationEntry(entry)).forEach((entry) => {
    types[entry.aggregateType === 'inventory_balance' ? 2 : ['update', 'updated'].includes(entry.operation) ? 1 : 3].count++;
  });
  const histogram = ['0–5 min', '5–10 min', '10–15 min', '15–30 min', 'Preko 30 min'].map((label) => ({ label, count: 0 }));
  intervals.forEach((value) => histogram[value <= 300 ? 0 : value <= 600 ? 1 : value <= 900 ? 2 : value <= 1800 ? 3 : 4].count++);
  const history = report?.daily || [];
  const previous = history.find((row) => row.date === shiftWorkDate(date, -1))?.periodCount || 0;
  const week = Array.from({ length: 7 }, (_, index) => history.find((row) => row.date === shiftWorkDate(date, -index - 1))?.periodCount || 0);
  return { all, periodEntries, periodCreations, gaps, hourly, growth, peak, timings, measured, quality, types, waiting, unknownWaiting,
    missing: [...missing].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    brands: groups('brand'), departments: groups('department'), histogram, history, previous, weekAverage: average(week),
    activeAverage: average(measured.map((item) => item.activeSeconds)), elapsedAverage: average(measured.map((item) => item.elapsedSeconds)),
    gapAverage: average(continuous), gapMedian: continuous.length ? (continuous[Math.floor(continuous.length / 2)] + continuous[Math.floor((continuous.length - 1) / 2)]) / 2 : null,
    positions: new Map(all.map((entry, index) => [entry.id, index])) };
}

export function downloadWorkforceCsv(rows, name) {
  const csv = '\uFEFF' + rows.map((row) => row.map((cell) => {
    const value = String(cell ?? '');
    return `"${(/^[=+@\-\t\r\n]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  }).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
