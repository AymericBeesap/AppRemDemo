import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@ui5/webcomponents-react'
import '@ui5/webcomponents/dist/Assets.js'
import '@ui5/webcomponents-fiori/dist/Assets.js'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './context/UserContext.tsx'
import { WorkflowProvider } from './context/WorkflowContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider>
          <WorkflowProvider>
            <App />
          </WorkflowProvider>
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
