import { logger } from "../config/logger";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Sparkles, AlertTriangle, HelpCircle, Heart, UserCheck, Flame, Compass, ShieldAlert, Target, Edit3, Check, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateAudiencePortrait, AudiencePortrait } from '../services/geminiService';

export const AudiencePortraitSection: React.FC = () => {
  const { selectedNiche, selectedBranding, audiencePortrait, setAudiencePortrait, selectedModel, toneOfVoice } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Default fallback portrait if none exists
  const activePortrait: AudiencePortrait = audiencePortrait || {
    pains: [
      'Недостаток структурированной практической информации без лишней воды',
      'Высокая конкуренция в сфере и страх напрасно потратить время',
      'Сложности с внедрением сложных теорий на практике',
    ],
    questions: [
      'С чего пошагово начать развитие в этой нише?',
      'Как быстро получить первые измеримые результаты?',
      'Какие фатальные ошибки совершают 90% новичков?',
    ],
    values: [
      'Практическая применимость и наглядные примеры',
      'Экономия времени и системность',
      'Рост дохода, статуса и личной экспертности',
    ],
    avatar: {
      name: 'Алексей, 28 лет',
      occupation: 'Амбициозный специалист / Предприниматель',
      demographics: 'Мужчины и женщины 22-38 лет, активные зрители YouTube',
      coreGoal: 'Получать максимальную выгоду и инсайты из каждого ролика',
      dailyHabits: 'Смотрит видео за обедом, в транспорте или перед сном с фокусом на результат',
    },
    recommendations: {
      narrativeAngle: 'Говорить прямо, экспертно и уверенно. Показывать конкретные кейсы, экранные демонстрации и цифры.',
      hookStrategy: 'На первых 5 секундах анонсировать главный результат, который зритель получит в конце видео.',
      whatToAvoid: 'Долгого вступления, размытых рассуждений, пауз и скучных монотонных лекций.',
      retentionTriggers: 'Использовать динамический монтаж, выплывающие титры-акценты, микро-интриги и пошаговые выводы.',
    },
  };

  // Editable local state
  const [tempPortrait, setTempPortrait] = useState<AudiencePortrait>(activePortrait);

  const handleGenerateAI = async () => {
    if (!selectedNiche) return;
    setIsGenerating(true);
    try {
      const generated = await generateAudiencePortrait(
        selectedNiche,
        selectedBranding?.name,
        { model: selectedModel, toneOfVoice }
      );
      setAudiencePortrait(generated);
      setTempPortrait(generated);
    } catch (err) {
      logger.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    setAudiencePortrait(tempPortrait);
    setIsEditing(false);
  };

  const updateItemInList = (key: 'pains' | 'questions' | 'values', index: number, value: string) => {
    const list = [...tempPortrait[key]];
    list[index] = value;
    setTempPortrait({ ...tempPortrait, [key]: list });
  };

  const addItemToList = (key: 'pains' | 'questions' | 'values') => {
    setTempPortrait({ ...tempPortrait, [key]: [...tempPortrait[key], 'Новый пункт...'] });
  };

  const removeItemFromList = (key: 'pains' | 'questions' | 'values', index: number) => {
    const list = tempPortrait[key].filter((_, i) => i !== index);
    setTempPortrait({ ...tempPortrait, [key]: list });
  };

  return (
    <div className="p-6 bg-surface rounded-2xl border border-border shadow-2xl relative overflow-hidden space-y-6">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none -ml-20 -mt-20" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-accent/20 text-accent border border-accent/30">
              <Users size={20} />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight italic flex items-center gap-2">
              Портрет ЦА и Аватар Зрителя
              <span className="text-xs font-normal not-italic px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent flex items-center gap-1">
                <Target size={12} /> Audience Insights
              </span>
            </h3>
          </div>
          <p className="text-xs text-neutral-400 pl-1">
            Анализ психологических болей, вопросов и ценностей аудитории для максимального кликабейта и удержания
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => {
                  setTempPortrait(activePortrait);
                  setIsEditing(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Edit3 size={14} /> Редактировать
              </button>
              <button
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent to-amber-500 hover:opacity-90 text-neutral-950 text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
              >
                <Sparkles size={14} className={isGenerating ? 'animate-spin' : ''} />
                {isGenerating ? 'Анализ ЦА...' : 'Сгенерировать ИИ-анализ ЦА'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-xs font-semibold transition-all"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Check size={14} /> Сохранить портрет
              </button>
            </>
          )}
        </div>
      </div>

      {!isEditing ? (
        /* DISPLAY MODE */
        <div className="space-y-6">
          {/* Avatar Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900/80 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center text-neutral-950 font-black text-2xl shadow-xl shadow-accent/20 border border-white/20">
                <UserCheck size={28} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-accent tracking-widest bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                  Аватар идеального зрителя
                </span>
                <h4 className="text-lg font-bold text-white italic">{activePortrait.avatar.name}</h4>
                <p className="text-xs text-neutral-400">{activePortrait.avatar.occupation} • {activePortrait.avatar.demographics}</p>
              </div>
            </div>

            <div className="flex flex-col md:items-end gap-1.5 text-xs bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80 max-w-md">
              <span className="text-[10px] text-neutral-500 uppercase font-bold">Главная цель зрителя:</span>
              <span className="text-amber-300 font-medium italic">"{activePortrait.avatar.coreGoal}"</span>
              <span className="text-[10px] text-neutral-500 mt-1">{activePortrait.avatar.dailyHabits}</span>
            </div>
          </div>

          {/* Tri-Column Grid: Pains, Questions, Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pains */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-red-500/20 space-y-3 relative group hover:border-red-500/40 transition-all">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle size={16} /> Боли и страхи ЦА
              </div>
              <ul className="space-y-2">
                {activePortrait.pains.map((pain, idx) => (
                  <li key={`portrait-pain-${pain}-${idx}`} className="text-xs text-neutral-300 flex items-start gap-2 bg-red-950/20 p-2 rounded-lg border border-red-900/30">
                    <span className="text-red-400 font-bold font-mono">0{idx + 1}.</span>
                    <span>{pain}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Questions */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-blue-500/20 space-y-3 relative group hover:border-blue-500/40 transition-all">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                <HelpCircle size={16} /> Главные вопросы и поисковые запросы
              </div>
              <ul className="space-y-2">
                {activePortrait.questions.map((q, idx) => (
                  <li key={`portrait-question-${q}-${idx}`} className="text-xs text-neutral-300 flex items-start gap-2 bg-blue-950/20 p-2 rounded-lg border border-blue-900/30">
                    <span className="text-blue-400 font-bold font-mono">?</span>
                    <span className="italic">"{q}"</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Values */}
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-emerald-500/20 space-y-3 relative group hover:border-emerald-500/40 transition-all">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Heart size={16} /> Ценности и базовые мотивы
              </div>
              <ul className="space-y-2">
                {activePortrait.values.map((v, idx) => (
                  <li key={`portrait-value-${v}-${idx}`} className="text-xs text-neutral-300 flex items-start gap-2 bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommendations Banner Grid */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Compass size={14} className="text-accent" /> Рекомендации по подаче материала для этого зрителя
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Narrative Angle */}
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1.5 hover:border-primary/50 transition-all">
                <div className="text-primary font-bold text-xs flex items-center gap-1.5">
                  <Flame size={14} /> Подача и тональность
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">{activePortrait.recommendations.narrativeAngle}</p>
              </div>

              {/* Hook Strategy */}
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1.5 hover:border-accent/50 transition-all">
                <div className="text-accent font-bold text-xs flex items-center gap-1.5">
                  <Target size={14} /> Хук за первых 5 секунд
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">{activePortrait.recommendations.hookStrategy}</p>
              </div>

              {/* What To Avoid */}
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1.5 hover:border-red-500/50 transition-all">
                <div className="text-red-400 font-bold text-xs flex items-center gap-1.5">
                  <ShieldAlert size={14} /> Чего избегать
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">{activePortrait.recommendations.whatToAvoid}</p>
              </div>

              {/* Retention Triggers */}
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1.5 hover:border-emerald-500/50 transition-all">
                <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                  <ArrowRight size={14} /> Удержание до конца
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">{activePortrait.recommendations.retentionTriggers}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* EDIT MODE FORM */
        <div className="space-y-6 bg-neutral-900/80 p-5 rounded-xl border border-neutral-800">
          {/* Avatar Form */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
              <UserCheck size={14} /> Аватар идеального зрителя
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold block mb-1">Имя и возраст</span>
                <input
                  type="text"
                  value={tempPortrait.avatar.name}
                  onChange={(e) => setTempPortrait({ ...tempPortrait, avatar: { ...tempPortrait.avatar, name: e.target.value } })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold block mb-1">Профессия</span>
                <input
                  type="text"
                  value={tempPortrait.avatar.occupation}
                  onChange={(e) => setTempPortrait({ ...tempPortrait, avatar: { ...tempPortrait.avatar, occupation: e.target.value } })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold block mb-1">Демография</span>
                <input
                  type="text"
                  value={tempPortrait.avatar.demographics}
                  onChange={(e) => setTempPortrait({ ...tempPortrait, avatar: { ...tempPortrait.avatar, demographics: e.target.value } })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 font-semibold block mb-1">Главная цель зрителя</span>
              <input
                type="text"
                value={tempPortrait.avatar.coreGoal}
                onChange={(e) => setTempPortrait({ ...tempPortrait, avatar: { ...tempPortrait.avatar, coreGoal: e.target.value } })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Pains, Questions, Values Edit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pains Edit */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-red-400">Боли ЦА</span>
                <button onClick={() => addItemToList('pains')} className="text-[10px] text-red-400 hover:underline flex items-center gap-1">
                  <Plus size={10} /> Добавить
                </button>
              </div>
              {tempPortrait.pains.map((p, i) => (
                <div key={`edit-pain-${i}`} className="flex gap-1">
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => updateItemInList('pains', i, e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-1.5 text-xs text-white"
                  />
                  <button onClick={() => removeItemFromList('pains', i)} className="text-neutral-500 hover:text-red-400 p-1">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Questions Edit */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-400">Вопросы ЦА</span>
                <button onClick={() => addItemToList('questions')} className="text-[10px] text-blue-400 hover:underline flex items-center gap-1">
                  <Plus size={10} /> Добавить
                </button>
              </div>
              {tempPortrait.questions.map((q, i) => (
                <div key={`edit-question-${i}`} className="flex gap-1">
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => updateItemInList('questions', i, e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-1.5 text-xs text-white"
                  />
                  <button onClick={() => removeItemFromList('questions', i)} className="text-neutral-500 hover:text-red-400 p-1">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Values Edit */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-400">Ценности ЦА</span>
                <button onClick={() => addItemToList('values')} className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1">
                  <Plus size={10} /> Добавить
                </button>
              </div>
              {tempPortrait.values.map((v, i) => (
                <div key={`edit-val-${i}`} className="flex gap-1">
                  <input
                    type="text"
                    value={v}
                    onChange={(e) => updateItemInList('values', i, e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded p-1.5 text-xs text-white"
                  />
                  <button onClick={() => removeItemFromList('values', i)} className="text-neutral-500 hover:text-red-400 p-1">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations Form */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Рекомендации по подаче материала</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold block mb-1">Подача и тональность</span>
                <textarea
                  value={tempPortrait.recommendations.narrativeAngle}
                  onChange={(e) => setTempPortrait({ ...tempPortrait, recommendations: { ...tempPortrait.recommendations, narrativeAngle: e.target.value } })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white h-16 resize-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold block mb-1">Хук за 5 секунд</span>
                <textarea
                  value={tempPortrait.recommendations.hookStrategy}
                  onChange={(e) => setTempPortrait({ ...tempPortrait, recommendations: { ...tempPortrait.recommendations, hookStrategy: e.target.value } })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white h-16 resize-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold block mb-1">Чего избегать</span>
                <textarea
                  value={tempPortrait.recommendations.whatToAvoid}
                  onChange={(e) => setTempPortrait({ ...tempPortrait, recommendations: { ...tempPortrait.recommendations, whatToAvoid: e.target.value } })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white h-16 resize-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold block mb-1">Удержание внимания</span>
                <textarea
                  value={tempPortrait.recommendations.retentionTriggers}
                  onChange={(e) => setTempPortrait({ ...tempPortrait, recommendations: { ...tempPortrait.recommendations, retentionTriggers: e.target.value } })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white h-16 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
