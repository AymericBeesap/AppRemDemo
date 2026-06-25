/**
 * mockData.ts — Données de démonstration (DEV uniquement).
 *
 * A FAIRE — Connexion SAP : toutes les données de ce fichier sont des données mock.
 * En production BTP, elles doivent être remplacées par des appels aux services réels :
 *
 *  employees[]   → getEmployees() / getEmployeesByManager()  in src/services/api.ts
 *                  Source : S/4HANA API_EMPLOYEE_SRV + PA0008 (salaire)
 *                  ou SuccessFactors Employee Central (EmpJob, EmpPayCompensation)
 *
 *  campaigns[]   → getCampaigns() / getCampaignById()        in src/services/api.ts
 *                  Source : CAP service (table Campaigns, OData V4)
 *
 *  propositions  → getPropositions() / upsertProposition()   in src/services/api.ts
 *                  Source : CAP service (table Propositions, OData V4)
 *
 *  audit*        → getAuditLogs() / getAuditParams()         in src/services/api.ts
 *                  Source : CAP service (table AuditLogs, append-only)
 *
 * Les interfaces TypeScript (Employee, Campaign, etc.) définies dans ce fichier
 * restent en place — elles sont le contrat interne de l'application.
 * Seules les données exportées (employees, campaigns, etc.) sont mock.
 *
 * Voir src/services/api.ts pour l'implémentation complète DEV/PROD.
 */

export type Role = 'SIRH' | 'DRH' | 'RRH' | 'Directeur' | 'Manager';
export type CampaignType = 'augmentation' | 'bonus' | 'gpec';
export type CampaignStatus = 'brouillon' | 'ouverte' | 'en_validation' | 'cloturee';
export type WorkflowStatus = 'en_attente' | 'en_cours' | 'valide' | 'rejete';
export type Gender = 'M' | 'F';

export interface Employee {
  matricule: string;
  nom: string;
  prenom: string;
  genre: Gender;
  entite: string;
  division: string;
  manager: string;
  directeur: string;
  grade: string;
  echelon: number;
  dateEntree: string;
  anciennete: number;
  salaireActuel: number;
  historiqueRemuneration: { annee: number; salaire: number; augmentation: number; bonus: number }[];
  eligible: boolean;
}

export interface Campaign {
  id: string;
  nom: string;
  type: CampaignType;
  statut: CampaignStatus;
  dateDebut: string;
  dateFin: string;
  enveloppe: number;
  consomme: number;
  population: number;
  entites: string[];
  workflowEtapes: WorkflowEtape[];
  // GPEC
  reglesGpec?: RegleGpec[];
  // Bonus
  bonusEntites?: BonusEntite[];
  calendrierBonus?: CalendrierBonus[];
}

export interface WorkflowEtape {
  ordre: number;
  role: Role;
  libelle: string;
  statut: WorkflowStatus;
  responsable?: string;
  dateAction?: string;
  commentaire?: string;
}

export interface Proposition {
  id: string;
  campaignId: string;
  matricule: string;
  montant: number;
  pourcentage: number;
  commentaire: string;
  statut: WorkflowStatus;
  auteur: string;
  dateCreation: string;
  dateModification: string;
}

export interface RegleGpec {
  grade: string;
  echelon: number;
  avancementAuto: boolean;
  tauxAvancement: number;
  accelerationPossible: boolean;
  tauxAcceleration: number;
  conditionAnciennete: number;
  nbEligibles: number;
}

export interface BonusEntite {
  entite: string;
  enveloppe: number;
  consomme: number;
  population: number;
  statut: WorkflowStatus;
  responsableRRH: string;
}

export interface CalendrierBonus {
  etape: string;
  dateDebut: string;
  dateFin: string;
  responsable: string;
  statut: WorkflowStatus;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  utilisateur: string;
  role: Role;
  action: string;
  entite: string;
  details: string;
  categorie: 'general' | 'parametres' | 'droits' | 'enveloppe';
}

export interface AuditParam {
  id: string;
  timestamp: string;
  utilisateur: string;
  campagne: string;
  champ: string;
  ancienneValeur: string;
  nouvelleValeur: string;
}

export interface AuditDroit {
  id: string;
  timestamp: string;
  operateur: string;
  utilisateurCible: string;
  ancienRole: string;
  nouveauRole: string;
  ancienPerimetre: string;
  nouveauPerimetre: string;
}

export interface BudgetEvent {
  id: string;
  timestamp: string;
  campagne: string;
  entite: string;
  type: 'allocation' | 'consommation' | 'arbitrage' | 'alerte';
  montant: number;
  utilisateur: string;
  details: string;
}

export interface AppUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  entite: string;
  perimetre: string[];
  actif: boolean;
  derniereConnexion: string;
}

export interface CurrentUser {
  nom: string;
  prenom: string;
  role: Role;
  entite: string;
  matricule: string;
}

// ─── Données mockées ───────────────────────────────────────────────────────

export const currentUser: CurrentUser = {
  nom: 'Dupont',
  prenom: 'Sophie',
  role: 'DRH',
  entite: 'Groupe Horizon',
  matricule: 'M00001',
};

