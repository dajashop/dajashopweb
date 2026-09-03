import { useEffect, useMemo, useState } from 'react';
import { Copy, Edit3, Plus, Save, Ticket, Trash2, X } from 'lucide-react';
import { promotionsAdminApi } from '../../../services/dajaPlatform.js';

const emptyScope = () => ({
  productIds: [],
  variantIds: [],
  categoryIds: [],
  brandIds: [],
  departmentIds: [],
  specifications: [],
});

const emptyPromotion = () => ({
  code: '',
  name: '',
  description: '',
  internalNote: '',
  active: true,
  discountType: 'percentage',
  discountValue: 10,
  maxDiscountAmount: '',
  appliesTo: 'eligible_items',
  minOrderAmount: '',
  minEligibleQuantity: 1,
  startsAt: '',
  endsAt: '',
  totalUsageLimit: '',
  perCustomerUsageLimit: '',
  loginRequirement: 'any',
  requiresVerifiedEmail: false,
  requiresNewsletter: false,
  firstOrderOnly: false,
  minCustomerOrderCount: '',
  maxCustomerOrderCount: '',
  minCustomerLifetimeSpend: '',
  allowedShippingMethods: [],
  allowedPaymentMethods: [],
  productRules: { include: emptyScope(), exclude: emptyScope() },
  customerTargets: { include: [], exclude: [] },
});

const numberOrNull = (value) => (value === '' || value === null ? null : Number(value));

const asDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toApiDate = (value) => (value ? new Date(value).toISOString() : null);

function formFromPromotion(promotion) {
  const cleanScope = (scope = {}) => ({ ...emptyScope(), ...scope });
  const targets = { include: [], exclude: [] };
  (promotion.customerTargets || []).forEach((target) => {
    if (target?.type === 'include' || target?.type === 'exclude') {
      targets[target.type].push(target.customerId);
    }
  });
  return {
    ...emptyPromotion(),
    ...promotion,
    maxDiscountAmount: promotion.maxDiscountAmount ?? '',
    minOrderAmount: promotion.minOrderAmount || '',
    minEligibleQuantity: promotion.minEligibleQuantity || 1,
    startsAt: asDateInput(promotion.startsAt),
    endsAt: asDateInput(promotion.endsAt),
    totalUsageLimit: promotion.totalUsageLimit ?? '',
    perCustomerUsageLimit: promotion.perCustomerUsageLimit ?? '',
    minCustomerOrderCount: promotion.minCustomerOrderCount ?? '',
    maxCustomerOrderCount: promotion.maxCustomerOrderCount ?? '',
    minCustomerLifetimeSpend: promotion.minCustomerLifetimeSpend ?? '',
    productRules: {
      include: cleanScope(promotion.productRules?.include),
      exclude: cleanScope(promotion.productRules?.exclude),
    },
    customerTargets: targets,
  };
}

function toPayload(form) {
  return {
    ...form,
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    internalNote: form.internalNote.trim() || null,
    discountValue: Number(form.discountValue),
    maxDiscountAmount: numberOrNull(form.maxDiscountAmount),
    minOrderAmount: numberOrNull(form.minOrderAmount),
    minEligibleQuantity: Number(form.minEligibleQuantity || 1),
    startsAt: toApiDate(form.startsAt),
    endsAt: toApiDate(form.endsAt),
    totalUsageLimit: numberOrNull(form.totalUsageLimit),
    perCustomerUsageLimit: numberOrNull(form.perCustomerUsageLimit),
    minCustomerOrderCount: numberOrNull(form.minCustomerOrderCount),
    maxCustomerOrderCount: numberOrNull(form.maxCustomerOrderCount),
    minCustomerLifetimeSpend: numberOrNull(form.minCustomerLifetimeSpend),
  };
}

