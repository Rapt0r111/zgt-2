"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Route } from "next";

interface LoginFormProps {
  callbackUrl: string;
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "Недостаточно прав доступа",
  credentials: "Неверный логин или пароль",
  inactive: "Учётная запись деактивирована",
};

export function LoginForm({ callbackUrl, error }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    error ? (ERROR_MESSAGES[error] ?? "Произошла ошибка") : null
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      try {
        // Convert username → internal email format used by better-auth
        // e.g. "admin" → "admin@zgt.local"
        const email = `${username.trim().toLowerCase()}@zgt.local`;

        const res = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { message?: string };
          setFormError(data.message ?? ERROR_MESSAGES.credentials);
          return;
        }

        router.push(callbackUrl as Route);

      } catch {
        setFormError("Ошибка соединения с сервером");
      }
    });
  };

  const inputClass = cn(
    "w-full px-4 py-2.5 rounded-lg text-sm",
    "bg-slate-700/60 border border-slate-600",
    "text-white placeholder:text-slate-400",
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
    "transition-shadow"
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Имя пользователя
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ivanov.iv"
          required
          autoComplete="username"
          autoFocus
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Пароль
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className={cn(inputClass, "pr-10")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {formError && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{formError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !username || !password}
        className={cn(
          "w-full flex items-center justify-center gap-2",
          "py-2.5 px-4 rounded-lg text-sm font-medium",
          "bg-blue-600 hover:bg-blue-500 text-white",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors shadow-lg shadow-blue-500/20",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
        )}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogIn className="w-4 h-4" />
        )}
        {isPending ? "Вход..." : "Войти"}
      </button>
    </form>
  );
}