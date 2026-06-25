import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  propositions as initialPropositions,
  campaigns as initialCampaigns,
  type Proposition,
  type Campaign,
  type WorkflowStatus,
} from '../data/mockData';

interface DataContextValue {
  propositions: Proposition[];
  campaigns: Campaign[];
  saveProposition: (prop: Proposition) => void;
  validateProposition: (id: string) => void;
  rejectProposition: (id: string) => void;
  removeProposition: (id: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  // C001 démarre sans proposition — le Manager les saisit en session
  const [propositions, setPropositions] = useState<Proposition[]>(
    initialPropositions.filter(p => p.campaignId !== 'C001')
  );
  const [campaigns] = useState<Campaign[]>(initialCampaigns);

  const saveProposition = (prop: Proposition) => {
    setPropositions(prev => {
      const idx = prev.findIndex(p => p.id === prop.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = prop;
        return next;
      }
      return [...prev, prop];
    });
  };

  const validateProposition = (id: string) => {
    setPropositions(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, statut: 'valide' as WorkflowStatus, dateModification: new Date().toISOString().slice(0, 10) }
          : p
      )
    );
  };

  const rejectProposition = (id: string) => {
    setPropositions(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, statut: 'rejete' as WorkflowStatus, dateModification: new Date().toISOString().slice(0, 10) }
          : p
      )
    );
  };

  const removeProposition = (id: string) => {
    setPropositions(prev => prev.filter(p => p.id !== id));
  };

  return (
    <DataContext.Provider value={{ propositions, campaigns, saveProposition, validateProposition, rejectProposition, removeProposition }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
}
