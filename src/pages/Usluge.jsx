// File: src/pages/Usluge.jsx
// Stranica za prikaz usluga - Sve u jednoj komponenti
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Ažurirano: Uklanjamo ShieldCheck, dodajemo KeyRound za daljinske
import { Store, BatteryCharging, Wrench, KeyRound } from 'lucide-react';
import '../pages/About.css';
import SEOHead from '../components/seo/SEOHead.jsx';

// Varijante za animaciju ulaska stranice
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

// Lokalni stilovi za kartice usluga, bazirani na temama
const serviceCardStyle = {
  padding: '30px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-accent)',
  borderRadius: '16px',
  minHeight: '250px',
  display: 'flex',
  flexDirection: 'column',
};

const highlightBoxStyle = {
  padding: '15px',
  borderLeft: '3px solid var(--color-primary)',
  background: 'var(--color-surface)',
  borderRadius: '4px',
  marginTop: '15px',
};

// Komponenta Usluge sa svim informacijama unutar sebe
export default function Usluge() {
  // Array sa podacima o uslugama, ažuriran prema zahtevu
  const services = [
    {
      Icon: BatteryCharging,
      title: 'Ekspertna Zamena Baterije Sata',
      description:
        'Vaš sat zaslužuje najviši nivo pažnje. Naša usluga obuhvata profesionalnu zamenu baterije uz korišćenje isključivo visokokvalitetnih ćelija. Pružamo garanciju na ugrađenu bateriju.',
      warning:
        'Molimo Vas da imate u vidu da se ova usluga sprovodi isključivo u našoj radnji u Nišu. Nismo u mogućnosti da pružamo uslugu zamene baterije putem kurirskih službi, čime osiguravamo najviši standard kvaliteta i sigurnosti.',
      id: 1,
    },
    {
      Icon: Wrench,
      title: 'Zamena Narukvica i Korekcija Veličine',
      description:
        'Stručna montaža novih narukvica, kao i precizno podešavanje dužine metalnih narukvica Vašeg sata. Neophodan profesionalni alat i ekspertiza su ključni za dugovečnost Vašeg sata.',
      warning:
        'Ova usluga zahteva direktan pregled i rad našeg majstora. Dostupna isključivo u Daja Shop radnji.',
      id: 2,
    },
    {
      Icon: KeyRound, // NOVO: Za daljinske upravljače za garaže
      title: 'Učenje Daljinskih Upravljača za Garaže/Kapije',
      description:
        'Pružamo profesionalnu uslugu programiranja i sinhronizacije daljinskih upravljača za Vaša garažna vrata, kapije ili rampe. Osigurajte sebi jednostavan i pouzdan pristup uz našu tehničku podršku.',
      warning:
        'Uspostavljanje veze i programiranje daljinskih upravljača zahteva prisustvo starog daljinskog upravljača kako bi se obezbedila puna kompatibilnost i uspešno uparivanje sa sistemom.',
      id: 3,
    },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.main
        className="usluge container"
        key="uslugePage"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={{ duration: 0.5 }}
        style={{ padding: '48px 0', gap: '64px' }}
      >
        <SEOHead
          title="Usluge"
          description="Usluge servisa satova, zamene baterija i programiranja daljinskih upravljača u DajaShop radnji."
        />
        <header className="section">
          <h1 className="h1" style={{ color: 'var(--color-primary)' }}>
            Profesionalne Usluge i Servis
          </h1>
          <p className="lead">
            U Daja Shopu, naša posvećenost Vašem zadovoljstvu prevazilazi
            prodaju. Nudimo pažljivo odabrane profesionalne servisne usluge,
            sprovedene sa najvećom preciznošću i poštovanjem prema Vašem
            proizvodu.
          </p>
        </header>

        <section className="usluge-grid section">
          <h2 className="h2" style={{ marginBottom: '32px' }}>
            Specijalizovane Servisne Usluge (Dostupne Samo u Radnji)
          </h2>

          <div className="grid-3" style={{ gap: '24px' }}>
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                className="card shadow glass"
                style={serviceCardStyle}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ scale: 1.02 }}
              >
                <div
                  className="icon"
                  style={{
                    color: 'var(--color-primary)',
                    fontSize: '2.5rem',
                    marginBottom: '16px',
                  }}
                >
                  <service.Icon size={40} />
                </div>
                <h3
                  className="h2"
                  style={{
                    fontSize: '1.5em',
                    color: 'var(--color-primary)',
                    marginBottom: '10px',
                  }}
                >
                  {service.title}
                </h3>
                <p className="lead" style={{ flexGrow: 1 }}>
                  {service.description}
                </p>

                <div style={highlightBoxStyle}>
                  <p
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: 'bold',
                      color: 'var(--color-primary)',
                    }}
                  >
                    <Store size={20} style={{ marginRight: '10px' }} />
                    VAŽNO OBAVEŠTENJE
                  </p>
                  <p
                    style={{
                      marginTop: '10px',
                      color: 'var(--color-text)',
                      fontSize: '0.95em',
                    }}
                  >
                    {service.warning}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </motion.main>
    </AnimatePresence>
  );
}