export const employees: Employee[] = [
  {
    matricule: 'E001', nom: 'Martin', prenom: 'Alice', genre: 'F',
    entite: 'Groupe Horizon', division: 'Finance', manager: 'E010', directeur: 'E020',
    grade: 'P3', echelon: 2, dateEntree: '2018-03-15', anciennete: 8,
    salaireActuel: 52000,
    historiqueRemuneration: [
      { annee: 2023, salaire: 48000, augmentation: 2000, bonus: 3500 },
      { annee: 2024, salaire: 50000, augmentation: 2000, bonus: 4000 },
      { annee: 2025, salaire: 52000, augmentation: 2000, bonus: 4500 },
    ],
    eligible: true,
  },
  {
    matricule: 'E002', nom: 'Bernard', prenom: 'Luc', genre: 'M',
    entite: 'Groupe Horizon', division: 'Finance', manager: 'E010', directeur: 'E020',
    grade: 'P3', echelon: 3, dateEntree: '2016-09-01', anciennete: 10,
    salaireActuel: 58000,
    historiqueRemuneration: [
      { annee: 2023, salaire: 54000, augmentation: 2500, bonus: 5000 },
      { annee: 2024, salaire: 56000, augmentation: 2000, bonus: 5500 },
      { annee: 2025, salaire: 58000, augmentation: 2000, bonus: 6000 },
    ],
    eligible: true,
  },
  {
    matricule: 'E003', nom: 'Leroy', prenom: 'Camille', genre: 'F',
    entite: 'Groupe Horizon', division: 'RH', manager: 'E011', directeur: 'E020',
    grade: 'P2', echelon: 1, dateEntree: '2021-06-14', anciennete: 5,
    salaireActuel: 42000,
    historiqueRemuneration: [
      { annee: 2023, salaire: 39000, augmentation: 1500, bonus: 2000 },
      { annee: 2024, salaire: 40500, augmentation: 1500, bonus: 2200 },
      { annee: 2025, salaire: 42000, augmentation: 1500, bonus: 2500 },
    ],
    eligible: true,
  },
  {
    matricule: 'E004', nom: 'Moreau', prenom: 'Thomas', genre: 'M',
    entite: 'Horizon France', division: 'IT', manager: 'E012', directeur: 'E021',
    grade: 'P4', echelon: 1, dateEntree: '2020-01-07', anciennete: 6,
    salaireActuel: 61000,
    historiqueRemuneration: [
      { annee: 2023, salaire: 57000, augmentation: 2000, bonus: 6000 },
      { annee: 2024, salaire: 59000, augmentation: 2000, bonus: 6500 },
      { annee: 2025, salaire: 61000, augmentation: 2000, bonus: 7000 },
    ],
    eligible: true,
  },
  {
    matricule: 'E005', nom: 'Simon', prenom: 'Nathalie', genre: 'F',
    entite: 'Horizon France', division: 'IT', manager: 'E012', directeur: 'E021',
    grade: 'P4', echelon: 2, dateEntree: '2019-04-22', anciennete: 7,
    salaireActuel: 65000,
    historiqueRemuneration: [
      { annee: 2023, salaire: 61000, augmentation: 2500, bonus: 7000 },
      { annee: 2024, salaire: 63000, augmentation: 2000, bonus: 7500 },
      { annee: 2025, salaire: 65000, augmentation: 2000, bonus: 8000 },
    ],
    eligible: true,
  },
  {
    matricule: 'E006', nom: 'Laurent', prenom: 'Pierre', genre: 'M',
    entite: 'Groupe Horizon', division: 'Commercial', manager: 'E013', directeur: 'E022',
    grade: 'P2', echelon: 2, dateEntree: '2022-09-05', anciennete: 4,
    salaireActuel: 44000,
    historiqueRemuneration: [
      { annee: 2023, salaire: 41000, augmentation: 1200, bonus: 2500 },
      { annee: 2024, salaire: 42500, augmentation: 1500, bonus: 3000 },
      { annee: 2025, salaire: 44000, augmentation: 1500, bonus: 3500 },
    ],
    eligible: true,
  },
  {
    matricule: 'E007', nom: 'Petit', prenom: 'Julie', genre: 'F',
    entite: 'Groupe Horizon', division: 'Commercial', manager: 'E013', directeur: 'E022',
    grade: 'P2', echelon: 2, dateEntree: '2022-01-10', anciennete: 4,
    salaireActuel: 43000,
    historiqueRemuneration: [
      { annee: 2023, salaire: 40000, augmentation: 1200, bonus: 2500 },
      { annee: 2024, salaire: 41500, augmentation: 1500, bonus: 2800 },
      { annee: 2025, salaire: 43000, augmentation: 1500, bonus: 3000 },
    ],
    eligible: true,
  },
  {
    matricule: 'E008', nom: 'Dubois', prenom: 'Marc', genre: 'M',
    entite: 'Horizon Rail', division: 'Opérations', manager: 'E014', directeur: 'E023',
    grade: 'P1', echelon: 3, dateEntree: '2015-11-03', anciennete: 11,
    salaireActuel: 38000,
    historiqueRemuneration: [
      { annee: 2023, salaire: 36000, augmentation: 800, bonus: 1500 },
      { annee: 2024, salaire: 37000, augmentation: 1000, bonus: 1800 },
      { annee: 2025, salaire: 38000, augmentation: 1000, bonus: 2000 },
    ],
    eligible: true,
  },
  {
    matricule: 'E009', nom: 'Garcia', prenom: 'Elena', genre: 'F',
    entite: 'Horizon Rail', division: 'Opérations', manager: 'E014', directeur: 'E023',
    grade: 'P1', echelon: 2, dateEntree: '2017-07-18', anciennete: 9,
    salaireActuel: 36500,
    historiqueRemuneration: [
      { annee: 2023, salaire: 34500, augmentation: 800, bonus: 1200 },
      { annee: 2024, salaire: 35500, augmentation: 1000, bonus: 1500 },
      { annee: 2025, salaire: 36500, augmentation: 1000, bonus: 1800 },
    ],
    eligible: true,
  },
  {
    matricule: 'E010', nom: 'Rousseau', prenom: 'Philippe', genre: 'M',
    entite: 'Groupe Horizon', division: 'Finance', manager: 'E020', directeur: 'E020',
    grade: 'M1', echelon: 2, dateEntree: '2013-02-01', anciennete: 13,
    salaireActuel: 78000,
    historiqueRemuneration: [
      { annee: 2023, salaire: 73000, augmentation: 2500, bonus: 10000 },
      { annee: 2024, salaire: 75500, augmentation: 2500, bonus: 11000 },
      { annee: 2025, salaire: 78000, augmentation: 2500, bonus: 12000 },
    ],
    eligible: false,
  },
  {
    matricule: 'E011', nom: 'Mercier', prenom: 'Claire', genre: 'F',
    entite: 'Groupe Horizon', division: 'RH', manager: 'E020', directeur: 'E020',
    grade: 'M1', echelon: 1, dateEntree: '2015-05-20', anciennete: 11,
    salaireActuel: 72000,
    historiqueRemuneration: [
      { annee: 2023, salaire: 67000, augmentation: 2500, bonus: 8000 },
      { annee: 2024, salaire: 69500, augmentation: 2500, bonus: 9000 },
      { annee: 2025, salaire: 72000, augmentation: 2500, bonus: 10000 },
    ],
    eligible: false,
  },
];

