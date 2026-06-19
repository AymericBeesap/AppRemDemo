import type { Role, CampaignType } from '../data/mockData';

export type WorkflowAction = 'valider' | 'rejeter' | 'demander_info' | 'deleguer';
export type WorkflowInstanceStatus = 'en_cours' | 'complete' | 'rejete' | 'suspendu';

// ─── Template (définition de processus) ──────────────────────────────────────
// En production BPA : mappé sur un "Process Definition" déployé sur SAP BPA

export interface WorkflowStepConfig {
  id: string;
  ordre: number;              // 1-based
  libelle: string;
  role: Role;
  delaiJours: number;         // SLA
  rappelJours: number;        // rappel avant échéance
  escaladeRole?: Role;        // escalade si SLA dépassé
  actions: WorkflowAction[];  // ce que l'acteur peut faire
  obligatoire: boolean;
  description?: string;
}

export interface WorkflowTemplate {
  id: string;
  nom: string;
  campaignType: CampaignType;
  description: string;
  steps: WorkflowStepConfig[];
  actif: boolean;
  modifieLe: string;
  modifiePar: string;
}

// ─── Instance de processus (une par campagne) ────────────────────────────────
// En production BPA : mappé sur un "Workflow Instance"

export interface WorkflowTaskRecord {
  stepId: string;
  stepLibelle: string;
  role: Role;
  action: WorkflowAction;
  acteur: string;
  timestamp: string;
  commentaire?: string;
}

export interface WorkflowProcessInstance {
  instanceId: string;
  campaignId: string;
  templateId: string;
  currentStepIndex: number; // 0-based ; égal à steps.length = complété
  status: WorkflowInstanceStatus;
  startedAt: string;
  history: WorkflowTaskRecord[];
}

// ─── Tâche en attente (inbox) ────────────────────────────────────────────────
// En production BPA : mappé sur les Task Center tasks via API

export interface WorkflowPendingTask {
  taskId: string;
  instanceId: string;
  campaignId: string;
  campaignNom: string;
  stepLibelle: string;
  role: Role;
  actions: WorkflowAction[];
  dueDate: string;
}

// ─── Étape enrichie (pour rendu UI) ─────────────────────────────────────────

export type StepStatus = 'valide' | 'en_cours' | 'en_attente';

export interface WorkflowStepView extends WorkflowStepConfig {
  status: StepStatus;
  completedAt?: string;
  actor?: string;
}

// ─── Interface adaptateur ─────────────────────────────────────────────────────
// C'est cette interface qui sera réimplémentée côté BPA.
// Règle de migration :
//   LocalWorkflowEngine  → implémentation en mémoire (MVP)
//   BpaWorkflowEngine    → appels REST SAP BPA (production)
// Les consommateurs (pages React) n'importent que cette interface.

export interface WorkflowEngineAdapter {
  /** Démarre une instance de processus pour une campagne. Retourne l'instanceId. */
  startProcess(campaignId: string, campaignNom: string, templateId: string): string;

  /** L'acteur courant valide/rejette/... l'étape active. */
  completeTask(
    instanceId: string,
    action: WorkflowAction,
    acteur: string,
    commentaire?: string,
  ): void;

  /** État courant d'une instance. */
  getProcessInstance(instanceId: string): WorkflowProcessInstance | null;

  /** Tâches en attente filtrées par rôle (alimente le dashboard). */
  getPendingTasks(role: Role): WorkflowPendingTask[];

  /** Étapes avec statut dérivé de l'instance (pour rendu du stepper). */
  getStepsView(instanceId: string, template: WorkflowTemplate): WorkflowStepView[];
}
