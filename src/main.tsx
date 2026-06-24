import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@ui5/webcomponents-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@ui5/webcomponents/dist/Assets.js'
import '@ui5/webcomponents-fiori/dist/Assets.js'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './context/UserContext.tsx'
import { WorkflowProvider } from './context/WorkflowContext.tsx'

// QueryClient global — configuration optimisée BTP :
// - staleTime 30s : évite les refetch trop fréquents sur des données RH peu volatiles
// - retry 2 : 2 tentatives avant d'afficher une erreur (tokens CSRF expirés, réseau BTP)
// - A FAIRE — Connexion BTP : ajuster staleTime selon la fraîcheur requise par entité de données
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false, // Les apps BTP Work Zone ouvrent souvent dans des iframes
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <UserProvider>
            <WorkflowProvider>
              <App />
            </WorkflowProvider>
          </UserProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
