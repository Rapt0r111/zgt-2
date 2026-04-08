/**
 * /personnel/[id] — Personnel Detail Page
 *
 * Full profile card for a single person.
 * Server Component — direct DB fetch, no API round-trip.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeft,
  User,
  Hash,
  Briefcase,
  Users,
  CalendarDays,
  RefreshCw,
  FileText,
  Pencil,
} from "lucide-react";
import { getPersonnelById } from "@/lib/personnel.server";
import { STATUS_MAP } from "@/types/personnel";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import { hasRole } from "@/lib/auth.server";
import { PersonnelDetailActions } from "./_components/PersonnelDetailActions";

interface PersonnelDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  { params }: PersonnelDetailPageProps
): Promise<Metadata> {
  const { id } = await params;
  const person = await getPersonnelById(id);
  if (!person) return { title: "Не найдено — ЗГТ" };
  return {
    title: `${person.lastName} ${person.firstName} — ЗГТ`,
  };
}

// ── Info row helper ───────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className={cn(
          "text-sm text-foreground font-medium",
          mono && "font-mono"
        )}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PersonnelDetailPage({ params }: PersonnelDetailPageProps) {
  const { id } = await params;
  const [person, canEdit] = await Promise.all([
    getPersonnelById(id),
    hasRole("operator"),
  ]);

  if (!person) notFound();

  const fullName = [person.lastName, person.firstName, person.middleName]
    .filter(Boolean)
    .join(" ");

  const statusInfo = STATUS_MAP[person.status as keyof typeof STATUS_MAP];
  const statusColors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    blue:    "bg-blue-500/10 text-blue-600 border-blue-500/20",
    amber:   "bg-amber-500/10 text-amber-600 border-amber-500/20",
    violet:  "bg-violet-500/10 text-violet-600 border-violet-500/20",
    red:     "bg-red-500/10 text-red-600 border-red-500/20",
  };

  // Generate avatar color from name
  const hue = (person.lastName.charCodeAt(0) * 37 + person.firstName.charCodeAt(0) * 17) % 360;
  const initials = `${person.lastName[0] ?? ""}${person.firstName[0] ?? ""}`.toUpperCase();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* ── Back ─────────────────────────────────────────────────────────── */}
      <Link
        href={"/personnel" as Route}
        className={cn(
          "inline-flex items-center gap-2 text-sm text-muted-foreground",
          "hover:text-foreground transition-colors"
        )}
      >
        <ArrowLeft className="w-4 h-4" />
        Личный состав
      </Link>

      {/* ── Hero card ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Color strip */}
        <div
          className="h-2"
          style={{ backgroundColor: `hsl(${hue} 55% 48%)` }}
        />

        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg"
              style={{ backgroundColor: `hsl(${hue} 55% 48%)` }}
              aria-hidden
            >
              {initials}
            </div>

            {/* Name & meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-3">
                <div>
                  <h1 className="text-xl font-bold text-foreground leading-tight">
                    {fullName}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {person.rank}
                    {person.position && (
                      <> · {person.position}</>
                    )}
                  </p>
                </div>

                {/* Status badge */}
                {statusInfo && (
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full",
                    "text-xs font-semibold border",
                    statusColors[statusInfo.color] ?? "bg-muted text-muted-foreground border-border"
                  )}>
                    {statusInfo.label}
                  </span>
                )}
              </div>

              {/* Personnel number */}
              {person.personnelNumber && (
                <p className="mt-2 text-xs font-mono text-muted-foreground bg-muted/50 inline-block px-2 py-0.5 rounded">
                  № {person.personnelNumber}
                </p>
              )}
            </div>

            {/* Edit action */}
            {canEdit && (
              <PersonnelDetailActions personId={person.id} />
            )}
          </div>
        </div>
      </div>

      {/* ── Details grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Service info */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Служебные данные
          </h2>
          <div className="mt-3 space-y-0">
            <InfoRow
              icon={Hash}
              label="Личный номер"
              value={person.personnelNumber}
              mono
            />
            <InfoRow
              icon={User}
              label="Звание"
              value={person.rank}
            />
            <InfoRow
              icon={Briefcase}
              label="Должность"
              value={person.position}
            />
            <InfoRow
              icon={Users}
              label="Подразделение"
              value={person.unit}
            />
          </div>
        </div>

        {/* Right: System info */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            Системная информация
          </h2>
          <div className="mt-3 space-y-0">
            <InfoRow
              icon={CalendarDays}
              label="Дата добавления"
              value={formatDateTime(person.createdAt)}
            />
            <InfoRow
              icon={RefreshCw}
              label="Последнее обновление"
              value={formatDateTime(person.updatedAt)}
            />
          </div>
        </div>
      </div>

      {/* ── Notes ────────────────────────────────────────────────────────── */}
      {person.notes && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Примечания
          </h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {person.notes}
          </p>
        </div>
      )}
    </div>
  );
}