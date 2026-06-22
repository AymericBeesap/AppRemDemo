/**
 * Configuration des endpoints BTP — AppRouter destinations.
 *
 * Chaque préfixe (/s4hana, /cap, /bpa) correspond à une route dans xs-app.json
 * qui redirige vers la destination BTP correspondante.
 *
 * Documentation destinations BTP :
 * https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/create-destinations-from-scratch
 */

// ── Préfixes AppRouter ────────────────────────────────────────────────────────

const S4 = '/s4hana';
const CAP = '/cap/odata/v4/RemunerationService';
const BPA = '/bpa/workflow/rest/v1';
const SF  = '/sf/odata/v2';

// ── S/4HANA OData V2 ─────────────────────────────────────────────────────────
// A FAIRE — Connexion S/4HANA : ces URIs correspondent aux API standard SAP.
// Activer via transaction /IWFND/MAINT_SERVICE ou SAP API Business Hub.

export const S4_ENDPOINTS = {
  // API_EMPLOYEE_SRV — Données employé (nom, matricule, grade, entité)
  // Scope requis : API_EMPLOYEE_SRV.Read
  EMPLOYEES:       `${S4}/sap/opu/odata/sap/API_EMPLOYEE_SRV/A_EmployeeBasicInfo`,

  // HCM_EMPL_POSIT_0001 — Poste et classification (grade, échelon, ancienneté)
  EMPLOYEE_DETAIL: `${S4}/sap/opu/odata/sap/HCM_EMPL_POSIT_0001/EmployeePayroll`,

  // API_ORG_UNIT_SRV — Structure organisationnelle (entités, divisions)
  ORG_UNITS:       `${S4}/sap/opu/odata/sap/API_ORG_UNIT_SRV/A_OrganizationalUnit`,

  // Compensation actuelle — via RPTPAY00 ou table PA0008 (Salaire de base)
  // A FAIRE — Vérifier disponibilité OData pour données salariales S/4HANA (GDPR sensible)
  COMPENSATION:    `${S4}/sap/opu/odata/sap/HCM_PAYRESULT_DISPLAY_SRV/PayrollResults`,

  // CSRF token endpoint (POST/PUT/DELETE nécessitent X-CSRF-Token)
  CSRF:            `${S4}/sap/opu/odata/sap/API_EMPLOYEE_SRV/`,
} as const;

// ── SAP SuccessFactors Employee Central (alternative à S/4HANA HR) ────────────
// A FAIRE — Connexion SuccessFactors : configurer l'intégration SF-S4HANA
// si votre paysage utilise SF EC comme système de référence RH.

export const SF_ENDPOINTS = {
  PERSONS:          `${SF}/PerPerson`,
  EMPLOYMENT:       `${SF}/EmpEmployment`,
  JOB_INFO:         `${SF}/EmpJob`,
  PAY_COMPENSATION: `${SF}/EmpPayCompensation`,
  GLOBAL_INFO:      `${SF}/EmpGlobalAssignment`,
  COST_CENTER:      `${SF}/CostCenter`,
} as const;

// ── CAP Service OData V4 ──────────────────────────────────────────────────────
// A FAIRE — CAP Backend : créer le projet CAP avec `cds init remuneration-srv`
// Entités à définir dans schema.cds :
//   - Campaigns (with associations to external S4 entities via cds.external)
//   - Propositions (linked to BPA workflow instance ID)
//   - AuditLogs (append-only, horodaté)
//   - AppUsers (users applicatifs avec rôles métier)

export const CAP_ENDPOINTS = {
  CAMPAIGNS:        `${CAP}/Campaigns`,
  PROPOSITIONS:     `${CAP}/Propositions`,
  WORKFLOW_ETAPES:  `${CAP}/WorkflowEtapes`,
  AUDIT_LOGS:       `${CAP}/AuditLogs`,
  AUDIT_PARAMS:     `${CAP}/AuditParams`,
  AUDIT_DROITS:     `${CAP}/AuditDroits`,
  BUDGET_EVENTS:    `${CAP}/BudgetEvents`,
  APP_USERS:        `${CAP}/AppUsers`,
  USER_ROLE:        `${CAP}/UserRole(me)`,    // Rôle métier de l'utilisateur connecté
  CAMPAIGN_POPULATION: `${CAP}/CampaignPopulation`,  // Vue = Campaigns + S4 Employees
} as const;

// ── SAP Build Process Automation (Workflow) ───────────────────────────────────
// A FAIRE — Connexion Workflow BPA :
// 1. Créer les Process Definitions BPMN2 dans SAP Build Process Automation Studio
// 2. Définition IDs à renseigner dans WORKFLOW_DEFINITION_IDS ci-dessous
// 3. Configurer les User Tasks avec les formulaires Fiori/React
// 4. Activer la destination workflow-service dans BTP Cockpit

export const BPA_ENDPOINTS = {
  WORKFLOW_INSTANCES:   `${BPA}/workflow-instances`,
  TASK_INSTANCES:       `${BPA}/task-instances`,
  MY_TASKS:             `${BPA}/user-task-instances/me`,
  FORM_INSTANCES:       `${BPA}/form-instances`,
  WORKFLOW_DEFINITIONS: `${BPA}/workflow-definitions`,
} as const;

// A FAIRE — Connexion Workflow BPA : remplacer par les IDs réels des process definitions BPA
export const WORKFLOW_DEFINITION_IDS = {
  AUGMENTATION: 'remuneration.augmentation.approval.v1',
  BONUS:        'remuneration.bonus.approval.v1',
  GPEC:         'remuneration.gpec.approval.v1',
} as const;

// ── XSUAA — Mapping rôles applicatifs ────────────────────────────────────────
// A FAIRE — Connexion XSUAA : créer les Role Collections dans BTP Cockpit
// Espace de nommage : $XSAPPNAME = "remunerations" (cf mta.yaml / xs-security.json)
// Exemple xs-security.json :
//   { "scopes": [{"name": "$XSAPPNAME.DRH"}, ...],
//     "role-templates": [{"name": "DRH", "scope-references": ["$XSAPPNAME.DRH"]}],
//     "role-collections": [{"name": "Remuneration_DRH", "role-template-references": [...]}] }

export const XSUAA_SCOPES = {
  DRH:       'remunerations.DRH',
  RRH:       'remunerations.RRH',
  MANAGER:   'remunerations.Manager',
  DIRECTEUR: 'remunerations.Directeur',
  SIRH:      'remunerations.SIRH',
} as const;

export type XsuaaScope = typeof XSUAA_SCOPES[keyof typeof XSUAA_SCOPES];
