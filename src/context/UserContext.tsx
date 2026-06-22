/**
 * UserContext — Identité utilisateur BTP / SAP Fiori Launchpad
 *
 * Ordre de résolution de l'identité (production BTP) :
 *
 *  1. sap.ushell.Container.getService('UserInfo')
 *     → Disponible quand l'app tourne dans SAP Build Work Zone (FLP Shell)
 *     → Fournit : email, prénom, nom, langue, fuseau horaire
 *     → Le rôle métier est résolu séparément via le CAP endpoint /UserRole(me)
 *
 *  2. Endpoint CAP /UserRole(me)
 *     → Le CAP service lit le JWT XSUAA (injecté par AppRouter) et retourne le rôle métier
 *     → Mapping : XSUAA scope "remunerations.DRH" → role "DRH"
 *
 *  3. Fallback développement local : switcher de profil (mode DEV uniquement)
 *
 * A FAIRE — Connexion XSUAA :
 *   - Créer xs-security.json avec les scopes/role-templates/role-collections
 *   - Assigner les Role Collections aux utilisateurs dans BTP Cockpit > Security > Users
 *   - S'assurer que le CAP service utilise @requires pour filtrer les données par rôle
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Role } from '../data/mockData';
import { CAP_ENDPOINTS, XSUAA_SCOPES } from '../config/endpoints';

const DEV = import.meta.env.DEV;

export interface SessionUser {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  role: Role;
  entite: string;
  perimetre: string[];
  matricule?: string;
}

// ── Profils de démonstration (DEV uniquement) ─────────────────────────────────
// A FAIRE — Supprimer ce switcher en production. Les utilisateurs sont authentifiés
// via XSUAA / SAP IAS. Le switcher ne doit jamais être déployé sur BTP.

const DEV_USERS: SessionUser[] = [
  { id: 'U001', prenom: 'Sophie',   nom: 'Dupont',   role: 'DRH',       entite: 'Groupe A',  perimetre: ['Groupe A', 'Filiale B', 'Filiale C'],    email: 'sophie.dupont@groupea.fr' },
  { id: 'U002', prenom: 'Thomas',   nom: 'Renard',   role: 'SIRH',      entite: 'Groupe A',  perimetre: ['Groupe A', 'Filiale B', 'Filiale C'],    email: 'thomas.renard@groupea.fr' },
  { id: 'U003', prenom: 'Marie',    nom: 'Lefort',   role: 'RRH',       entite: 'Filiale B', perimetre: ['Filiale B'],                             email: 'marie.lefort@groupea.fr' },
  { id: 'U006', prenom: 'Philippe', nom: 'Rousseau', role: 'Directeur', entite: 'Groupe A',  perimetre: ['Finance – Groupe A'], matricule: 'E010', email: 'ph.rousseau@groupea.fr' },
  { id: 'U008', prenom: 'Claire',   nom: 'Mercier',  role: 'Manager',   entite: 'Groupe A',  perimetre: ['RH – Groupe A'],      matricule: 'E011', email: 'c.mercier@groupea.fr' },
];

// ── Interface SAP ushell (types minimaux) ─────────────────────────────────────
// A FAIRE — Connexion FLP : installer @types/sap__ui5-shims ou déclarer globalement
// dans src/vite-env.d.ts si nécessaire

declare global {
  interface Window {
    sap?: {
      ushell?: {
        Container: {
          getService(name: 'UserInfo'): {
            getId(): string;
            getFirstName(): string;
            getLastName(): string;
            getEmail(): string;
            getFullName(): string;
          };
          getService(name: string): unknown;
        };
      };
    };
  }
}

// ── Résolution du rôle métier via CAP ─────────────────────────────────────────

interface UserRoleResponse {
  role: Role;
  entite: string;
  perimetre: string[];
  matricule?: string;
}

async function fetchUserRoleFromCAP(): Promise<UserRoleResponse> {
  // A FAIRE — CAP Service :
  // GET /cap/odata/v4/RemunerationService/UserRole(me)
  // Le CAP service lit le JWT XSUAA depuis le header Authorization (injecté par AppRouter)
  // et retourne le rôle métier mappé depuis les scopes XSUAA.
  //
  // Exemple de mapping CAP service.js :
  //   srv.on('UserRole', async (req) => {
  //     const jwt = req.user;
  //     if (jwt.is(XSUAA_SCOPES.DRH))       return { role: 'DRH', ... };
  //     if (jwt.is(XSUAA_SCOPES.MANAGER))   return { role: 'Manager', ... };
  //     throw new Error('No role assigned');
  //   });
  //
  // Si plusieurs rôles : priorité DRH > RRH > Directeur > Manager > SIRH

  const res = await fetch(CAP_ENDPOINTS.USER_ROLE, {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`UserRole fetch failed: ${res.status}`);
  const json = await res.json();
  return json as UserRoleResponse;
}

async function loadBTPUser(): Promise<SessionUser> {
  // Étape 1 : identité depuis FLP Shell (sap.ushell)
  const ushell = window.sap?.ushell?.Container;
  let id = '';
  let prenom = '';
  let nom = '';
  let email = '';

  if (ushell) {
    try {
      const userInfo = ushell.getService('UserInfo');
      id     = userInfo.getId();
      prenom = userInfo.getFirstName();
      nom    = userInfo.getLastName();
      email  = userInfo.getEmail();
    } catch {
      // A FAIRE — Connexion FLP : logger l'erreur dans SAP BTP Application Logging service
      console.warn('[UserContext] sap.ushell.UserInfo unavailable, fallback to CAP');
    }
  }

  // Étape 2 : rôle métier depuis CAP
  // A FAIRE — Connexion CAP : décommenter quand le service CAP est déployé
  // const roleData = await fetchUserRoleFromCAP();

  // Fallback temporaire en attendant le CAP service
  // A FAIRE — Supprimer ce fallback quand fetchUserRoleFromCAP() est opérationnel
  const roleData: UserRoleResponse = { role: 'DRH', entite: 'Groupe A', perimetre: ['Groupe A'] };

  return {
    id:        id || email || 'unknown',
    prenom:    prenom || 'Utilisateur',
    nom:       nom || 'BTP',
    email,
    role:      roleData.role,
    entite:    roleData.entite,
    perimetre: roleData.perimetre,
    matricule: roleData.matricule,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

interface UserContextValue {
  user: SessionUser;
  allUsers: SessionUser[];           // Uniquement en DEV
  switchUser: (id: string) => void;  // Uniquement en DEV
  isLoading: boolean;
  isInFLP: boolean;                  // true quand l'app tourne dans Work Zone
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<SessionUser>(DEV_USERS[0]);
  const [isLoading, setLoading] = useState(!DEV);

  // Détection FLP : sap.ushell est injecté par le Fiori Launchpad
  const isInFLP = typeof window !== 'undefined' && !!window.sap?.ushell;

  useEffect(() => {
    if (DEV) return; // En DEV, on utilise le switcher de profil

    // A FAIRE — Connexion BTP : loadBTPUser() sera actif en production
    // Actuellement commenté pour ne pas bloquer le dev ; décommenter avant déploiement BTP
    // setLoading(true);
    // loadBTPUser()
    //   .then(u => setUser(u))
    //   .catch(err => {
    //     console.error('[UserContext] Failed to load BTP user:', err);
    //     // A FAIRE — Afficher une page d'erreur d'authentification plutôt que le fallback
    //   })
    //   .finally(() => setLoading(false));
    setLoading(false);
  }, []);

  const switchUser = (id: string) => {
    if (!DEV) return; // Interdit en production
    const found = DEV_USERS.find(u => u.id === id);
    if (found) setUser(found);
  };

  return (
    <UserContext.Provider value={{
      user,
      allUsers: DEV ? DEV_USERS : [],
      switchUser,
      isLoading,
      isInFLP,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}

// Export pour compatibilité avec le code existant utilisant l'ancien type
export type { SessionUser as CurrentUser };
