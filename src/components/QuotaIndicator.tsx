import React, { useState, useEffect } from "react";
import {
  Activity,
  Cpu,
  Sparkles,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import {
  subscribeToQuota,
  getQuotaUsage,
  getModelQuotaLimits,
  formatTokenCount,
  QuotaUsage,
  DEFAULT_MODEL_QUOTAS
} from "../services/ai/aiConfig";

interface QuotaHeaderWidgetProps {
  activeModel: string;
  setActiveModel?: (model: string) => void;
  modelsList?: { id: string; name: string; shortName?: string }[];
  onOpenLimits: () => void;
}

export const QuotaHeaderWidget: React.FC<QuotaHeaderWidgetProps> = ({
  activeModel,
  setActiveModel,
  modelsList,
  onOpenLimits
}) => {
  const [usage, setUsage] = useState<QuotaUsage>(() => getQuotaUsage());
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToQuota((updated) => {
      setUsage(updated);
    });
    return () => unsubscribe();
  }, []);

  const modelLimits = getModelQuotaLimits(activeModel);
  const currentModelStats = usage.modelUsage?.[activeModel] || {
    requestsPerMinute: usage.requestsPerMinute,
    tokensPerMinute: usage.tokensPerMinute,
    requestsPerDay: usage.requestsPerDay,
    tokensToday: usage.tokensToday
  };

  // Percentages relative to active model limits
  const tpmPercent = Math.min(
    100,
    Math.round((currentModelStats.tokensPerMinute / modelLimits.TPM) * 100)
  );
  const rpmPercent = Math.min(
    100,
    Math.round((currentModelStats.requestsPerMinute / modelLimits.RPM) * 100)
  );

  const maxUsagePercent = Math.max(tpmPercent, rpmPercent);

  // Status color based on consumption
  let statusColor = "bg-emerald-500";
  let statusText = "Норма";
  let textColor = "text-emerald-400";
  let borderColor = "border-emerald-500/30";

  if (maxUsagePercent > 85) {
    statusColor = "bg-red-500 animate-pulse";
    statusText = "Лимит близок";
    textColor = "text-red-400";
    borderColor = "border-red-500/40";
  } else if (maxUsagePercent > 50) {
    statusColor = "bg-amber-500";
    statusText = "Нагрузка";
    textColor = "text-amber-400";
    borderColor = "border-amber-500/30";
  }

  const formattedTpm = formatTokenCount(currentModelStats.tokensPerMinute);
  const formattedLimit = formatTokenCount(modelLimits.TPM);

  return (
    <div className="relative">
      <div className={`flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border ${borderColor} shadow-sm`}>
        {/* Model Dropdown Part */}
        {modelsList && setActiveModel && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-neutral-800/80 transition-all">
            <Cpu size={14} className="text-amber-400 shrink-0" />
            <select
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
              className="bg-transparent text-xs font-bold text-neutral-200 focus:outline-none cursor-pointer max-w-[120px] sm:max-w-[160px] truncate"
            >
              {modelsList.map((m) => (
                <option key={m.id} value={m.id} className="bg-neutral-900 text-neutral-200">
                  {m.shortName || m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {modelsList && setActiveModel && (
          <div className="w-[1px] h-4 bg-neutral-800 my-auto" />
        )}

        {/* Quota Part */}
        <button
          onClick={() => setIsPopoverOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-neutral-800/80 transition-all cursor-pointer group"
          title="Текущее потребление квот и токенов Gemini"
        >
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
            <Zap size={13} className={textColor} />
          </div>

          <div className="hidden md:flex flex-col text-left">
            <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-200">
              <span>{formattedTpm}</span>
              <span className="text-neutral-500">/</span>
              <span className="text-neutral-400">{formattedLimit}</span>
            </div>
          </div>

          <span className="text-[11px] font-extrabold text-neutral-300 md:hidden">
            {maxUsagePercent}%
          </span>

          <ChevronDown
            size={12}
            className={`text-neutral-400 transition-transform ${
              isPopoverOpen ? "rotate-180 text-white" : ""
            }`}
          />
        </button>
      </div>

      {/* Popover Breakdown */}
      {isPopoverOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsPopoverOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-4 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-primary" />
                <span className="font-bold text-white">Мониторинг квот ИИ</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${textColor} bg-neutral-950 border border-neutral-800`}>
                {statusText}
              </span>
            </div>

            <div className="space-y-3">
              {/* TPM Bar */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-neutral-400">Токенов в минуту (TPM):</span>
                  <span className="font-bold text-white">
                    {formattedTpm} / {formattedLimit} ({tpmPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/80">
                  <div
                    className={`h-full transition-all ${
                      tpmPercent > 85 ? "bg-red-500" : tpmPercent > 50 ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.max(2, tpmPercent)}%` }}
                  />
                </div>
              </div>

              {/* RPM Bar */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-neutral-400">Запросов в минуту (RPM):</span>
                  <span className="font-bold text-white">
                    {currentModelStats.requestsPerMinute} / {modelLimits.RPM} ({rpmPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/80">
                  <div
                    className={`h-full transition-all ${
                      rpmPercent > 85 ? "bg-red-500" : rpmPercent > 50 ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${Math.max(2, rpmPercent)}%` }}
                  />
                </div>
              </div>

              {/* RPD & Daily Totals */}
              <div className="p-2.5 bg-neutral-950/80 rounded-xl border border-neutral-800/80 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Запросов за 24ч (RPD):</span>
                  <span className="font-mono text-neutral-200">
                    {usage.requestsPerDay} / {modelLimits.RPD}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Обработано токенов сегодня:</span>
                  <span className="font-mono text-primary font-bold">
                    {formatTokenCount(usage.tokensToday)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsPopoverOpen(false);
                  onOpenLimits();
                }}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Все лимиты и модели</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export interface QuotaDetailsPanelProps {
  activeModel?: string;
}

export const QuotaDetailsPanel: React.FC<QuotaDetailsPanelProps> = ({
  activeModel = "gemini-3.1-flash-lite"
}) => {
  const [usage, setUsage] = useState<QuotaUsage>(() => getQuotaUsage());

  useEffect(() => {
    const unsubscribe = subscribeToQuota((updated) => {
      setUsage(updated);
    });
    return () => unsubscribe();
  }, []);

  const currentLimits = getModelQuotaLimits(activeModel);
  const currentModelStats = usage.modelUsage?.[activeModel] || {
    requestsPerMinute: usage.requestsPerMinute,
    tokensPerMinute: usage.tokensPerMinute,
    requestsPerDay: usage.requestsPerDay,
    tokensToday: usage.tokensToday
  };

  const tpmPercent = Math.min(
    100,
    Math.round((currentModelStats.tokensPerMinute / currentLimits.TPM) * 100)
  );
  const rpmPercent = Math.min(
    100,
    Math.round((currentModelStats.requestsPerMinute / currentLimits.RPM) * 100)
  );
  const rpdPercent = Math.min(
    100,
    Math.round((usage.requestsPerDay / currentLimits.RPD) * 100)
  );

  return (
    <div className="space-y-4 text-xs">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl">
          <div className="text-[11px] text-neutral-400 font-medium">Токены / мин (TPM)</div>
          <div className="text-base font-black text-white mt-1">
            {formatTokenCount(currentModelStats.tokensPerMinute)}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            из {formatTokenCount(currentLimits.TPM)}
          </div>
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full ${
                tpmPercent > 85 ? "bg-red-500" : tpmPercent > 50 ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: `${Math.max(4, tpmPercent)}%` }}
            />
          </div>
        </div>

        <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl">
          <div className="text-[11px] text-neutral-400 font-medium">Запросы / мин (RPM)</div>
          <div className="text-base font-black text-white mt-1">
            {currentModelStats.requestsPerMinute}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            из {currentLimits.RPM} RPM
          </div>
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full ${
                rpmPercent > 85 ? "bg-red-500" : rpmPercent > 50 ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: `${Math.max(4, rpmPercent)}%` }}
            />
          </div>
        </div>

        <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl">
          <div className="text-[11px] text-neutral-400 font-medium">Запросы за 24ч (RPD)</div>
          <div className="text-base font-black text-white mt-1">
            {usage.requestsPerDay}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            из {currentLimits.RPD} RPD
          </div>
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.max(4, rpdPercent)}%` }}
            />
          </div>
        </div>

        <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl">
          <div className="text-[11px] text-neutral-400 font-medium">Всего токенов сегодня</div>
          <div className="text-base font-black text-primary mt-1">
            {formatTokenCount(usage.tokensToday)}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
            <ShieldCheck size={11} />
            Каскад защиты активен
          </div>
        </div>
      </div>

      {/* Model-by-Model Breakdown */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
          Лимиты моделей и распределение
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(DEFAULT_MODEL_QUOTAS).map(([mId, limits]) => {
            const mStats = usage.modelUsage?.[mId] || { requestsPerMinute: 0, tokensPerMinute: 0, requestsPerDay: 0, tokensToday: 0 };
            const isActive = mId === activeModel;

            return (
              <div
                key={mId}
                className={`p-3 rounded-xl border transition-all ${
                  isActive
                    ? "bg-neutral-900 border-primary/40 shadow-sm"
                    : "bg-neutral-950/60 border-neutral-800/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-200 text-xs">
                    {mId.replace("-preview", "").replace("gemini-", "Gemini ")}
                  </span>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30">
                      Активна
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-neutral-400 flex items-center justify-between">
                  <span>Лимит: {limits.RPM} RPM / {formatTokenCount(limits.TPM)} TPM</span>
                  <span className="font-mono text-neutral-300">
                    {formatTokenCount(mStats.tokensToday)} ток.
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