export const campaigns: Campaign[] = [
  {
    id: 'C001',
    nom: 'Augmentations individuelles 2026',
    type: 'augmentation',
    statut: 'ouverte',
    dateDebut: '2026-02-01',
    dateFin: '2026-03-31',
    enveloppe: 450000,
    consomme: 287500,
    population: 4005,
    entites: ['Groupe Horizon', 'Horizon France', 'Horizon Rail'],
    workflowEtapes: [
      { ordre: 1, role: 'Manager', libelle: 'Saisie des propositions', statut: 'valide', responsable: 'Managers', dateAction: '2026-02-15' },
      { ordre: 2, role: 'Directeur', libelle: 'Validation directeur', statut: 'en_cours', responsable: 'Directeurs' },
      { ordre: 3, role: 'RRH', libelle: 'Validation RRH', statut: 'en_attente', responsable: 'RRH' },
      { ordre: 4, role: 'DRH', libelle: 'Validation DRH groupe', statut: 'en_attente', responsable: 'DRH' },
    ],
  },
  {
    id: 'C002',
    nom: 'Campagne Bonus 2025',
    type: 'bonus',
    statut: 'cloturee',
    dateDebut: '2026-01-15',
    dateFin: '2026-02-28',
    enveloppe: 620000,
    consomme: 598400,
    population: 3820,
    entites: ['Groupe Horizon', 'Horizon France', 'Horizon Rail'],
    workflowEtapes: [
      { ordre: 1, role: 'Manager', libelle: 'Saisie des bonus', statut: 'valide', responsable: 'Managers', dateAction: '2026-02-01' },
      { ordre: 2, role: 'Directeur', libelle: 'Validation directeur', statut: 'valide', responsable: 'Directeurs', dateAction: '2026-02-15' },
      { ordre: 3, role: 'DRH', libelle: 'Validation DRH', statut: 'valide', responsable: 'DRH', dateAction: '2026-02-28' },
    ],
    bonusEntites: [
      { entite: 'Groupe Horizon', enveloppe: 310000, consomme: 298200, population: 1890, statut: 'valide', responsableRRH: 'Marie Lefort' },
      { entite: 'Horizon France', enveloppe: 200000, consomme: 193600, population: 1240, statut: 'valide', responsableRRH: 'Jean Moriel' },
      { entite: 'Horizon Rail', enveloppe: 110000, consomme: 106600, population: 690, statut: 'valide', responsableRRH: 'Anne Tissot' },
    ],
    calendrierBonus: [
      { etape: 'Ouverture saisie managers', dateDebut: '2026-01-15', dateFin: '2026-02-01', responsable: 'Managers', statut: 'valide' },
      { etape: 'Validation directeurs', dateDebut: '2026-02-02', dateFin: '2026-02-15', responsable: 'Directeurs', statut: 'valide' },
      { etape: 'Consolidation RRH', dateDebut: '2026-02-16', dateFin: '2026-02-22', responsable: 'RRH', statut: 'valide' },
      { etape: 'Arbitrage et validation DRH', dateDebut: '2026-02-23', dateFin: '2026-02-28', responsable: 'DRH', statut: 'valide' },
    ],
  },
  {
    id: 'C003',
    nom: 'GPEC par grade – Juin 2026',
    type: 'gpec',
    statut: 'brouillon',
    dateDebut: '2026-06-01',
    dateFin: '2026-07-31',
    enveloppe: 180000,
    consomme: 0,
    population: 1250,
    entites: ['Groupe Horizon'],
    workflowEtapes: [
      { ordre: 1, role: 'Manager', libelle: 'Propositions avancement', statut: 'en_attente', responsable: 'Managers' },
      { ordre: 2, role: 'RRH', libelle: 'Validation RRH', statut: 'en_attente', responsable: 'RRH' },
      { ordre: 3, role: 'DRH', libelle: 'Arbitrage DRH', statut: 'en_attente', responsable: 'DRH' },
    ],
    reglesGpec: [
      { grade: 'P1', echelon: 1, avancementAuto: true,  tauxAvancement: 2.5, accelerationPossible: false, tauxAcceleration: 0,   conditionAnciennete: 2, nbEligibles: 98  },
      { grade: 'P1', echelon: 2, avancementAuto: true,  tauxAvancement: 2.5, accelerationPossible: false, tauxAcceleration: 0,   conditionAnciennete: 2, nbEligibles: 87  },
      { grade: 'P1', echelon: 3, avancementAuto: false, tauxAvancement: 2.0, accelerationPossible: true,  tauxAcceleration: 3.5, conditionAnciennete: 3, nbEligibles: 64  },
      { grade: 'P2', echelon: 1, avancementAuto: true,  tauxAvancement: 2.5, accelerationPossible: false, tauxAcceleration: 0,   conditionAnciennete: 2, nbEligibles: 142 },
      { grade: 'P2', echelon: 2, avancementAuto: true,  tauxAvancement: 2.5, accelerationPossible: true,  tauxAcceleration: 4.0, conditionAnciennete: 2, nbEligibles: 115 },
      { grade: 'P2', echelon: 3, avancementAuto: false, tauxAvancement: 2.0, accelerationPossible: true,  tauxAcceleration: 4.0, conditionAnciennete: 3, nbEligibles: 89  },
      { grade: 'P3', echelon: 1, avancementAuto: true,  tauxAvancement: 3.0, accelerationPossible: false, tauxAcceleration: 0,   conditionAnciennete: 2, nbEligibles: 178 },
      { grade: 'P3', echelon: 2, avancementAuto: false, tauxAvancement: 2.5, accelerationPossible: true,  tauxAcceleration: 4.5, conditionAnciennete: 3, nbEligibles: 134 },
      { grade: 'P4', echelon: 1, avancementAuto: false, tauxAvancement: 3.0, accelerationPossible: true,  tauxAcceleration: 5.0, conditionAnciennete: 3, nbEligibles: 201 },
      { grade: 'P4', echelon: 2, avancementAuto: false, tauxAvancement: 2.5, accelerationPossible: true,  tauxAcceleration: 5.0, conditionAnciennete: 4, nbEligibles: 142 },
    ],
  },
];

