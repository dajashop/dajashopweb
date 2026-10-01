import { useSyncExternalStore } from 'react';
import { getSearchHistory, subscribeSearchHistory } from '../services/searchHistory.js';
export default function useSearchHistory() { return useSyncExternalStore(subscribeSearchHistory, getSearchHistory, getSearchHistory); }
