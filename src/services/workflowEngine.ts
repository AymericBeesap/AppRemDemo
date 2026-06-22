/**
 * WorkflowEngine — couche d'abstraction entre l'UI et le moteur de workflow.
 *
 * Architecture :
 *   DEV  → LocalWorkflowEngine  : état en mémoire React (aucun backend requis)
 *   PROD → BpaWorkflowEngine    : appels REST SAP Build Process Automation
 *
 * Pour migrer vers BPA :
 *   1. Déployer les Process Definitions BPMN2 dans BPA Studio
 *   2. Renseigner WORKFLOW_DEFINITION_IDS dans src/config/endpoints.ts
 *   3. Dans WorkflowContext.tsx : basculer engineRef vers new BpaWorkflowEngine()
 *   4. Le reste du code React n'a pas besoin d'être modifié (interface commune)
 *
 * A FAIRE — Connexion Workflow BPA :
 *   mapping des actions UI → décisions BPA :
 *   'valider'  → decision: "approve"
 *   'rejeter'  → decision: "reject"
 *   'demander' → decision: "requestInfo"
 */

import type {
  WorkflowEngineAdapter,
  WorkflowTemplate,
  WorkflowProcessInstance,
  WorkflowPendingTask,
  WorkflowStepView,
  WorkflowAction,
} from '../types/workflow';
import type { Role } from '../data/mockData';
import { BPA_ENDPOINTS, WORKFLOW_DEFINITION_IDS } from '../config/endpoints';

// ─── Implémentation locale (DEV / MVP) ───────────────────────────────────────

export class LocalWorkflowEngine implements WorkflowEngineAdapter {
  private instances = new Map<string, WorkflowProcessInstance>();
  private templates: WorkflowTemplate[];

  constructor(templates: WorkflowTemplate[]) {
    this.templates = templates;
  }

  updateTemplates(templates: WorkflowTemplate[]) {
    this.templates = templates;
  }

  startProcess(campaignId: string, _campaignNom: string, templateId: string): string {
    const instanceId = `INST-${campaignId}-${Date.now()}`;
    this.instances.set(instanceId, {
      instanceId,
      campaignId,
      templateId,
      currentStepIndex: 0,
      status: 'en_cours',
      startedAt: new Date().toISOString(),
      history: [],
    });
    return instanceId;
  }

  completeTask(instanceId: string, action: WorkflowAction, acteur: string, commentaire?: string) {
    const inst = this.instances.get(instanceId);
    if (!inst || inst.status !== 'en_cours') return;

    const template = this.templates.find(t => t.id === inst.templateId);
    if (!template) return;

    const currentStep = template.steps[inst.currentStepIndex];
    if (!currentStep) return;

    inst.history.push({
      stepId: currentStep.id,
      stepLibelle: currentStep.libelle,
      role: currentStep.role,
      action,
      acteur,
      timestamp: new Date().toISOString(),
      commentaire,
    });

    if (action === 'rejeter') {
      inst.status = 'rejete';
    } else {
      inst.currentStepIndex += 1;
      if (inst.currentStepIndex >= template.steps.length) {
        inst.status = 'complete';
      }
    }
  }

  getProcessInstance(instanceId: string): WorkflowProcessInstance | null {
    return this.instances.get(instanceId) ?? null;
  }

  getPendingTasks(role: Role): WorkflowPendingTask[] {
    const tasks: WorkflowPendingTask[] = [];
    this.instances.forEach(inst => {
      if (inst.status !== 'en_cours') return;
      const template = this.templates.find(t => t.id === inst.templateId);
      if (!template) return;
      const step = template.steps[inst.currentStepIndex];
      if (!step || step.role !== role) return;
      const dueMs = new Date(inst.startedAt).getTime() + step.delaiJours * 86400000;
      tasks.push({
        taskId: `TASK-${inst.instanceId}-${step.id}`,
        instanceId: inst.instanceId,
        campaignId: inst.campaignId,
        campaignNom: inst.campaignId,
        stepLibelle: step.libelle,
        role: step.role,
        actions: step.actions,
        dueDate: new Date(dueMs).toISOString(),
      });
    });
    return tasks;
  }

  getStepsView(instanceId: string, template: WorkflowTemplate): WorkflowStepView[] {
    const inst = this.instances.get(instanceId);
    return template.steps.map((step, idx) => {
      if (!inst) return { ...step, status: 'en_attente' as const };
      const record = inst.history.find(h => h.stepId === step.id);
      if (record) {
        return { ...step, status: 'valide' as const, completedAt: record.timestamp, actor: record.acteur };
      }
      if (idx === inst.currentStepIndex && inst.status === 'en_cours') {
        return { ...step, status: 'en_cours' as const };
      }
      return { ...step, status: 'en_attente' as const };
    });
  }