export const propositions: Proposition[] = [
  {
    id: 'P001', campaignId: 'C001', matricule: 'E001',
    montant: 2600, pourcentage: 5.0, commentaire: 'Excellente performance, prise de responsabilité.',
    statut: 'valide', auteur: 'Philippe Rousseau', dateCreation: '2026-02-10', dateModification: '2026-02-15',
  },
  {
    id: 'P002', campaignId: 'C001', matricule: 'E002',
    montant: 2320, pourcentage: 4.0, commentaire: 'Bonne performance constante.',
    statut: 'en_cours', auteur: 'Philippe Rousseau', dateCreation: '2026-02-12', dateModification: '2026-02-12',
  },
  {
    id: 'P003', campaignId: 'C001', matricule: 'E003',
    montant: 1680, pourcentage: 4.0, commentaire: 'Montée en compétences RH.',
    statut: 'en_cours', auteur: 'Claire Mercier', dateCreation: '2026-02-11', dateModification: '2026-02-11',
  },
  {
    id: 'P004', campaignId: 'C001', matricule: 'E004',
    montant: 3660, pourcentage: 6.0, commentaire: 'Lead technique, projet stratégique livré.',
    statut: 'en_attente', auteur: 'Eric Lambert', dateCreation: '2026-02-13', dateModification: '2026-02-13',
  },
  {
    id: 'P005', campaignId: 'C001', matricule: 'E005',
    montant: 3250, pourcentage: 5.0, commentaire: 'Architecture Cloud, expertise reconnue.',
    statut: 'en_attente', auteur: 'Eric Lambert', dateCreation: '2026-02-13', dateModification: '2026-02-13',
  },
  // Bonus C002
  {
    id: 'P006', campaignId: 'C002', matricule: 'E001',
    montant: 4500, pourcentage: 0, commentaire: 'Objectifs atteints à 110%.',
    statut: 'valide', auteur: 'Philippe Rousseau', dateCreation: '2026-01-20', dateModification: '2026-02-28',
  },
  {
    id: 'P007', campaignId: 'C002', matricule: 'E002',
    montant: 6000, pourcentage: 0, commentaire: 'Excellent résultat annuel.',
    statut: 'valide', auteur: 'Philippe Rousseau', dateCreation: '2026-01-20', dateModification: '2026-02-28',
  },
  {
    id: 'P008', campaignId: 'C002', matricule: 'E004',
    montant: 7000, pourcentage: 0, commentaire: 'Livraison projet phare dans les délais.',
    statut: 'valide', auteur: 'Eric Lambert', dateCreation: '2026-01-22', dateModification: '2026-02-28',
  },
];

