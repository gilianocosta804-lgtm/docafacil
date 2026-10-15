export interface CreatedFormResult {
  formId: string;
  responderUri: string;
  editUri: string;
  title: string;
}

export class GoogleFormsService {
  // Create a driver check-in Google Form with the requested questions
  public static async createDriverArrivalForm(accessToken: string, title: string = 'Check-in de Chegada de Carros - Carregamento Docas'): Promise<CreatedFormResult> {
    // 1. Create the Form
    const initialBody = {
      info: {
        title: title,
        documentTitle: title,
      },
    };

    const res = await fetch('https://forms.googleapis.com/v1/forms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(initialBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Falha ao criar Google Form (${res.status})`);
    }

    const createdForm = await res.json();
    const formId = createdForm.formId;
    const responderUri = createdForm.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`;
    const editUri = `https://docs.google.com/forms/d/${formId}/edit`;

    // 2. Add requested questions to the Form
    const updateRequests = {
      includeFormInResponse: true,
      requests: [
        {
          updateFormInfo: {
            info: {
              description:
                'Formulário oficial para motoristas ao chegarem na base com seus carros. Preencha seus dados para entrar na fila de chamada das docas.',
            },
            updateMask: 'description',
          },
        },
        {
          createItem: {
            item: {
              title: 'Nome Completo do Motorista',
              description: 'Informe seu nome e sobrenome',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: {
                    paragraph: false,
                  },
                },
              },
            },
            location: { index: 0 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Código Alfanumérico da Rota',
              description: 'Informe o código alfanumérico da sua rota (Exemplos: SP-01, RT-104, CPN-08, SAN-02, ZS-14)',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: {
                    paragraph: false,
                  },
                },
              },
            },
            location: { index: 1 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Cidade de Destino',
              description: 'Indique a cidade para onde você vai realizar as entregas (Ex: São Paulo, Campinas, Santos, Sorocaba)',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: {
                    paragraph: false,
                  },
                },
              },
            },
            location: { index: 2 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Rota Prioridade?',
              description: 'Sua carga é de rota com prioridade de saída imediata / urgente?',
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: 'RADIO',
                    options: [
                      { value: 'Sim - Rota Prioridade (Urgente)' },
                      { value: 'Não - Rota Normal / Padrão' },
                    ],
                  },
                },
              },
            },
            location: { index: 3 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Horário de Chegada na Base',
              description: 'Horário em que estacionou o carro no pátio da base (Ex: 08:30)',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: {
                    paragraph: false,
                  },
                },
              },
            },
            location: { index: 4 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Localização de Chegada na Base (Leitura QR Code)',
              description: 'Confirmação presencial no pátio da base por leitura de QR Code da guarita/portaria',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: {
                    paragraph: false,
                  },
                },
              },
            },
            location: { index: 5 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Placa do Carro / Modelo do Veículo',
              description: 'Exemplo: ABC-1234 ou BRA2E19 (Fiorino, Spin, Strada, Gol, Kangoo)',
              questionItem: {
                question: {
                  required: true,
                  textQuestion: {
                    paragraph: false,
                  },
                },
              },
            },
            location: { index: 6 },
          },
        },
        {
          createItem: {
            item: {
              title: 'Telefone / WhatsApp com DDD',
              description: 'Para avisos e contato direto se necessário (Ex: 11 99999-8888)',
              questionItem: {
                question: {
                  required: false,
                  textQuestion: {
                    paragraph: false,
                  },
                },
              },
            },
            location: { index: 7 },
          },
        },
      ],
    };

    const updateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateRequests),
    });

    if (!updateRes.ok) {
      console.warn('Questions batch update warning:', await updateRes.text());
    }

    return {
      formId,
      responderUri,
      editUri,
      title,
    };
  }

  // Fetch form responses if reading directly from Forms API
  public static async fetchFormResponses(accessToken: string, formId: string) {
    const res = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ao ler respostas do Google Forms (${res.status})`);
    }

    return await res.json();
  }

  // Create daily Google Form for a specific day's driver arrival check-in
  public static async createDailyForm(accessToken: string, dateLabel?: string): Promise<CreatedFormResult> {
    const today = dateLabel || new Date().toLocaleDateString('pt-BR');
    const title = `Check-in de Chegada de Motoristas - ${today}`;
    return await this.createDriverArrivalForm(accessToken, title);
  }
}
