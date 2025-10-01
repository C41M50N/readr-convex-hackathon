import { create } from 'zustand';

type ModalState = 'open' | 'closed';

interface ModalStateStoreState {
  state: ModalState;
  set: (newState: ModalState) => void;
}

type CreateModalStateStoreParams = {
  defaultState?: ModalState;
};

export function createModalStateStore({
  defaultState = 'closed',
}: CreateModalStateStoreParams) {
  return create<ModalStateStoreState>((set) => ({
    state: defaultState,
    set(newState) {
      set(() => ({ state: newState }));
    },
  }));
}

// ############################################################################

export const useAddContentModal = createModalStateStore({
  defaultState: 'closed',
});
