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

// A FAIRE — Microsoft Entra ID : en production, l'authentification est déléguée à
// Microsoft Entra ID (Azure AD) via OpenID Connect, fédéré avec SAP IAS (Identity
// Authentication Service). Le flux BTP est :
//   Browser → SAP BTP AppRouter → SAP IAS (proxy OIDC) → Microsoft Entra ID
// Le token JWT Entra ID est échangé par SAP IAS contre un token XSUAA.
// Configuration requise : SAP IAS tenant + Corporate IdP (Entra) + XSUAA trust.
// Voir : SAP BTP Security > Trust and Authorization > Trust Configuration.

const DEV_USERS: SessionUser[] = [
  { id: 'U001', prenom: 'Sophie',   nom: 'Dupont',   role: 'DRH',       entite: 'Groupe Horizon', perimetre: ['Groupe Horizon', 'Horizon France', 'Horizon Rail'],    email: 'sophie.dupont@horizon-group.fr' },
  { id: 'U002', prenom: 'Thomas',   nom: 'Renard',   role: 'SIRH',      entite: 'Groupe Horizon', perimetre: ['Groupe Horizon', 'Horizon France', 'Horizon Rail'],    email: 'thomas.renard@horizon-group.fr' },
  { id: 'U003', prenom: 'Marie',    nom: 'Lefort',   role: 'RRH',       entite: 'Horizon France',        perimetre: ['Horizon France'],                                        email: 'marie.lefort@horizon-france.fr' },
  { id: 'U006', prenom: 'Philippe', nom: 'Rousseau', role: 'Directeur', entite: 'Groupe Horizon', perimetre: ['Groupe Horizon'], matricule: 'E010',     email: 'ph.rousseau@horizon-group.fr' },
  { id: 'U008', prenom: 'Claire',   nom: 'Mercier',  role: 'Manager',   entite: 'Groupe Horizon', perimetre: ['RH – Groupe Horizon'],      matricule: 'E011',     email: 'c.mercier@horizon-group.fr' },
];

// Les types SAP ushell (window.sap.ushell.Container, UserInfo, Navigation...)
// sont déclarés dans src/vite-env.d.ts — pas de declare global ici.

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
  const ushell = (window as any).sap?.ushell?.Container;
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
  const roleData: UserRoleResponse = { role: 'DRH', entite: 'Groupe Horizon', perimetre: ['Groupe Horizon'] };

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
  const isInFLP = typeof window !== 'undefined' && !!(window as any).sap?.ushell;

  useEffect(() => {
    if (DEV) return; // En DEV, le switcher de profil gère l'identité

    setLoading(true);
    loadBTPUser()
      .then(u => setUser(u))
      .catch(err => {
        console.error('[UserContext] Échec du chargement de l\'identité BTP:', err);
        // A FAIRE — Afficher une page d'erreur dédiée plutôt que de rester sur le profil DEV par défaut
        // Exemple : navigate('/error?code=auth_failed')
      })
      .finally(() => setLoading(false));
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
