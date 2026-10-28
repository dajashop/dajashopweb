import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from '../hooks/useAuth.js';
import { UndoCtx } from "./UndoContext.jsx";
import UndoToast from "../components/modals/UndoToast.jsx";

export function UndoProvider({ children }) {
  const { user } = useAuth();
  const [toast, setToast] = useState({
    visible: false,
    item: null,
    onUndo: null, // Callback funkcija koja vraća artikal
  });

  const showUndo = useCallback((item, onUndoCallback) => {
    setToast({
      visible: true,
      item,
      onUndo: () => {
        onUndoCallback(); // Vrati artikal u korpu
        hideUndo();       // Zatvori toast
      },
    });
  }, []);

  const hideUndo = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => { hideUndo(); }, [user?.uid, user?.id, hideUndo]);

  return (
    <UndoCtx.Provider value={{ showUndo, hideUndo }}>
      {children}
      
      {/* Globalni Toast render */}
      <UndoToast
        visible={toast.visible}
        item={toast.item}
        onUndo={toast.onUndo}
        onClose={hideUndo}
        duration={6000}
      />
    </UndoCtx.Provider>
  );
}
