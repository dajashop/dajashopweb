import { useState } from 'react';
import { FORM_RULES } from '../data/validationRules';

export function useFormValidator(initialState) {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});

  // Handler za promenu (kucanje)
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Brišemo grešku čim korisnik krene da kuca
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Handler za onBlur (validacija pojedinačnog polja)
  const handleBlur = (e) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const validateField = (name, value) => {
    const rule = FORM_RULES[name];
    if (rule) {
      // 1. Ako vrednost postoji, proveri Regex
      if (value && !rule.regex.test(value)) {
        setErrors((prev) => ({ ...prev, [name]: rule.message }));
        return false;
      }
      // (Ovde ne proveravamo prazno polje na onBlur da ne bi smarali korisnika pre vremena)
    }
    return true;
  };

  const getErrors = (fieldsToSkip) => {
    const newErrors = {};
    for (const [key, value] of Object.entries(formData)) {
      const rule = FORM_RULES[key];
      if (!rule || fieldsToSkip.includes(key)) continue;
      if (!value || !String(value).trim()) {
        newErrors[key] = 'Ovo polje je obavezno.';
      } else if (!rule.regex.test(value)) {
        newErrors[key] = rule.message;
      }
    }
    return newErrors;
  };

  const isValid = (fieldsToSkip = []) => Object.keys(getErrors(fieldsToSkip)).length === 0;
  const validateAll = (fieldsToSkip = []) => {
    const newErrors = getErrors(fieldsToSkip);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    formData,
    setFormData, // <--- OVO JE KLJUČNO! SADA JE EXPORTOVANO.
    errors,
    handleChange,
    handleBlur,
    isValid,
    validateAll,
  };
}
