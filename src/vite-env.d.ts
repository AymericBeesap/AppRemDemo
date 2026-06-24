/// <reference types="vite/client" />

// Variables d'environnement Vite (préfixe VITE_)
interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_SAP_CLIENT?: string;
  // A FAIRE — Ajouter les variables d'environnement spécifiques BTP au fur et à mesure
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ── Déclarations SAP FLP Shell API ────────────────────────────────────────────
// Disponible uniquement quand l'app tourne dans SAP Build Work Zone (Fiori Launchpad).
// Injecté par le shell FLP dans window.sap.ushell.
// A FAIRE — Connexion FLP : pour une couverture TypeScript complète, installer
// @types/sap__ui5-shims ou générer les types depuis le SDK SAP UI5

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
            getLanguage(): string;
          };
          getService(name: 'Navigation'): {
            navigate(target: {
              target: { semanticObject: string; action: string };
              params?: Record<string, string>;
            }): void;
            isNavigationSupported(targets: object[]): Promise<{ supported: boolean }[]>;
          };
          getService(name: string): unknown;
          attachRendererCreatedEvent(callback: () => void): void;
        };
      };
      ui?: {
        getCore(): {
          applyTheme(themeId: string): void;
          getConfiguration(): { getLanguage(): string };
        };
      };
    };
  }
}
