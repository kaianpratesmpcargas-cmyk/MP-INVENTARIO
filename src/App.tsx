import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { LoginView } from './components/auth/LoginView';
import { PendingApprovalView } from './components/auth/PendingApprovalView';
import { Layout } from './components/layout/Layout';
import { NavItemKey } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { InventoryView } from './components/inventory/InventoryView';
import { ScannerView } from './components/scanner/ScannerView';
import { LabelsView } from './components/labels/LabelsView';
import { MaintenanceView } from './components/maintenance/MaintenanceView';
import { ConferenceView } from './components/conference/ConferenceView';
import { MovementsView } from './components/movements/MovementsView';
import { ReportsView } from './components/reports/ReportsView';
import { UsersView } from './components/users/UsersView';
import { AuditView } from './components/audit/AuditView';
import { SettingsView } from './components/settings/SettingsView';

// Modais Globais
import { NewEquipmentModal } from './components/inventory/NewEquipmentModal';
import { EquipmentSuccessModal } from './components/inventory/EquipmentSuccessModal';
import { EquipmentDetailModal } from './components/inventory/EquipmentDetailModal';
import { EquipmentEditModal } from './components/inventory/EquipmentEditModal';
import { TransferModal } from './components/inventory/TransferModal';
import { SendMaintenanceModal } from './components/inventory/SendMaintenanceModal';
import { FinishMaintenanceModal } from './components/inventory/FinishMaintenanceModal';
import { ChangeStatusModal } from './components/inventory/ChangeStatusModal';
import { DecommissionModal } from './components/inventory/DecommissionModal';

import { Equipamento } from './types';

