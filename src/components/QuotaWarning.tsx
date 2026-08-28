import React, { useEffect, useState } from 'react';
import { AlertTriangle, Gauge, Zap, Activity, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { subscribeToQuota, QuotaUsage, getQuotaUsage } from '../services/geminiService';

interface QuotaWarningProps {
  currentModel?: {
    id: string;
    name: string;
    badge: string;
    badgeColor: string;
    desc: string;
    rpm: number;
    rpd: number;
    tpm: string;
    speed: number;
    intelligence: number;
  };
}

export function QuotaWarning({ currentModel }: QuotaWarningProps) {
  const [usage, setUsage] = useState<QuotaUsage>(getQuotaUsage());
  const [now, setNow] = useState<number>(Date.now());
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeToQuota((u) => {
      setUsage(u);
    });

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const rpm = usage.requestsPerMinute;
  const rpd = usage.requestsPerDay;
  const tpm = usage.tokensPerMinute;

  const maxRpm = currentModel?.rpm || 15;
  const maxRpd = currentModel?.rpd || 1500;
  const maxTpm = currentModel?.tpm === '32,000' ? 32000 : 1000000;

  const rpmPercent = Math.min(100, Math.round((rpm / maxRpm) * 100));
  const rpdPercent = Math.min(100, Math.round((rpd / maxRpd) * 100));
  const tpmPercent = Math.min(100, Math.round((tpm / maxTpm) * 100));

  const isWarning = rpmPercent >= 66 || rpdPercent >= 75;
  const isCritical = rpmPercent >= 86 || rpdPercent >= 90;

  let secondsToReset = 0;
  if (usage.lastRequestTime && rpm > 0) {
    const elapsed = (now - usage.lastRequestTime) / 1000;
    secondsToReset = Math.max(0, Math.ceil(60 - elapsed));
  }

  const getProgressBarColor = (pct: number) => {
    if (pct >= 86) return 'bg-gradient-to-r from-red-500 to-rose-400';
    if (pct >= 66) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
    return 'bg-gradient-to-r from-emerald-500 to-teal-400';
  };

  return (
    <div className="mt-2 p-2.5 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 space-y-2 shadow-inner text-white font-sans transition-all">
      {/* Header: Title & Live Status Dot & Expand Toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="flex items-center justify-between cursor-pointer select-none group"
        title={isExpanded ? "Свернуть блок квоты" : "Развернуть блок квоты"}
      >
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:border-primary/40 transition-colors">
            <Gauge size={13} />
          </div>
          <div>
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-200 group-hover:text-white transition-colors">
              Квота Gemini API
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-red-400 animate-ping' : isWarning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          <span className="text-[9px] font-mono text-neutral-400">
            {rpm}/{maxRpm} RPM
          </span>
          <button className="text-neutral-400 hover:text-white p-0.5 rounded transition-colors ml-0.5">
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="space-y-2 pt-1 border-t border-neutral-800/60 animate-in fade-in duration-200">
          {/* Model Badge */}
          {currentModel && (
            <div className="flex items-center justify-between text-[8px] bg-neutral-950/60 px-2 py-1 rounded-lg border border-neutral-800/40">
              <span className="text-neutral-400 font-bold truncate">
                {currentModel.name}
              </span>
              <span className={`font-extrabold px-1.5 py-0.5 rounded border ${currentModel.badgeColor}`}>
                {currentModel.badge}
              </span>
            </div>
          )}

          {/* Critical/Warning Alerts */}
          {isCritical && (
            <div className="p-1.5 bg-red-500/15 border border-red-500/30 rounded-xl flex items-start gap-1.5 text-red-400 text-[9.5px]">
              <AlertTriangle size={12} className="shrink-0 mt-0.5 animate-pulse" />
              <div className="leading-tight">
                <span className="font-bold block">🚨 Высокая нагрузка API!</span>
                <span className="opacity-90">Запросы автоматически замедляются для предотвращения ошибки 429.</span>
              </div>
            </div>
          )}

          {!isCritical && isWarning && (
            <div className="p-1.5 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-start gap-1.5 text-amber-400 text-[9.5px]">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <div className="leading-tight">
                <span className="font-bold block">⚠️ Приближение к лимиту ({rpm}/{maxRpm} RPM)</span>
              </div>
            </div>
          )}

          {/* Live Quota Progress Gauges */}
          <div className="space-y-1.5 pt-0.5">
            {/* RPM Gauge */}
            <div className="bg-neutral-950/60 p-1.5 rounded-xl border border-neutral-800/40 space-y-1">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-neutral-400 font-medium flex items-center gap-1">
                  <Zap size={10} className="text-amber-400" />
                  Запросы/мин (RPM)
                </span>
                <span className="font-mono font-bold text-white">
                  {rpm} / {maxRpm}
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${getProgressBarColor(rpmPercent)}`}
                  style={{ width: `${Math.max(4, rpmPercent)}%` }}
                />
              </div>
            </div>

            {/* RPD Gauge */}
            <div className="bg-neutral-950/60 p-1.5 rounded-xl border border-neutral-800/40 space-y-1">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-neutral-400 font-medium flex items-center gap-1">
                  <Activity size={10} className="text-emerald-400" />
                  Запросы/день (RPD)
                </span>
                <span className="font-mono font-bold text-white">
                  {rpd} / {maxRpd}
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${getProgressBarColor(rpdPercent)}`}
                  style={{ width: `${Math.max(2, rpdPercent)}%` }}
                />
              </div>
            </div>

            {/* TPM Gauge */}
            <div className="bg-neutral-950/60 p-1.5 rounded-xl border border-neutral-800/40 space-y-1">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-neutral-400 font-medium flex items-center gap-1">
                  <Info size={10} className="text-cyan-400" />
                  Токены/мин (TPM)
                </span>
                <span className="font-mono font-bold text-white">
                  {tpm > 1000 ? `${(tpm / 1000).toFixed(1)}k` : tpm} / {maxTpm >= 1000000 ? '1M' : `${maxTpm / 1000}k`}
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${getProgressBarColor(tpmPercent)}`}
                  style={{ width: `${Math.max(2, tpmPercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Speed & Intelligence Indicators */}
          {currentModel && (
            <div className="grid grid-cols-2 gap-1 pt-1 border-t border-neutral-800/60 text-[8px]">
              <div className="flex items-center justify-between px-1.5 py-1 bg-neutral-950/40 rounded-lg border border-neutral-800/30">
                <span className="text-neutral-500 font-bold">Скорость:</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={`speed-dot-${i}`}
                      className={`w-1.5 h-1 rounded-sm ${
                        i <= currentModel.speed ? "bg-emerald-400" : "bg-neutral-800"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-1.5 py-1 bg-neutral-950/40 rounded-lg border border-neutral-800/30">
                <span className="text-neutral-500 font-bold">Интеллект:</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={`intel-dot-${i}`}
                      className={`w-1.5 h-1 rounded-sm ${
                        i <= currentModel.intelligence ? "bg-purple-400" : "bg-neutral-800"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reset Countdown Footer */}
          <div className="flex items-center justify-between text-[8.5px] text-neutral-400 border-t border-neutral-800/60 pt-1.5">
            <span className="flex items-center gap-1 font-mono">
              <Clock size={10} className="text-neutral-500" />
              {secondsToReset > 0 ? (
                <span>Сброс окна: <strong className="text-white">{secondsToReset}с</strong></span>
              ) : (
                <span className="text-emerald-400">Окно свободно</span>
              )}
            </span>
            <span className="text-neutral-500 text-[8px]">Обновление 1с</span>
          </div>
        </div>
      )}
    </div>
  );
}