export const auditLogs: AuditLog[] = [
  { id: 'A001', timestamp: '2026-02-01T09:00:00', utilisateur: 'Sophie Dupont', role: 'DRH', action: 'Création campagne', entite: 'Groupe Horizon', details: 'Campagne "Augmentations individuelles 2026" créée', categorie: 'general' },
  { id: 'A002', timestamp: '2026-02-10T10:30:00', utilisateur: 'Philippe Rousseau', role: 'Manager', action: 'Proposition soumise', entite: 'Finance', details: 'Proposition P001 soumise pour E001 – +5,0%', categorie: 'general' },
  { id: 'A003', timestamp: '2026-02-12T14:15:00', utilisateur: 'Philippe Rousseau', role: 'Manager', action: 'Proposition soumise', entite: 'Finance', details: 'Proposition P002 soumise pour E002 – +4,0%', categorie: 'general' },
  { id: 'A004', timestamp: '2026-02-15T11:00:00', utilisateur: 'Philippe Rousseau', role: 'Directeur', action: 'Validation', entite: 'Finance', details: 'Proposition P001 validée par le directeur', categorie: 'general' },
  { id: 'A005', timestamp: '2026-02-28T17:45:00', utilisateur: 'Sophie Dupont', role: 'DRH', action: 'Clôture campagne', entite: 'Groupe Horizon', details: 'Campagne Bonus 2025 clôturée – 598 400 € consommés', categorie: 'general' },
  { id: 'A006', timestamp: '2026-02-11T09:12:00', utilisateur: 'Claire Mercier', role: 'Manager', action: 'Proposition soumise', entite: 'RH', details: 'Proposition P003 soumise pour E003 – +4,0%', categorie: 'general' },
  { id: 'A007', timestamp: '2026-02-13T15:30:00', utilisateur: 'Eric Lambert', role: 'Manager', action: 'Proposition soumise', entite: 'IT', details: 'Propositions P004 et P005 soumises pour équipe IT', categorie: 'general' },
  { id: 'A008', timestamp: '2026-02-18T10:00:00', utilisateur: 'Sophie Dupont', role: 'DRH', action: 'Ouverture campagne GPEC', entite: 'Groupe Horizon', details: 'Campagne GPEC Juin 2026 paramétrée', categorie: 'general' },
  { id: 'A009', timestamp: '2026-02-20T14:22:00', utilisateur: 'Marie Lefort', role: 'RRH', action: 'Consultation données', entite: 'Horizon France', details: 'Export liste collaborateurs Horizon France – 312 enregistrements', categorie: 'general' },
  { id: 'A010', timestamp: '2026-03-01T09:00:00', utilisateur: 'System', role: 'SIRH', action: 'Import automatique', entite: 'Groupe Horizon', details: 'Import SAP – mise à jour de 4 005 collaborateurs', categorie: 'general' },
];

export const auditParams: AuditParam[] = [
  { id: 'AP001', timestamp: '2026-02-01T09:05:00', utilisateur: 'Sophie Dupont', campagne: 'Augmentations individuelles 2026', champ: 'Enveloppe totale', ancienneValeur: '400 000 €', nouvelleValeur: '450 000 €' },
  { id: 'AP002', timestamp: '2026-02-01T09:10:00', utilisateur: 'Sophie Dupont', campagne: 'Augmentations individuelles 2026', champ: 'Date de fin', ancienneValeur: '2026-03-15', nouvelleValeur: '2026-03-31' },
  { id: 'AP003', timestamp: '2026-02-03T14:00:00', utilisateur: 'Sophie Dupont', campagne: 'Augmentations individuelles 2026', champ: 'Entités incluses', ancienneValeur: 'Groupe Horizon, Horizon France', nouvelleValeur: 'Groupe Horizon, Horizon France, Horizon Rail' },
  { id: 'AP004', timestamp: '2026-02-05T11:30:00', utilisateur: 'Thomas Renard', campagne: 'Augmentations individuelles 2026', champ: 'Règle éligibilité ancienneté', ancienneValeur: '12 mois', nouvelleValeur: '6 mois' },
  { id: 'AP005', timestamp: '2026-01-10T10:00:00', utilisateur: 'Sophie Dupont', campagne: 'Campagne Bonus 2025', champ: 'Enveloppe Groupe Horizon', ancienneValeur: '280 000 €', nouvelleValeur: '310 000 €' },
  { id: 'AP006', timestamp: '2026-05-20T15:00:00', utilisateur: 'Thomas Renard', campagne: 'GPEC par grade – Juin 2026', champ: 'Taux avancement P3 Éch.2', ancienneValeur: '3,0 %', nouvelleValeur: '2,5 %' },
];

