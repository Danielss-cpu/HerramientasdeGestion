"use client";

import {
    Bell, User, Check, CheckCircle2, AlertTriangle, ShieldCheck,
    LogOut, Settings, UserCircle, Crown, Stethoscope, Wrench,
    Eye, FileSearch, ClipboardCheck, Syringe, ChevronRight,
    Clock, Filter, X, BellOff, Trash2,
} from "lucide-react";
import { GlobalSearch } from "./global-search";
import { useState, useRef, useEffect, useMemo } from "react";
import { recentAlerts as initialAlerts, getRelativeTime } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAuth, roleLabels, roleColors, type UserRole } from "@/context/auth-context";
import type { Alert } from "@/lib/types";

// ─── Role icons ───────────────────────────────────────────────────────────────
const roleIcons: Record<UserRole, typeof Crown> = {
    admin: Crown,
    doctor: Stethoscope,
    support: Wrench,
};

// ─── Notification filter tabs ─────────────────────────────────────────────────
type FilterTab = "all" | "critical" | "pending" | "today";

const FILTERS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "critical", label: "Críticas" },
    { id: "pending", label: "Pendientes" },
    { id: "today", label: "Hoy" },
];

// ─── Level helpers ────────────────────────────────────────────────────────────
const LEVEL_CONFIG = {
    3: {
        bg: "bg-rose-500/10",
        border: "border-rose-500/25",
        text: "text-rose-400",
        badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        label: "Nivel 3 — Crítico",
        rowBg: "bg-rose-500/[0.04]",
        unreadDot: "bg-rose-500",
    },
    2: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/25",
        text: "text-amber-400",
        badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        label: "Nivel 2 — Moderado",
        rowBg: "bg-amber-500/[0.03]",
        unreadDot: "bg-amber-400",
    },
    1: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/25",
        text: "text-blue-400",
        badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",
        label: "Nivel 1 — Leve",
        rowBg: "",
        unreadDot: "bg-blue-400",
    },
    0: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/25",
        text: "text-emerald-400",
        badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        label: "Normal",
        rowBg: "",
        unreadDot: "bg-emerald-400",
    },
} as const;

type LevelKey = keyof typeof LEVEL_CONFIG;

function getLevelCfg(level: number) {
    const key = (level in LEVEL_CONFIG ? level : 0) as LevelKey;
    return LEVEL_CONFIG[key];
}

function LevelIcon({ level }: { level: number }) {
    if (level === 3) return <AlertTriangle className="h-4 w-4 text-rose-400" />;
    if (level === 2) return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    if (level === 1) return <CheckCircle2 className="h-4 w-4 text-blue-400" />;
    return <ShieldCheck className="h-4 w-4 text-emerald-400" />;
}

