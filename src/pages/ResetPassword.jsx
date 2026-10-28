import { useStorefront } from '../localization/StorefrontContext.jsx';
import { useEmailLinkRequest } from '../hooks/useEmailLinkRequest.js';
import { isEmailLinkToken, isInvalidEmailLink } from '../utils/emailErrors.js';
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../services/dajaPlatform.js';
import SEOHead from '../components/seo/SEOHead.jsx';
import './ResetPassword.css';

const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: 'Najmanje 8 karaktera', passes: (value) => value.length >= 8 },
  { key: 'uppercase', label: 'Jedno veliko slovo', passes: (value) => /[A-Z]/.test(value) },
  { key: 'number', label: 'Jedan broj', passes: (value) => /\d/.test(value) },
];

export default function ResetPassword() {
  const { t: translateText } = useStorefront();

  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const beginRequest = useEmailLinkRequest(token);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(isEmailLinkToken(token) ? 'ready' : 'invalid');
  const [errors, setErrors] = useState({});
  const passwordRequirements = PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.passes(password),
  }));
  const passwordIsValid = passwordRequirements.every((requirement) => requirement.met);
  const confirmationMatches = Boolean(confirmation) && confirmation === password;
  const confirmationInvalid = Boolean(confirmation) && !confirmationMatches;

  useEffect(() => {
    setPassword('');
    setConfirmation('');
    setShowPassword(false);
    setErrors({});
    setStatus(isEmailLinkToken(token) ? 'ready' : 'invalid');
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!passwordIsValid) nextErrors.password = 'Lozinka ne ispunjava sve uslove.';
    if (confirmation !== password) nextErrors.confirmation = 'Lozinke se ne podudaraju.';
    if (!isEmailLinkToken(token)) nextErrors.form = 'Link za promenu lozinke nije potpun ili nije važeći.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const request = beginRequest();
    if (!request) return;
    setStatus('saving');
    try {
      await authApi.resetPassword(token, password);
      if (!request.isCurrent()) return;
      setPassword('');
      setConfirmation('');
      setStatus('success');
    } catch (error) {
      if (!request.isCurrent()) return;
      setStatus(isInvalidEmailLink(error) ? 'invalid' : 'ready');
      setErrors({
        form: error?.message || 'Promena trenutno nije uspela. Podaci su sačuvani u formi; pokušajte ponovo.',
      });
    } finally { request.finish(); }
  }

  const isSuccess = status === 'success';
  const isSaving = status === 'saving';
  const isInvalid = status === 'invalid';

  return (
    <section className="reset-password-page" aria-live="polite">
      <SEOHead title={translateText("Promena lozinke")} noIndex={true} />
      <div className="reset-password-page__card">
        <div className="reset-password-page__icon" aria-hidden="true">
          {translateText(isSuccess ? <CheckCircle2 size={28} /> : isInvalid ? <KeyRound size={28} /> : <ShieldCheck size={28} />)}
        </div>
        {isSuccess ? (
          <>
            <p className="reset-password-page__eyebrow reset-password-page__eyebrow--success">{translateText("Lozinka je promenjena")}</p>
            <h1>{translateText("Uspešno ste postavili novu lozinku.")}</h1>
            <p className="reset-password-page__copy">{translateText("Sve prethodne prijave na ovom nalogu su završene. Sada možete zatvoriti ovu stranicu i prijaviti se novom lozinkom.")}</p>
            <Link className="reset-password-page__button" to="/">{translateText("Nazad na DajaShop")}</Link>
          </>
        ) : (
          <>
            <p className="reset-password-page__eyebrow">{translateText("DajaShop nalog")}</p>
            <h1>{translateText(isInvalid ? 'Link više nije važeći.' : 'Postavite novu lozinku.')}</h1>
            <p className="reset-password-page__copy">
              {translateText(isInvalid
                ? 'Link je možda već iskorišćen ili je istekao. Zatražite novi link sa stranice za prijavu.'
                : 'Nova lozinka mora imati najmanje 8 karaktera, jedno veliko slovo i jedan broj.')}
            </p>
            {!isInvalid && (
              <form className="reset-password-page__form" onSubmit={submit} noValidate>
                <label>
                  <span>{translateText("Nova lozinka")}</span>
                  <div className={errors.password ? 'reset-password-page__input reset-password-page__input--error' : 'reset-password-page__input'}>
                    <Lock size={18} aria-hidden="true" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setErrors((current) => ({ ...current, password: undefined }));
                      }}
                      autoComplete="new-password"
                      disabled={isSaving}
                    />
                    <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={translateText(showPassword ? 'Sakrij lozinke' : 'Prikaži lozinke')}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <ul className="reset-password-page__requirements" aria-label={translateText("Uslovi za lozinku")}>
                    {passwordRequirements.map((requirement) => (
                      <li key={requirement.key} className={requirement.met ? 'is-met' : ''}>
                        <span aria-hidden="true">✓</span>
                        {translateText(requirement.label)}
                      </li>
                    ))}
                  </ul>
                </label>
                <label>
                  <span>{translateText("Ponovite novu lozinku")}</span>
                  <div className={errors.confirmation || confirmationInvalid ? 'reset-password-page__input reset-password-page__input--error' : 'reset-password-page__input'}>
                    <Lock size={18} aria-hidden="true" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmation}
                      onChange={(event) => {
                        setConfirmation(event.target.value);
                        setErrors((current) => ({ ...current, confirmation: undefined }));
                      }}
                      autoComplete="new-password"
                      disabled={isSaving}
                    />
                  </div>
                  {(confirmation || errors.confirmation) && (
                    <small className={confirmationMatches ? 'reset-password-page__match reset-password-page__match--valid' : 'reset-password-page__error'}>
                      {translateText(confirmationMatches ? 'Lozinke se podudaraju.' : 'Lozinke se ne podudaraju.')}
                    </small>
                  )}
                </label>
                <button className="reset-password-page__button" disabled={isSaving}>
                  {translateText(isSaving ? 'Čuvamo novu lozinku...' : 'Sačuvaj novu lozinku')}
                </button>
              </form>
            )}
            {errors.form && <p className="reset-password-page__error reset-password-page__error--form">{translateText(errors.form)}</p>}
            <Link className="reset-password-page__secondary" to="/">
              <Mail size={16} />{translateText(" Nazad na prijavu")}</Link>
          </>
        )}
      </div>
    </section>
  );
}