export const auditDroits: AuditDroit[] = [
  { id: 'AD001', timestamp: '2025-12-01T10:00:00', operateur: 'Thomas Renard', utilisateurCible: 'Marie Lefort', ancienRole: 'Manager', nouveauRole: 'RRH', ancienPerimetre: 'Horizon France', nouveauPerimetre: 'Horizon France' },
  { id: 'AD002', timestamp: '2026-01-05T09:00:00', operateur: 'Sophie Dupont', utilisateurCible: 'Jean Moriel', ancienRole: 'RRH', nouveauRole: 'RRH', ancienPerimetre: 'Groupe Horizon', nouveauPerimetre: 'Horizon France' },
  { id: 'AD003', timestamp: '2026-01-15T14:30:00', operateur: 'Thomas Renard', utilisateurCible: 'Eric Lambert', ancienRole: 'Manager', nouveauRole: 'Directeur', ancienPerimetre: 'IT – Horizon France', nouveauPerimetre: 'IT – Horizon France' },
  { id: 'AD004', timestamp: '2026-02-10T11:00:00', operateur: 'Thomas Renard', utilisateurCible: 'Lucie Masson', ancienRole: '–', nouveauRole: 'Manager', ancienPerimetre: '–', nouveauPerimetre: 'Commercial – Groupe Horizon' },
  { id: 'AD005', timestamp: '2026-03-01T16:00:00', operateur: 'Sophie Dupont', utilisateurCible: 'Anne Tissot', ancienRole: 'Manager', nouveauRole: 'RRH', ancienPerimetre: 'Opérations – Horizon Rail', nouveauPerimetre: 'Horizon Rail' },
];

export const budgetEvents: BudgetEvent[] = [
  { id: 'BE001', timestamp: '2026-02-01T09:00:00', campagne: 'Augmentations individuelles 2026', entite: 'Groupe Horizon',   type: 'allocation',    montant: 450000, utilisateur: 'Sophie Dupont',  details: 'Enveloppe initiale allouée' },
  { id: 'BE002', timestamp: '2026-02-10T10:30:00', campagne: 'Augmentations individuelles 2026', entite: 'Groupe Horizon',   type: 'consommation',  montant: 2600,   utilisateur: 'Philippe Rousseau', details: 'Proposition P001 – Alice Martin +5,0%' },
  { id: 'BE003', timestamp: '2026-02-11T09:12:00', campagne: 'Augmentations individuelles 2026', entite: 'Groupe Horizon',   type: 'consommation',  montant: 1680,   utilisateur: 'Claire Mercier', details: 'Proposition P003 – Camille Leroy +4,0%' },
  { id: 'BE004', timestamp: '2026-02-12T14:15:00', campagne: 'Augmentations individuelles 2026', entite: 'Groupe Horizon',   type: 'consommation',  montant: 2320,   utilisateur: 'Philippe Rousseau', details: 'Proposition P002 – Luc Bernard +4,0%' },
  { id: 'BE005', timestamp: '2026-02-13T15:30:00', campagne: 'Augmentations individuelles 2026', entite: 'Horizon France',  type: 'consommation',  montant: 6910,   utilisateur: 'Eric Lambert', details: 'Propositions P004+P005 – IT Horizon France' },
  { id: 'BE006', timestamp: '2026-02-20T11:00:00', campagne: 'Augmentations individuelles 2026', entite: 'Horizon France',  type: 'alerte',        montant: 87500,  utilisateur: 'System', details: 'Alerte 80% enveloppe Horizon France atteinte' },
  { id: 'BE007', timestamp: '2026-02-22T14:00:00', campagne: 'Augmentations individuelles 2026', entite: 'Horizon France',  type: 'arbitrage',     montant: 5000,   utilisateur: 'Sophie Dupont', details: 'Arbitrage DRH – enveloppe Horizon France augmentée de 5 000 €' },
  { id: 'BE008', timestamp: '2026-01-15T09:00:00', campagne: 'Campagne Bonus 2025',              entite: 'Groupe Horizon',   type: 'allocation',    montant: 620000, utilisateur: 'Sophie Dupont', details: 'Enveloppe bonus allouée (3 entités)' },
  { id: 'BE009', timestamp: '2026-02-28T17:45:00', campagne: 'Campagne Bonus 2025',              entite: 'Groupe Horizon',   type: 'consommation',  montant: 598400, utilisateur: 'System', details: 'Consolidation finale – 598 400 € distribués' },
];

