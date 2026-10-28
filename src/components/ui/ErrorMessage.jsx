import { useStorefront } from '../../localization/StorefrontContext.jsx';
// src/components/ui/ErrorMessage.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

const ErrorMessage = ({ message }) => {
  const { t: translateText } = useStorefront();
  return (<motion.div
    initial={{ opacity: 0, y: -8, height: 0, marginTop: 0 }}
    animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 6 }}
    exit={{ opacity: 0, y: -8, height: 0, marginTop: 0 }}
    transition={{ duration: 0.25, type: 'spring', bounce: 0.3 }}
    className="custom-error-popout"
  >
    <AlertCircle size={14} className="error-icon-pop" />
    <span>{translateText(message)}</span>
  </motion.div>);
};

export default ErrorMessage;