function MultiSelect({ label, value, options, onChange, hint }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-700">{label}</span>
      <select
        multiple
        value={value}
        onChange={(event) => onChange([...event.target.selectedOptions].map((option) => option.value))}
        className="mt-1.5 min-h-28 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

function CheckOptions({ label, values, options, onChange }) {
  const toggle = (value) => onChange(values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]);
  return (
    <div>
      <p className="text-sm font-semibold text-neutral-700">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
            <input type="checkbox" checked={values.includes(option.value)} onChange={() => toggle(option.value)} />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function ScopeEditor({ title, scope, onChange, products, categories, brands, departments, specs }) {
  const [draft, setDraft] = useState({ specKeyId: '', value: '', operator: 'equals' });
  const productOptions = products.map((product) => ({ id: product.id, label: `${product.name}${product.brand ? ` — ${product.brand}` : ''}` }));
  const variantOptions = products
    .filter((product) => product.variantId)
    .map((product) => ({ id: product.variantId, label: `${product.name} (${product.sku || 'osnovna varijanta'})` }));
  const specificationRules = scope.specifications || [];
  const addSpecification = () => {
    if (!draft.specKeyId || !draft.value.trim()) return;
    const selectedSpec = specs.find((spec) => spec.id === draft.specKeyId);
    onChange({
      ...scope,
      specifications: [...specificationRules, {
        ...draft,
        value: draft.value.trim(),
        ...(selectedSpec?.slug ? { specKeySlug: selectedSpec.slug } : {}),
        ...(selectedSpec?.name ? { specKeyName: selectedSpec.name } : {}),
      }],
    });
    setDraft({ specKeyId: '', value: '', operator: 'equals' });
  };
  const specName = (id) => specs.find((spec) => spec.id === id)?.name || 'Specifikacija';
  return (
    <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-4">
        <h4 className="font-bold text-neutral-900">{title}</h4>
        <p className="mt-1 text-xs text-neutral-500">Više izabranih vrednosti u istom polju znači „jedna od njih”; popunjena različita polja se kombinuju.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MultiSelect label="Proizvodi" value={scope.productIds} options={productOptions} onChange={(productIds) => onChange({ ...scope, productIds })} />
        <MultiSelect label="Varijante" value={scope.variantIds} options={variantOptions} onChange={(variantIds) => onChange({ ...scope, variantIds })} />
        <MultiSelect label="Kategorije" value={scope.categoryIds} options={categories.map((item) => ({ id: item.id, label: item.name }))} onChange={(categoryIds) => onChange({ ...scope, categoryIds })} />
        <MultiSelect label="Brendovi" value={scope.brandIds} options={brands.map((item) => ({ id: item.id, label: item.name }))} onChange={(brandIds) => onChange({ ...scope, brandIds })} />
        <MultiSelect label="Odeljenja" value={scope.departmentIds} options={departments.map((item) => ({ id: item.id, label: item.name }))} onChange={(departmentIds) => onChange({ ...scope, departmentIds })} />
        <div>
          <p className="text-sm font-semibold text-neutral-700">Specifikacije</p>
          <div className="mt-1.5 grid gap-2">
            <select value={draft.specKeyId} onChange={(event) => setDraft({ ...draft, specKeyId: event.target.value })} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm">
              <option value="">Izaberi specifikaciju</option>
              {specs.map((spec) => <option key={spec.id} value={spec.id}>{spec.name}{spec.unit ? ` (${spec.unit})` : ''}</option>)}
            </select>
            <div className="flex gap-2">
              <select value={draft.operator} onChange={(event) => setDraft({ ...draft, operator: event.target.value })} className="w-28 rounded-xl border border-neutral-200 bg-white px-2 py-2 text-sm">
                <option value="equals">jednako</option>
                <option value="contains">sadrži</option>
              </select>
              <input value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} placeholder="Vrednost" className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" />
              <button type="button" onClick={addSpecification} className="rounded-xl bg-neutral-900 px-3 text-white"><Plus size={16} /></button>
            </div>
          </div>
          {specificationRules.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {specificationRules.map((rule, index) => (
                <button key={`${rule.specKeyId}-${rule.value}-${index}`} type="button" onClick={() => onChange({ ...scope, specifications: specificationRules.filter((_, itemIndex) => itemIndex !== index) })} className="rounded-full bg-white px-2 py-1 text-xs text-neutral-700 shadow-sm ring-1 ring-neutral-200">
                  {specName(rule.specKeyId)} {rule.operator === 'contains' ? 'sadrži' : '='} {rule.value} ×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CustomerTargets({ form, setForm, customers }) {
  const [mode, setMode] = useState('include');
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const visibleCustomers = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('sr-RS');
    if (!needle) return customers;
    return customers.filter((customer) => `${customer.displayName} ${customer.email || ''}`.toLocaleLowerCase('sr-RS').includes(needle));
  }, [customers, search]);
  const add = () => {
    if (!customerId) return;
    setForm((current) => ({
      ...current,
      customerTargets: {
        ...current.customerTargets,
        [mode]: [...new Set([...current.customerTargets[mode], customerId])],
        [mode === 'include' ? 'exclude' : 'include']: current.customerTargets[mode === 'include' ? 'exclude' : 'include'].filter((id) => id !== customerId),
      },
    }));
    setCustomerId('');
  };
  const label = (id) => {
    const customer = customers.find((item) => item.id === id);
    return customer ? `${customer.displayName || 'Korisnik'}${customer.email ? ` — ${customer.email}` : ''}` : id;
  };
  return (
    <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <h4 className="font-bold text-neutral-900">Odabrani korisnici</h4>
      <p className="mt-1 text-xs text-neutral-500">Ako je lista „važi samo za” prazna, kod nije ograničen na konkretne naloge. Isključeni korisnici uvek nemaju pravo na kod.</p>
      <div className="mt-3 grid gap-2 md:grid-cols-[150px_1fr_auto]">
        <select value={mode} onChange={(event) => setMode(event.target.value)} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm">
          <option value="include">Važi samo za</option>
          <option value="exclude">Isključi korisnika</option>
        </select>
        <div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pretraži ime ili email" className="mb-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm" />
          <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm">
            <option value="">Izaberi korisnika</option>
            {visibleCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.displayName || 'Bez imena'} — {customer.email || 'bez emaila'} {customer.newsletterSubscribed ? '• newsletter' : ''}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={add} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white">Dodaj</button>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {['include', 'exclude'].map((type) => (
          <div key={type} className="rounded-xl bg-white p-3 ring-1 ring-neutral-200">
            <p className="text-sm font-semibold text-neutral-700">{type === 'include' ? 'Važi samo za' : 'Isključeni korisnici'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.customerTargets[type].length === 0 && <span className="text-xs text-neutral-400">Nema odabranih korisnika</span>}
              {form.customerTargets[type].map((id) => (
                <button key={id} type="button" onClick={() => setForm((current) => ({ ...current, customerTargets: { ...current.customerTargets, [type]: current.customerTargets[type].filter((item) => item !== id) } }))} className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700 hover:bg-red-50">
                  {label(id)} ×
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function discountLabel(promotion) {
  if (promotion.discountType === 'free_shipping') return 'Besplatna dostava';
  return promotion.discountType === 'percentage' ? `${promotion.discountValue}% popusta` : `${Number(promotion.discountValue).toLocaleString('sr-RS')} RSD popusta`;
}

export default function PromotionManager({ products, brands, categories, departments, specs }) {
  const [promotions, setPromotions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [promotionRows, customerRows] = await Promise.all([
        promotionsAdminApi.list(),
        promotionsAdminApi.audience(),
      ]);
      setPromotions(Array.isArray(promotionRows) ? promotionRows : []);
      setCustomers(Array.isArray(customerRows) ? customerRows : []);
    } catch (requestError) {
      setError(requestError.message || 'Promo kodovi nisu dostupni.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyPromotion());
    setError('');
  };
  const startEdit = (promotion) => {
    setEditingId(promotion.id);
    setForm(formFromPromotion(promotion));
    setError('');
  };
  const closeEditor = () => {
    setEditingId(null);
    setForm(null);
  };
  const save = async (event) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError('');
    try {
      const payload = toPayload(form);
      if (editingId) await promotionsAdminApi.update(editingId, payload);
      else await promotionsAdminApi.create(payload);
      closeEditor();
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Promo kod nije sačuvan.');
    } finally {
      setSaving(false);
    }
  };
  const duplicate = async (id) => {
    try {
      await promotionsAdminApi.duplicate(id);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Kopiranje promo koda nije uspelo.');
    }
  };
  const remove = async (id) => {
    if (!window.confirm('Obrisati promo kod? Postojeće porudžbine ostaju sačuvane.')) return;
    try {
      await promotionsAdminApi.remove(id);
      if (editingId === id) closeEditor();
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Promo kod nije obrisan.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2"><Ticket size={22} className="text-neutral-900" /><h2 className="text-xl font-bold text-neutral-900">Promo kodovi</h2></div>
          <p className="mt-1 max-w-3xl text-sm text-neutral-500">Pravila se proveravaju na serveru pri unosu koda i ponovo pri plaćanju — cena, artikli, korisnik i limiti ne mogu biti zaobiđeni iz pregledača.</p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 font-bold text-white hover:bg-black"><Plus size={18} /> Novi promo kod</button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {form && (
        <form onSubmit={save} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div><h3 className="text-lg font-bold text-neutral-900">{editingId ? 'Izmeni promo kod' : 'Novi promo kod'}</h3><p className="text-sm text-neutral-500">Prazna ograničenja znače da se pravilo ne primenjuje.</p></div>
            <button type="button" onClick={closeEditor} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"><X size={16} /> Zatvori</button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label><span className="text-sm font-semibold text-neutral-700">Kod *</span><div className="mt-1.5 flex gap-2"><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="JESEN15" className="min-w-0 w-full rounded-xl border border-neutral-200 px-3 py-2.5 font-mono uppercase outline-none focus:ring-2 focus:ring-neutral-300" /><button type="button" onClick={() => setForm({ ...form, code: `DAJA-${Math.random().toString(36).slice(2, 8).toUpperCase()}` })} className="rounded-xl border border-neutral-200 px-3 text-xs font-bold hover:bg-neutral-50">Generiši</button></div></label>
            <label><span className="text-sm font-semibold text-neutral-700">Interni naziv *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Jesenja kampanja" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-neutral-300" /></label>
            <label><span className="text-sm font-semibold text-neutral-700">Tip pogodnosti *</span><select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value, discountValue: event.target.value === 'free_shipping' ? 0 : form.discountValue || 10 })} className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5"><option value="percentage">Procenat popusta</option><option value="fixed">Fiksni iznos (RSD)</option><option value="free_shipping">Besplatna dostava</option></select></label>
            {form.discountType !== 'free_shipping' ? <label><span className="text-sm font-semibold text-neutral-700">{form.discountType === 'percentage' ? 'Popust (%) *' : 'Popust (RSD) *'}</span><input required type="number" min={form.discountType === 'percentage' ? 1 : 0.01} max={form.discountType === 'percentage' ? 100 : undefined} step={form.discountType === 'percentage' ? 1 : 0.01} value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">Dostava će biti 0 RSD, bez obzira na prag besplatne dostave.</div>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="text-sm font-semibold text-neutral-700">Opis za tim</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="2" placeholder="Šta promocija radi i gde se prikazuje" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label>
            <label><span className="text-sm font-semibold text-neutral-700">Privatna napomena</span><textarea value={form.internalNote} onChange={(event) => setForm({ ...form, internalNote: event.target.value })} rows="2" placeholder="Napomena za administratore" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label>
          </div>

          <section className="grid gap-4 rounded-2xl border border-neutral-200 p-4 md:grid-cols-2 xl:grid-cols-4">
            <label><span className="text-sm font-semibold text-neutral-700">Popust se računa na</span><select value={form.appliesTo} onChange={(event) => setForm({ ...form, appliesTo: event.target.value })} className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5"><option value="eligible_items">Samo odgovarajuće artikle</option><option value="order">Celokupnu porudžbinu</option></select></label>
            <label><span className="text-sm font-semibold text-neutral-700">Maks. popust (RSD)</span><input type="number" min="0" step="0.01" value={form.maxDiscountAmount} onChange={(event) => setForm({ ...form, maxDiscountAmount: event.target.value })} placeholder="Bez limita" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" disabled={form.discountType !== 'percentage'} /></label>
            <label><span className="text-sm font-semibold text-neutral-700">Min. vrednost korpe (RSD)</span><input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={(event) => setForm({ ...form, minOrderAmount: event.target.value })} placeholder="Bez minimuma" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label>
            <label><span className="text-sm font-semibold text-neutral-700">Min. komada koji odgovaraju</span><input type="number" min="1" step="1" value={form.minEligibleQuantity} onChange={(event) => setForm({ ...form, minEligibleQuantity: event.target.value })} className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label>
          </section>

          <section className="grid gap-4 rounded-2xl border border-neutral-200 p-4 md:grid-cols-2 xl:grid-cols-4">
            <label><span className="text-sm font-semibold text-neutral-700">Počinje</span><input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label>
            <label><span className="text-sm font-semibold text-neutral-700">Završava</span><input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label>
            <label><span className="text-sm font-semibold text-neutral-700">Ukupan limit korišćenja</span><input type="number" min="1" step="1" value={form.totalUsageLimit} onChange={(event) => setForm({ ...form, totalUsageLimit: event.target.value })} placeholder="Bez limita" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label>
            <label><span className="text-sm font-semibold text-neutral-700">Limit po korisniku</span><input type="number" min="1" step="1" value={form.perCustomerUsageLimit} onChange={(event) => setForm({ ...form, perCustomerUsageLimit: event.target.value, loginRequirement: event.target.value ? 'authenticated' : form.loginRequirement })} placeholder="Bez limita" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label>
          </section>

          <section className="rounded-2xl border border-neutral-200 p-4">
            <h4 className="font-bold text-neutral-900">Uslovi za korisnika</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label><span className="text-sm font-semibold text-neutral-700">Stanje prijave</span><select value={form.loginRequirement} onChange={(event) => setForm({ ...form, loginRequirement: event.target.value })} className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5"><option value="any">Svejedno</option><option value="authenticated">Mora biti prijavljen</option><option value="guest">Samo gost bez prijave</option></select></label>
              <label><span className="text-sm font-semibold text-neutral-700">Min. ranijih porudžbina</span><input type="number" min="0" step="1" value={form.minCustomerOrderCount} onChange={(event) => setForm({ ...form, minCustomerOrderCount: event.target.value, loginRequirement: event.target.value !== '' ? 'authenticated' : form.loginRequirement })} placeholder="Bez uslova" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label>
              <label><span className="text-sm font-semibold text-neutral-700">Maks. ranijih porudžbina</span><input type="number" min="0" step="1" value={form.maxCustomerOrderCount} onChange={(event) => setForm({ ...form, maxCustomerOrderCount: event.target.value, loginRequirement: event.target.value !== '' ? 'authenticated' : form.loginRequirement })} placeholder="Bez uslova" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label>
              <label><span className="text-sm font-semibold text-neutral-700">Min. prethodni promet (RSD)</span><input type="number" min="0" step="0.01" value={form.minCustomerLifetimeSpend} onChange={(event) => setForm({ ...form, minCustomerLifetimeSpend: event.target.value, loginRequirement: event.target.value !== '' ? 'authenticated' : form.loginRequirement })} placeholder="Bez uslova" className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5" /></label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[['requiresVerifiedEmail', 'Potvrđen email'], ['requiresNewsletter', 'Aktivan newsletter'], ['firstOrderOnly', 'Samo prva porudžbina'], ['active', 'Kod je aktivan']].map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"><input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setForm({ ...form, [key]: event.target.checked, ...(key !== 'active' && event.target.checked ? { loginRequirement: key === 'requiresNewsletter' || key === 'requiresVerifiedEmail' || key === 'firstOrderOnly' ? 'authenticated' : form.loginRequirement } : {}) })} />{label}</label>
              ))}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <ScopeEditor title="Proizvodi na koje kod važi" scope={form.productRules.include} onChange={(include) => setForm({ ...form, productRules: { ...form.productRules, include } })} products={products} categories={categories} brands={brands} departments={departments} specs={specs} />
            <ScopeEditor title="Izuzmi proizvode iz koda" scope={form.productRules.exclude} onChange={(exclude) => setForm({ ...form, productRules: { ...form.productRules, exclude } })} products={products} categories={categories} brands={brands} departments={departments} specs={specs} />
          </div>

          <div className="grid gap-4 rounded-2xl border border-neutral-200 p-4 md:grid-cols-2">
            <CheckOptions label="Ograniči način dostave" values={form.allowedShippingMethods} onChange={(allowedShippingMethods) => setForm({ ...form, allowedShippingMethods })} options={[{ value: 'courier', label: 'Kurirska dostava' }, { value: 'pickup', label: 'Preuzimanje' }]} />
            <CheckOptions label="Ograniči način plaćanja" values={form.allowedPaymentMethods} onChange={(allowedPaymentMethods) => setForm({ ...form, allowedPaymentMethods })} options={[{ value: 'cod', label: 'Pouzeće' }, { value: 'pickup', label: 'Plaćanje pri preuzimanju' }]} />
          </div>

          <CustomerTargets form={form} setForm={setForm} customers={customers} />

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4"><button type="button" onClick={closeEditor} className="rounded-xl border border-neutral-200 px-4 py-2.5 font-bold text-neutral-700 hover:bg-neutral-50">Otkaži</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 font-bold text-white disabled:opacity-60"><Save size={18} />{saving ? 'Čuvanje...' : 'Sačuvaj promo kod'}</button></div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4"><h3 className="font-bold text-neutral-900">Postojeći promo kodovi</h3></div>
        {loading ? <p className="p-5 text-sm text-neutral-500">Učitavam promo kodove...</p> : promotions.length === 0 ? <div className="p-10 text-center text-sm text-neutral-500">Još nema promo kodova. Napravi prvi kod iznad.</div> : <div className="divide-y divide-neutral-100">{promotions.map((promotion) => (
          <div key={promotion.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><code className="rounded bg-neutral-100 px-2 py-1 font-bold text-neutral-900">{promotion.code}</code><span className={`rounded-full px-2 py-1 text-xs font-bold ${promotion.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{promotion.active ? 'Aktivan' : 'Neaktivan'}</span><span className="text-sm font-semibold text-neutral-700">{discountLabel(promotion)}</span></div><p className="mt-2 text-sm font-semibold text-neutral-900">{promotion.name}</p><p className="mt-1 text-xs text-neutral-500">Iskorišćeno: {promotion.usesCount}{promotion.totalUsageLimit ? ` / ${promotion.totalUsageLimit}` : ''}{promotion.startsAt ? ` • od ${new Date(promotion.startsAt).toLocaleString('sr-RS')}` : ''}{promotion.endsAt ? ` • do ${new Date(promotion.endsAt).toLocaleString('sr-RS')}` : ''}</p></div>
            <div className="flex flex-wrap gap-2"><button onClick={() => startEdit(promotion)} className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><Edit3 size={15} /> Izmeni</button><button onClick={() => duplicate(promotion.id)} className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><Copy size={15} /> Kopiraj</button><button onClick={() => remove(promotion.id)} className="rounded-lg border border-red-100 px-3 py-2 text-red-600 hover:bg-red-50" aria-label={`Obriši ${promotion.code}`}><Trash2 size={16} /></button></div>
          </div>
        ))}</div>}
      </section>
    </div>
  );
}