// ─── Quick action buttons per notification ────────────────────────────────────
function QuickActions({
    alert,
    canValidate,
    onMarkRead,
}: {
    alert: Alert;
    canValidate: boolean;
    onMarkRead: () => void;
}) {
    return (
        <div className="flex items-center gap-1 flex-wrap mt-2 pt-2 border-t border-white/5">
            <button
                onClick={(e) => { e.stopPropagation(); }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 hover:text-white border border-white/8 transition-all"
            >
                <Eye className="h-2.5 w-2.5" /> Ver caso
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 hover:text-white border border-white/8 transition-all"
            >
                <FileSearch className="h-2.5 w-2.5" /> Abrir análisis
            </button>
            {alert.status === "new" && (
                <button
                    onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 hover:text-white border border-white/8 transition-all"
                >
                    <ClipboardCheck className="h-2.5 w-2.5" /> Marcar revisada
                </button>
            )}
            {canValidate && alert.level >= 2 && (
                <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/35 border border-indigo-500/30 transition-all"
                >
                    <Syringe className="h-2.5 w-2.5" /> Validar diagnóstico
                </button>
            )}
        </div>
    );
}

// ─── Single notification row ──────────────────────────────────────────────────
function NotificationRow({
    alert,
    isExpanded,
    canValidate,
    onToggle,
    onMarkRead,
}: {
    alert: Alert;
    isExpanded: boolean;
    canValidate: boolean;
    onToggle: () => void;
    onMarkRead: () => void;
}) {
    const cfg = getLevelCfg(alert.level);
    const isNew = alert.status === "new";

    return (
        <div
            onClick={() => { onToggle(); if (isNew) onMarkRead(); }}
            className={cn(
                "group relative px-4 py-3 cursor-pointer border-b border-white/5 transition-all duration-200",
                "hover:bg-white/[0.035]",
                isNew ? cn(cfg.rowBg, "border-l-2", `border-l-${isNew ? cfg.unreadDot.replace("bg-", "") : "transparent"}`) : "border-l-2 border-l-transparent",
            )}
        >
            {/* Unread dot */}
            {isNew && (
                <span className={cn(
                    "absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full",
                    cfg.unreadDot,
                )} />
            )}

            <div className="flex gap-3">
                {/* Icon */}
                <div className={cn(
                    "shrink-0 mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center border",
                    cfg.bg, cfg.border,
                )}>
                    <LevelIcon level={alert.level} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                            "text-xs font-semibold leading-tight line-clamp-1",
                            isNew ? "text-white" : "text-slate-300",
                        )}>
                            {alert.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                                cfg.badge,
                            )}>
                                N{alert.level}
                            </span>
                            <ChevronRight className={cn(
                                "h-3 w-3 text-slate-600 transition-transform duration-200",
                                isExpanded && "rotate-90 text-slate-400",
                            )} />
                        </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {alert.patientName}
                        <span className="text-slate-600 mx-1">·</span>
                        <span className="text-slate-500">{alert.patientId}</span>
                    </p>

                    {/* Expanded content */}
                    <div className={cn(
                        "overflow-hidden transition-all duration-200",
                        isExpanded ? "max-h-64 opacity-100 mt-2" : "max-h-0 opacity-0",
                    )}>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            {alert.description}
                        </p>
                        <div className="flex items-center gap-1 mt-1.5">
                            <Clock className="h-2.5 w-2.5 text-slate-600" />
                            <span className="text-[10px] text-slate-500">{getRelativeTime(alert.timestamp)}</span>
                            <span className="text-slate-700 mx-1">·</span>
                            <span className="text-[10px] text-slate-500">{alert.confidence}% confianza</span>
                        </div>
                        <QuickActions alert={alert} canValidate={canValidate} onMarkRead={onMarkRead} />
                    </div>

                    {/* Collapsed: just time */}
                    {!isExpanded && (
                        <span className="text-[10px] text-slate-600 mt-0.5 block">
                            {getRelativeTime(alert.timestamp)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Header ──────────────────────────────────────────────────────────────
export function Header() {
    const { user, activeRole, switchRole, hasMultipleRoles, canAccessModule, logout } = useAuth();
    const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(7);
    const [clearConfirm, setClearConfirm] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Stats ────────────────────────────────────────────────────────────────
    const unreadCount = alerts.filter(a => a.status === "new").length;
    const criticalCount = alerts.filter(a => a.level === 3 && a.status === "new").length;

    // ── Permission ────────────────────────────────────────────────────────────
    const canValidate = activeRole === "admin" || activeRole === "doctor";

    // ── Outside click ─────────────────────────────────────────────────────────
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────
    const markAllAsRead = () => setAlerts(prev => prev.map(a => ({ ...a, status: "reviewed" as const })));

    const markAsRead = (id: string) =>
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "reviewed" as const } : a));

    const toggleExpand = (id: string) =>
        setExpandedId(prev => (prev === id ? null : id));

    const handleClearAll = () => {
        if (!clearConfirm) {
            // First click: arm the confirm state, auto-reset after 3 s
            setClearConfirm(true);
            clearTimerRef.current = setTimeout(() => setClearConfirm(false), 3000);
        } else {
            // Second click: actually clear
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
            setAlerts([]);
            setClearConfirm(false);
            setExpandedId(null);
            setVisibleCount(7);
        }
    };

    // Cancel confirm if dropdown closes
    useEffect(() => {
        if (!isOpen) {
            setClearConfirm(false);
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        }
    }, [isOpen]);

    // ── Filter + sort ─────────────────────────────────────────────────────────
    const filteredAlerts = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let list = [...alerts];

        if (activeFilter === "critical") list = list.filter(a => a.level === 3);
        else if (activeFilter === "pending") list = list.filter(a => a.status === "new");
        else if (activeFilter === "today") list = list.filter(a => a.timestamp >= startOfDay);

        // Sort: unread first, then by level desc, then by time desc
        list.sort((a, b) => {
            if (a.status === "new" && b.status !== "new") return -1;
            if (a.status !== "new" && b.status === "new") return 1;
            if (b.level !== a.level) return b.level - a.level;
            return b.timestamp.getTime() - a.timestamp.getTime();
        });

        return list;
    }, [alerts, activeFilter]);

    const visibleAlerts = filteredAlerts.slice(0, visibleCount);
    const hasMore = filteredAlerts.length > visibleCount;

    // ── Profile display ───────────────────────────────────────────────────────
    const colors = roleColors[activeRole];
    const displayName = user?.name ?? "Usuario";
    const displaySubtitle = roleLabels[activeRole];

    const handleRoleSwitch = (role: UserRole) => {
        switchRole(role);
        setIsProfileOpen(false);
    };

    return (
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
                <div className="flex flex-1">
                    <GlobalSearch />
                </div>
                <div className="flex items-center gap-x-4 lg:gap-x-6">

                    {/* ── NOTIFICATIONS ──────────────────────────────────── */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => { setIsOpen(!isOpen); setVisibleCount(7); }}
                            className="relative -m-2.5 p-2.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                        >
                            <span className="sr-only">Ver notificaciones</span>
                            <Bell className={cn("h-6 w-6 transition-colors", isOpen && "text-white")} aria-hidden="true" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 flex h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_0_2px_rgba(15,23,42,1)]">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60" />
                                </span>
                            )}
                        </button>

                        {isOpen && (
                            <div className="absolute right-0 top-full mt-2 w-[22rem] origin-top-right rounded-2xl bg-slate-900/98 backdrop-blur-xl shadow-2xl ring-1 ring-white/10 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">

                                {/* ── Header ───────────────────────────── */}
                                <div className="px-4 pt-4 pb-3 bg-slate-800/30 border-b border-white/5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-white">Notificaciones</h3>
                                            <p className="text-[10px] text-slate-500 mt-0.5">Centro de gestión clínica</p>
                                        </div>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* Summary counters */}
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2 border border-white/5">
                                            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                                <Bell className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-white leading-none">{unreadCount}</p>
                                                <p className="text-[10px] text-slate-500 leading-tight">Sin revisar</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2 border border-white/5">
                                            <div className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-white leading-none">{criticalCount}</p>
                                                <p className="text-[10px] text-slate-500 leading-tight">Críticas activas</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Filters */}
                                    <div className="flex items-center gap-1">
                                        <Filter className="h-3 w-3 text-slate-600 shrink-0" />
                                        {FILTERS.map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => { setActiveFilter(f.id); setVisibleCount(7); setExpandedId(null); }}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all",
                                                    activeFilter === f.id
                                                        ? "bg-primary/20 text-primary border border-primary/30"
                                                        : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
                                                )}
                                            >
                                                {f.label}
                                                {f.id === "critical" && criticalCount > 0 && (
                                                    <span className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                                                        {criticalCount}
                                                    </span>
                                                )}
                                                {f.id === "pending" && unreadCount > 0 && (
                                                    <span className="ml-1 inline-flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-full bg-slate-600 text-[8px] font-bold text-white">
                                                        {unreadCount}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-indigo-400 transition-colors shrink-0"
                                            >
                                                <Check className="h-3 w-3" />
                                                Todo leído
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ── List ─────────────────────────────── */}
                                <div className="overflow-y-auto custom-modal-scrollbar" style={{ maxHeight: "360px" }}>
                                    {visibleAlerts.length > 0 ? (
                                        <>
                                            {visibleAlerts.map(alert => (
                                                <NotificationRow
                                                    key={alert.id}
                                                    alert={alert}
                                                    isExpanded={expandedId === alert.id}
                                                    canValidate={canValidate}
                                                    onToggle={() => toggleExpand(alert.id)}
                                                    onMarkRead={() => markAsRead(alert.id)}
                                                />
                                            ))}
                                            {/* Load more */}
                                            {hasMore && (
                                                <button
                                                    onClick={() => setVisibleCount(c => c + 5)}
                                                    className="w-full py-2.5 text-[11px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    Cargar {Math.min(filteredAlerts.length - visibleCount, 5)} más
                                                    <ChevronRight className="h-3 w-3 rotate-90" />
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                                            <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center ring-1 ring-white/5">
                                                <BellOff className="h-5 w-5 text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-400">Sin resultados</p>
                                                <p className="text-xs text-slate-600 mt-0.5">No hay notificaciones en esta categoría</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── Footer ───────────────────────────── */}
                                <div className="px-4 py-2.5 border-t border-white/5 bg-slate-800/20 flex items-center justify-between gap-3">
                                    {/* Clear all button — two-step confirm */}
                                    {alerts.length > 0 && (
                                        <button
                                            onClick={handleClearAll}
                                            className={cn(
                                                "flex items-center gap-1.5 text-[11px] font-semibold transition-all duration-200 rounded-lg px-2 py-1 border",
                                                clearConfirm
                                                    ? "bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25 animate-pulse"
                                                    : "text-slate-500 border-transparent hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20",
                                            )}
                                            title={clearConfirm ? "Haz clic de nuevo para confirmar" : "Vaciar notificaciones"}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                            {clearConfirm ? "¿Confirmar vaciado?" : "Vaciar"}
                                        </button>
                                    )}
                                    <Link
                                        href="/dashboard/alerts"
                                        onClick={() => setIsOpen(false)}
                                        className="ml-auto text-[11px] font-semibold text-primary hover:text-indigo-400 transition-colors flex items-center gap-1 shrink-0"
                                    >
                                        Ver alertas <ChevronRight className="h-3 w-3" />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-white/10" aria-hidden="true" />

                    {/* ── PROFILE ────────────────────────────────────────── */}
                    <div className="flex items-center gap-x-4 lg:gap-x-6">
                        <div className="relative" ref={profileRef}>
                            <div
                                className="flex items-center gap-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                            >
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center border border-white/10">
                                    <User className="h-4 w-4 text-white" />
                                </div>
                                <div className="hidden lg:block">
                                    <span className="block text-sm font-semibold leading-6 text-white">{displayName}</span>
                                    <span className={cn("block text-xs -mt-1 font-medium", colors.text)}>{displaySubtitle}</span>
                                </div>
                            </div>

                            {isProfileOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-xl bg-slate-900/95 backdrop-blur-xl shadow-2xl ring-1 ring-white/10 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="px-4 py-3 border-b border-white/5">
                                        <p className="text-sm text-white font-medium">{displayName}</p>
                                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                                    </div>

                                    {hasMultipleRoles && user && (
                                        <div className="px-2 py-2 border-b border-white/5">
                                            <p className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider font-bold">Cambiar Rol</p>
                                            {user.roles.map(role => {
                                                const Icon = roleIcons[role];
                                                return (
                                                    <button
                                                        key={role}
                                                        onClick={() => handleRoleSwitch(role)}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-left",
                                                            activeRole === role
                                                                ? cn(roleColors[role].bg, roleColors[role].text, "border", roleColors[role].border, "font-medium")
                                                                : "text-slate-400 hover:bg-white/5 hover:text-white",
                                                        )}
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                        <span className="flex-1">{roleLabels[role]}</span>
                                                        {activeRole === role && <Check className="h-4 w-4" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="py-1">
                                        <Link
                                            href="/dashboard/profile"
                                            onClick={() => setIsProfileOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left w-full"
                                        >
                                            <UserCircle className="h-4 w-4" />
                                            Mi Perfil
                                        </Link>
                                        {canAccessModule("settings") && (
                                            <Link
                                                href="/dashboard/settings"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left w-full"
                                            >
                                                <Settings className="h-4 w-4" />
                                                Configuración
                                            </Link>
                                        )}
                                    </div>

                                    <div className="h-px bg-white/5" />
                                    <div className="py-1">
                                        <button
                                            onClick={logout}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors text-left w-full"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </header>
    );
}
