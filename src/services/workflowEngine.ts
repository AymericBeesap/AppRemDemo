/**
 * WorkflowEngine — couche d'abstraction entre l'UI et le moteur de workflow.
 *
 * MVP  : LocalWorkflowEngine — état en mémoire React.
 * Prod : BpaWorkflowEngine   — appels REST SAP Build Process Automation.
 *
 * Règle de migration BPA :
 *   - startProcess     → POST /workflow/rest/v1/workflow-instances
 *   - completeTask     → PUT  /workflow/rest/v1/task-instances/{id}/complete
 *   - getProcessInstance → GET /workflow/rest/v1/workflow-instances/{id}
 *   - getPendingTasks  → GET  /workflow/rest/v1/task-instances?status=READY
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

// ─── Implémentation locale (MVP) ─────────────────────────────────────────────

export class LocalWorkflowEngine implements WorkflowEngineAdapter {
  private instances = new Map<string, WorkflowProcessInstance>();
  private templates: WorkflowTemplate[];

  constructor(templates: WorkflowTemplate[]) {
    this.templates = templates;
  }

  /** Appelé par WorkflowContext quand les templates changent dans l'Admin. */
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

  /** Initialise une instance depuis les données mock existantes (compatibilité). */
  initFromMock(
    campaignId: string,
    templateId: string,
    completedSteps: number,
    startedAt: string,
  ) {
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

// ─── BpaWorkflowEngine (squelette — production) ───────────────────────────────
// À implémenter lors de la migration vers SAP BPA.
// Remplace LocalWorkflowEngine sans modifier aucun composant React.

/*
export class BpaWorkflowEngine implements WorkflowEngineAdapter {
  private baseUrl: string;
  private token: string;

  constructor(btpSubdomain: string, token: string) {
    this.baseUrl = `https://${btpSubdomain}.workflow.cfapps.eu10.hana.ondemand.com/workflow/rest/v1`;
    this.token = token;
  }

  startProcess(campaignId: string, campaignNom: string, templateId: string): string {
    // POST /workflow-instances
    // body: { definitionId: templateId, context: { campaignId, campaignNom } }
    throw new Error('BpaWorkflowEngine: startProcess not yet implemented');
  }

  completeTask(instanceId: string, action: WorkflowAction, acteur: string, commentaire?: string): void {
    // PUT /task-instances/{taskId}/complete
    // body: { decision: action, context: { commentaire } }
    throw new Error('BpaWorkflowEngine: completeTask not yet implemented');
  }

  getProcessInstance(instanceId: string): WorkflowProcessInstance | null {
    // GET /workflow-instances/{instanceId}
    throw new Error('BpaWorkflowEngine: getProcessInstance not yet implemented');
  }

  getPendingTasks(role: Role): WorkflowPendingTask[] {
    // GET /task-instances?status=READY&attributes=role:${role}
    throw new Error('BpaWorkflowEngine: getPendingTasks not yet implemented');
  }

  getStepsView(instanceId: string, template: WorkflowTemplate): WorkflowStepView[] {
    throw new Error('BpaWorkflowEngine: getStepsView not yet implemented');
  }
}
*/
