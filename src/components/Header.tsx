import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Cpu,
  History,
  Sliders,
  Sparkles,
  Settings,
  LogIn,
  LogOut,
  UserCheck,
  RefreshCw,
  ChevronDown,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

const MODELS = [
  { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash" },
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash" },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro" },
];

export interface HeaderProps {
  activeTab: string;
  onToggleSidebar: () => void;
  activeModel: string;
  setActiveModel: (model: string) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenInstructions: () => void;
  onOpenLimits: () => void;
  user: any;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onSwitchAccount?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleSidebar,
  activeModel,
  setActiveModel,
  onOpenSettings,
  onOpenHistory,
  onOpenInstructions,
  onOpenLimits,
  user,
  onSignIn,
  onSignOut,
  onSwitchAccount,
}) => {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    if (isUserDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isUserDropdownOpen]);

  const userName = user?.displayName || (user?.email ? user.email.split("@")[0] : "Пользователь Google");
  const userEmail = user?.email || "";
  const userPhoto = user?.photoURL || "";
  const userInitial = (userName || userEmail || "G")[0].toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-neutral-950/90 border-b border-neutral-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Hamburger + Current Page Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer"
              title="Открыть меню"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-400 hidden sm:inline">Модуль:</span>
              <span className="text-sm font-black text-white px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
                {activeTab}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Model Selector */}
            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5">
              <Cpu size={14} className="text-accent" />
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="bg-transparent text-xs font-bold text-neutral-200 focus:outline-none cursor-pointer"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-neutral-900 text-neutral-200">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* History Button */}
            <button
              onClick={onOpenHistory}
              className="hidden md:flex p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer items-center gap-1.5 text-xs font-semibold"
              title="История проектов и сессий"
            >
              <History size={16} />
              <span>История</span>
            </button>

            {/* Custom Instructions */}
            <button
              onClick={onOpenInstructions}
              className="hidden lg:flex p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer items-center gap-1.5 text-xs font-semibold"
              title="Инструкции для ИИ"
            >
              <Sliders size={16} />
              <span>Правила</span>
            </button>

            {/* Limits */}
            <button
              onClick={onOpenLimits}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Лимиты и квоты"
            >
              <Sparkles size={16} className="text-amber-400" />
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer"
              title="Настройки"
            >
              <Settings size={16} />
            </button>

            {/* Google User Profile or Sign-In Button */}
            <div className="pl-1 sm:pl-2 border-l border-neutral-800" ref={dropdownRef}>
              {user ? (
                <div className="relative">
                  <button
                    id="header-user-menu-btn"
                    onClick={() => setIsUserDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group"
                    title="Управление аккаунтом Google"
                  >
                    <div className="relative">
                      {userPhoto ? (
                        <img
                          src={userPhoto}
                          alt={userName}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-neutral-700 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent/20 text-accent border border-accent/40 flex items-center justify-center font-bold text-xs">
                          {userInitial}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-neutral-950" />
                    </div>

                    <div className="hidden xl:flex flex-col text-left max-w-[130px]">
                      <span className="text-xs font-bold text-neutral-200 truncate leading-tight group-hover:text-white">
                        {userName}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium truncate leading-tight">
                        Google подключен
                      </span>
                    </div>

                    <ChevronDown
                      size={14}
                      className={`text-neutral-400 transition-transform duration-200 ${
                        isUserDropdownOpen ? "rotate-180 text-white" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* User Info Header */}
                      <div className="p-4 bg-neutral-950/80 border-b border-neutral-800">
                        <div className="flex items-center gap-3">
                          {userPhoto ? (
                            <img
                              src={userPhoto}
                              alt={userName}
                              className="w-10 h-10 rounded-full border border-neutral-700 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-accent/20 text-accent border border-accent/40 flex items-center justify-center font-bold text-sm">
                              {userInitial}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{userName}</h4>
                            <p className="text-[11px] text-neutral-400 truncate">{userEmail || "Авторизован через Google"}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                                <ShieldCheck size={10} />
                                Google OAuth Активен
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Actions */}
                      <div className="p-2 space-y-1 text-xs">
                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            onOpenSettings();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-xl transition-all text-left cursor-pointer"
                        >
                          <Settings size={14} className="text-neutral-400" />
                          <span>Настройки API и ключи</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            if (onSwitchAccount) {
                              onSwitchAccount();
                            } else if (onSignIn) {
                              onSignIn();
                            }
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800/80 rounded-xl transition-all text-left cursor-pointer"
                        >
                          <RefreshCw size={14} className="text-neutral-400" />
                          <span>Сменить аккаунт Google</span>
                        </button>

                        <div className="my-1 border-t border-neutral-800/60" />

                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            if (onSignOut) {
                              onSignOut();
                            }
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all text-left cursor-pointer font-semibold"
                        >
                          <LogOut size={14} />
                          <span>Выйти из аккаунта</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  id="header-google-signin-btn"
                  onClick={onSignIn}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs shadow-md shadow-white/5 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  title="Войти через аккаунт Google"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
                  <span className="hidden sm:inline">Войти через Google</span>
                  <span className="sm:hidden">Войти</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