export const appUsers: AppUser[] = [
  { id: 'U001', nom: 'Dupont',   prenom: 'Sophie',   email: 'sophie.dupont@horizon-group.fr',   role: 'DRH',      entite: 'Groupe Horizon', perimetre: ['Groupe Horizon', 'Horizon France', 'Horizon Rail'], actif: true,  derniereConnexion: '2026-06-18T08:30:00' },
  { id: 'U002', nom: 'Renard',   prenom: 'Thomas',   email: 'thomas.renard@horizon-group.fr',   role: 'SIRH',     entite: 'Groupe Horizon', perimetre: ['Groupe Horizon', 'Horizon France', 'Horizon Rail'], actif: true,  derniereConnexion: '2026-06-17T17:45:00' },
  { id: 'U003', nom: 'Lefort',   prenom: 'Marie',    email: 'marie.lefort@horizon-group.fr',    role: 'RRH',      entite: 'Horizon France', perimetre: ['Horizon France'],                         actif: true,  derniereConnexion: '2026-06-18T09:00:00' },
  { id: 'U004', nom: 'Moriel',   prenom: 'Jean',     email: 'jean.moriel@horizon-france.fr',    role: 'RRH',      entite: 'Horizon France', perimetre: ['Horizon France'],                         actif: true,  derniereConnexion: '2026-06-15T11:20:00' },
  { id: 'U005', nom: 'Tissot',   prenom: 'Anne',     email: 'anne.tissot@horizon-rail.fr',    role: 'RRH',      entite: 'Horizon Rail', perimetre: ['Horizon Rail'],                         actif: true,  derniereConnexion: '2026-06-16T14:10:00' },
  { id: 'U006', nom: 'Rousseau', prenom: 'Philippe', email: 'ph.rousseau@horizon-group.fr',     role: 'Directeur', entite: 'Groupe Horizon', perimetre: ['Finance – Groupe Horizon'],                actif: true,  derniereConnexion: '2026-06-18T07:55:00' },
  { id: 'U007', nom: 'Lambert',  prenom: 'Eric',     email: 'e.lambert@horizon-france.fr',      role: 'Directeur', entite: 'Horizon France', perimetre: ['IT – Horizon France'],                   actif: true,  derniereConnexion: '2026-06-17T16:30:00' },
  { id: 'U008', nom: 'Mercier',  prenom: 'Claire',   email: 'c.mercier@horizon-group.fr',       role: 'Manager',  entite: 'Groupe Horizon', perimetre: ['RH – Groupe Horizon'],                     actif: true,  derniereConnexion: '2026-06-18T08:10:00' },
  { id: 'U009', nom: 'Masson',   prenom: 'Lucie',    email: 'l.masson@horizon-group.fr',        role: 'Manager',  entite: 'Groupe Horizon', perimetre: ['Commercial – Groupe Horizon'],              actif: true,  derniereConnexion: '2026-06-14T10:45:00' },
  { id: 'U010', nom: 'Blanc',    prenom: 'David',    email: 'd.blanc@horizon-rail.fr',        role: 'Manager',  entite: 'Horizon Rail', perimetre: ['Opérations – Horizon Rail'],            actif: false, derniereConnexion: '2026-05-20T09:00:00' },
];

export type TaskUrgence = 'normale' | 'urgente' | 'critique';
export type TaskType = 'saisie' | 'validation' | 'arbitrage' | 'consolidation' | 'admin' | 'parametrage';

export interface WorkflowTask {
  id: string;
  titre: string;
  description: string;
  urgence: TaskUrgence;
  echeance: string;
  lien: string;
  type: TaskType;
  rolesEligibles: Role[];
  // Pour filtrage par périmètre (optionnel)
  entite?: string;
  campaignId?: string;
  nbItems?: number;
}

