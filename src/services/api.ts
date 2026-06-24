/**
 * Service de données Rémunération — Couche d'abstraction API / Mock
 *
 * Architecture cible SAP BTP :
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │  React App (HTML5 App Repository)                                     │
 * │        ↓ fetch()  [ce fichier]                                        │
 * │  AppRouter BTP (xs-app.json)                                          │
 * │     ├── /s4hana/* → Destination "s4hana"     → SAP S/4HANA (PA, OM) │
 * │     ├── /cap/*    → Destination "remuner-srv" → SAP CAP / HANA Cloud │
 * │     └── /bpa/*    → Destination "workflow"    → SAP BPA               │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * En DEV (import.meta.env.DEV === true) : retourne les données mockées.
 * En PROD (BTP) : exécute les vrais appels API via AppRouter.
 *
 * Migration : remplacer les blocs `if (DEV) return mock...` un à un,
 * après validation de chaque destination dans BTP Cockpit.
 */

import {
  employees        as MOCK_EMPLOYEES,
  campaigns        as MOCK_CAMPAIGNS,
  propositions     as MOCK_PROPOSITIONS,
  auditLogs        as MOCK_AUDIT_LOGS,
  auditParams      as MOCK_AUDIT_PARAMS,
  auditDroits      as MOCK_AUDIT_DROITS,
  budgetEvents     as MOCK_BUDGET_EVENTS,
  appUsers         as MOCK_APP_USERS,
  genderEquityData as MOCK_GENDER_EQUITY,
  budgetByEntity   as MOCK_BUDGET_BY_ENTITY,
  type Employee, type Campaign, type Proposition,
  type AuditLog, type AuditParam, type AuditDroit,
  type BudgetEvent, type AppUser, type WorkflowStatus,
} from '../data/mockData';

import { CAP_ENDPOINTS, S4_ENDPOINTS } from '../config/endpoints';

const DEV = import.meta.env.DEV;

// sap-client : numéro de mandant S/4HANA. Injecter dans chaque requête S/4HANA.
// A FAIRE — Connexion S/4HANA : remplacer par le mandant de production (100, 200, etc.)
// Peut aussi être configuré comme propriété de la destination BTP (Additional Properties > sap-client)
const SAP_CLIENT = import.meta.env.VITE_SAP_CLIENT ?? '100';

// ── CSRF Token S/4HANA OData V2 ───────────────────────────────────────────────
// S/4HANA rejette tout POST/PUT/DELETE sans X-CSRF-Token valide (réponse 403 CSRF-Token invalid).
// Le token est obtenu via un GET avec le header X-CSRF-Token: Fetch, puis mis en cache.
// Durée de vie du token : ~30 min côté S/4HANA (renouveler en cas de 403).

let csrfTokenCache: { token: string; expiresAt: number } | null = null;

async function fetchCsrfToken(): Promise<string> {
  const now = Date.now();
  if (csrfTokenCache && csrfTokenCache.expiresAt > now) return csrfTokenCache.token;

  // GET sur le service root pour récupérer le token — S/4HANA répond avec X-CSRF-Token dans le header
  const res = await fetch(S4_ENDPOINTS.CSRF, {
    method: 'GET',
    headers: {
      'X-CSRF-Token': 'Fetch',
      Accept: 'application/json',
      'sap-client': SAP_CLIENT,
    },
    credentials: 'include',
  });
  const token = res.headers.get('x-csrf-token');
  if (!token || token === 'Required') {
    throw new ApiError(403, 'CSRF Fetch', 'S/4HANA CSRF token non reçu — vérifier la destination BTP et les autorisations ICF');
  }
  // Cache 25 min (S/4HANA expire à 30 min)
  csrfTokenCache = { token, expiresAt: now + 25 * 60 * 1000 };
  return token;
}

// ── Helpers HTTP ──────────────────────────────────────────────────────────────

async function odataGet<T>(url: string, params?: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ $format: 'json', ...params }).toString();
  const res = await fetch(`${url}?${qs}`, {
    headers: {
      Accept: 'application/json',
      'sap-client': SAP_CLIENT,
      // A FAIRE — Connexion S/4HANA : ajouter le header SAP-Passport pour le tracing bout-en-bout
      // 'SAP-PASSPORT': generateSapPassport(),
    },
    credentials: 'include',
  });
  if (!res.ok) throw new ApiError(res.status, `GET ${url}`, await res.text());
  const json = await res.json();
  // OData V2 : data dans .d.results  |  OData V4 : data dans .value
  return (json.d?.results ?? json.value ?? json) as T;
}

