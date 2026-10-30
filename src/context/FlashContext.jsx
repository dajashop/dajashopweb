import React, { createContext, useState, useCallback, useMemo } from "react";
import FlashModal from "../components/modals/FlashModal.jsx";
import { CheckCircle2, ShoppingBag, Info, CircleAlert } from "lucide-react";

export const FlashCtx = createContext();

export function FlashProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: "",
    subtitle: "",
    icon: null,
    duration: 2000,
  });

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  /**
   * Glavna funkcija za prikaz obaveštenja.
   * @param {string} title - Glavni naslov
   * @param {string} subtitle - Opis (npr. "Uspešno dodato")
   * @param {'success'|'cart'|'info'|'error'|ReactNode} typeOrIcon - Tip ikone ili custom ikona
   */
  const flash = useCallback((title, subtitle = "", typeOrIcon = "success") => {
    let iconElement;

    if (React.isValidElement(typeOrIcon)) {
      iconElement = typeOrIcon;
    } else {
      switch (typeOrIcon) {
        case "cart":
          iconElement = <ShoppingBag size={22} className="text-white" />;
          break;
        case "info":
          iconElement = <Info size={22} className="text-white" />;
          break;
        case "error":
          iconElement = <CircleAlert size={22} className="text-white" />;
          break;
        case "success":
        default:
          iconElement = <CheckCircle2 size={22} className="text-white" />;
          break;
      }
    }

    setState({
      open: true,
      title,
      subtitle,
      icon: iconElement,
      isError: typeOrIcon === 'error',
      duration: 2000, // default trajanje
    });
  }, []);

  const value = useMemo(() => ({ flash, close }), [flash, close]);

  return (
    <FlashCtx.Provider value={value}>
      {children}
      {/* Globalni modal koji uvek sluša */}
      <FlashModal
        open={state.open}
        title={state.title}
        subtitle={state.subtitle}
        icon={state.icon}
        onClose={close}
        duration={state.duration}
        isError={state.isError}
      />
    </FlashCtx.Provider>
  );
}
