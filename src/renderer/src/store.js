import { create } from 'zustand'

/** Stato globale UI: navigazione, libreria giri e selezione per il confronto. */
export const useStore = create((set, get) => ({
  view: 'live', // live | analysis | compare | library
  setView: (view) => set({ view }),

  laps: [], // [{ id, meta }]
  setLaps: (laps) => set({ laps }),

  // selezione per confronto / analisi
  selectedA: null,
  selectedB: null,
  selectLap: (slot, id) => set({ [slot === 'A' ? 'selectedA' : 'selectedB']: id }),

  refreshLaps: async () => {
    const laps = await window.api.listLaps()
    set({ laps })
    return laps
  },

  status: null,
  setStatus: (status) => set({ status })
}))
