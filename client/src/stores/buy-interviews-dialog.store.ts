import { create } from "zustand";

type BuyInterviewsDialogStore = {
  isOpen: boolean;
  // Set when opened because the user tried to create an interview with none
  // left, so the dialog can say why it appeared.
  isOutOfCredits: boolean;
  open: (options?: { isOutOfCredits?: boolean }) => void;
  close: () => void;
};

// Global so any page or menu can open the one dialog mounted in the root.
export const useBuyInterviewsDialog = create<BuyInterviewsDialogStore>(
  (set) => ({
    isOpen: false,
    isOutOfCredits: false,
    open: ({ isOutOfCredits = false } = {}) =>
      set({ isOpen: true, isOutOfCredits }),
    close: () => set({ isOpen: false }),
  }),
);
