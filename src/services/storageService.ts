import { DriverEntry, Dock, WorkspaceConfig } from '../types';

const INITIAL_DOCKS: Dock[] = [
  { id: 'dock-1', numero: '01', nome: 'Doca 01', status: 'carregando', colaboradorNome: 'Carlos Silva (Mesa 01)' },
  { id: 'dock-2', numero: '02', nome: 'Doca 02', status: 'chamando', colaboradorNome: 'Marcos Santos (Mesa 02)' },
  { id: 'dock-3', numero: '03', nome: 'Doca 03', status: 'livre', colaboradorNome: 'Mariana Lima' },
  { id: 'dock-4', numero: '04', nome: 'Doca 04', status: 'livre' },
  { id: 'dock-5', numero: '05', nome: 'Doca 05', status: 'livre' },
  { id: 'dock-6', numero: '06', nome: 'Doca 06', status: 'manutencao' },
];

const INITIAL_DRIVERS: DriverEntry[] = [
  {
    id: 'drv-1',
    rowIndex: 2,
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    nome: 'Roberto Alves Costa',
    rota: 'GAM-01',
    cidade: 'Gama',
    rotaPrioridade: true,
    horarioChegada: '07:30',
    localizacao: 'Pátio Condomínio SYS Gama (~45m)',
    latitude: -16.0492,
    longitude: -48.0483,
    mapsUrl: 'https://www.google.com/maps?q=-16.0492,-48.0483',
    placa: 'RST3C90',
    telefone: '(61) 98112-7788',
    status: 'carregando',
    docaDesignada: 'Doca 01',
    horarioChamada: '07:45',
    inicioCarregamento: '07:55',
    colaboradorResponsavel: 'Carlos Silva (Mesa 01)',
  },
  {
    id: 'drv-2',
    rowIndex: 3,
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    nome: 'Luciana Santos Ramos',
    rota: 'SJC-03',
    cidade: 'São José dos Campos',
    rotaPrioridade: true,
    horarioChegada: '08:00',
    localizacao: 'Guarita / Vaga Visitante (Base)',
    latitude: -23.5510,
    longitude: -46.6340,
    mapsUrl: 'https://www.google.com/maps?q=-23.5510,-46.6340',
    placa: 'KLP4421',
    telefone: '(12) 99881-2233',
    status: 'chamado',
    docaDesignada: 'Doca 02',
    horarioChamada: '08:20',
  },
  {
    id: 'drv-3',
    rowIndex: 4,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    nome: 'Carlos Eduardo Silva',
    rota: 'SP-14',
    cidade: 'São Paulo',
    rotaPrioridade: false,
    horarioChegada: '08:15',
    localizacao: 'Pátio A - Vaga Carro 04',
    latitude: -23.5518,
    longitude: -46.6325,
    mapsUrl: 'https://www.google.com/maps?q=-23.5518,-46.6325',
    placa: 'BRA2E19',
    telefone: '(11) 98765-4321',
    status: 'aguardando',
  },
  {
    id: 'drv-4',
    rowIndex: 5,
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    nome: 'Marcos Antônio Pereira',
    rota: 'CPN-08',
    cidade: 'Campinas',
    rotaPrioridade: true,
    horarioChegada: '08:35',
    localizacao: 'Pátio B - Vaga 12',
    latitude: -23.5522,
    longitude: -46.6318,
    mapsUrl: 'https://www.google.com/maps?q=-23.5522,-46.6318',
    placa: 'FDX9A88',
    telefone: '(19) 99123-4567',
    status: 'aguardando',
  },
  {
    id: 'drv-5',
    rowIndex: 6,
    timestamp: new Date(Date.now() - 1500000).toISOString(),
    nome: 'Felipe de Souza',
    rota: 'ABC-05',
    cidade: 'Santo André',
    rotaPrioridade: false,
    horarioChegada: '08:50',
    localizacao: 'Pátio C - Estacionamento Utilitários',
    latitude: -23.5501,
    longitude: -46.6350,
    mapsUrl: 'https://www.google.com/maps?q=-23.5501,-46.6350',
    placa: 'QWE7B12',
    telefone: '(11) 97654-1122',
    status: 'aguardando',
  },
  {
    id: 'drv-6',
    rowIndex: 7,
    timestamp: new Date(Date.now() - 600000).toISOString(),
    nome: 'José Wellington Dias',
    rota: 'SOR-11',
    cidade: 'Sorocaba',
    rotaPrioridade: false,
    horarioChegada: '09:05',
    localizacao: 'Pátio A - Vaga Carro 09',
    latitude: -23.5512,
    longitude: -46.6338,
    mapsUrl: 'https://www.google.com/maps?q=-23.5512,-46.6338',
    placa: 'GHJ5678',
    telefone: '(15) 99345-6789',
    status: 'aguardando',
  },
];

// Link driver to initial docks
INITIAL_DOCKS[0].motoristaAtual = INITIAL_DRIVERS[0];
INITIAL_DOCKS[1].motoristaAtual = INITIAL_DRIVERS[1];

export const getStoredDrivers = (): DriverEntry[] => {
  try {
    const raw = localStorage.getItem('docafacil_drivers');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore error
  }
  return INITIAL_DRIVERS;
};

export const setStoredDrivers = (drivers: DriverEntry[]) => {
  try {
    localStorage.setItem('docafacil_drivers', JSON.stringify(drivers));
  } catch (e) {
    // Ignore error
  }
};

export const getStoredDocks = (): Dock[] => {
  try {
    const raw = localStorage.getItem('docafacil_docks');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore error
  }
  return INITIAL_DOCKS;
};

export const setStoredDocks = (docks: Dock[]) => {
  try {
    localStorage.setItem('docafacil_docks', JSON.stringify(docks));
  } catch (e) {
    // Ignore error
  }
};

export const getStoredConfig = (): WorkspaceConfig => {
  try {
    const raw = localStorage.getItem('docafacil_workspace_config');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore error
  }
  return {
    spreadsheetId: '',
    spreadsheetUrl: '',
    sheetName: 'Controle de Chamadas',
    autoSyncInterval: 5,
    isSyncing: false,
  };
};

export const setStoredConfig = (config: WorkspaceConfig) => {
  try {
    localStorage.setItem('docafacil_workspace_config', JSON.stringify(config));
  } catch (e) {
    // Ignore error
  }
};
