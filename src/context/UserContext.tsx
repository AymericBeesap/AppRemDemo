import { createContext, useContext, useState } from 'react';
import type { Role } from '../data/mockData';

export interface SessionUser {
  id: string;
  nom: string;
  prenom: string;
  role: Role;
  entite: string;
  perimetre: string[];
}

const SESSION_USERS: SessionUser[] = [
  { id: 'U001', prenom: 'Sophie',   nom: 'Dupont',   role: 'DRH',       entite: 'Groupe A',  perimetre: ['Groupe A', 'Filiale B', 'Filiale C'] },
  { id: 'U002', prenom: 'Thomas',   nom: 'Renard',   role: 'SIRH',      entite: 'Groupe A',  perimetre: ['Groupe A', 'Filiale B', 'Filiale C'] },
  { id: 'U003', prenom: 'Marie',    nom: 'Lefort',   role: 'RRH',       entite: 'Filiale B', perimetre: ['Filiale B'] },
  { id: 'U006', prenom: 'Philippe', nom: 'Rousseau', role: 'Directeur', entite: 'Groupe A',  perimetre: ['Finance – Groupe A'] },
  { id: 'U008', prenom: 'Claire',   nom: 'Mercier',  role: 'Manager',   entite: 'Groupe A',  perimetre: ['RH – Groupe A'] },
];

interface UserContextValue {
  user: SessionUser;
  allUsers: SessionUser[];
  switchUser: (id: string) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser>(SESSION_USERS[0]);

  const switchUser = (id: string) => {
    const found = SESSION_USERS.find(u => u.id === id);
    if (found) setUser(found);
  };

  return (
    <UserContext.Provider value={{ user, allUsers: SESSION_USERS, switchUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}