// Mutations S/4HANA OData V2 — nécessitent un CSRF token valide
async function s4Mutate<T>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  let csrfToken: string;
  try {
    csrfToken = await fetchCsrfToken();
  } catch {
    // En cas d'échec CSRF, invalider le cache et réessayer une fois
    csrfTokenCache = null;
    csrfToken = await fetchCsrfToken();
  }

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-CSRF-Token': csrfToken,
      'sap-client': SAP_CLIENT,
    },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  // CSRF expiré : invalider le cache (le prochain appel refetchera)
  if (res.status === 403) {
    csrfTokenCache = null;
    throw new ApiError(403, `${method} ${url}`, 'CSRF token expiré — réessayer');
  }

  if (!res.ok) throw new ApiError(res.status, `${method} ${url}`, await res.text());
  if (method === 'DELETE' || res.status === 204) return undefined as T;
  const json = await res.json();
  return (json.d ?? json) as T;
}

async function capFetch<T>(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  // CAP OData V4 : pas de CSRF token nécessaire (géré par le framework CAP)
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    // OData V4 error format : { error: { code, message } }
    const errBody = await res.text();
    let detail = errBody;
    try { detail = JSON.parse(errBody)?.error?.message ?? errBody; } catch { /* raw text */ }
    throw new ApiError(res.status, `${method} ${url}`, detail);
  }
  if (method === 'DELETE' || res.status === 204) return undefined as T;
  const json = await res.json();
  return (json.value ?? json) as T;
}

export class ApiError extends Error {
  constructor(public status: number, public endpoint: string, public detail: string) {
    super(`API ${status} — ${endpoint}: ${detail}`);
  }
}

// ── Mapping S/4HANA OData V2 → types internes ────────────────────────────────
// A FAIRE — Connexion S/4HANA : adapter ces mappings selon la version S/4HANA
// (1909, 2020, 2023) et la configuration HR de votre système.

interface S4Employee {
  PersonnelNumber: string;
  FirstName: string;
  LastName: string;
  Gender: '1' | '2';           // 1=M, 2=F dans S/4HANA HR
  CompanyCode: string;
  OrganizationalUnit: string;
  Position: string;
  EmploymentStatus: string;
  // A FAIRE — Connexion S/4HANA : les champs de salaire nécessitent IT0008 (Basic Pay)
  // qui peut requérir un RFC custom ou le service HR_ADMIN_WS_SALARY_DATA
  BasicPay?: number;
  Currency?: string;
  // A FAIRE — Connexion S/4HANA : grade/échelon mappés via PA0001 (Org Assignment)
  // champs PayScale, PayScaleType, PayScaleArea, PayScaleGroup, PayScaleLevel
  PayScaleGroup?: string;
  PayScaleLevel?: string;
}

function mapS4Employee(s4: S4Employee): Employee {
  // A FAIRE — Connexion S/4HANA : ajuster le mapping selon votre config RH
  // Le calcul de l'ancienneté nécessite la date d'entrée (IT0000 Action Begin Date)
  return {
    matricule:   s4.PersonnelNumber,
    nom:         s4.LastName,
    prenom:      s4.FirstName,
    genre:       s4.Gender === '2' ? 'F' : 'M',
    entite:      s4.CompanyCode,
    division:    s4.OrganizationalUnit,
    manager:     '',      // A FAIRE — Connexion S/4HANA : IT0001 Chef hiérarchique (MANDT)
    directeur:   '',      // A FAIRE — Connexion S/4HANA : lire la hiérarchie OM via HRP1001
    grade:       s4.PayScaleGroup ?? 'P1',
    echelon:     parseInt(s4.PayScaleLevel ?? '1', 10),
    dateEntree:  '',      // A FAIRE — Connexion S/4HANA : PA0000 Begda de l'action d'embauche
    anciennete:  0,       // A FAIRE — Calculer depuis dateEntree
    salaireActuel: s4.BasicPay ?? 0,
    historiqueRemuneration: [], // A FAIRE — Connexion S/4HANA : lire PA0008 historique + bonus PA0015
    eligible:    s4.EmploymentStatus !== '0',
  };
}

// ── Mapping CAP OData V4 → types internes ────────────────────────────────────
// A FAIRE — CAP Backend : ces interfaces doivent correspondre au schéma CDS défini dans
// cap/db/schema.cds. Générer les types TypeScript via `cds-typer` (npx @cap-js/cds-typer)

