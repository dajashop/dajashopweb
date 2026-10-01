import { useEffect, useState } from 'react';
import { filterConfigurationApi } from '../services/filterConfiguration.js';

export default function useFilterConfiguration(department) {
  const [state, setState] = useState({ department: '', configuration: null, loading: true, error: '' });
  useEffect(() => {
    let cancelled = false;
    const refresh = () => filterConfigurationApi.published(department).then((result) => {
      if (!cancelled) setState({ department, configuration: result.configuration, loading: false, error: '' });
    }).catch((error) => {
      if (!cancelled) setState((current) => current.department === department && current.configuration
        ? current : { department, configuration: null, loading: false, error: error.message });
    });
    refresh();
    const onFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, 60_000);
    return () => { cancelled = true; window.removeEventListener('focus', onFocus); window.clearInterval(timer); };
  }, [department]);
  return state.department === department ? state : { configuration: null, loading: true, error: '' };
}