  initFromMock(campaignId: string, templateId: string, completedSteps: number, startedAt: string) {
    const instanceId = `INST-${campaignId}`;
    if (this.instances.has(instanceId)) return instanceId;

    const template = this.templates.find(t => t.id === templateId);
    const totalSteps = template?.steps.length ?? 0;

    const history = (template?.steps ?? []).slice(0, completedSteps).map(step => ({
      stepId: step.id,
      stepLibelle: step.libelle,
      role: step.role,
      action: 'valider' as WorkflowAction,
      acteur: `${step.role} (mock)`,
      timestamp: startedAt,
    }));

    this.instances.set(instanceId, {
      instanceId,
      campaignId,
      templateId,
      currentStepIndex: Math.min(completedSteps, totalSteps),
      status: completedSteps >= totalSteps ? 'complete' : 'en_cours',
      startedAt,
      history,
    });

    return instanceId;
  }
}

// ─── BpaWorkflowEngine — Production SAP Build Process Automation ───────────────
//
// A FAIRE — Connexion Workflow BPA : cette classe remplace LocalWorkflowEngine
// en production BTP. Les étapes de mise en service :
//
//  1. BTP Cockpit > Instances & Subscriptions > SAP Build Process Automation
//     → Créer une instance de service BPA (plan: standard)
//     → Créer un Service Key → récupérer les URLs et credentials OAuth2
//
//  2. BPA Studio (https://<subaccount>.sap-process-automation.cfapps.<region>.hana.ondemand.com)
//     → Créer 3 Process Definitions :
//       - remuneration.augmentation.approval.v1
//       - remuneration.bonus.approval.v1
//       - remuneration.gpec.approval.v1
//     → Chaque process doit avoir un "Start Context" avec : campaignId, campaignNom, proposedBy
//     → Chaque User Task doit avoir : assignee (role/groupe XSUAA), formulaire React
//
//  3. Activation du token CSRF :
//     Les endpoints BPA REST ne nécessitent pas de CSRF token (contrairement à S/4HANA OData V2)
//     mais nécessitent un Bearer token OAuth2 (XSUAA client_credentials ou user_token)
//
//  4. Dans WorkflowContext.tsx :
//     Remplacer : engineRef = useRef(new LocalWorkflowEngine(templates))
//     Par       : engineRef = useRef(new BpaWorkflowEngine())
//     (le token XSUAA est injecté automatiquement par le AppRouter BTP — pas besoin de le gérer)

export class BpaWorkflowEngine implements WorkflowEngineAdapter {

  // BPA REST API — le token OAuth2 est géré par l'AppRouter BTP (propagation automatique)
  // En développement local : utiliser un Service Key BPA et un script d'obtention de token