interface CAPCampaign {
  ID: string;
  nom: string;
  type: 'augmentation' | 'bonus' | 'gpec';
  statut: string;
  dateDebut: string;
  dateFin: string;
  enveloppe: number;
  consomme: number;
  population: number;
  entites: string;    // JSON stringifié dans CAP → parser
  workflowInstanceId?: string;
}

interface CAPProposition {
  ID: string;
  campaignId: string;
  matricule: string;
  montant: number;
  pourcentage: number;
  commentaire: string;
  statut: WorkflowStatus;
  auteur: string;
  createdAt: string;
  modifiedAt: string;
}

// ── Employees ─────────────────────────────────────────────────────────────────

export async function getEmployees(): Promise<Employee[]> {
  if (DEV) return MOCK_EMPLOYEES;

  // A FAIRE — Connexion S/4HANA :
  // Endpoint : GET /s4hana/sap/opu/odata/sap/API_EMPLOYEE_SRV/A_EmployeeBasicInfo
  // Filtres  : $filter=EmploymentStatus ne '0' and IsMarkedForDeletion eq false
  // Expand   : $expand=to_PersonEmploymentStatus
  // Tri      : $orderby=LastName,FirstName
  // Paginer  : $top=5000&$skip=0 (ou utiliser $skiptoken BTP)
  //
  // IMPORTANT — Données GDPR/données personnelles :
  //   - Stocker un consentement DSGVO avant d'afficher les salaires
  //   - Masquer les données salariales selon le rôle XSUAA (vérification côté CAP)
  //   - Les données de salaire (PA0008) nécessitent une autorisation S/4HANA spécifique (P_ORGINCON)

  const results = await odataGet<S4Employee[]>(S4_ENDPOINTS.EMPLOYEES, {
    $filter: "EmploymentStatus ne '0'",
    $top: '5000',
  });
  return results.map(mapS4Employee);
}

