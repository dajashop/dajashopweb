import { useEffect, useState } from 'react';
import { cachedFilterConfiguration, filterConfigurationApi, onFilterConfigurationChange, rememberFilterConfiguration } from '../services/filterConfiguration.js';
import { usePageData } from '../ssr/PageData.jsx';

export default function useFilterConfiguration(department, deferInitialRequest = false) {
  const page = usePageData();
  const initial = page?.hydrating ? page.data?.filters?.[department] : cachedFilterConfiguration(department, true)?.configuration;
  const [state, setState] = useState(initial !== undefined
    ? { department, configuration: initial, loading: false, error: '' }
    : { department: '', configuration: null, loading: true, error: '' });
  useEffect(() => {
    let cancelled = false;
    const seed = page?.data?.filters?.[department];
    if (page?.hydrating && seed && !cachedFilterConfiguration(department, true)) {
      rememberFilterConfiguration(department, seed, page?.data?.filterVersions?.[department]);
    }
    const unsubscribe = onFilterConfigurationChange((changed, entry) => {
      if (!cancelled && changed === department) setState({ department, configuration: entry.configuration, loading: false, error: '' });
    });
    const refresh = () => filterConfigurationApi.published(department).then((result) => {
      if (!cancelled) setState({ department, configuration: result.configuration, loading: false, error: '' });
    }).catch((error) => {
      if (!cancelled) setState((current) => current.department === department && current.configuration
        ? current : { department, configuration: null, loading: false, error: error.message });
    });
    if (!deferInitialRequest || cachedFilterConfiguration(department, true)) refresh();
    const onFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('daja:filters-changed', refresh);
    const timer = window.setInterval(onFocus, 60_000);
    return () => { cancelled = true; unsubscribe(); window.removeEventListener('focus', onFocus); window.removeEventListener('daja:filters-changed', refresh); window.clearInterval(timer); };
  }, [department, page, deferInitialRequest]);
  return state.department === department ? state : { configuration: null, loading: true, error: '' };
}
