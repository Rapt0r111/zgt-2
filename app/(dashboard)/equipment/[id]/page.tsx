/**
 * /equipment/[id] — Equipment Detail Page
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import type { Route } from "next";
import {
  ArrowLeft, Monitor, Hash, MapPin, User, Cpu, HardDrive,
  Calendar, RefreshCw, Pencil, Package, History,
} from "lucide-react";
import { getEquipmentById } from "@/lib/equipment.server";
import { EQUIPMENT_STATUS_MAP } from "@/types/equipment";
import { formatDateTime, cn } from "@/lib/utils";
import { hasRole } from "@/lib/auth.server";
import { EquipmentHistory } from "../_components/EquipmentHistory";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await getEquipmentById(id);
  if (!item) return { title: "Не найдено — ЗГТ" };
  return { title: `${item.displayName} — ЗГТ` };
}

function InfoRow({ icon: Icon, label, value, mono }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | null | undefined; mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className={cn("text-sm text-foreground font-medium", mono && "font-mono")}>{value}</p>
      </div>
    </div>
  );
}

function KitBadge({ label, present, working }: { label: string; present: boolean | null; working?: boolean | null }) {
  if (present === null) return null;
  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-2 rounded-lg text-sm",
      present ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-muted border border-border"
    )}>
      <span className={present ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-medium", present ? "text-emerald-600" : "text-muted-foreground")}>
          {present ? "Есть" : "Нет"}
        </span>
        {present && working !== null && working !== undefined && (
          <span className={cn("text-xs", working ? "text-emerald-500" : "text-red-500")}>
            · {working ? "исправно" : "неисправно"}
          </span>
        )}
      </div>
    </div>
  );
}

export default async function EquipmentDetailPage({ params }: Props) {
  const { id } = await params;
  const [item, canEdit] = await Promise.all([
    getEquipmentById(id),
    hasRole("operator"),
  ]);

  if (!item) notFound();

  const statusInfo = EQUIPMENT_STATUS_MAP[item.status as keyof typeof EQUIPMENT_STATUS_MAP];
  const statusColors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    blue:    "bg-blue-500/10 text-blue-600 border-blue-500/20",
    amber:   "bg-amber-500/10 text-amber-600 border-amber-500/20",
    red:     "bg-red-500/10 text-red-600 border-red-500/20",
  };

  const categoryLabels: Record<string, string> = {
    workstation: "ПЭВМ / АРМ", laptop: "Ноутбук", server: "Сервер", other: "Прочее",
  };

  const hasKit = item.hasCharger !== null || item.hasMouse !== null || item.hasBag !== null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Link href={"/equipment" as Route}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Вычислительная техника
      </Link>

      {/* Hero card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-2 bg-primary" />
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Monitor className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-3">
                <div>
                  <h1 className="text-xl font-bold text-foreground leading-tight">{item.displayName}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {categoryLabels[item.category]}
                    {item.manufacturer && <> · {item.manufacturer}</>}
                    {item.model        && <> {item.model}</>}
                  </p>
                </div>
                {statusInfo && (
                  <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
                    statusColors[statusInfo.color] ?? "bg-muted")}>
                    {statusInfo.label}
                  </span>
                )}
              </div>
              {item.inventoryNumber && (
                <p className="mt-2 text-xs font-mono text-muted-foreground bg-muted/50 inline-block px-2 py-0.5 rounded">
                  Инв. № {item.inventoryNumber}
                </p>
              )}
            </div>
            {canEdit && (
              <button
                onClick={undefined}
                data-edit-id={item.id}
                className="h-9 px-3 rounded-lg border border-input text-sm flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Редактировать</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identification */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            Идентификация
          </h2>
          <InfoRow icon={Hash}    label="Инвентарный номер" value={item.inventoryNumber} mono />
          <InfoRow icon={Hash}    label="Серийный номер"    value={item.serialNumber}    mono />
          <InfoRow icon={Hash}    label="Серийный номер МНИ" value={item.mniSerialNumber} mono />
          <InfoRow icon={Monitor} label="Производитель"     value={item.manufacturer} />
          <InfoRow icon={Monitor} label="Модель"            value={item.model} />
        </div>

        {/* Specs */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            Характеристики
          </h2>
          <InfoRow icon={Cpu}       label="Процессор"      value={item.cpu} />
          <InfoRow icon={Cpu}       label="ОЗУ"            value={item.ramGb ? `${item.ramGb} ГБ` : null} />
          <InfoRow icon={HardDrive} label="Хранилище"      value={item.storageGb ? `${item.storageType ?? ""} ${item.storageGb} ГБ`.trim() : null} />
          <InfoRow icon={Monitor}   label="ОС"             value={item.os} />
        </div>

        {/* Location / Owner */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            Размещение
          </h2>
          <InfoRow icon={MapPin} label="Местоположение" value={item.location} />
          <InfoRow icon={User}   label="Ответственный"  value={item.personnelName ? `${item.personnelRank ?? ""} ${item.personnelName}`.trim() : null} />
          <InfoRow icon={Calendar}  label="Добавлено"   value={formatDateTime(item.createdAt)} />
          <InfoRow icon={RefreshCw} label="Обновлено"   value={formatDateTime(item.updatedAt)} />
        </div>

        {/* Kit */}
        {hasKit && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              Комплектность
            </h2>
            <div className="space-y-2">
              <KitBadge label="Зарядное устройство" present={item.hasCharger} working={item.isChargerWorking} />
              <KitBadge label="Мышь"                present={item.hasMouse}   working={item.isMouseWorking} />
              <KitBadge label="Сумка / чехол"       present={item.hasBag} />
            </div>
          </div>
        )}
      </div>

      {/* Storage devices */}
      {item.storageDevices.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            Накопители ({item.storageDevices.length})
          </h2>
          <div className="space-y-3">
            {item.storageDevices.map((sd) => (
              <div key={sd.id} className="flex flex-wrap items-start gap-4 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                  <div><span className="text-muted-foreground text-xs">Тип:</span> {sd.type ?? "—"}</div>
                  <div><span className="text-muted-foreground text-xs">Объём:</span> {sd.capacityGb ? `${sd.capacityGb} ГБ` : "—"}</div>
                  <div><span className="text-muted-foreground text-xs">Интерфейс:</span> {sd.interface ?? "—"}</div>
                  <div className="font-mono text-xs"><span className="text-muted-foreground">С/Н:</span> {sd.serialNumber}</div>
                  {sd.inventoryNumber && <div className="font-mono text-xs"><span className="text-muted-foreground">Инв:</span> {sd.inventoryNumber}</div>}
                  {sd.manufacturer && <div><span className="text-muted-foreground text-xs">Пр-ль:</span> {sd.manufacturer} {sd.model}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          История перемещений
        </h2>
        <Suspense fallback={
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/5" />
                </div>
              </div>
            ))}
          </div>
        }>
          <EquipmentHistory equipmentId={item.id} />
        </Suspense>
      </div>
    </div>
  );
}