export async function getEmployeesByManager(managerMatricule: string): Promise<Employee[]> {
  if (DEV) return MOCK_EMPLOYEES.filter(e => e.manager === managerMatricule && e.eligible);

  // A FAIRE — Connexion S/4HANA :
  // La hiérarchie manager→équipe passe par la table HRP1001 (OM : Relations entre postes)
  // Relation type ISOBJECT 'A002' (Belongs to org unit) ou utiliser PERNR_MANAGER
  // Alternative : RFC custom ZHR_GET_DIRECT_REPORTS(IV_PERNR = managerMatricule)
  // Ou API SuccessFactors : GET /sf/odata/v2/EmpJob?$filter=managerId eq '{managerMatricule}'
  throw new Error('A FAIRE — Connexion S/4HANA : getEmployeesByManager');
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function getCampaigns(): Promise<Campaign[]> {
  if (DEV) return MOCK_CAMPAIGNS;

  // A FAIRE — CAP Service :
  // GET /cap/odata/v4/RemunerationService/Campaigns
  // $orderby=dateDebut desc
  // $expand=workflowEtapes
  // Le filtre par périmètre utilisateur est appliqué côté CAP via @requires et @restrict
  // (lecture seule pour Manager, écriture pour DRH/RRH)

  const results = await capFetch<CAPCampaign[]>(`${CAP_ENDPOINTS.CAMPAIGNS}?$orderby=dateDebut desc`);
  return results.map(c => ({
    ...c,
    id: c.ID,
    entites: JSON.parse(c.entites ?? '[]'),
    workflowEtapes: [], // A FAIRE — CAP : expand workflowEtapes depuis l'entité associée
  })) as Campaign[];
}

export async function getCampaignById(id: string): Promise<Campaign | undefined> {
  if (DEV) return MOCK_CAMPAIGNS.find(c => c.id === id);

  // A FAIRE — CAP Service :
  // GET /cap/odata/v4/RemunerationService/Campaigns('{id}')
  // $expand=workflowEtapes,bonusEntites,reglesGpec
  const result = await capFetch<CAPCampaign>(`${CAP_ENDPOINTS.CAMPAIGNS}('${id}')?$expand=workflowEtapes`);
  return { ...result, id: result.ID, entites: JSON.parse(result.entites ?? '[]') } as Campaign;
}

export async function createCampaign(data: Omit<Campaign, 'id'>): Promise<Campaign> {
  if (DEV) {
    const newCampaign = { ...data, id: `C_${Date.now()}` } as Campaign;
    return newCampaign;
  }

  // A FAIRE — CAP Service :
  // POST /cap/odata/v4/RemunerationService/Campaigns
  // Body : { nom, type, statut: 'brouillon', enveloppe, entites: JSON.stringify(entites), ... }
  // Après création, déclencher le workflow BPA via workflowService.startWorkflow()
  // Autorisation : @requires: 'DRH' (côté CAP annotations)

  const result = await capFetch<CAPCampaign>(CAP_ENDPOINTS.CAMPAIGNS, 'POST', {
    ...data,
    entites: JSON.stringify(data.entites),
  });
  return { ...result, id: result.ID, entites: data.entites } as Campaign;
}

export async function updateCampaign(id: string, patch: Partial<Campaign>): Promise<void> {
  if (DEV) return;

  // A FAIRE — CAP Service :
  // PATCH /cap/odata/v4/RemunerationService/Campaigns('{id}')
  // Vérifier le statut courant avant modification (règle métier : pas de modif si 'cloturee')
  // Déclencher un AuditLog via CAP before-handler ou action CDS custom

  await capFetch(`${CAP_ENDPOINTS.CAMPAIGNS}('${id}')`, 'PATCH', {
    ...patch,
    entites: patch.entites ? JSON.stringify(patch.entites) : undefined,
  });
}

// ── Propositions ──────────────────────────────────────────────────────────────

export async function getPropositions(campaignId?: string): Promise<Proposition[]> {
  if (DEV) {
    return campaignId
      ? MOCK_PROPOSITIONS.filter(p => p.campaignId === campaignId)
      : MOCK_PROPOSITIONS;
  }

  // A FAIRE — CAP Service :
  // GET /cap/odata/v4/RemunerationService/Propositions
  // $filter=campaignId eq '{campaignId}'
  // $orderby=dateModification desc
  // Sécurité CAP : un Manager ne voit que ses propres propositions (@restrict)
  // Un DRH/RRH voit toutes les propositions de son périmètre

  const filter = campaignId ? `$filter=campaignId eq '${campaignId}'` : '';
  const results = await capFetch<CAPProposition[]>(
    `${CAP_ENDPOINTS.PROPOSITIONS}?${filter}&$orderby=modifiedAt desc`,
  );
  return results.map(p => ({
    id: p.ID,
    campaignId: p.campaignId,
    matricule: p.matricule,
    montant: p.montant,
    pourcentage: p.pourcentage,
    commentaire: p.commentaire,
    statut: p.statut,
    auteur: p.auteur,
    dateCreation: p.createdAt,
    dateModification: p.modifiedAt,
  }));
}

export async function upsertProposition(
  campaignId: string,
  matricule: string,
  data: { montant: number; pourcentage: number; commentaire: string },
  existingId?: string,
): Promise<Proposition> {
  if (DEV) {
    return {
      id: existingId ?? `P_${Date.now()}`,
      campaignId, matricule, statut: 'en_cours',
      auteur: 'Sophie Dupont',
      dateCreation: new Date().toISOString().slice(0, 10),
      dateModification: new Date().toISOString().slice(0, 10),
      ...data,
    };
  }

  // A FAIRE — CAP Service + Workflow BPA :
  // Si nouvelle proposition (pas d'existingId) :
  //   POST /cap/odata/v4/RemunerationService/Propositions
  //   Body : { campaignId, matricule, montant, pourcentage, commentaire, statut: 'en_cours' }
  //   Côté CAP : before-handler qui génère un AuditLog (action 'Proposition soumise')
  //   Côté BPA : si c'est la dernière proposition manquante → démarrer l'étape validation
  //
  // Si modification (existingId) :
  //   PATCH /cap/odata/v4/RemunerationService/Propositions('{existingId}')
  //   Vérifier que statut !== 'valide' avant de permettre la modification
  //   Côté BPA : notifier le valideur via tâche BPA si statut='en_attente'

  if (existingId) {
    const result = await capFetch<CAPProposition>(
      `${CAP_ENDPOINTS.PROPOSITIONS}('${existingId}')`, 'PATCH', data,
    );
    return { id: result.ID, campaignId, matricule, statut: result.statut,
      auteur: result.auteur, dateCreation: result.createdAt, dateModification: result.modifiedAt, ...data };
  }
  const result = await capFetch<CAPProposition>(CAP_ENDPOINTS.PROPOSITIONS, 'POST',
    { campaignId, matricule, ...data, statut: 'en_cours' },
  );
  return { id: result.ID, campaignId, matricule, statut: result.statut,
    auteur: result.auteur, dateCreation: result.createdAt, dateModification: result.modifiedAt, ...data };
}

export async function deleteProposition(id: string): Promise<void> {
  if (DEV) return;

  // A FAIRE — CAP Service :
  // DELETE /cap/odata/v4/RemunerationService/Propositions('{id}')
  // Vérifier que statut !== 'valide' (règle métier : pas de suppression après validation)
  // Générer un AuditLog via CAP before-handler

  await capFetch(`${CAP_ENDPOINTS.PROPOSITIONS}('${id}')`, 'DELETE');
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export async function getAuditLogs(): Promise<AuditLog[]> {
  if (DEV) return MOCK_AUDIT_LOGS;

  // A FAIRE — CAP Service :
  // GET /cap/odata/v4/RemunerationService/AuditLogs
  // $orderby=timestamp desc
  // $top=200
  // Filtré par périmètre via @restrict (RRH voit son entité, DRH voit tout)
  // Les AuditLogs sont créés côté CAP (before/after handlers), jamais depuis le frontend

  return capFetch<AuditLog[]>(`${CAP_ENDPOINTS.AUDIT_LOGS}?$orderby=timestamp desc&$top=200`);
}

export async function getAuditParams(): Promise<AuditParam[]> {
  if (DEV) return MOCK_AUDIT_PARAMS;
  // A FAIRE — CAP Service : GET /cap/odata/v4/RemunerationService/AuditParams
  return capFetch<AuditParam[]>(`${CAP_ENDPOINTS.AUDIT_PARAMS}?$orderby=timestamp desc`);
}

export async function getAuditDroits(): Promise<AuditDroit[]> {
  if (DEV) return MOCK_AUDIT_DROITS;
  // A FAIRE — CAP Service : GET /cap/odata/v4/RemunerationService/AuditDroits
  return capFetch<AuditDroit[]>(`${CAP_ENDPOINTS.AUDIT_DROITS}?$orderby=timestamp desc`);
}

export async function getBudgetEvents(campaignNom?: string): Promise<BudgetEvent[]> {
  if (DEV) return campaignNom ? MOCK_BUDGET_EVENTS.filter(e => e.campagne === campaignNom) : MOCK_BUDGET_EVENTS;
  const filter = campaignNom ? `$filter=campagne eq '${encodeURIComponent(campaignNom)}'` : '';
  return capFetch<BudgetEvent[]>(`${CAP_ENDPOINTS.BUDGET_EVENTS}?${filter}&$orderby=timestamp desc`);
}

// ── Users applicatifs ─────────────────────────────────────────────────────────

export async function getAppUsers(): Promise<AppUser[]> {
  if (DEV) return MOCK_APP_USERS;

  // A FAIRE — CAP Service + XSUAA :
  // GET /cap/odata/v4/RemunerationService/AppUsers
  // La liste des utilisateurs applicatifs peut venir :
  //   Option A : CAP entity AppUsers (maintenu manuellement par SIRH)
  //   Option B : XSUAA Shadow Users API : GET /sap/rest/authorization/v2/users
  //              (nécessite scope xs_user.read dans xs-security.json)
  //   Option C : IAS Users API (SAP Identity Authentication Service)

  return capFetch<AppUser[]>(CAP_ENDPOINTS.APP_USERS);
}

// ── Reporting ─────────────────────────────────────────────────────────────────

export async function getGenderEquityData() {
  if (DEV) return MOCK_GENDER_EQUITY;

  // A FAIRE — CAP Service ou S/4HANA :
  // Vue analytique custom dans CAP (CDS View) agrégeant les salaires PA0008 par grade et genre
  // Alternative : utiliser SAP Analytics Cloud embedded analytics
  // ou une CDS Analytical View exposée via /sap/opu/odata/sap/REMUN_EQUITY_SRV

  throw new Error('A FAIRE — Connexion S/4HANA : getGenderEquityData via vue analytique');
}

export async function getBudgetByEntity() {
  if (DEV) return MOCK_BUDGET_BY_ENTITY;

  // A FAIRE — CAP Service :
  // Vue CDS calculant la consommation par entité depuis les Campaigns + Propositions
  // GET /cap/odata/v4/RemunerationService/BudgetByEntity

  throw new Error('A FAIRE — CAP Service : getBudgetByEntity via vue CDS agrégée');
}
