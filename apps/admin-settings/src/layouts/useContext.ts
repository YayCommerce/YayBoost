import { createContext, useContext } from "react";

export interface PageContextType {
  setPageHeader: (title: string | null, description?: string | null) => void;
  setActionElement: (element: React.ReactNode | null) => void;
}

export const PageContext = createContext<PageContextType | undefined>(undefined);

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePageContext must be used within PageProvider');
  }
  return context;
}
