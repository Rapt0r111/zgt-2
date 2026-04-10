import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth.server";
import { LoginForm } from "./LoginForm";
import { Shield } from "lucide-react";

export const metadata: Metadata = { title: "Вход — ЗГТ" };

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "hsl(220 47% 4%)" }}
    >
      {/* Aurora background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            top: "-30%", left: "-20%", width: "60%", height: "80%",
            background: "radial-gradient(ellipse, hsl(217 91% 60% / 0.1) 0%, transparent 70%)",
            animation: "aurora-float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            bottom: "-20%", right: "-10%", width: "50%", height: "65%",
            background: "radial-gradient(ellipse, hsl(258 90% 66% / 0.08) 0%, transparent 70%)",
            animation: "aurora-float 11s ease-in-out infinite reverse",
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59,130,246,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(258 90% 66%))",
              boxShadow: "0 8px 32px hsl(217 91% 60% / 0.4)",
            }}
          >
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "hsl(220 50% 95%)", letterSpacing: "-0.5px" }}
          >
            ЗГТ Система
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Управление личным составом и техникой
          </p>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "hsl(220 40% 8% / 0.9)",
            border: "1px solid hsl(220 30% 14%)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 24px 60px hsl(220 47% 2% / 0.6)",
          }}
        >
          <LoginForm
            callbackUrl={params.callbackUrl ?? "/"}
            error={params.error}
          />
        </div>

        <p className="text-center mt-5 text-xs text-muted-foreground">
          Только для авторизованного персонала
        </p>
      </div>
    </div>
  );
}