import { createContext, useContext, useState, useMemo, useRef } from 'react';
import type { WorkflowTemplate, WorkflowStepView, WorkflowAction } from '../types/workflow';
import { LocalWorkflowEngine } from '../services/workflowEngine';
import { DEFAULT_WORKFLOW_TEMPLATES } from '../data/workflowTemplates';
import type { CampaignType, Role } from '../data/mockData';

// ─── Initialisation des instances mock ───────────────────────────────────────
// Correspond aux campagnes existantes dans mockData
const MOCK_INSTANCES: Array<{
  campaignId: string;
  templateId: string;
  completedSteps: number;
  startedAt: string;
}> = [
  { campaignId: 'C001', templateId: 'WF-AUG-01', completedSteps: 2, startedAt: '2026-02-01T08:00:00Z' },
  { campaignId: 'C002', templateId: 'WF-BON-01', completedSteps: 2, startedAt: '2025-11-01T08:00:00Z' },
  { campaignId: 'C003', templateId: 'WF-GPEC-01', completedSteps: 0, startedAt: '2026-03-01T08:00:00Z' },
];

interface WorkflowContextValue {
  templates: WorkflowTemplate[];
  /** Retourne le template actif pour un type de campagne. */
  getTemplate(type: CampaignType): WorkflowTemplate | undefined;
  /** Retourne les steps enrichis (avec statut) pour une campagne. */
  getStepsView(campaignId: string, type: CampaignType): WorkflowStepView[];
  /** Complète l'étape courante d'une campagne. */
  completeTask(campaignId: string, action: WorkflowAction, acteur: string, commentaire?: string): void;
  /** Démarre un nouveau processus (création de campagne). */
  startProcess(campaignId: string, campaignNom: string, type: CampaignType): void;
  /** Admin — remplace un template entier. */
  updateTemplate(template: WorkflowTemplate): void;
  /** Tâches en attente pour un rôle donné. */
  getPendingTasks(role: Role): ReturnType<LocalWorkflowEngine['getPendingTasks']>;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(DEFAULT_WORKFLOW_TEMPLATES);

  // L'engine vit dans un ref pour éviter de recréer la Map d'instances à chaque render
  const engineRef = useRef<LocalWorkflowEngine>(new LocalWorkflowEngine(templates));

  // Synchronise les templates dans l'engine quand ils changent
  engineRef.current.updateTemplates(templates);

  // Initialise les instances mock une seule fois
  const initDone = useRef(false);
  if (!initDone.current) {
    MOCK_INSTANCES.forEach(m =>
      engineRef.current.initFromMock(m.campaignId, m.templateId, m.completedSteps, m.startedAt),
    );
    initDone.current = true;
  }

  const value = useMemo<WorkflowContextValue>(() => ({
    templates,

    getTemplate(type) {
      return templates.find(t => t.campaignType === type && t.actif);
    },

    getStepsView(campaignId, type) {
      const template = templates.find(t => t.campaignType === type && t.actif);
      if (!template) return [];
      const instanceId = `INST-${campaignId}`;
      return engineRef.current.getStepsView(instanceId, template);
    },

    completeTask(campaignId, action, acteur, commentaire) {
      const instanceId = `INST-${campaignId}`;
      engineRef.current.completeTask(instanceId, action, acteur, commentaire);
    },

    startProcess(campaignId, campaignNom, type) {
      const template = templates.find(t => t.campaignType === type && t.actif);
      if (!template) return;
      engineRef.current.startProcess(campaignId, campaignNom, template.id);
    },

    updateTemplate(updated) {
      setTemplates(prev =>
        prev.map(t => t.id === updated.id ? { ...updated, modifieLe: new Date().toISOString() } : t),
      );
    },

    getPendingTasks(role) {
      return engineRef.current.getPendingTasks(role);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [templates]);

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflow must be used inside WorkflowProvider');
  return ctx;
}
