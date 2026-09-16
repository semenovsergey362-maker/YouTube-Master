import React, { useState } from "react";
import { X, User, Mail, Sparkles, LogIn, ShieldCheck, Chrome, Zap } from "lucide-react";
import { signInWithLocalProfile, signInWithGoogle } from "../firebase";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<"fast" | "google">("fast");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Пожалуйста, введите ваше имя или никнейм");
      return;
    }
    setLoading(true);
    try {
      const u = signInWithLocalProfile(name.trim(), email.trim());
      toast.success(`Добро пожаловать, ${u.displayName}!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Ошибка входа: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = () => {
    setLoading(true);
    try {
      const guestNames = ["Креатор", "Автор Shorts", "Ютубер", "Контентмейкер"];
      const randomName = guestNames[Math.floor(Math.random() * guestNames.length)];
      const u = signInWithLocalProfile(randomName);
      toast.success(`Вы вошли как ${u.displayName}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Ошибка входа: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success("Авторизация через Google успешно выполнена!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Не удалось войти через Google: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent/30 to-purple-500/30 border border-accent/40 flex items-center justify-center text-accent shadow-lg shadow-accent/10">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white">Вход в приложение</h3>
            <p className="text-xs text-neutral-400">Выберите удобный способ авторизации</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800/80 mb-6">
          <button
            type="button"
            onClick={() => setMode("fast")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === "fast"
                ? "bg-neutral-800 text-white shadow-md border border-neutral-700"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Zap size={14} className={mode === "fast" ? "text-accent" : ""} />
            Быстрый вход (Без Google)
          </button>
          <button
            type="button"
            onClick={() => setMode("google")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === "google"
                ? "bg-neutral-800 text-white shadow-md border border-neutral-700"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Chrome size={14} className={mode === "google" ? "text-blue-400" : ""} />
            Google OAuth
          </button>
        </div>

        {mode === "fast" ? (
          <form onSubmit={handleFastSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Имя или Никнейм <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Алексей И. или 7profesion"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-accent rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Email <span className="text-neutral-500 font-normal">(Опционально)</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-accent rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all cursor-pointer active:scale-[0.99]"
              >
                <LogIn size={16} />
                <span>Войти в аккаунт</span>
              </button>

              <button
                type="button"
                onClick={handleGuestSubmit}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700/60 transition-all cursor-pointer"
              >
                <Zap size={14} className="text-amber-400" />
                <span>Войти как Гость (1 клик)</span>
              </button>
            </div>

            <p className="text-[11px] text-neutral-500 text-center pt-1 leading-relaxed">
              ⚡ Вход происходит мгновенно. Не требует никаких настроек Google Cloud или подтверждений!
            </p>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs leading-relaxed flex items-start gap-2.5">
              <ShieldCheck size={18} className="shrink-0 mt-0.5 text-blue-400" />
              <div>
                <p className="font-semibold mb-0.5">Google OAuth для YouTube</p>
                <p className="text-[11px] text-neutral-300">
                  Нужен только владельцу проекта для автозагрузки ролика на YouTube. Обычным пользователям рекомендуем использовать <strong>Быстрый вход</strong>!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSubmit}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Войти через Google OAuth</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
