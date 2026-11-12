/**
 * Legacy Store Proxy
 * Delegates all state and operations to the unified Pinia simulation store.
 */

import { useSimulationStore } from './simulationStore.js';

export const useTwinStore = useSimulationStore;
export default useSimulationStore;