const MainApp: React.FC = () => {
  const { currentUser } = useAuth();
  const { findEquipmentByCode } = useInventory();

  // Navegação
  const [activeView, setActiveView] = useState<NavItemKey>('dashboard');
  const [inventoryFilterParam, setInventoryFilterParam] = useState<string | undefined>(undefined);
  const [labelsInitialIds, setLabelsInitialIds] = useState<string[]>([]);

  // Estados dos Modais
  const [isNewEquipmentModalOpen, setIsNewEquipmentModalOpen] = useState(false);
  const [preFilledCodeForNew, setPreFilledCodeForNew] = useState<string | undefined>(undefined);

  const [createdSuccessEquipment, setCreatedSuccessEquipment] = useState<Equipamento | null>(null);
  const [detailEquipment, setDetailEquipment] = useState<Equipamento | null>(null);
  const [editEquipment, setEditEquipment] = useState<Equipamento | null>(null);
  const [transferEquipment, setTransferEquipment] = useState<Equipamento | null>(null);
  const [maintenanceEquipment, setMaintenanceEquipment] = useState<Equipamento | null>(null);
  const [finishMaintenanceEquipment, setFinishMaintenanceEquipment] = useState<Equipamento | null>(null);
  const [statusChangeEquipment, setStatusChangeEquipment] = useState<Equipamento | null>(null);
  const [decommissionEquipment, setDecommissionEquipment] = useState<Equipamento | null>(null);

  // Verificação de autenticação
  if (!currentUser) {
    return <LoginView />;
  }

  if (currentUser.status === 'PENDENTE') {
    return <PendingApprovalView />;
  }

  // Navegação com filtros opcionais
  const handleNavigate = (view: NavItemKey, filterParam?: string) => {
    setActiveView(view);
    if (filterParam) {
      setInventoryFilterParam(filterParam);
    }
  };

  // Busca rápida no Header
  const handleQuickSearch = (query: string) => {
    const eq = findEquipmentByCode(query);
    if (eq) {
      setDetailEquipment(eq);
    } else {
      setActiveView('inventory');
      setInventoryFilterParam(query);
    }
  };

  // Callback de sucesso no cadastro
  const handleEquipmentCreated = (newEq: Equipamento) => {
    setCreatedSuccessEquipment(newEq);
  };

  // Navegar para Etiquetas com IDs selecionados
  const handleNavigateToLabels = (selectedIds?: string[]) => {
    if (selectedIds) setLabelsInitialIds(selectedIds);
    setActiveView('labels');
  };

  return (
    <Layout
      activeView={activeView}
      onNavigate={handleNavigate}
      onQuickSearch={handleQuickSearch}
    >
      {/* Roteador de Views */}
      {activeView === 'dashboard' && (
        <DashboardView
          onNavigate={handleNavigate}
          onOpenNewEquipment={() => {
            setPreFilledCodeForNew(undefined);
            setIsNewEquipmentModalOpen(true);
          }}
        />
      )}

      {activeView === 'inventory' && (
        <InventoryView
          onOpenNewEquipment={() => {
            setPreFilledCodeForNew(undefined);
            setIsNewEquipmentModalOpen(true);
          }}
          onViewDetails={eq => setDetailEquipment(eq)}
          onOpenTransfer={eq => setTransferEquipment(eq)}
          onOpenMaintenance={eq => setMaintenanceEquipment(eq)}
          onOpenFinishMaintenance={eq => setFinishMaintenanceEquipment(eq)}
          onOpenStatusChange={eq => setStatusChangeEquipment(eq)}
          onOpenDecommission={eq => setDecommissionEquipment(eq)}
          onOpenEdit={eq => setEditEquipment(eq)}
          onNavigateToLabels={handleNavigateToLabels}
          onNavigateToConference={() => setActiveView('conference')}
          initialFilter={inventoryFilterParam}
        />
      )}

      {activeView === 'scanner' && (
        <ScannerView
          onOpenNewEquipmentWithCode={code => {
            setPreFilledCodeForNew(code);
            setIsNewEquipmentModalOpen(true);
          }}
          onOpenTransfer={eq => setTransferEquipment(eq)}
          onOpenMaintenance={eq => setMaintenanceEquipment(eq)}
          onOpenFinishMaintenance={eq => setFinishMaintenanceEquipment(eq)}
          onOpenStatusChange={eq => setStatusChangeEquipment(eq)}
          onOpenDecommission={eq => setDecommissionEquipment(eq)}
          onOpenEdit={eq => setEditEquipment(eq)}
          onViewDetails={eq => setDetailEquipment(eq)}
        />
      )}

      {activeView === 'labels' && (
        <LabelsView initialSelectedIds={labelsInitialIds} />
      )}

      {activeView === 'maintenance' && (
        <MaintenanceView
          onOpenNewMaintenance={eq => {
            if (eq) {
              setMaintenanceEquipment(eq);
            } else {
              setActiveView('inventory');
            }
          }}
          onOpenFinishMaintenance={eq => setFinishMaintenanceEquipment(eq)}
          onViewEquipmentDetails={eq => setDetailEquipment(eq)}
        />
      )}

      {activeView === 'conference' && <ConferenceView />}

      {activeView === 'movements' && <MovementsView />}

      {activeView === 'reports' && <ReportsView />}

      {activeView === 'users' && <UsersView />}

      {activeView === 'audit' && <AuditView />}

      {activeView === 'settings' && <SettingsView />}

      {/* MODAIS GLOBAIS */}
      {/* 1. Modal Novo Equipamento */}
      <NewEquipmentModal
        isOpen={isNewEquipmentModalOpen}
        onClose={() => {
          setIsNewEquipmentModalOpen(false);
          setPreFilledCodeForNew(undefined);
        }}
        onSuccess={handleEquipmentCreated}
        initialPreFilledCode={preFilledCodeForNew}
      />

      {/* 2. Modal Sucesso com Barcode & Impressão */}
      <EquipmentSuccessModal
        isOpen={!!createdSuccessEquipment}
        onClose={() => setCreatedSuccessEquipment(null)}
        equipamento={createdSuccessEquipment}
        onOpenNewAnother={() => {
          setPreFilledCodeForNew(undefined);
          setIsNewEquipmentModalOpen(true);
        }}
        onViewDetails={eq => setDetailEquipment(eq)}
      />

      {/* 3. Modal Detalhes & Timeline do Patrimônio */}
      <EquipmentDetailModal
        isOpen={!!detailEquipment}
        onClose={() => setDetailEquipment(null)}
        equipamento={detailEquipment}
        onOpenTransfer={eq => setTransferEquipment(eq)}
        onOpenMaintenance={eq => setMaintenanceEquipment(eq)}
        onOpenFinishMaintenance={eq => setFinishMaintenanceEquipment(eq)}
        onOpenStatusChange={eq => setStatusChangeEquipment(eq)}
        onOpenDecommission={eq => setDecommissionEquipment(eq)}
        onOpenEdit={eq => setEditEquipment(eq)}
      />

      {/* 4. Modal Edição */}
      <EquipmentEditModal
        isOpen={!!editEquipment}
        onClose={() => setEditEquipment(null)}
        equipamento={editEquipment}
      />

      {/* 5. Modal Transferência */}
      <TransferModal
        isOpen={!!transferEquipment}
        onClose={() => setTransferEquipment(null)}
        equipamento={transferEquipment}
      />

      {/* 6. Modal Enviar Manutenção */}
      <SendMaintenanceModal
        isOpen={!!maintenanceEquipment}
        onClose={() => setMaintenanceEquipment(null)}
        equipamento={maintenanceEquipment}
      />

      {/* 7. Modal Finalizar Manutenção */}
      <FinishMaintenanceModal
        isOpen={!!finishMaintenanceEquipment}
        onClose={() => setFinishMaintenanceEquipment(null)}
        equipamento={finishMaintenanceEquipment}
      />

      {/* 8. Modal Alterar Status */}
      <ChangeStatusModal
        isOpen={!!statusChangeEquipment}
        onClose={() => setStatusChangeEquipment(null)}
        equipamento={statusChangeEquipment}
      />

      {/* 9. Modal Dar Baixa */}
      <DecommissionModal
        isOpen={!!decommissionEquipment}
        onClose={() => setDecommissionEquipment(null)}
        equipamento={decommissionEquipment}
      />
    </Layout>
  );
};

export function App() {
  return (
    <AuthProvider>
      <InventoryProvider>
        <MainApp />
      </InventoryProvider>
    </AuthProvider>
  );
}

export default App;
