import { DriverEntry, DriverStatus } from '../types';

export const DEFAULT_COLUMNS = [
  'ID',
  'Data/Hora Registro',
  'Nome do Motorista',
  'Rota Alfanumérica',
  'Cidade Destino',
  'Rota Prioridade',
  'Horário de Chegada',
  'Localização na Base (Google Maps)',
  'Link Google Maps',
  'Placa do Veículo',
  'Telefone',
  'Status',
  'Doca Designada',
  'Horário da Chamada',
  'Início Carregamento',
  'Fim Carregamento',
  'Observações'
];

export interface SheetParseResult {
  drivers: DriverEntry[];
  sheetName: string;
  headerColumns: string[];
}

export class GoogleSheetsService {
  // Get spreadsheet metadata to retrieve exact sheet/tab names
  public static async getSpreadsheetInfo(accessToken: string, spreadsheetId: string) {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ao acessar planilha (${res.status})`);
    }

    const data = await res.json();
    return data;
  }

  // Create a brand new logistics spreadsheet with styling
  public static async createSpreadsheet(accessToken: string, title: string = 'Controle de Chamadas - Docas') {
    const requestBody = {
      properties: {
        title: `${title} (${new Date().toLocaleDateString('pt-BR')})`,
      },
      sheets: [
        {
          properties: {
            title: 'Controle de Chamadas',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    };

    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Falha ao criar planilha Google Sheets (${res.status})`);
    }

    const created = await res.json();
    const spreadsheetId = created.spreadsheetId;
    const spreadsheetUrl = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Add headers and initial styling
    await this.initializeHeaders(accessToken, spreadsheetId, 'Controle de Chamadas');

    return {
      spreadsheetId,
      spreadsheetUrl,
      sheetName: 'Controle de Chamadas',
    };
  }

  // Create daily spreadsheet for a specific day's driver call
  public static async createDailySpreadsheet(accessToken: string, dateLabel?: string) {
    const today = dateLabel || new Date().toLocaleDateString('pt-BR');
    const title = `Chamada de Motoristas - ${today}`;
    const result = await this.createSpreadsheet(accessToken, title);
    return {
      ...result,
      dateLabel: today,
    };
  }

  // Initialize header row with logistics columns
  private static async initializeHeaders(accessToken: string, spreadsheetId: string, sheetTitle: string) {
    const range = `'${sheetTitle}'!A1:N1`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range,
          majorDimension: 'ROWS',
          values: [DEFAULT_COLUMNS],
        }),
      }
    );

    if (!res.ok) {
      console.warn('Could not set headers automatically:', await res.text());
    }
  }

  // Read all rows and map them into DriverEntry
  public static async fetchDriversFromSheet(
    accessToken: string,
    spreadsheetId: string,
    preferSheetName?: string
  ): Promise<SheetParseResult> {
    // 1. Discover active tab
    const info = await this.getSpreadsheetInfo(accessToken, spreadsheetId);
    const sheets = info.sheets || [];
    if (sheets.length === 0) {
      throw new Error('Nenhuma aba encontrada na planilha especificada.');
    }

    let targetSheetTitle = sheets[0]?.properties?.title || 'Sheet1';
    if (preferSheetName) {
      const found = sheets.find((s: any) => s.properties?.title === preferSheetName);
      if (found) targetSheetTitle = found.properties.title;
    }

    // 2. Read values
    const range = `'${targetSheetTitle}'!A1:Z1000`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ao ler dados da planilha (${res.status})`);
    }

    const data = await res.json();
    const rows: string[][] = data.values || [];

    if (rows.length === 0) {
      return {
        drivers: [],
        sheetName: targetSheetTitle,
        headerColumns: DEFAULT_COLUMNS,
      };
    }

    // 3. Map headers dynamically (supports both native app columns & Google Forms default columns)
    const rawHeader = rows[0].map(h => (h || '').toString().trim());
    const colIndex = (searchTerms: string[]): number => {
      const lowerSearch = searchTerms.map(s => s.toLowerCase());
      return rawHeader.findIndex(h => {
        const val = h.toLowerCase();
        return lowerSearch.some(term => val.includes(term));
      });
    };

    const idxId = colIndex(['id', 'código', 'codigo']);
    const idxTimestamp = colIndex(['carimbo', 'data/hora', 'data', 'timestamp', 'registro']);
    const idxNome = colIndex(['nome', 'motorista', 'condutor']);
    const idxRota = colIndex(['rota alfanumérica', 'código alfanumérico', 'rota', 'itinerário', 'itinerario']);
    const idxCidade = colIndex(['cidade destino', 'cidade', 'município', 'municipio']);
    const idxPrioridade = colIndex(['rota prioridade', 'prioridade', 'urgente']);
    const idxChegada = colIndex(['horário de chegada', 'horario de chegada', 'chegada', 'hora']);
    const idxLocal = colIndex(['localização na base', 'localização', 'localizacao', 'pátio', 'patio', 'vaga', 'estacionamento', 'onde você está']);
    const idxMapsUrl = colIndex(['link google maps', 'maps', 'google maps', 'localização no mapa']);
    const idxPlaca = colIndex(['placa', 'veículo', 'veiculo', 'caminhão', 'cavalo']);
    const idxTelefone = colIndex(['telefone', 'celular', 'whatsapp', 'contato']);
    const idxStatus = colIndex(['status', 'situação', 'situacao', 'estado']);
    const idxDoca = colIndex(['doca', 'doca designada', 'baia']);
    const idxChamada = colIndex(['horário da chamada', 'horario da chamada', 'chamado em']);
    const idxInicio = colIndex(['início', 'inicio carregamento', 'inicio']);
    const idxFim = colIndex(['fim', 'conclusão', 'conclusao', 'finalizado']);
    const idxObs = colIndex(['observações', 'observacoes', 'obs', 'notas']);

    const drivers: DriverEntry[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(cell => !cell || cell.trim() === '')) {
        continue; // skip completely empty rows
      }

      const getVal = (idx: number, fallback: string = ''): string => {
        if (idx >= 0 && idx < row.length && row[idx] !== undefined) {
          return String(row[idx]).trim();
        }
        return fallback;
      };

      const nome = getVal(idxNome, `Motorista Linha ${i + 1}`);
      if (!nome) continue;

      let rawStatus = getVal(idxStatus, 'aguardando').toLowerCase();
      let status: DriverStatus = 'aguardando';
      if (rawStatus.includes('chamad')) status = 'chamado';
      else if (rawStatus.includes('carreg')) status = 'carregando';
      else if (rawStatus.includes('conclu') || rawStatus.includes('finaliz')) status = 'concluido';
      else if (rawStatus.includes('cancel')) status = 'cancelado';

      const id = getVal(idxId, `row-${i + 1}-${Date.now()}`);
      const timestamp = getVal(idxTimestamp, new Date().toISOString());
      const rota = getVal(idxRota, 'SP-01');
      const cidade = getVal(idxCidade, '');
      const rawPrioridade = getVal(idxPrioridade, '').toLowerCase();
      const rotaPrioridade = rawPrioridade.includes('sim') || rawPrioridade.includes('prior') || rawPrioridade.includes('urgente') || rawPrioridade === 'true';
      const horarioChegada = getVal(idxChegada, new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      const localizacao = getVal(idxLocal, 'Pátio');
      const mapsUrl = getVal(idxMapsUrl, '');
      const placa = getVal(idxPlaca, '---');
      const telefone = getVal(idxTelefone, '');
      const docaDesignada = getVal(idxDoca, '');
      const horarioChamada = getVal(idxChamada, '');
      const inicioCarregamento = getVal(idxInicio, '');
      const fimCarregamento = getVal(idxFim, '');
      const observacoes = getVal(idxObs, '');

      // Parse coordinates from mapsUrl or location if present
      let lat: number | undefined;
      let lng: number | undefined;
      const coordMatch = (mapsUrl + ' ' + localizacao).match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }

      drivers.push({
        id,
        rowIndex: i + 1, // 1-based index in sheet
        timestamp,
        nome,
        rota,
        cidade: cidade || undefined,
        rotaPrioridade,
        horarioChegada,
        localizacao,
        latitude: lat,
        longitude: lng,
        mapsUrl: mapsUrl || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : undefined),
        placa,
        telefone,
        status,
        docaDesignada: docaDesignada || undefined,
        horarioChamada: horarioChamada || undefined,
        inicioCarregamento: inicioCarregamento || undefined,
        fimCarregamento: fimCarregamento || undefined,
        observacoes: observacoes || undefined,
      });
    }

    return {
      drivers,
      sheetName: targetSheetTitle,
      headerColumns: rawHeader.length > 0 ? rawHeader : DEFAULT_COLUMNS,
    };
  }

  // Update a driver's row with status, dock, call time
  public static async updateDriverRow(
    accessToken: string,
    spreadsheetId: string,
    sheetTitle: string,
    rowIndex: number,
    driver: DriverEntry,
    headerColumns: string[]
  ): Promise<void> {
    // If rowIndex is not known, we can't update a specific row
    if (!rowIndex || rowIndex < 2) return;

    // Helper to find column letter (e.g. 0 -> A, 1 -> B, ...)
    const toColLetter = (colIdx: number): string => {
      let temp = colIdx;
      let letter = '';
      while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
      }
      return letter;
    };

    // Map column updates
    const colIndex = (terms: string[]): number => {
      const lowerTerms = terms.map(t => t.toLowerCase());
      return headerColumns.findIndex(h => {
        const val = h.toLowerCase();
        return lowerTerms.some(term => val.includes(term));
      });
    };

    const statusCol = colIndex(['status', 'situação', 'situacao']);
    const docaCol = colIndex(['doca', 'doca designada']);
    const chamadaCol = colIndex(['horário da chamada', 'horario da chamada', 'chamado em']);
    const inicioCol = colIndex(['início', 'inicio carregamento']);
    const fimCol = colIndex(['fim', 'conclusão', 'conclusao']);
    const qtyCol = colIndex(['quantidade', 'volumes', 'pacotes']);
    const colabCol = colIndex(['colaborador', 'responsável', 'responsavel', 'mesa']);
    const iscaCol = colIndex(['isca', 'rastreador']);

    const batchData: Array<{ range: string; values: string[][] }> = [];

    if (statusCol >= 0) {
      const col = toColLetter(statusCol);
      batchData.push({
        range: `'${sheetTitle}'!${col}${rowIndex}`,
        values: [[driver.status.toUpperCase()]],
      });
    }

    if (docaCol >= 0 && driver.docaDesignada !== undefined) {
      const col = toColLetter(docaCol);
      batchData.push({
        range: `'${sheetTitle}'!${col}${rowIndex}`,
        values: [[driver.docaDesignada]],
      });
    }

    if (chamadaCol >= 0 && driver.horarioChamada !== undefined) {
      const col = toColLetter(chamadaCol);
      batchData.push({
        range: `'${sheetTitle}'!${col}${rowIndex}`,
        values: [[driver.horarioChamada]],
      });
    }

    if (inicioCol >= 0 && driver.inicioCarregamento !== undefined) {
      const col = toColLetter(inicioCol);
      batchData.push({
        range: `'${sheetTitle}'!${col}${rowIndex}`,
        values: [[driver.inicioCarregamento]],
      });
    }

    if (fimCol >= 0 && driver.fimCarregamento !== undefined) {
      const col = toColLetter(fimCol);
      batchData.push({
        range: `'${sheetTitle}'!${col}${rowIndex}`,
        values: [[driver.fimCarregamento]],
      });
    }

    if (qtyCol >= 0 && driver.quantidadeCarregada !== undefined) {
      const col = toColLetter(qtyCol);
      batchData.push({
        range: `'${sheetTitle}'!${col}${rowIndex}`,
        values: [[String(driver.quantidadeCarregada)]],
      });
    }

    if (colabCol >= 0 && driver.colaboradorResponsavel !== undefined) {
      const col = toColLetter(colabCol);
      batchData.push({
        range: `'${sheetTitle}'!${col}${rowIndex}`,
        values: [[driver.colaboradorResponsavel]],
      });
    }

    if (iscaCol >= 0 && driver.numeroIsca !== undefined) {
      const col = toColLetter(iscaCol);
      batchData.push({
        range: `'${sheetTitle}'!${col}${rowIndex}`,
        values: [[driver.numeroIsca]],
      });
    }

    if (batchData.length === 0) {
      return;
    }

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: batchData,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ao atualizar linha no Google Sheets (${res.status})`);
    }
  }

  // Append a new driver check-in
  public static async appendDriverCheckin(
    accessToken: string,
    spreadsheetId: string,
    sheetTitle: string,
    driver: Omit<DriverEntry, 'id' | 'rowIndex'>
  ): Promise<void> {
    const newId = `DRV-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');

    const rowData = [
      newId,
      dateFormatted,
      driver.nome,
      driver.rota,
      driver.cidade || '',
      driver.rotaPrioridade ? 'SIM (Prioridade)' : 'NÃO',
      driver.horarioChegada || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      driver.localizacao,
      driver.mapsUrl || '',
      driver.placa.toUpperCase(),
      driver.telefone || '',
      'AGUARDANDO',
      driver.docaDesignada || '',
      driver.horarioChamada || '',
      driver.inicioCarregamento || '',
      driver.fimCarregamento || '',
      driver.observacoes || '',
    ];

    const range = `'${sheetTitle}'!A:Q`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ao registrar motorista na planilha (${res.status})`);
    }
  }

  // --- ACCESS CONTROL SPREADSHEET SYNC METHODS ---
  public static readonly AUTH_COLUMNS = [
    'Nome Completo',
    'CPF',
    'Telefone para Contato',
    'Login / Usuário',
    'Senha (8 Dígitos Mesclados)',
    'Perfil / Nível',
    'Status',
    'Data de Cadastro',
    'Observações'
  ];

  // Ensure authorized users tab exists with headers and initial data
  public static async ensureAuthorizedUsersTab(
    accessToken: string,
    spreadsheetId: string,
    sheetTitle: string = 'Acessos_Autorizados'
  ): Promise<void> {
    const info = await this.getSpreadsheetInfo(accessToken, spreadsheetId);
    const sheets = info.sheets || [];
    const exists = sheets.some((s: any) => s.properties?.title === sheetTitle);

    if (!exists) {
      // Add sheet tab
      const addRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetTitle,
                    gridProperties: {
                      frozenRowCount: 1,
                    },
                  },
                },
              },
            ],
          }),
        }
      );

      if (!addRes.ok) {
        const err = await addRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Falha ao criar aba de controle de acessos na planilha.');
      }

      // Add headers and initial rows
      const initRange = `'${sheetTitle}'!A1:I3`;
      const initialRows = [
        this.AUTH_COLUMNS,
        [
          'Giliano - Administrador Geral',
          '123.456.789-00',
          '(11) 98765-4321',
          'admin',
          'Gi15L0i1',
          'Administrador Geral',
          'Ativo',
          new Date().toLocaleDateString('pt-BR'),
          'Acesso Mestre do Administrador Geral'
        ],
        [
          'Carlos Oliveira',
          '234.567.890-11',
          '(11) 97654-3210',
          'operador',
          'Ca25R0l0',
          'Operador de Docas',
          'Ativo',
          new Date().toLocaleDateString('pt-BR'),
          'Operador de Chamada de Carros'
        ],
      ];

      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(initRange)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: initRange,
            majorDimension: 'ROWS',
            values: initialRows,
          }),
        }
      );
    }
  }

  // Fetch authorized users from the sheet
  public static async fetchAuthorizedUsersFromSheet(
    accessToken: string,
    spreadsheetId: string,
    sheetTitle: string = 'Acessos_Autorizados'
  ): Promise<string[][]> {
    const range = `'${sheetTitle}'!A2:I100`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      // If 400/404 because sheet tab doesn't exist yet, try to create it
      if (res.status === 400 || res.status === 404) {
        await this.ensureAuthorizedUsersTab(accessToken, spreadsheetId, sheetTitle);
        // Retry once
        const retry = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (retry.ok) {
          const retData = await retry.json();
          return retData.values || [];
        }
      }
      return [];
    }

    const data = await res.json();
    return data.values || [];
  }

  // Append new authorized user to the sheet
  public static async appendAuthorizedUserToSheet(
    accessToken: string,
    spreadsheetId: string,
    user: {
      name: string;
      cpf: string;
      phone: string;
      username: string;
      password: string;
      role: string;
      status: string;
      createdAt: string;
      notes?: string;
    },
    sheetTitle: string = 'Acessos_Autorizados'
  ): Promise<void> {
    await this.ensureAuthorizedUsersTab(accessToken, spreadsheetId, sheetTitle);

    const row = [
      user.name,
      user.cpf,
      user.phone,
      user.username,
      user.password,
      user.role === 'admin_geral' ? 'Administrador Geral' : 'Operador',
      user.status === 'ativo' ? 'Ativo' : 'Bloqueado',
      user.createdAt || new Date().toLocaleDateString('pt-BR'),
      user.notes || '',
    ];

    const range = `'${sheetTitle}'!A:I`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Erro ao gravar usuário na planilha de acessos.');
    }
  }

  // Update an existing user in the sheet
  public static async updateAuthorizedUserInSheet(
    accessToken: string,
    spreadsheetId: string,
    rowIndex: number,
    user: {
      name: string;
      cpf: string;
      phone: string;
      username: string;
      password: string;
      role: string;
      status: string;
      createdAt: string;
      notes?: string;
    },
    sheetTitle: string = 'Acessos_Autorizados'
  ): Promise<void> {
    const row = [
      user.name,
      user.cpf,
      user.phone,
      user.username,
      user.password,
      user.role === 'admin_geral' ? 'Administrador Geral' : 'Operador',
      user.status === 'ativo' ? 'Ativo' : 'Bloqueado',
      user.createdAt || new Date().toLocaleDateString('pt-BR'),
      user.notes || '',
    ];

    const range = `'${sheetTitle}'!A${rowIndex}:I${rowIndex}`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range,
          majorDimension: 'ROWS',
          values: [row],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Erro ao atualizar usuário na planilha de acessos.');
    }
  }
}
