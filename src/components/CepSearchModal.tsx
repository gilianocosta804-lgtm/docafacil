import React, { useState } from 'react';
import { Search, MapPin, Copy, Check, ExternalLink, X, Navigation, Building2, Compass } from 'lucide-react';
import { CepResult } from '../types';

interface CepSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCep?: string;
}

export const CepSearchModal: React.FC<CepSearchModalProps> = ({
  isOpen,
  onClose,
  initialCep = '',
}) => {
  const [cepInput, setCepInput] = useState(initialCep);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<CepResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<CepResult[]>(() => {
    try {
      const stored = localStorage.getItem('docafacil_cep_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  if (!isOpen) return null;

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCepInput(formatCep(e.target.value));
    setErrorMsg(null);
  };

  const handleSearch = async (e?: React.FormEvent, customCep?: string) => {
    if (e) e.preventDefault();
    const target = (customCep || cepInput).replace(/\D/g, '');

    if (target.length !== 8) {
      setErrorMsg('Informe um CEP válido com 8 dígitos.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${target}/json/`);
      if (!response.ok) {
        throw new Error('Falha ao consultar serviço de CEP.');
      }
      const data: CepResult = await response.json();

      if (data.erro) {
        setErrorMsg(`CEP ${formatCep(target)} não foi localizado na base dos Correios.`);
        setResult(null);
      } else {
        setResult(data);
        // Save to history
        setHistory((prev) => {
          const filtered = prev.filter((item) => item.cep !== data.cep);
          const next = [data, ...filtered].slice(0, 5);
          localStorage.setItem('docafacil_cep_history', JSON.stringify(next));
          return next;
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão ao buscar o CEP.');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `${result.logradouro}${result.complemento ? ' ' + result.complemento : ''}, ${result.bairro}, ${result.localidade} - ${result.uf}, CEP: ${result.cep}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Consulta de CEP & Logística</h2>
              <p className="text-xs text-slate-400 mt-0.5">Localize bairros, rotas e cidades para carregamento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input body */}
        <div className="p-5 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={cepInput}
                onChange={handleInputChange}
                placeholder="Ex: 01310-100 ou digite os números"
                maxLength={9}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || cepInput.replace(/\D/g, '').length !== 8}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0 shadow-sm"
            >
              {isLoading ? 'Buscando...' : 'Pesquisar'}
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-sky-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                    CEP {result.cep}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                    {result.logradouro || 'Logradouro não informado'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {result.bairro ? `${result.bairro} · ` : ''}
                    <span className="font-semibold text-white">{result.localidade} - {result.uf}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer text-xs flex items-center gap-1"
                    title="Copiar endereço"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${result.logradouro}, ${result.bairro}, ${result.localidade} - ${result.uf}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition cursor-pointer text-xs flex items-center gap-1"
                    title="Abrir no Google Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Maps</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Cidade / UF</span>
                  <span className="text-slate-200">{result.localidade}/{result.uf}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">DDD Local</span>
                  <span className="text-slate-200">({result.ddd || '--'})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Código IBGE</span>
                  <span className="text-slate-200">{result.ibge || '--'}</span>
                </div>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                Consultas Recentes
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {history.map((item) => (
                  <button
                    key={item.cep}
                    type="button"
                    onClick={() => {
                      setCepInput(item.cep);
                      setResult(item);
                    }}
                    className="w-full text-left p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800 border border-slate-800/80 flex items-center justify-between text-xs transition cursor-pointer"
                  >
                    <span className="font-mono text-sky-400 font-bold">{item.cep}</span>
                    <span className="text-slate-300 truncate max-w-[200px] text-[11px]">
                      {item.logradouro ? `${item.logradouro}, ` : ''}{item.localidade}-{item.uf}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Consulta direta à base pública dos Correios (ViaCEP)</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
