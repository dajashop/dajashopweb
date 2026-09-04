export const PASSWORD_RULE = {
  regex: /^(?=.*[A-Z])(?=.*\d).{8,}$/,
  message: 'Min. 8 karaktera, 1 veliko slovo i 1 broj.',
};

export const FORM_RULES = {
  email: {
    regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: 'Unesite validnu email adresu.',
  },
  phone: {
    regex: /^(\+|0)[0-9\s\-\/]{6,20}$/,
    message: 'Unesite validan broj telefona. primer: +381601234567.',
  },
  postalCode: {
    regex: /^\d{5}$/,
    message: 'Neispravan poštanski broj.',
  },
  name: {
    regex: /^[a-zA-Z\u00C0-\u024F\s]{2,}$/,
    message: 'Ovo polje je obavezno.',
  },
  // --- DODATO ---
  surname: {
    regex: /^[a-zA-Z\u00C0-\u024F\s]{2,}$/,
    message: 'Ovo polje je obavezno.',
  },
  address: {
    regex: /^.{5,}$/,
    message: 'Unesite punu adresu (Ulica i broj).',
  },
  // --- DODATO ---
  city: {
    regex: /^.{2,}$/,
    message: 'Unesite naziv grada.',
  },
};
