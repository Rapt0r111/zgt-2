"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  callbackUrl: string;
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  forbidden:   "Недостаточно прав доступа",
  credentials: "Неверный логин или пароль",
  inactive:    "Учётная запись деактивирована",
};

const inputBase = cn(
  "w-full px-4 py-2.5 rounded-xl text-sm",
  "text-[hsl(220_50%_95%)] placeholder:text-[hsl(215_16%_35%)]",
  "focus:outline-none transition-all duration-200",
);

const inputStyle = {
  background: "hsl(220 40% 11%)",
  border: "1px solid hsl(220 30% 16%)",
};

const inputFocusStyle = `
  [data-focused=true] {
    border-color: hsl(217 91% 60% / 0.5);
    box-shadow: 0 0 0 3px hsl(217 91% 60% / 0.1);
  }
`;

export function LoginForm({ callbackUrl, error }: LoginFormProps) {
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError]     = useState<string | null>(
    error ? (ERROR_MESSAGES[error] ?? "Произошла ошибка") : null
  );
  const [isPending, startTransition]  = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    startTransition(async () => {
      try {
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

        window.location.href = callbackUrl;
      } catch {
        setFormError("Ошибка соединения с сервером");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Username */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "hsl(215 20% 65%)" }}
        >
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
          className={inputBase}
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = "hsl(217 91% 60% / 0.5)";
            e.target.style.boxShadow   = "0 0 0 3px hsl(217 91% 60% / 0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "hsl(220 30% 16%)";
            e.target.style.boxShadow   = "none";
          }}
        />
      </div>

      {/* Password */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "hsl(215 20% 65%)" }}
        >
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
            className={cn(inputBase, "pr-10")}
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = "hsl(217 91% 60% / 0.5)";
              e.target.style.boxShadow   = "0 0 0 3px hsl(217 91% 60% / 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "hsl(220 30% 16%)";
              e.target.style.boxShadow   = "none";
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: "hsl(215 16% 40%)" }}
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error */}
      {formError && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm"
          style={{
            background: "hsl(0 72% 60% / 0.1)",
            border: "1px solid hsl(0 72% 60% / 0.25)",
            color: "hsl(0 72% 72%)",
          }}
        >
          <span className="mt-0.5 shrink-0">⚠</span>
          <span>{formError}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || !username || !password}
        className={cn(
          "w-full flex items-center justify-center gap-2",
          "py-2.5 px-4 rounded-xl text-sm font-600",
          "text-white transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
          "btn-aurora",
        )}
        style={{ fontWeight: 600 }}
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