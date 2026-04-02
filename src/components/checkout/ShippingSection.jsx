import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, MapPin, CheckCircle2, MessageSquare } from 'lucide-react'; // Dodata MessageSquare

// Prosleđujemo URL mape kao prop ili konstantu ako je potrebno
const SHOP_ADDRESS_QUERY = 'Daja Shop, Podzemni prolaz lokal C31, Nis, Srbija';
const MAP_EMBED_URL = `https://www.google.com/maps/embed/v1/place?key=${
  import.meta.env.VITE_GOOGLE_MAPS_KEY
}&q=${encodeURIComponent(SHOP_ADDRESS_QUERY)}`;

export default function ShippingSection({
  shippingMethod,
  setShippingMethod,
  isFreeShipping,
  COURIER_COST,
  money,
  finalShipping, // NOVO: Props za napomenu kuriru
  orderNote,
  setOrderNote,
}) {
  return (
    <>
           {' '}
      <section className="checkout-section card glass">
               {' '}
        <div className="section-header">
                    <div className="step-badge">2</div>         {' '}
          <h2>Način isporuke</h2>       {' '}
        </div>
               {' '}
        <div className="shipping-options">
                   {' '}
          <label
            className={`radio-card ${
              shippingMethod === 'courier' ? 'selected' : ''
            }`}
            onClick={() => setShippingMethod('courier')}
          >
                       {' '}
            <div className="radio-info">
                            <Truck size={20} className="text-primary" />       
                   {' '}
              <div>
                               {' '}
                <span className="radio-title">Isporuka kurirskom službom</span> 
                             {' '}
                <span className="radio-desc">
                                   {' '}
                  {isFreeShipping
                    ? 'Iznad 8.000 RSD besplatno'
                    : `Cena: ${money(COURIER_COST)}`}
                                 {' '}
                </span>
                             {' '}
              </div>
                         {' '}
            </div>
                       {' '}
            <div className="radio-price">
                           {' '}
              {isFreeShipping ? (
                <span
                  className="text-success"
                  style={{
                    textAlign: 'right',
                    minWidth: '100px',
                    display: 'inline-block',
                  }}
                >
                  Besplatna
                </span>
              ) : (
                <span>{money(COURIER_COST)}</span>
              )}
                         {' '}
            </div>
                       {' '}
            <input
              type="radio"
              name="shipping"
              value="courier"
              checked={shippingMethod === 'courier'}
              hidden
              readOnly
            />
                       {' '}
            <div className="radio-check">
                            <CheckCircle2 size={16} />           {' '}
            </div>
                     {' '}
          </label>
                   {' '}
          <label
            className={`radio-card ${
              shippingMethod === 'pickup' ? 'selected' : ''
            }`}
            onClick={() => setShippingMethod('pickup')}
          >
                       {' '}
            <div className="radio-info">
                            <MapPin size={20} className="text-primary" />       
                   {' '}
              <div>
                               {' '}
                <span className="radio-title">Preuzimanje u prodavnici</span>   
                           {' '}
                <span className="radio-desc">
                                    Niš, Podzemni prolaz lokal C31 (Uvek
                  besplatno)                {' '}
                </span>
                             {' '}
              </div>
                         {' '}
            </div>
                       {' '}
            <div
              className="radio-price"
              style={{ textAlign: 'right', minWidth: '100px' }}
            >
                            <span className="text-success">Besplatna</span>     
                   {' '}
            </div>
                       {' '}
            <input
              type="radio"
              name="shipping"
              value="pickup"
              checked={shippingMethod === 'pickup'}
              hidden
              readOnly
            />
                       {' '}
            <div className="radio-check">
                            <CheckCircle2 size={16} />           {' '}
            </div>
                     {' '}
          </label>
                 {' '}
        </div>
        {/* --- [NOVO] PROFESIONALNA NAPOMENA ZA KURIRA (samo za kurirsku službu) --- */}
        <AnimatePresence>
          {shippingMethod === 'courier' && (
            <motion.div
              className="mt-6 full-width"
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <label
                htmlFor="order-note-textarea"
                className="text-sm font-semibold text-[var(--color-text)] mb-3 block flex items-center gap-2 select-none"
              >
                <MessageSquare
                  size={18}
                  // Koristim direktan stil ovde jer su klase nepoznate
                  style={{ color: 'var(--color-primary)' }}
                />
                Dodatne instrukcije za kurira (Opciono)
              </label>

              <div
                // Imitacija input-group stila korišćenjem tematskih varijabli
                className="w-full bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] focus-within:border-[var(--color-primary)] transition-colors duration-200"
              >
                <textarea
                  id="order-note-textarea"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Npr. interfon ne radi, molimo Vas da nas pozovete 10 minuta pre isporuke, ili ostavite paket kod komšije (broj 15)."
                  rows={3}
                  maxLength={200}
                  className="w-full p-4 bg-transparent focus:outline-none text-[var(--color-text)] placeholder:text-[var(--color-muted)] resize-none"
                  style={{
                    minHeight: '100px',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                  }}
                />
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-2">
                Unesite do 200 karaktera. Detaljne instrukcije pomažu da Vaša
                isporuka protekne glatko i efikasno.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {/* -------------------------------------------------------------------------- */}
             {' '}
      </section>
           {' '}
      <AnimatePresence>
               {' '}
        {shippingMethod === 'pickup' && (
          <motion.section
            className="checkout-section card glass pickup-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden', padding: 0 }}
          >
                       {' '}
            <div style={{ padding: '24px' }}>
                            <h3>Lokacija prodavnice:</h3>             {' '}
              <div className="location-box" style={{ marginTop: '12px' }}>
                               {' '}
                <p
                  style={{
                    marginBottom: '4px',
                    fontWeight: '700',
                    color: 'var(--text)',
                  }}
                >
                                    Daja Shop Niš                {' '}
                </p>
                               {' '}
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                                    Podzemni prolaz lokal C31, Obrenovićeva bb,
                  Niš                {' '}
                </p>
                             {' '}
              </div>
                         {' '}
            </div>
                       {' '}
            <div className="map-container">
                           {' '}
              <iframe
                className="map-iframe"
                title="Daja Shop Lokacija"
                width="100%"
                height="100%"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={MAP_EMBED_URL}
              ></iframe>
                         {' '}
            </div>
                     {' '}
          </motion.section>
        )}
             {' '}
      </AnimatePresence>
         {' '}
    </>
  );
}
