/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Processes from './pages/Processes';
import CreateProcess from './pages/CreateProcess';
import Requests from './pages/Requests';
import RequestDetails from './pages/RequestDetails';
import NewRequest from './pages/NewRequest';
import Tasks from './pages/Tasks';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Calendar from './pages/Calendar';
import Chat from './pages/Chat';
import Organization from './pages/Organization';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Settings from './pages/Settings';
import Audit from './pages/Audit';
import { ReactNode } from 'react';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const RBACRoute = ({ children, allowedRoles }: { children: ReactNode, allowedRoles: string[] }) => {
  const { user } = useAuth();
  
  const userRole = user?.role || 'Usuário';

  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white rounded-xl shadow-sm border border-slate-100 m-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
        <p className="text-slate-500">Seu perfil ({userRole}) não tem permissão para acessar esta página.</p>
      </div>
    );
  }
  
  return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="processes" element={<RBACRoute allowedRoles={['Administrador', 'Gestor']}><Processes /></RBACRoute>} />
              <Route path="processes/new" element={<RBACRoute allowedRoles={['Administrador', 'Gestor']}><CreateProcess /></RBACRoute>} />
              <Route path="processes/:id/edit" element={<RBACRoute allowedRoles={['Administrador', 'Gestor']}><CreateProcess /></RBACRoute>} />
              <Route path="requests/new" element={<RBACRoute allowedRoles={['Administrador', 'Gestor', 'Usuário', 'Auditor']}><NewRequest /></RBACRoute>} />
              <Route path="requests" element={<RBACRoute allowedRoles={['Administrador', 'Gestor', 'Usuário', 'Auditor']}><Requests /></RBACRoute>} />
              <Route path="requests/:id" element={<RBACRoute allowedRoles={['Administrador', 'Gestor', 'Usuário', 'Auditor']}><RequestDetails /></RBACRoute>} />
              <Route path="tasks" element={<RBACRoute allowedRoles={['Administrador', 'Gestor', 'Usuário']}><Tasks /></RBACRoute>} />
              <Route path="documents" element={<RBACRoute allowedRoles={['Administrador', 'Gestor', 'Usuário', 'Auditor']}><Documents /></RBACRoute>} />
              <Route path="reports" element={<RBACRoute allowedRoles={['Administrador', 'Gestor', 'Auditor']}><Reports /></RBACRoute>} />
              <Route path="calendar" element={<RBACRoute allowedRoles={['Administrador', 'Gestor', 'Usuário', 'Auditor']}><Calendar /></RBACRoute>} />
              <Route path="chat" element={<RBACRoute allowedRoles={['Administrador', 'Gestor', 'Usuário', 'Auditor']}><Chat /></RBACRoute>} />
              <Route path="organization" element={<RBACRoute allowedRoles={['Administrador']}><Organization /></RBACRoute>} />
              <Route path="users" element={<RBACRoute allowedRoles={['Administrador', 'Gestor']}><Users /></RBACRoute>} />
              <Route path="roles" element={<RBACRoute allowedRoles={['Administrador']}><Roles /></RBACRoute>} />
              <Route path="settings" element={<RBACRoute allowedRoles={['Administrador']}><Settings /></RBACRoute>} />
              <Route path="audit" element={<RBACRoute allowedRoles={['Administrador', 'Auditor']}><Audit /></RBACRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

