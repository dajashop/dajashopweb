import { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Edit3,
  ImageOff,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
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

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toApiDate = (value) => (value ? new Date(value).toISOString() : null);

function formFromPromotion(promotion) {
  const cleanScope = (scope = {}) => ({ ...emptyScope(), ...scope });
  const customerTargets = { include: [], exclude: [] };
  (promotion.customerTargets || []).forEach((target) => {
    if ((target?.type === 'include' || target?.type === 'exclude') && target.customerId) {
      customerTargets[target.type].push(target.customerId);
    }
  });
  return {
    ...emptyPromotion(),
    ...promotion,
    maxDiscountAmount: promotion.maxDiscountAmount ?? '',
    minOrderAmount: promotion.minOrderAmount || '',
    minEligibleQuantity: promotion.minEligibleQuantity || 1,
    startsAt: toDateInput(promotion.startsAt),
    endsAt: toDateInput(promotion.endsAt),
    totalUsageLimit: promotion.totalUsageLimit ?? '',
    perCustomerUsageLimit: promotion.perCustomerUsageLimit ?? '',
    minCustomerOrderCount: promotion.minCustomerOrderCount ?? '',
    maxCustomerOrderCount: promotion.maxCustomerOrderCount ?? '',
    minCustomerLifetimeSpend: promotion.minCustomerLifetimeSpend ?? '',
    productRules: {
      include: cleanScope(promotion.productRules?.include),
      exclude: cleanScope(promotion.productRules?.exclude),
    },
    customerTargets,
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

function ImagePreview({ product, onClose }) {
  if (!product) return null;
  const image = product.primaryImageUrl || product.mainImageUrl || product.thumbnailUrl || product.image;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Uvećana slika proizvoda">
      <div className="relative max-h-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-neutral-900 shadow-lg" aria-label="Zatvori"><X size={20} /></button>
        {image ? <img src={image} alt={product.name || 'Proizvod'} className="max-h-[85vh] max-w-full rounded-2xl bg-white object-contain shadow-2xl" /> : <div className="flex h-80 w-80 items-center justify-center rounded-2xl bg-white text-sm text-neutral-500">Slika nije dostupna</div>}
        <p className="mt-3 text-center text-sm font-semibold text-white">{product.name}</p>
      </div>
    </div>
  );
}

function ChoiceChips({ label, values, options, onChange }) {
  const toggle = (id) => onChange(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  return (
    <div>
      <p className="text-sm font-semibold text-neutral-700">{label}</p>
      <div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1">
        {options.map((option) => {
          const selected = values.includes(option.id);
          return <button key={option.id} type="button" onClick={() => toggle(option.id)} className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors ${selected ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'}`}>{option.label}</button>;
        })}
        {!options.length && <span className="text-xs text-neutral-400">Nema opcija.</span>}
      </div>
    </div>
  );
}

function CheckOptions({ label, values, options, onChange }) {
  const toggle = (value) => onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  return (
    <div>
      <p className="text-sm font-semibold text-neutral-700">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700"><input type="checkbox" checked={values.includes(option.value)} onChange={() => toggle(option.value)} />{option.label}</label>)}
      </div>
    </div>
  );
}

function SelectedProducts({ scope, products, onChange }) {
  const selected = [
    ...scope.productIds.map((id) => ({ id, type: 'product', product: products.find((item) => item.id === id) })),
    ...scope.variantIds.map((id) => ({ id, type: 'variant', product: products.find((item) => item.variantId === id) })),
  ];
  if (!selected.length) return <p className="text-sm text-neutral-500">Nisu izabrani konkretni proizvodi. Pravilo se oslanja na kategorije, brendove, odeljenja ili važi za sve artikle.</p>;
  const remove = (item) => onChange({ ...scope, [item.type === 'product' ? 'productIds' : 'variantIds']: scope[item.type === 'product' ? 'productIds' : 'variantIds'].filter((id) => id !== item.id) });
  return <div className="flex flex-wrap gap-2">{selected.map((item) => <button key={`${item.type}-${item.id}`} type="button" onClick={() => remove(item)} className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white py-1 pl-1 pr-2 text-xs text-neutral-700 hover:border-red-200 hover:bg-red-50"><span className="flex h-7 w-7 overflow-hidden rounded-full bg-neutral-100">{item.product?.thumbnailUrl || item.product?.primaryImageUrl || item.product?.image ? <img src={item.product.thumbnailUrl || item.product.primaryImageUrl || item.product.image} alt="" className="h-full w-full object-cover" /> : <ImageOff size={13} className="m-auto text-neutral-400" />}</span>{item.product?.name || 'Obrisan proizvod'}{item.type === 'variant' ? ' · varijanta' : ''}<X size={13} /></button>)}</div>;
}

function ScopeEditor({ scope, onChange, products = [], categories = [], brands = [], departments = [], specs = [], mode }) {
  const [query, setQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);
  const [preview, setPreview] = useState(null);
  const [specDraft, setSpecDraft] = useState({ specKeyId: '', value: '', operator: 'equals' });

  const selectedIds = new Set([...scope.productIds, ...scope.variantIds]);
  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('sr-RS');
    return products.filter((product) => {
      const searchable = [product.name, product.sku, product.mpn, product.barcode].filter(Boolean).join(' ').toLocaleLowerCase('sr-RS');
      return (!needle || searchable.includes(needle))
        && (!brandFilter || String(product.brandId) === brandFilter)
        && (!categoryFilter || String(product.primaryCategoryId) === categoryFilter)
        && (!departmentFilter || String(product.departmentId) === departmentFilter)
        && (!onlySelected || selectedIds.has(product.id) || selectedIds.has(product.variantId));
    });
  }, [products, query, brandFilter, categoryFilter, departmentFilter, onlySelected, scope.productIds, scope.variantIds]);

  const toggle = (field, id) => onChange({ ...scope, [field]: scope[field].includes(id) ? scope[field].filter((value) => value !== id) : [...scope[field], id] });
  const addSpecification = () => {
    if (!specDraft.specKeyId || !specDraft.value.trim()) return;
    const spec = specs.find((item) => item.id === specDraft.specKeyId);
    onChange({ ...scope, specifications: [...scope.specifications, { ...specDraft, value: specDraft.value.trim(), ...(spec?.slug ? { specKeySlug: spec.slug } : {}), ...(spec?.name ? { specKeyName: spec.name } : {}) }] });
    setSpecDraft({ specKeyId: '', value: '', operator: 'equals' });
  };
  const resetFilters = () => {
    setQuery('');
    setBrandFilter('');
    setCategoryFilter('');
    setDepartmentFilter('');
    setOnlySelected(false);
  };
  const title = mode === 'include' ? 'Važi za proizvode' : 'Izuzmi proizvode';
  const helper = mode === 'include'
    ? 'Ako ništa ne izabereš, kod važi za sve artikle. Prikazni filteri ispod samo olakšavaju izbor i ne menjaju pravilo dok ne klikneš proizvod.'
    : 'Izabrani artikli i uslovi ovde nikad neće dobiti popust.';

  return (
    <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h4 className="font-bold text-neutral-900">{title}</h4><p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-500">{helper}</p></div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-neutral-700 ring-1 ring-neutral-200">{scope.productIds.length + scope.variantIds.length} izabrano</span>
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto]">
          <label className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Traži po nazivu ili šifri artikla" className="w-full rounded-xl border border-neutral-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-neutral-300" /></label>
          <select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)} className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"><option value="">Svi brendovi</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"><option value="">Sve kategorije</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"><option value="">Sva odeljenja</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
          <button type="button" onClick={resetFilters} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50">Resetuj</button>
        </div>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-neutral-600"><input type="checkbox" checked={onlySelected} onChange={(event) => setOnlySelected(event.target.checked)} /> Prikaži samo izabrane</label>
      </div>

      <div className="mt-3 grid max-h-[34rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
        {filteredProducts.map((product) => {
          const image = product.thumbnailUrl || product.primaryImageUrl || product.mainImageUrl || product.image;
          const selectedProduct = scope.productIds.includes(product.id);
          const selectedVariant = product.variantId && scope.variantIds.includes(product.variantId);
          return <article key={product.id} className={`overflow-hidden rounded-xl border bg-white transition-colors ${selectedProduct || selectedVariant ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'}`}>
            <div className="flex gap-3 p-3">
              <button type="button" onClick={() => setPreview(product)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100" aria-label={`Uvećaj sliku: ${product.name}`}>
                {image ? <img src={image} alt={product.name} className="h-full w-full object-cover" /> : <ImageOff size={20} className="m-auto mt-7 text-neutral-400" />}
                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-[10px] font-bold text-white">UVEĆAJ</span>
              </button>
              <div className="min-w-0 flex-1"><h5 className="line-clamp-2 text-sm font-bold text-neutral-900">{product.name}</h5><p className="mt-1 truncate text-xs text-neutral-500">Šifra: {product.sku || product.mpn || 'nije uneta'}</p><p className="mt-1 truncate text-xs text-neutral-500">{product.brand || 'Bez brenda'} · {product.category || 'Bez kategorije'}</p></div>
            </div>
            <div className="grid grid-cols-2 border-t border-neutral-100">
              <button type="button" onClick={() => toggle('productIds', product.id)} className={`px-3 py-2 text-xs font-bold ${selectedProduct ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-50'}`}>{selectedProduct ? '✓ Ceo proizvod' : 'Izaberi proizvod'}</button>
              <button type="button" disabled={!product.variantId} onClick={() => product.variantId && toggle('variantIds', product.variantId)} className={`border-l border-neutral-100 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:text-neutral-300 ${selectedVariant ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}>{selectedVariant ? '✓ Varijanta' : 'Samo varijanta'}</button>
            </div>
          </article>;
        })}
        {!filteredProducts.length && <div className="col-span-full rounded-xl border border-dashed border-neutral-300 bg-white py-10 text-center text-sm text-neutral-500">Nema artikala za zadate filtere.</div>}
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3"><p className="mb-2 text-sm font-semibold text-neutral-700">Odabrani artikli</p><SelectedProducts scope={scope} products={products} onChange={onChange} /></div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChoiceChips label="Kategorije kao pravilo" values={scope.categoryIds} options={categories.map((item) => ({ id: item.id, label: item.name }))} onChange={(categoryIds) => onChange({ ...scope, categoryIds })} />
        <ChoiceChips label="Brendovi kao pravilo" values={scope.brandIds} options={brands.map((item) => ({ id: item.id, label: item.name }))} onChange={(brandIds) => onChange({ ...scope, brandIds })} />
        <ChoiceChips label="Odeljenja kao pravilo" values={scope.departmentIds} options={departments.map((item) => ({ id: item.id, label: item.name }))} onChange={(departmentIds) => onChange({ ...scope, departmentIds })} />
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4">
        <p className="text-sm font-semibold text-neutral-700">Specifikacije kao pravilo</p>
        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)_auto]">
          <select value={specDraft.specKeyId} onChange={(event) => setSpecDraft({ ...specDraft, specKeyId: event.target.value })} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"><option value="">Izaberi specifikaciju</option>{specs.map((spec) => <option key={spec.id} value={spec.id}>{spec.name}{spec.unit ? ` (${spec.unit})` : ''}</option>)}</select>
          <select value={specDraft.operator} onChange={(event) => setSpecDraft({ ...specDraft, operator: event.target.value })} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm"><option value="equals">jednako</option><option value="contains">sadrži</option></select>
          <input value={specDraft.value} onChange={(event) => setSpecDraft({ ...specDraft, value: event.target.value })} placeholder="Vrednost specifikacije" className="rounded-xl border border-neutral-200 px-3 py-2 text-sm" />
          <button type="button" onClick={addSpecification} className="rounded-xl bg-neutral-900 px-3 py-2 text-white"><Plus size={17} /></button>
        </div>
        {scope.specifications.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{scope.specifications.map((rule, index) => <button key={`${rule.specKeyId}-${index}`} type="button" onClick={() => onChange({ ...scope, specifications: scope.specifications.filter((_, itemIndex) => itemIndex !== index) })} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700">{specs.find((item) => item.id === rule.specKeyId)?.name || 'Specifikacija'} {rule.operator === 'contains' ? 'sadrži' : '='} {rule.value} ×</button>)}</div>}
      </div>
      <ImagePreview product={preview} onClose={() => setPreview(null)} />
    </section>
  );
}

function ProductRulesEditor({ form, setForm, products, categories, brands, departments, specs }) {
  const [mode, setMode] = useState('include');
  const scope = form.productRules[mode];
  const count = (value) => value.productIds.length + value.variantIds.length + value.categoryIds.length + value.brandIds.length + value.departmentIds.length + value.specifications.length;
  const onChange = (nextScope) => setForm({ ...form, productRules: { ...form.productRules, [mode]: nextScope } });
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><SlidersHorizontal size={19} /><h3 className="font-bold text-neutral-900">Artikli i filteri promocije</h3></div><p className="mt-1 text-sm text-neutral-500">Izaberi artikle vizuelno, uz pretragu po nazivu ili šifri.</p></div></div>
      <div className="mt-4 flex flex-wrap gap-2 border-b border-neutral-100 pb-4">
        {[['include', 'Važi za', count(form.productRules.include)], ['exclude', 'Izuzeci', count(form.productRules.exclude)]].map(([value, label, valueCount]) => <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${mode === value ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>{label} {valueCount ? `(${valueCount})` : ''}</button>)}
      </div>
      <div className="mt-4"><ScopeEditor key={mode} mode={mode} scope={scope} onChange={onChange} products={products} categories={categories} brands={brands} departments={departments} specs={specs} /></div>
    </section>
  );
}

function CustomerTargets({ form, setForm, customers }) {
  const [mode, setMode] = useState('include');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('sr-RS');
    return !needle ? customers : customers.filter((customer) => `${customer.displayName || ''} ${customer.email || ''}`.toLocaleLowerCase('sr-RS').includes(needle));
  }, [customers, search]);
  const add = () => {
    if (!selected) return;
    const otherMode = mode === 'include' ? 'exclude' : 'include';
    setForm({ ...form, customerTargets: { ...form.customerTargets, [mode]: [...new Set([...form.customerTargets[mode], selected])], [otherMode]: form.customerTargets[otherMode].filter((id) => id !== selected) } });
    setSelected('');
  };
  const label = (id) => {
    const customer = customers.find((item) => item.id === id);
    return customer ? `${customer.displayName || 'Korisnik'}${customer.email ? ` — ${customer.email}` : ''}` : id;
  };
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5"><h3 className="font-bold text-neutral-900">Odabrani korisnici</h3><p className="mt-1 text-sm text-neutral-500">Lista „važi samo za” je opcionalna; isključeni korisnici uvek nemaju pravo na kod.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-[160px_minmax(0,1fr)_auto]"><select value={mode} onChange={(event) => setMode(event.target.value)} className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"><option value="include">Važi samo za</option><option value="exclude">Isključi korisnika</option></select><div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pretraži ime ili email" className="mb-2 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" /><select value={selected} onChange={(event) => setSelected(event.target.value)} className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"><option value="">Izaberi korisnika</option>{visible.map((customer) => <option key={customer.id} value={customer.id}>{customer.displayName || 'Bez imena'} — {customer.email || 'bez emaila'}{customer.newsletterSubscribed ? ' · newsletter' : ''}</option>)}</select></div><button type="button" onClick={add} className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white">Dodaj</button></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{['include', 'exclude'].map((type) => <div key={type} className="rounded-xl bg-neutral-50 p-3"><p className="text-sm font-semibold text-neutral-700">{type === 'include' ? 'Važi samo za' : 'Isključeni korisnici'}</p><div className="mt-2 flex flex-wrap gap-1.5">{!form.customerTargets[type].length && <span className="text-xs text-neutral-400">Nema korisnika</span>}{form.customerTargets[type].map((id) => <button key={id} type="button" onClick={() => setForm({ ...form, customerTargets: { ...form.customerTargets, [type]: form.customerTargets[type].filter((item) => item !== id) } })} className="rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-red-50">{label(id)} ×</button>)}</div></div>)}</div>
    </section>
  );
}

function discountLabel(promotion) {
  if (promotion.discountType === 'free_shipping') return 'Besplatna dostava';
  return promotion.discountType === 'percentage' ? `${promotion.discountValue}% popusta` : `${Number(promotion.discountValue).toLocaleString('sr-RS')} RSD popusta`;
}

function fieldClass() { return 'mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-300'; }

export default function PromotionManager({ products = [], brands = [], categories = [], departments = [], specs = [] }) {
  const [promotions, setPromotions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const load = async () => {
    setLoading(true); setError('');
    try { const [promotionRows, customerRows] = await Promise.all([promotionsAdminApi.list(), promotionsAdminApi.audience()]); setPromotions(Array.isArray(promotionRows) ? promotionRows : []); setCustomers(Array.isArray(customerRows) ? customerRows : []); }
    catch (requestError) { setError(requestError.message || 'Promo kodovi nisu dostupni.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const closeEditor = () => { setEditingId(null); setForm(null); };
  const save = async (event) => {
    event.preventDefault(); if (!form) return;
    setSaving(true); setError('');
    try { const payload = toPayload(form); if (editingId) await promotionsAdminApi.update(editingId, payload); else await promotionsAdminApi.create(payload); closeEditor(); await load(); }
    catch (requestError) { setError(requestError.message || 'Promo kod nije sačuvan.'); }
    finally { setSaving(false); }
  };
  const duplicate = async (id) => { try { await promotionsAdminApi.duplicate(id); await load(); } catch (requestError) { setError(requestError.message || 'Kopiranje promo koda nije uspelo.'); } };
  const remove = async (id) => { if (!window.confirm('Obrisati promo kod? Postojeće porudžbine ostaju sačuvane.')) return; try { await promotionsAdminApi.remove(id); if (editingId === id) closeEditor(); await load(); } catch (requestError) { setError(requestError.message || 'Promo kod nije obrisan.'); } };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div><div className="flex items-center gap-2"><Ticket size={22} /><h2 className="text-xl font-bold text-neutral-900">Promo kodovi</h2></div><p className="mt-1 max-w-3xl text-sm text-neutral-500">Kreiraj pravila za cenu, artikle, kupce i limite. Sva pravila se završno proveravaju na serveru.</p></div><button onClick={() => { setEditingId(null); setForm(emptyPromotion()); setError(''); }} className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 font-bold text-white hover:bg-black"><Plus size={18} /> Novi promo kod</button></div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {form && <form onSubmit={save} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4"><div><h3 className="text-lg font-bold text-neutral-900">{editingId ? 'Izmeni promo kod' : 'Novi promo kod'}</h3><p className="text-sm text-neutral-500">Prazno polje znači da ograničenje nije uključeno.</p></div><button type="button" onClick={closeEditor} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"><X size={16} /> Zatvori</button></div>
        <section className="grid gap-4 rounded-2xl border border-neutral-200 p-4 md:grid-cols-2 xl:grid-cols-4">
          <label><span className="text-sm font-semibold text-neutral-700">Kod *</span><div className="mt-1.5 flex gap-2"><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="JESEN15" className="min-w-0 w-full rounded-xl border border-neutral-200 px-3 py-2.5 font-mono" /><button type="button" onClick={() => setForm({ ...form, code: `DAJA-${Math.random().toString(36).slice(2, 8).toUpperCase()}` })} className="rounded-xl border border-neutral-200 px-3 text-xs font-bold">Generiši</button></div></label>
          <label><span className="text-sm font-semibold text-neutral-700">Interni naziv *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Jesenja kampanja" className={fieldClass()} /></label>
          <label><span className="text-sm font-semibold text-neutral-700">Tip pogodnosti</span><select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value, discountValue: event.target.value === 'free_shipping' ? 0 : form.discountValue || 10 })} className={fieldClass()}><option value="percentage">Procenat popusta</option><option value="fixed">Fiksni iznos (RSD)</option><option value="free_shipping">Besplatna dostava</option></select></label>
          {form.discountType !== 'free_shipping' ? <label><span className="text-sm font-semibold text-neutral-700">{form.discountType === 'percentage' ? 'Popust (%) *' : 'Popust (RSD) *'}</span><input required type="number" min={form.discountType === 'percentage' ? 1 : 0.01} max={form.discountType === 'percentage' ? 100 : undefined} step={form.discountType === 'percentage' ? 1 : 0.01} value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} className={fieldClass()} /></label> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">Dostava će biti besplatna.</div>}
          <label className="md:col-span-2"><span className="text-sm font-semibold text-neutral-700">Opis</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="2" className={fieldClass()} /></label><label className="md:col-span-2"><span className="text-sm font-semibold text-neutral-700">Privatna napomena</span><textarea value={form.internalNote} onChange={(event) => setForm({ ...form, internalNote: event.target.value })} rows="2" className={fieldClass()} /></label>
        </section>
        <section className="grid gap-4 rounded-2xl border border-neutral-200 p-4 md:grid-cols-2 xl:grid-cols-4">
          <label><span className="text-sm font-semibold text-neutral-700">Popust se računa na</span><select value={form.appliesTo} onChange={(event) => setForm({ ...form, appliesTo: event.target.value })} className={fieldClass()}><option value="eligible_items">Samo odgovarajuće artikle</option><option value="order">Celokupnu porudžbinu</option></select></label><label><span className="text-sm font-semibold text-neutral-700">Maks. popust (RSD)</span><input type="number" min="0" step="0.01" disabled={form.discountType !== 'percentage'} value={form.maxDiscountAmount} onChange={(event) => setForm({ ...form, maxDiscountAmount: event.target.value })} className={fieldClass()} placeholder="Bez limita" /></label><label><span className="text-sm font-semibold text-neutral-700">Min. iznos (RSD)</span><input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={(event) => setForm({ ...form, minOrderAmount: event.target.value })} className={fieldClass()} placeholder="Bez minimuma" /><span className="mt-1 block text-xs leading-4 text-neutral-500">Kad ograničiš artikle, zbir se računa samo za njih — ne i za ostale proizvode u korpi.</span></label><label><span className="text-sm font-semibold text-neutral-700">Min. komada</span><input type="number" min="1" value={form.minEligibleQuantity} onChange={(event) => setForm({ ...form, minEligibleQuantity: event.target.value })} className={fieldClass()} /></label>
          <label><span className="text-sm font-semibold text-neutral-700">Počinje</span><input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className={fieldClass()} /></label><label><span className="text-sm font-semibold text-neutral-700">Završava</span><input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className={fieldClass()} /></label><label><span className="text-sm font-semibold text-neutral-700">Ukupan limit</span><input type="number" min="1" value={form.totalUsageLimit} onChange={(event) => setForm({ ...form, totalUsageLimit: event.target.value })} className={fieldClass()} placeholder="Bez limita" /></label><label><span className="text-sm font-semibold text-neutral-700">Limit po korisniku</span><input type="number" min="1" value={form.perCustomerUsageLimit} onChange={(event) => setForm({ ...form, perCustomerUsageLimit: event.target.value, loginRequirement: event.target.value ? 'authenticated' : form.loginRequirement })} className={fieldClass()} placeholder="Bez limita" /></label>
        </section>
        <section className="rounded-2xl border border-neutral-200 p-4"><h3 className="font-bold text-neutral-900">Uslovi za korisnika</h3><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><label><span className="text-sm font-semibold text-neutral-700">Stanje prijave</span><select value={form.loginRequirement} onChange={(event) => setForm({ ...form, loginRequirement: event.target.value })} className={fieldClass()}><option value="any">Svejedno</option><option value="authenticated">Mora biti prijavljen</option><option value="guest">Samo gost</option></select></label><label><span className="text-sm font-semibold text-neutral-700">Min. ranijih porudžbina</span><input type="number" min="0" value={form.minCustomerOrderCount} onChange={(event) => setForm({ ...form, minCustomerOrderCount: event.target.value })} className={fieldClass()} /></label><label><span className="text-sm font-semibold text-neutral-700">Maks. ranijih porudžbina</span><input type="number" min="0" value={form.maxCustomerOrderCount} onChange={(event) => setForm({ ...form, maxCustomerOrderCount: event.target.value })} className={fieldClass()} /></label><label><span className="text-sm font-semibold text-neutral-700">Min. prethodni promet (RSD)</span><input type="number" min="0" value={form.minCustomerLifetimeSpend} onChange={(event) => setForm({ ...form, minCustomerLifetimeSpend: event.target.value })} className={fieldClass()} /></label></div><div className="mt-4 flex flex-wrap gap-2">{[['requiresVerifiedEmail', 'Potvrđen email'], ['requiresNewsletter', 'Aktivan newsletter'], ['firstOrderOnly', 'Samo prva porudžbina'], ['active', 'Kod je aktivan']].map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"><input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setForm({ ...form, [key]: event.target.checked, ...(key !== 'active' && event.target.checked ? { loginRequirement: 'authenticated' } : {}) })} />{label}</label>)}</div></section>
        <ProductRulesEditor form={form} setForm={setForm} products={products} categories={categories} brands={brands} departments={departments} specs={specs} />
        <section className="grid gap-4 rounded-2xl border border-neutral-200 p-4 md:grid-cols-2"><CheckOptions label="Ograniči način dostave" values={form.allowedShippingMethods} onChange={(allowedShippingMethods) => setForm({ ...form, allowedShippingMethods })} options={[{ value: 'courier', label: 'Kurirska dostava' }, { value: 'pickup', label: 'Preuzimanje' }]} /><CheckOptions label="Ograniči način plaćanja" values={form.allowedPaymentMethods} onChange={(allowedPaymentMethods) => setForm({ ...form, allowedPaymentMethods })} options={[{ value: 'cod', label: 'Pouzeće' }, { value: 'pickup', label: 'Pri preuzimanju' }]} /></section>
        <CustomerTargets form={form} setForm={setForm} customers={customers} />
        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4"><button type="button" onClick={closeEditor} className="rounded-xl border border-neutral-200 px-4 py-2.5 font-bold text-neutral-700">Otkaži</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 font-bold text-white disabled:opacity-60"><Save size={18} />{saving ? 'Čuvanje...' : 'Sačuvaj promo kod'}</button></div>
      </form>}
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"><div className="border-b border-neutral-100 px-5 py-4"><h3 className="font-bold text-neutral-900">Postojeći promo kodovi</h3></div>{loading ? <p className="p-5 text-sm text-neutral-500">Učitavam promo kodove...</p> : promotions.length === 0 ? <div className="p-10 text-center text-sm text-neutral-500">Još nema promo kodova. Napravi prvi kod iznad.</div> : <div className="divide-y divide-neutral-100">{promotions.map((promotion) => <div key={promotion.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><code className="rounded bg-neutral-100 px-2 py-1 font-bold text-neutral-900">{promotion.code}</code><span className={`rounded-full px-2 py-1 text-xs font-bold ${promotion.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>{promotion.active ? 'Aktivan' : 'Neaktivan'}</span><span className="text-sm font-semibold text-neutral-700">{discountLabel(promotion)}</span></div><p className="mt-2 text-sm font-semibold text-neutral-900">{promotion.name}</p><p className="mt-1 text-xs text-neutral-500">Iskorišćeno: {promotion.usesCount}{promotion.totalUsageLimit ? ` / ${promotion.totalUsageLimit}` : ''}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => { setEditingId(promotion.id); setForm(formFromPromotion(promotion)); setError(''); }} className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700"><Edit3 size={15} /> Izmeni</button><button onClick={() => duplicate(promotion.id)} className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700"><Copy size={15} /> Kopiraj</button><button onClick={() => remove(promotion.id)} className="rounded-lg border border-red-100 px-3 py-2 text-red-600"><Trash2 size={16} /></button></div></div>)}</div>}</section>
    </div>
  );
}