export const workflowTasks: WorkflowTask[] = [
  // ── Manager ──────────────────────────────────────────────────────────────
  {
    id: 'T001',
    titre: 'Saisir les propositions – Augmentations 2026',
    description: '3 collaborateurs de votre équipe sont encore sans proposition.',
    urgence: 'urgente',
    echeance: '2026-03-31',
    lien: '/campaigns/C001',
    type: 'saisie',
    rolesEligibles: ['Manager'],
    campaignId: 'C001',
    nbItems: 3,
  },
  {
    id: 'T002',
    titre: 'Préparer les propositions GPEC',
    description: 'La campagne GPEC Juin 2026 ouvrira le 01/06. Anticipez les propositions d\'avancement de votre équipe.',
    urgence: 'normale',
    echeance: '2026-06-14',
    lien: '/campaigns/C003',
    type: 'saisie',
    rolesEligibles: ['Manager'],
    campaignId: 'C003',
  },

  // ── Directeur ─────────────────────────────────────────────────────────────
  {
    id: 'T003',
    titre: 'Valider les propositions d\'augmentation',
    description: '3 propositions soumises par vos managers sont en attente de votre validation.',
    urgence: 'urgente',
    echeance: '2026-03-15',
    lien: '/campaigns/C001',
    type: 'validation',
    rolesEligibles: ['Directeur'],
    campaignId: 'C001',
    nbItems: 3,
  },
  {
    id: 'T004',
    titre: 'Alerte budget – Horizon France dépasse 80 %',
    description: 'L\'enveloppe Augmentations de Horizon France est consommée à 88 %. Un arbitrage peut être nécessaire.',
    urgence: 'critique',
    echeance: '2026-03-10',
    lien: '/campaigns/C001',
    type: 'arbitrage',
    rolesEligibles: ['Directeur'],
    campaignId: 'C001',
  },

  // ── RRH ──────────────────────────────────────────────────────────────────
  {
    id: 'T005',
    titre: 'Consolider les propositions – Horizon France',
    description: 'Les managers de Horizon France ont terminé leur saisie. Consolidez et validez avant transmission au DRH.',
    urgence: 'urgente',
    echeance: '2026-03-20',
    lien: '/campaigns/C001',
    type: 'consolidation',
    rolesEligibles: ['RRH'],
    entite: 'Horizon France',
    campaignId: 'C001',
    nbItems: 2,
  },
  {
    id: 'T006',
    titre: 'Vérifier l\'éligibilité GPEC – population à importer',
    description: 'La population GPEC Juin 2026 n\'a pas encore été importée pour votre périmètre.',
    urgence: 'normale',
    echeance: '2026-05-25',
    lien: '/campaigns/C003',
    type: 'parametrage',
    rolesEligibles: ['RRH'],
    campaignId: 'C003',
  },

  // ── DRH ──────────────────────────────────────────────────────────────────
  {
    id: 'T007',
    titre: 'Validation finale – Augmentations individuelles 2026',
    description: 'Les RRH ont consolidé. La campagne attend votre validation finale avant clôture.',
    urgence: 'urgente',
    echeance: '2026-03-31',
    lien: '/campaigns/C001',
    type: 'validation',
    rolesEligibles: ['DRH'],
    campaignId: 'C001',
  },
  {
    id: 'T008',
    titre: 'Arbitrage budgétaire – Horizon France à 88 %',
    description: 'L\'enveloppe Horizon France est quasi épuisée. Décidez d\'un abondement ou d\'un plafonnement.',
    urgence: 'critique',
    echeance: '2026-03-10',
    lien: '/audit',
    type: 'arbitrage',
    rolesEligibles: ['DRH'],
    entite: 'Horizon France',
  },
  {
    id: 'T009',
    titre: 'Ouvrir la campagne GPEC Juin 2026',
    description: 'Le paramétrage est en cours. Validez et ouvrez la campagne pour les managers.',
    urgence: 'normale',
    echeance: '2026-06-01',
    lien: '/campaigns/C003',
    type: 'parametrage',
    rolesEligibles: ['DRH'],
    campaignId: 'C003',
  },
  {
    id: 'T010',
    titre: 'Planifier la revue des droits utilisateurs',
    description: 'La revue semestrielle des droits est prévue au 01/07/2026. Initiez la démarche.',
    urgence: 'normale',
    echeance: '2026-07-01',
    lien: '/admin',
    type: 'admin',
    rolesEligibles: ['DRH'],
  },

  // ── SIRH ─────────────────────────────────────────────────────────────────
  {
    id: 'T011',
    titre: 'Import SAP – 12 erreurs de correspondance',
    description: '12 matricules n\'ont pas pu être réconciliés lors du dernier import. Corriger avant la prochaine campagne.',
    urgence: 'critique',
    echeance: '2026-03-05',
    lien: '/admin',
    type: 'admin',
    rolesEligibles: ['SIRH'],
    nbItems: 12,
  },
  {
    id: 'T012',
    titre: 'Paramétrer les règles GPEC par grade',
    description: 'Les règles d\'avancement et d\'accélération de la campagne GPEC sont à finaliser.',
    urgence: 'urgente',
    echeance: '2026-05-20',
    lien: '/campaigns/C003',
    type: 'parametrage',
    rolesEligibles: ['SIRH'],
    campaignId: 'C003',
  },
  {
    id: 'T013',
    titre: 'Planifier la revue des droits (01/07/2026)',
    description: 'Préparer la liste des accès à revoir et notifier les responsables.',
    urgence: 'normale',
    echeance: '2026-06-15',
    lien: '/admin',
    type: 'admin',
    rolesEligibles: ['SIRH'],
  },
];

export const genderEquityData = [
  { grade: 'P1', hommes: 36750, femmes: 35500, ecart: -3.4 },
  { grade: 'P2', hommes: 43500, femmes: 42500, ecart: -2.3 },
  { grade: 'P3', hommes: 58000, femmes: 52000, ecart: -10.3 },
  { grade: 'P4', hommes: 61000, femmes: 65000, ecart: 6.6 },
  { grade: 'M1', hommes: 78000, femmes: 72000, ecart: -7.7 },
];

export const budgetByEntity = [
  { entite: 'Groupe Horizon', enveloppe: 250000, consomme: 162000 },
  { entite: 'Horizon France', enveloppe: 130000, consomme: 87500 },
  { entite: 'Horizon Rail', enveloppe: 70000, consomme: 38000 },
];

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  brouillon: 'Brouillon',
  ouverte: 'Ouverte',
  en_validation: 'En validation',
  cloturee: 'Clôturée',
};

export const workflowStatusLabels: Record<WorkflowStatus, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  valide: 'Validé',
  rejete: 'Rejeté',
};

export const campaignTypeLabels: Record<CampaignType, string> = {
  augmentation: 'Augmentations individuelles',
  bonus: 'Bonus',
  gpec: 'GPEC',
};

export const roleLabels: Record<Role, string> = {
  SIRH: 'SIRH',
  DRH: 'DRH',
  RRH: 'RRH',
  Directeur: 'Directeur',
  Manager: 'Manager',
};

export const roleColors: Record<Role, string> = {
  SIRH:      '#0f7070',
  DRH:       '#0a6ed1',
  RRH:       '#5a3e8c',
  Directeur: '#a05000',
  Manager:   '#1b7e39',
};
