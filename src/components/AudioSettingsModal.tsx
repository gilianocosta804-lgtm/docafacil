import React, { useState } from 'react';
import { Volume2, VolumeX, Mic, Bell, X, Play } from 'lucide-react';
import { audioService } from '../services/audioService';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const [soundEnabled, setSoundEnabled] = useState(audioService.getSoundEnabled());
  const [voiceEnabled, setVoiceEnabled] = useState(audioService.getVoiceEnabled());
  const [volume, setVolume] = useState(audioService.getVolume());
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  if (!isOpen) return null;

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    audioService.setSoundEnabled(enabled);
  };

  const handleToggleVoice = (enabled: boolean) => {
    setVoiceEnabled(enabled);
    audioService.setVoiceEnabled(enabled);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioService.setVolume(newVol);
  };

  const testChime = async () => {
    setIsPlayingTest(true);
    await audioService.playChime();
    setIsPlayingTest(false);
  };

  const testFullAlert = async () => {
    setIsPlayingTest(true);
    await audioService.playDockAlert('Carlos Silva', 'Doca 02', 'Rota 14 - Zona Sul');
    setIsPlayingTest(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Configuração de Alertas Sonoros</h3>
            <p className="text-xs text-slate-400">Gongo de chamada e locução de voz das docas</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Som do gongo */}
          <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-white">Sinal Sonoro (Gongo)</p>
                <p className="text-xs text-slate-400">Acústica de aeroporto/logística</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => handleToggleSound(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Voz sintetizada */}
          <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-sky-400" />
              <div>
                <p className="text-sm font-semibold text-white">Locução de Voz (TTS)</p>
                <p className="text-xs text-slate-400">Anuncia o motorista e doca em voz alta</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => handleToggleVoice(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {/* Volume Slider */}
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                {volume === 0 ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
                Volume Geral
              </span>
              <span className="font-mono text-amber-400">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Test buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={testChime}
              disabled={isPlayingTest}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600/80 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" />
              Testar Apenas Gongo Sonoro
            </button>
            <button
              onClick={testFullAlert}
              disabled={isPlayingTest}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Testar Alerta Completo (Gongo + Chamada por Voz)
            </button>
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-sm font-semibold transition"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
