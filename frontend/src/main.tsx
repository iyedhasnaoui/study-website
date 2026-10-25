import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { DevRoleSwitcher} from "./components/dev/DevRoleSwitcher.tsx";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DevRoleSwitcher />
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
