"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, memo } from "react";

/**
 * RouteTransition — Quick scan animation that plays on every sidebar navigation.
 * 
 * Detects pathname changes and shows a ~700ms overlay animation with:
 * - Quick scan beam sweep
 * - Module name flash
 * - Fade out reveal
 * 
 * 100% CSS animations (GPU-accelerated). Does NOT block interactions.
 */

// Map routes to display names
const ROUTE_LABELS: Record<string, string> = {
    "/dashboard": "Dashboard Clínico",
    "/dashboard/analysis": "Análisis de Imágenes",
    "/dashboard/patients": "Pacientes",
    "/dashboard/validation": "Validación Experta",
    "/dashboard/reports": "Reportes",
    "/dashboard/model": "Modelo IA",
    "/dashboard/settings": "Configuración",
    "/dashboard/alerts": "Centro de Alertas",
    "/dashboard/profile": "Perfil",
};

export const RouteTransition = memo(function RouteTransition() {
    const pathname = usePathname();
    const [isAnimating, setIsAnimating] = useState(false);
    const [label, setLabel] = useState("");
    const [transitionKey, setTransitionKey] = useState(0);
    const prevPath = useRef(pathname);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Skip on initial mount
        if (prevPath.current === pathname) return;
        prevPath.current = pathname;

        // Get module label — try exact match, then try normalized (strip trailing slash)
        const normalizedPath = pathname.replace(/\/$/, "") || "/dashboard";
        const routeLabel = ROUTE_LABELS[pathname] || ROUTE_LABELS[normalizedPath] || "Cargando módulo…";
        setLabel(routeLabel);

        // Increment key to force DOM remount (restarts CSS animations)
        setTransitionKey((k) => k + 1);
        setIsAnimating(true);

        // Clear any existing timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Hide after animation completes
        timeoutRef.current = setTimeout(() => {
            setIsAnimating(false);
        }, 700);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [pathname]);

    if (!isAnimating) return null;

    return (
        <div className="rt-overlay" key={transitionKey} aria-hidden="true">
            {/* Scan sweep line */}
            <div className="rt-sweep" />

            {/* Horizontal scan beam */}
            <div className="rt-beam" />

            {/* Center content */}
            <div className="rt-center">
                {/* Scan ring */}
                <div className="rt-ring" />
                <div className="rt-ring rt-ring--2" />

                {/* Module label */}
                <div className="rt-label">
                    <div className="rt-label-line" />
                    <span className="rt-label-text">{label}</span>
                    <div className="rt-label-line" />
                </div>
            </div>

            {/* Corner accents */}
            <div className="rt-corner rt-corner--tl" />
            <div className="rt-corner rt-corner--tr" />
            <div className="rt-corner rt-corner--bl" />
            <div className="rt-corner rt-corner--br" />

            {/* Particle burst */}
            <div className="rt-particle rt-p1" />
            <div className="rt-particle rt-p2" />
            <div className="rt-particle rt-p3" />
            <div className="rt-particle rt-p4" />

            <style dangerouslySetInnerHTML={{
                __html: `
                .rt-overlay {
                    position: fixed;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 256px;
                    z-index: 90;
                    pointer-events: none;
                    overflow: hidden;
                    animation: rt-fade 0.7s ease forwards;
                    background: radial-gradient(ellipse at center, rgba(6,10,20,0.85) 0%, rgba(6,10,20,0.4) 60%, transparent 100%);
                }

                @keyframes rt-fade {
                    0% { opacity: 0; }
                    15% { opacity: 1; }
                    70% { opacity: 1; }
                    100% { opacity: 0; }
                }

                /* ── Vertical sweep ─────────────── */
                .rt-sweep {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.6) 30%, rgba(34,211,238,0.8) 50%, rgba(99,102,241,0.6) 70%, transparent);
                    box-shadow: 0 0 20px 4px rgba(99,102,241,0.3), 0 0 60px 8px rgba(34,211,238,0.15);
                    animation: rt-sweep-down 0.6s ease-out forwards;
                }

                @keyframes rt-sweep-down {
                    0% { transform: translateY(-4px); opacity: 0; }
                    10% { opacity: 1; }
                    100% { transform: translateY(calc(100vh)); opacity: 0; }
                }

                /* ── Horizontal beam ─────────────── */
                .rt-beam {
                    position: absolute;
                    left: 0;
                    top: 50%;
                    width: 100%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.3) 20%, rgba(34,211,238,0.2) 50%, rgba(99,102,241,0.3) 80%, transparent);
                    animation: rt-beam-flash 0.5s ease-out 0.1s both;
                }

                @keyframes rt-beam-flash {
                    0% { opacity: 0; transform: scaleX(0); }
                    30% { opacity: 1; transform: scaleX(1); }
                    100% { opacity: 0; transform: scaleX(1); }
                }

                /* ── Center rings ─────────────────── */
                .rt-center {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }

                .rt-ring {
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    border: 1.5px solid rgba(99,102,241,0.3);
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0.3);
                    animation: rt-ring-expand 0.55s ease-out forwards;
                }

                .rt-ring--2 {
                    width: 120px;
                    height: 120px;
                    border-color: rgba(34,211,238,0.15);
                    animation: rt-ring-expand 0.6s ease-out 0.05s forwards;
                }

                @keyframes rt-ring-expand {
                    0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.8; }
                    60% { opacity: 0.5; }
                    100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
                }

                /* ── Module label ─────────────────── */
                .rt-label {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    animation: rt-label-show 0.6s ease both;
                    margin-top: 48px;
                }

                .rt-label-text {
                    font-size: 13px;
                    font-weight: 600;
                    color: rgba(165, 180, 252, 0.9);
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    white-space: nowrap;
                    text-shadow: 0 0 12px rgba(99,102,241,0.4);
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                }

                .rt-label-line {
                    width: 30px;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.5));
                    animation: rt-line-grow 0.4s ease 0.1s both;
                }
                .rt-label-line:last-child {
                    background: linear-gradient(90deg, rgba(99,102,241,0.5), transparent);
                }

                @keyframes rt-label-show {
                    0% { opacity: 0; transform: translateY(6px); }
                    30% { opacity: 1; transform: translateY(0); }
                    75% { opacity: 1; }
                    100% { opacity: 0; transform: translateY(-4px); }
                }

                @keyframes rt-line-grow {
                    0% { width: 0; opacity: 0; }
                    50% { width: 30px; opacity: 0.8; }
                    100% { width: 30px; opacity: 0; }
                }

                /* ── Corner accents ───────────────── */
                .rt-corner {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    animation: rt-corner-flash 0.5s ease 0.05s both;
                }
                .rt-corner--tl { top: 20%; left: 10%; border-top: 1.5px solid rgba(99,102,241,0.25); border-left: 1.5px solid rgba(99,102,241,0.25); }
                .rt-corner--tr { top: 20%; right: 10%; border-top: 1.5px solid rgba(99,102,241,0.25); border-right: 1.5px solid rgba(99,102,241,0.25); }
                .rt-corner--bl { bottom: 20%; left: 10%; border-bottom: 1.5px solid rgba(34,211,238,0.2); border-left: 1.5px solid rgba(34,211,238,0.2); }
                .rt-corner--br { bottom: 20%; right: 10%; border-bottom: 1.5px solid rgba(34,211,238,0.2); border-right: 1.5px solid rgba(34,211,238,0.2); }

                @keyframes rt-corner-flash {
                    0% { opacity: 0; transform: scale(0.5); }
                    30% { opacity: 0.8; transform: scale(1); }
                    100% { opacity: 0; transform: scale(1.2); }
                }

                /* ── Particles ────────────────────── */
                .rt-particle {
                    position: absolute;
                    width: 3px;
                    height: 3px;
                    border-radius: 50%;
                    top: 50%;
                    left: 50%;
                }
                .rt-p1 { background: #6366f1; animation: rt-particle-1 0.5s ease-out 0.1s both; }
                .rt-p2 { background: #22d3ee; animation: rt-particle-2 0.5s ease-out 0.15s both; }
                .rt-p3 { background: #8b5cf6; animation: rt-particle-3 0.5s ease-out 0.08s both; }
                .rt-p4 { background: #6366f1; animation: rt-particle-4 0.5s ease-out 0.12s both; }

                @keyframes rt-particle-1 {
                    0% { transform: translate(0,0) scale(1); opacity: 0.8; box-shadow: 0 0 6px #6366f1; }
                    100% { transform: translate(-60px, -40px) scale(0); opacity: 0; }
                }
                @keyframes rt-particle-2 {
                    0% { transform: translate(0,0) scale(1); opacity: 0.8; box-shadow: 0 0 6px #22d3ee; }
                    100% { transform: translate(50px, -50px) scale(0); opacity: 0; }
                }
                @keyframes rt-particle-3 {
                    0% { transform: translate(0,0) scale(1); opacity: 0.8; box-shadow: 0 0 6px #8b5cf6; }
                    100% { transform: translate(-40px, 45px) scale(0); opacity: 0; }
                }
                @keyframes rt-particle-4 {
                    0% { transform: translate(0,0) scale(1); opacity: 0.8; box-shadow: 0 0 6px #6366f1; }
                    100% { transform: translate(55px, 35px) scale(0); opacity: 0; }
                }
            ` }} />
        </div>
    );
});