  private async bpaRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    // A FAIRE — Connexion Workflow BPA : en production, le AppRouter injecte
    // le header Authorization automatiquement depuis le binding XSUAA.
    // En développement local, passer le token manuellement (cf. Service Key BPA).
    const res = await fetch(`${BPA_ENDPOINTS.WORKFLOW_INSTANCES.replace('/workflow-instances', '')}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include', // L'AppRouter transmet le cookie de session / Bearer token
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`BPA ${method} ${path} → ${res.status}: ${text}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  // ── Interfaces BPA REST V1 ──────────────────────────────────────────────────

  private mapCampaignTypeToDefinitionId(templateId: string): string {
    // A FAIRE — Connexion Workflow BPA : mapper les templateIds locaux vers les
    // Process Definition IDs réels créés dans BPA Studio
    if (templateId.includes('AUG')) return WORKFLOW_DEFINITION_IDS.AUGMENTATION;
    if (templateId.includes('BON')) return WORKFLOW_DEFINITION_IDS.BONUS;
    if (templateId.includes('GPEC')) return WORKFLOW_DEFINITION_IDS.GPEC;
    return WORKFLOW_DEFINITION_IDS.AUGMENTATION;
  }

  startProcess(campaignId: string, campaignNom: string, templateId: string): string {
    // A FAIRE — Connexion Workflow BPA :
    // POST /workflow/rest/v1/workflow-instances
    // Body : {
    //   "definitionId": "remuneration.augmentation.approval.v1",
    //   "context": {
    //     "campaignId": "C001",
    //     "campaignNom": "Augmentations 2026 – Groupe A",
    //     "proposedBy": "c.mercier@groupea.fr",
    //     "enveloppeTotal": 85000,
    //     "enveloppeRestante": 62000
    //   }
    // }
    // Réponse : { "id": "bpa-instance-uuid", "definitionId": "...", "status": "RUNNING" }

    const definitionId = this.mapCampaignTypeToDefinitionId(templateId);
    const instanceId = `BPA-PENDING-${campaignId}`;

    // Appel asynchrone — on retourne un ID provisoire et on met à jour quand BPA répond
    // A FAIRE — Connexion Workflow BPA : stocker l'instanceId BPA réel dans CAP
    // (table Propositions.workflowInstanceId) pour les appels ultérieurs
    this.bpaRequest<{ id: string }>('POST', '/workflow-instances', {
      definitionId,
      context: { campaignId, campaignNom },
    }).then(res => {
      console.info(`[BPA] Workflow started: ${res.id} for campaign ${campaignId}`);
      // A FAIRE — Connexion CAP : sauvegarder res.id dans Campaigns.bpaInstanceId via PATCH
    }).catch(err => {
      console.error('[BPA] startProcess failed:', err);
      // A FAIRE — Connexion BTP Application Logging : logger l'erreur avec correlation ID
    });

    return instanceId;
  }

  completeTask(instanceId: string, action: WorkflowAction, acteur: string, commentaire?: string): void {
    // A FAIRE — Connexion Workflow BPA :
    // 1. GET /workflow/rest/v1/task-instances?workflowInstanceId={instanceId}&status=READY
    //    → Récupérer l'ID du User Task courant
    //
    // 2. PUT /workflow/rest/v1/task-instances/{taskId}/complete
    //    Body : {
    //      "decision": "approve" | "reject" | "requestInfo",
    //      "context": {
    //        "acteur": "c.mercier@groupea.fr",
    //        "commentaire": "...",
    //        "completedAt": "2026-06-22T10:00:00Z"
    //      }
    //    }
    //
    // Mapping actions UI → décisions BPA :
    //   'valider'  → "approve"
    //   'rejeter'  → "reject"
    //   'demander' → "requestInfo"

    const bpaDecision = action === 'valider' ? 'approve'
                      : action === 'rejeter' ? 'reject'
                      : 'requestInfo';

    this.bpaRequest<{ id: string }[]>('GET', `/task-instances?workflowInstanceId=${instanceId}&status=READY`)
      .then(tasks => {
        if (!tasks.length) {
          console.warn('[BPA] No READY tasks found for instance:', instanceId);
          return;
        }
        const taskId = tasks[0].id;
        return this.bpaRequest<void>('PUT', `/task-instances/${taskId}/complete`, {
          decision: bpaDecision,
          context: { acteur, commentaire, completedAt: new Date().toISOString() },
        });
      })
      .catch(err => {
        console.error('[BPA] completeTask failed:', err);
      });
  }

  getProcessInstance(instanceId: string): WorkflowProcessInstance | null {
    // A FAIRE — Connexion Workflow BPA :
    // GET /workflow/rest/v1/workflow-instances/{instanceId}
    // Réponse : { "id": "...", "definitionId": "...", "status": "RUNNING|COMPLETED|ERRONEOUS", "context": {...} }
    //
    // Mapper BPA status → status local :
    //   "RUNNING"   → 'en_cours'
    //   "COMPLETED" → 'complete'
    //   "ERRONEOUS" → 'rejete'
    //
    // Cette méthode est sync dans l'interface → utiliser React Query ou SWR pour
    // les appels async BPA et pré-charger les instances avant le rendu

    console.warn('[BPA] getProcessInstance: use React Query hook instead of sync call', instanceId);
    return null;
  }

  getPendingTasks(role: Role): WorkflowPendingTask[] {
    // A FAIRE — Connexion Workflow BPA :
    // GET /workflow/rest/v1/task-instances?status=READY
    // Le BPA filtre automatiquement les tâches de l'utilisateur connecté via XSUAA
    //
    // Pour filtrer par rôle (si plusieurs rôles dans le même process) :
    //   GET /task-instances?status=READY&attributes=recipientUsers:{email},recipientGroups:{role}
    //
    // Réponse : [{
    //   "id": "task-uuid",
    //   "workflowInstanceId": "instance-uuid",
    //   "subject": "Validation Directeur — Augmentations 2026",
    //   "description": "...",
    //   "dueDate": "2026-07-15T00:00:00Z",
    //   "status": "READY",
    //   "workflowDefinitionId": "remuneration.augmentation.approval.v1",
    //   "applicationScope": "Remuneration-manage",   ← pour nav cross-app FLP
    //   "customAttributes": [{ "label": "campaignId", "value": "C001" }]
    // }]
    //
    // Cette méthode est sync dans l'interface → idem getProcessInstance : utiliser SWR
    // et appeler directement BPA_ENDPOINTS.MY_TASKS depuis le composant Dashboard

    console.warn('[BPA] getPendingTasks: use React Query hook with BPA_ENDPOINTS.MY_TASKS instead', role);
    return [];
  }

  getStepsView(instanceId: string, template: WorkflowTemplate): WorkflowStepView[] {
    // A FAIRE — Connexion Workflow BPA :
    // GET /workflow/rest/v1/workflow-instances/{instanceId}/execution-logs
    // → Retourne l'historique complet des étapes (COMPLETED/RUNNING/PENDING)
    //
    // Mapper execution-logs → WorkflowStepView[] en croisant avec template.steps
    // Les execution-logs BPA contiennent : stepId, status, startedAt, completedAt, actor

    console.warn('[BPA] getStepsView: use BPA execution-logs API', instanceId, template.id);
    return template.steps.map(step => ({ ...step, status: 'en_attente' as const }));
  }
}
