/**
 * WorkflowContext — Gestion du cycle de vie des workflows de campagne.
 *
 * Moteur actif :
 *   DEV  → LocalWorkflowEngine (état en mémoire, aucun backend)
 *   PROD → BpaWorkflowEngine   (SAP Build Process Automation REST V1)
 *
 * A FAIRE — Connexion Workflow BPA : pour activer le BpaWorkflowEngine en production,
 * décommenter le bloc "PROD engine" ci-dessous et commenter le "DEV engine".
 * Le reste du code React (pages, composants) n'a PAS besoin d'être modifié.
 *
 * A FAIRE — Synchronisation CAP : les appels BPA retournent un instanceId BPA (UUID).
 * Stocker cet UUID dans la table CAP Campaigns.bpaInstanceId pour retrouver
 * l'instance lors des actions ultérieures (validation, rejet, consultation).
 */

import { createContext, useContext, useState, useMemo, useRef } from 'react';
import type { WorkflowTemplate, WorkflowStepView, WorkflowAction } from '../types/workflow';
import { LocalWorkflowEngine, BpaWorkflowEngine } from '../services/workflowEngine';
import { DEFAULT_WORKFLOW_TEMPLATES } from '../data/workflowTemplates';
import type { CampaignType, Role } from '../data/mockData';

const DEV = import.meta.env.DEV;

// ── Initialisation des instances mock (DEV uniquement) ────────────────────────
// A FAIRE — Connexion CAP : en production, les instances workflow sont chargées
// depuis CAP (Campaigns.bpaInstanceId) et gérées par BPA — supprimer MOCK_INSTANCES.
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
  getTemplate(type: CampaignType): WorkflowTemplate | undefined;
  getStepsView(campaignId: string, type: CampaignType): WorkflowStepView[];
  completeTask(campaignId: string, action: WorkflowAction, acteur: string, commentaire?: string): void;
  startProcess(campaignId: string, campaignNom: string, type: CampaignType): void;
  updateTemplate(template: WorkflowTemplate): void;
  getPendingTasks(role: Role): ReturnType<LocalWorkflowEngine['getPendingTasks']>;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(DEFAULT_WORKFLOW_TEMPLATES);

  // ── Sélection du moteur workflow ────────────────────────────────────────────
  // DEV engine : état en mémoire React (aucune dépendance externe)
  const devEngine = useRef(new LocalWorkflowEngine(templates));

  // A FAIRE — Connexion Workflow BPA : décommenter pour activer le moteur BPA en prod
  // const prodEngine = useRef(new BpaWorkflowEngine());

  // Référence active : basculer entre devEngine et prodEngine selon l'env
  const engineRef = devEngine;
  // A FAIRE — Connexion Workflow BPA : remplacer la ligne ci-dessus par :
  // const engineRef = DEV ? devEngine : prodEngine;

  // Synchronise les templates dans le LocalEngine quand l'admin les modifie
  if (DEV) engineRef.current.updateTemplates(templates);

  // Initialise les instances mock une seule fois (DEV uniquement)
  const initDone = useRef(false);
  if (DEV && !initDone.current) {
    MOCK_INSTANCES.forEach(m =>
      (engineRef.current as LocalWorkflowEngine).initFromMock(
        m.campaignId, m.templateId, m.completedSteps, m.startedAt,
      ),
    );
    initDone.current = true;
  }

  const value = useMemo<WorkflowContextValue>(() => ({
    templates,

    getTemplate(type) {
      // A FAIRE — Connexion CAP : en production, les templates sont stockés dans CAP
      // (entité WorkflowTemplates) et chargés au démarrage via getWorkflowTemplates()
      return templates.find(t => t.campaignType === type && t.actif);
    },

    getStepsView(campaignId, type) {
      // A FAIRE — Connexion Workflow BPA : en production, utiliser BPA execution-logs
      // GET /workflow/rest/v1/workflow-instances/{bpaInstanceId}/execution-logs
      const template = templates.find(t => t.campaignType === type && t.actif);
      if (!template) return [];
      const instanceId = DEV ? `INST-${campaignId}` : campaignId; // BPA utilise l'UUID natif
      return engineRef.current.getStepsView(instanceId, template);
    },

    completeTask(campaignId, action, acteur, commentaire) {
      // A FAIRE — Connexion Workflow BPA : en production, récupérer l'instanceId BPA
      // depuis CAP (Campaigns.bpaInstanceId) avant d'appeler completeTask
      const instanceId = DEV ? `INST-${campaignId}` : campaignId;
      engineRef.current.completeTask(instanceId, action, acteur, commentaire);
    },

    startProcess(campaignId, campaignNom, type) {
      // A FAIRE — Connexion Workflow BPA : stocker l'instanceId BPA retourné dans CAP
      // PATCH /cap/odata/v4/RemunerationService/Campaigns(${campaignId})
      // body: { bpaInstanceId: instanceId }
      const template = templates.find(t => t.campaignType === type && t.actif);
      if (!template) return;
      engineRef.current.startProcess(campaignId, campaignNom, template.id);
    },

    updateTemplate(updated) {
      // A FAIRE — Connexion CAP : en production, persister via
      // PATCH /cap/odata/v4/RemunerationService/WorkflowTemplates(${updated.id})
      setTemplates(prev =>
        prev.map(t => t.id === updated.id ? { ...updated, modifieLe: new Date().toISOString() } : t),
      );
    },

    getPendingTasks(role) {
      // A FAIRE — Connexion Workflow BPA : en production, appeler directement
      // GET BPA_ENDPOINTS.MY_TASKS depuis le composant Dashboard avec React Query/SWR.
      // Le BPA filtre automatiquement les tâches de l'utilisateur XSUAA connecté.
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
