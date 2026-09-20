import { useState } from 'react';

export default function WorkforceReviewNotes({ product, onReturn, disabled }) {
  const [note, setNote] = useState(product.qualityReviewNote || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const missing = product.qualityMissing || [];
  return (
    <div className="space-y-3">
      <section
        className={`rounded-2xl border p-5 ${missing.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}
      >
        <h3 className="font-bold">Automatska kontrola sačuvanog artikla</h3>
        {missing.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {missing.map((item) => (
              <li key={item}>Nedostaje: {item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-emerald-800">
            Sva obavezna polja su popunjena. Proverite tačnost podataka i
            fotografiju.
          </p>
        )}
        <p className="mt-3 text-xs text-neutral-500">
          Kontrola se osvežava nakon čuvanja. Ne proverava istinitost opisa i
          specifikacija.
        </p>
      </section>
      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <label htmlFor="workforce-review-note" className="font-bold">
          Vaša napomena za doradu
        </label>
        <textarea
          id="workforce-review-note"
          maxLength={2000}
          rows={4}
          className="mt-3 w-full resize-y rounded-xl border border-neutral-200 p-3 text-sm"
          placeholder="Napišite konkretno šta zaposleni treba da ispravi…"
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setSent(false);
          }}
        />
        <p className="mb-3 text-xs text-neutral-500">
          Prvo se čuvaju izmene ovog formulara, pa se artikal vraća zaposlenom
          sa vašom napomenom.
        </p>
        <button
          type="button"
          disabled={disabled || busy || sent || !note.trim()}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              const saved = await onReturn(note.trim());
              if (saved) setSent(true);
            } catch (err) {
              setError(err.message || 'Slanje nije uspelo.');
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-amber-950 disabled:opacity-50"
        >
          {busy
            ? 'Čuvanje i slanje…'
            : sent
              ? 'Poslato zaposlenom'
              : 'Sačuvaj izmene i vrati na doradu'}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {sent && (
          <p role="status" className="mt-2 text-sm text-emerald-700">
            Artikal je vraćen na doradu sa vašom napomenom.
          </p>
        )}
      </section>
    </div>
  );
}
