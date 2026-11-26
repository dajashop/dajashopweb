// Browser-side inventory. Keep names and durations aligned with the owning code and providers.
export const cookieInventory = {
  "necessary": [
    {
      "id": "session",
      "title": "Prijava i zaštita zahteva",
      "entries": [
        {
          "name": "__Host-daja_customer",
          "type": "Kolačić",
          "duration": "Do 15 minuta",
          "purpose": "Održava aktivnu prijavu kupca."
        },
        {
          "name": "__Host-daja_staff",
          "type": "Kolačić",
          "duration": "Do 15 minuta",
          "purpose": "Održava zaštićenu sesiju ovlašćenog osoblja."
        },
        {
          "name": "__Host-daja_refresh",
          "type": "Kolačić",
          "duration": "Podrazumevano 30 dana",
          "purpose": "Obnavlja prijavu bez ponovnog unosa lozinke."
        },
        {
          "name": "__Host-daja_csrf",
          "type": "Kolačić",
          "duration": "30 dana",
          "purpose": "Štiti slanje obrazaca i promene na nalogu od zahteva sa drugog sajta."
        },
        {
          "name": "__Host-daja_oauth",
          "type": "Kolačić",
          "duration": "Do 10 minuta",
          "purpose": "Povezuje započetu Google prijavu sa istim pregledačem."
        },
        {
          "name": "__Host-daja_phone",
          "type": "Kolačić",
          "duration": "Do 10 minuta",
          "purpose": "Povezuje započetu verifikaciju telefona sa istim pregledačem."
        },
        {
          "name": "__Host-daja_passkey",
          "type": "Kolačić",
          "duration": "Do 5 minuta",
          "purpose": "Povezuje proveru pristupnog ključa sa započetom prijavom."
        },
        {
          "name": "__Host-daja_welcome",
          "type": "Kolačić",
          "duration": "Do 30 dana",
          "purpose": "Pamti potvrdu emaila za korišćenje kupona dobrodošlice u istom pregledaču."
        },
        {
          "name": "daja_oauth_browser_state",
          "type": "sessionStorage",
          "duration": "Do 10 minuta važenja",
          "purpose": "Proverava povratak sa Google prijave. Koristi se jednom."
        },
        {
          "name": "daja_cookie_session_lock",
          "type": "localStorage",
          "duration": "Do 60 sekundi važenja",
          "purpose": "Sprečava da dve kartice istovremeno obnavljaju prijavu."
        }
      ]
    },
    {
      "id": "store",
      "title": "Izbor privatnosti, korpa i jezik",
      "entries": [
        {
          "name": "dajashop_privacy_receipt",
          "type": "localStorage",
          "duration": "180 dana važenja",
          "purpose": "Pamti dozvole koje ste izabrali i verziju politike."
        },
        {
          "name": "cart",
          "type": "localStorage",
          "duration": "Bez automatskog isteka",
          "purpose": "Pamti artikle i količine u vašoj korpi."
        },
        {
          "name": "daja_wishlist",
          "type": "localStorage",
          "duration": "Bez automatskog isteka",
          "purpose": "Čuva artikle koje dodate na listu želja."
        },
        {
          "name": "daja_saved_cart:*",
          "type": "localStorage",
          "duration": "Bez automatskog isteka",
          "purpose": "Pamti artikle koje ste sačuvali za kasnije."
        },
        {
          "name": "daja_active_promo",
          "type": "localStorage",
          "duration": "Bez automatskog isteka",
          "purpose": "Pamti kupon koji ste primenili. Server posebno proverava važenje kupona."
        },
        {
          "name": "daja_welcome_promo_removed_for",
          "type": "localStorage",
          "duration": "Bez automatskog isteka",
          "purpose": "Pamti da ste uklonili kupon dobrodošlice kako se ne bi ponovo primenio."
        },
        {
          "name": "daja_kod_dobrodoslice_na_cekanju",
          "type": "localStorage",
          "duration": "Bez automatskog isteka",
          "purpose": "Pamti dobijeni kod dobrodošlice."
        },
        {
          "name": "dajashop_product_alert_state",
          "type": "localStorage",
          "duration": "Bez automatskog isteka",
          "purpose": "Pamti pristup upravljanju obaveštenjima koja ste tražili za artikle."
        },
        {
          "name": "daja_language_choice",
          "type": "Kolačić",
          "duration": "365 dana",
          "purpose": "Pamti jezik koji sami izaberete."
        },
        {
          "name": "dajashop_language",
          "type": "localStorage",
          "duration": "Bez automatskog isteka",
          "purpose": "Pamti jezik prikaza prodavnice."
        },
        {
          "name": "dajashop_currency",
          "type": "localStorage",
          "duration": "Bez automatskog isteka",
          "purpose": "Pamti valutu koju ste izabrali za informativni prikaz cena."
        }
      ]
    },
    {
      "id": "tools",
      "title": "Poručivanje, gravura i rad stranice",
      "entries": [
        {
          "name": "daja:checkout-attempt:*",
          "type": "sessionStorage",
          "duration": "Do potvrde ishoda ili kraja sesije kartice",
          "purpose": "Pomaže da se ista porudžbina ne pošalje dvaput posle prekida."
        },
        {
          "name": "daja-chunk-reload-at",
          "type": "sessionStorage",
          "duration": "Do kraja sesije kartice",
          "purpose": "Sprečava ponavljanje automatskog osvežavanja ako se deo stranice nije učitao."
        },
        {
          "name": "daja:prelaunch-notice-dismissed",
          "type": "sessionStorage",
          "duration": "Do kraja sesije kartice",
          "purpose": "Pamti zatvaranje obaveštenja o radu prodavnice."
        },
        {
          "name": "daja-engraving",
          "type": "IndexedDB",
          "duration": "Bez automatskog isteka",
          "purpose": "Čuva nacrte koje pravite u editoru gravure da biste mogli da nastavite rad."
        }
      ]
    },
    {
      "id": "cloudflare",
      "title": "Cloudflare zaštita",
      "entries": [
        {
          "name": "cf_clearance",
          "type": "Kolačić",
          "duration": "Prolaz provere podešen na 30 minuta",
          "purpose": "Pamti da je pregledač prošao Cloudflare bezbednosnu proveru."
        },
        {
          "name": "__cf_bm",
          "type": "Kolačić",
          "duration": "30 minuta bez aktivnosti",
          "purpose": "Pomaže Cloudflare-u da prepozna automatizovani saobraćaj kada je ta zaštita uključena."
        }
      ],
      "note": "Ovi zapisi mogu se pojaviti kada se primeni odgovarajuća bezbednosna provera.",
      "source": "https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/"
    },
    {
      "id": "recaptcha",
      "title": "Google reCAPTCHA",
      "entries": [
        {
          "name": "_GRECAPTCHA",
          "type": "Kolačić",
          "duration": "Rok određuje Google",
          "purpose": "Pomaže Google-u da proveri zahtev za SMS kod i spreči zloupotrebu. Rok možete videti u pregledaču ako je kolačić postavljen."
        }
      ],
      "note": "Provera se pokreće kad zatražite SMS kod i potvrdite nastavak.",
      "source": "https://docs.cloud.google.com/recaptcha/docs/faq"
    },
    {
      "id": "staff",
      "title": "Samo za osoblje prodavnice",
      "entries": [
        {
          "name": "daja_staff_device_id",
          "type": "localStorage",
          "duration": "Bez automatskog isteka",
          "purpose": "Prepoznaje pregledač koji osoblje koristi za rad u administraciji."
        },
        {
          "name": "daja_admin_product_draft:*",
          "type": "localStorage",
          "duration": "Bez automatskog isteka",
          "purpose": "Čuva nepotvrđen nacrt uređivanja artikla."
        },
        {
          "name": "daja_work_timing_queue:account:*",
          "type": "localStorage",
          "duration": "Do slanja zapisa, bez automatskog isteka",
          "purpose": "Čuva radne zapise dok se ne pošalju na server."
        },
        {
          "name": "daja-admin-media-queue",
          "type": "IndexedDB",
          "duration": "Do završetka ili uklanjanja, bez automatskog isteka",
          "purpose": "Čuva slike odabrane za prenos i omogućava nastavak prekinutog prenosa."
        }
      ]
    }
  ],
  "functional": [
    {
      "id": "settings",
      "title": "Podešavanja DAJA Shopa",
      "entries": [
        {
          "name": "theme",
          "type": "localStorage",
          "duration": "180 dana",
          "purpose": "Pamti izabranu svetlu ili tamnu temu."
        },
        {
          "name": "daja_last_login",
          "type": "localStorage",
          "duration": "30 dana",
          "purpose": "Pamti način poslednje prijave i prikaz poslednjeg naloga."
        },
        {
          "name": "dajashop_newsletter_seen",
          "type": "localStorage",
          "duration": "180 dana",
          "purpose": "Pamti da ste videli ili zatvorili poziv za prijavu na novosti."
        },
        {
          "name": "engraving-auto-suggestions",
          "type": "localStorage",
          "duration": "180 dana",
          "purpose": "Pamti da li želite automatske predloge gravure."
        },
        {
          "name": "daja:preference-expiry:*",
          "type": "localStorage",
          "duration": "Isti rok kao podešavanje",
          "purpose": "Čuva samo datum do kog određeno podešavanje važi."
        },
        {
          "name": "daja_workforce_layout:*",
          "type": "localStorage",
          "duration": "180 dana",
          "purpose": "Pamti raspored panela koji je izabralo osoblje."
        }
      ]
    },
    {
      "id": "catalogue",
      "title": "Lokalni keš kataloga",
      "entries": [
        {
          "name": "catalog-scroll:*",
          "type": "sessionStorage",
          "duration": "Do kraja sesije kartice",
          "purpose": "Pamti poziciju u listi artikala da se vratite na isto mesto."
        },
        {
          "name": "daja-public-catalog-v2",
          "type": "IndexedDB",
          "duration": "Do 5 minuta od potvrde servera",
          "purpose": "Čuva kratkotrajne kopije javnih podataka o artiklima radi bržeg učitavanja. Istekli podaci se ne koriste."
        }
      ]
    }
  ],
  "google": [
    {
      "id": "google",
      "title": "Google Maps i Places",
      "entries": [
        {
          "name": "NID",
          "type": "Kolačić",
          "duration": "6 meseci od poslednjeg korišćenja",
          "purpose": "Google može da pamti podešavanja svojih usluga, kao što je jezik."
        },
        {
          "name": "_Secure-ENID",
          "type": "Kolačić",
          "duration": "13 meseci",
          "purpose": "Google može da pamti podešavanja svojih usluga."
        },
        {
          "name": "SID",
          "type": "Kolačić",
          "duration": "2 godine",
          "purpose": "Google koristi za zaštitu Google naloga i potvrdu njegove prijave."
        },
        {
          "name": "HSID",
          "type": "Kolačić",
          "duration": "2 godine",
          "purpose": "Google koristi zajedno sa SID za bezbednost prijavljenog Google naloga."
        }
      ],
      "note": "Primeri zapisa koje Google navodi za svoje usluge. Ono što se pojavi kod vas zavisi od Google usluge, pregledača i toga da li ste prijavljeni na Google nalog.",
      "source": "https://policies.google.com/technologies/cookies"
    }
  ],
  "analytics": [
    {
      "id": "cloudflare-analytics",
      "title": "Cloudflare Web Analytics",
      "entries": [],
      "note": "Ova analitika radi bez kolačića i bez sopstvenog zapisa u lokalnoj memoriji pregledača. Uz vašu dozvolu šalje podatke o učitavanju i korišćenju javnih stranica.",
      "source": "https://developers.cloudflare.com/web-analytics/faq/"
    }
  ]
};
