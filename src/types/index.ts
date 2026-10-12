export type DriverStatus = 'aguardando' | 'chamado' | 'carregando' | 'concluido' | 'cancelado';

export interface DriverEntry {
  id: string;
  rowIndex?: number; // 1-based index in Google Sheets
  timestamp: string; // ISO or date string
  nome: string;
  rota: string; // Código alfanumérico da rota (ex: SP-01, RT-104, ZS-02)
  cidade?: string; // Cidade de destino indicada pelo motorista (ex: São Paulo, Campinas, Santos)
  rotaPrioridade?: boolean; // Rota prioridade definida no forms/guarita
  horarioChegada: string; // HH:mm or timestamp
  localizacao: string; // e.g. Pátio Norte, Vaga 12 ou Pátio da Base (Google Maps)
  latitude?: number;
  longitude?: number;
  mapsUrl?: string; // Link direto do Google Maps para o ponto da chegada
  placa: string;
  telefone?: string;
  status: DriverStatus;
  docaDesignada?: string; // e.g. Doca 01
  horarioChamada?: string; // HH:mm
  inicioCarregamento?: string;
  fimCarregamento?: string;
  observacoes?: string;
  quantidadeCarregada?: number | string; // Quantidade de pacotes/volumes carregados
  numeroIsca?: string; // Número da isca de segurança / rastreador (CONFIDENCIAL ADM)
  colaboradorResponsavel?: string; // Nome do colaborador que acompanhou a carga na doca
  colaboradorId?: string; // ID do colaborador
}

export type DockStatus = 'livre' | 'chamando' | 'carregando' | 'manutencao' | 'pausada';

export interface Dock {
  id: string;
  numero: string; // e.g. "01", "02"
  nome: string; // e.g. "Doca 01"
  status: DockStatus;
  motoristaAtual?: DriverEntry;
  chamadoEm?: string; // timestamp
  tipoCarga?: string; // e.g. "Seca", "Refrigerada", "Geral"
  colaboradorId?: string; // ID do colaborador que assumiu a mesa da doca
  colaboradorNome?: string; // Nome do colaborador na mesa
  pausadaEm?: number; // timestamp quando entrou em pausa
  pausaMotivo?: string; // Motivo da pausa (ex: Almoço, Intervalo, Manutenção)
  quantidadeCarregada?: number | string;
  numeroIsca?: string; // Confidencial Adm
}

export interface CallAlertEvent {
  id: string;
  motoristaNome: string;
  placa: string;
  docaNome: string;
  rota: string;
  timestamp: number;
  chamadaId: string;
}

export interface DailyWorkspaceItem {
  date: string; // Formato YYYY-MM-DD ou DD/MM/AAAA
  formattedDate: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
  formId?: string;
  formUrl?: string;
  formResponderUrl?: string;
  createdAt: string;
}

export interface WorkspaceConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
  formId?: string;
  formUrl?: string;
  formResponderUrl?: string;
  lastSyncTimestamp?: number;
  autoSyncInterval: number; // in seconds
  isSyncing: boolean;
  authSpreadsheetId?: string; // Planilha permanente e fixa de logins e acessos de motoristas/operadores
  authSheetName?: string; // Aba permanente para credenciais (default: 'Acessos_Autorizados')
  activeDailyDate?: string; // Data da chamada diária ativa (ex: '2026-10-09')
  dailyWorkspaces?: DailyWorkspaceItem[]; // Histórico das planilhas e formulários criados para cada dia
  secondaryGoogleEmail?: string; // Segunda conta Google de gerenciamento previamente autorizada pelo Admin Geral
}

export type UserRole = 'admin_geral' | 'operador' | 'supervisor';
export type UserStatus = 'ativo' | 'bloqueado';

export interface AuthorizedUser {
  id: string;
  name: string; // Nome completo do operador
  cpf: string; // CPF (ex: 123.456.789-00)
  phone: string; // Telefone para contato (ex: 11 98765-4321)
  username: string; // Login / Usuário
  password: string; // Senha mesclada de 8 dígitos (maiúsculas e minúsculas)
  role: UserRole; // Nível de acesso
  status: UserStatus; // Ativo ou Bloqueado
  createdAt: string; // Data de cadastro
  notes?: string; // Observações
  rowIndex?: number; // Linha na planilha do Google Sheets
  assignedDockId?: string; // Doca atribuída ao colaborador
  assignedDockNome?: string; // Nome da doca atribuída (ex: 'Doca 01')
}

// Permissões configuráveis pelo Administrador Geral para Colaboradores
export interface CollaboratorPermissions {
  canCallDrivers: boolean; // Chamar motoristas para a doca
  canStartLoading: boolean; // Iniciar carregamento
  canFinishLoading: boolean; // Finalizar carregamento
  canTransferPackages: boolean; // Movimentar pacotes entre rotas
  canSearchCep: boolean; // Consultar CEP no sistema
  canUseChat: boolean; // Chat com administração e outras docas
  canPauseDock: boolean; // Botão de pausa na doca
  canSwitchDock: boolean; // Mudar de doca
}

// Mensagens no Chat entre Docas e Administradores
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole | 'admin_geral' | 'gerenciamento';
  dockId?: string;
  dockNome?: string;
  text: string;
  timestamp: number;
  isUrgent?: boolean;
}

// Remanejamento e sinalização de pacotes entre rotas / docas
export interface PackageTransfer {
  id: string;
  codigoPacote: string; // Código de rastreio ou volume
  descricao?: string;
  origemDocaId: string;
  origemDocaNome: string;
  origemColaboradorNome: string;
  rotaOrigem: string;
  rotaDestino: string;
  destinoDocaId?: string;
  destinoDocaNome?: string;
  timestamp: number;
  status: 'pendente' | 'recebido' | 'cancelado';
  recebidoPorNome?: string;
  recebidoEm?: number;
  observacao?: string;
}

// Consulta de CEP via ViaCEP
export interface CepResult {
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge?: string;
  ddd?: string;
  erro?: boolean;
}

export type AppViewMode = 'dashboard' | 'driver-tv' | 'driver-mobile' | 'driver-checkin';

