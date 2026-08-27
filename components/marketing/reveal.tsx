"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

/** True once the user has scrolled past `threshold` px. Drives the nav's transparent → solid transition. */
export function useScrolled(threshold = 40) {
    const [scrolled, setScrolled] = useState(false)
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > threshold)
        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [threshold])
    return scrolled
}

/** Page scroll progress as a 0–100 percentage, for the top progress bar. */
export function useScrollProgress() {
    const [progress, setProgress] = useState(0)
    useEffect(() => {
        const onScroll = () => {
            const el = document.documentElement
            const scrollable = el.scrollHeight - el.clientHeight
            setProgress(scrollable > 0 ? Math.min(100, (el.scrollTop / scrollable) * 100) : 0)
        }
        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])
    return progress
}

/** Thin gradient bar fixed to the top of the viewport, tracking scroll progress. */
export function ScrollProgress() {
    const progress = useScrollProgress()
    return (
        <div className="fixed left-0 top-0 z-[60] h-[3px] w-full bg-transparent">
            <div
                className="h-full bg-gradient-to-r from-[#FF6B4A] to-[#9db4ff] transition-[width] duration-150 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
    )
}

/** Fades + slides a section into view the first time it enters the viewport. */
export function Reveal({
    children,
    className = "",
    delay = 0,
}: {
    children: ReactNode
    className?: string
    delay?: number
}) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
            style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
        >
            {children}
        </div>
    )
}

/**
 * Shared keyframes/utility classes for the marketing pages (scroll reveal, floating
 * cards, drifting ambient orbs). Global (not scoped) so child components like
 * <Reveal> can use the class names too. Mount once per page.
 */
export function MarketingMotionStyles() {
    return (
        <style jsx global>{`
            .reveal {
                opacity: 0;
                transform: translateY(28px);
                transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
                will-change: opacity, transform;
            }
            .reveal-visible {
                opacity: 1;
                transform: translateY(0);
            }
            .match-card-hover:hover {
                transform: translateY(-3px);
            }
            @keyframes matchFloat1 {
                0%, 100% { transform: translateY(0) rotate(-3deg); }
                50% { transform: translateY(-12px) rotate(-3deg); }
            }
            @keyframes matchFloat2 {
                0%, 100% { transform: translateY(0) rotate(2deg); }
                50% { transform: translateY(10px) rotate(2deg); }
            }
            @keyframes matchFloat3 {
                0%, 100% { transform: translateY(0) rotate(-1deg); }
                50% { transform: translateY(-8px) rotate(-1deg); }
            }
            .match-float-1 { animation: matchFloat1 6s ease-in-out infinite; }
            .match-float-2 { animation: matchFloat2 7s ease-in-out infinite; }
            .match-float-3 { animation: matchFloat3 5.5s ease-in-out infinite; }
            @keyframes orbDrift1 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                50% { transform: translate(-30px, 30px) scale(1.08); }
            }
            @keyframes orbDrift2 {
                0%, 100% { transform: translate(0, 0) scale(1); }
                50% { transform: translate(25px, -20px) scale(1.06); }
            }
            .orb-drift-1 { animation: orbDrift1 14s ease-in-out infinite; }
            .orb-drift-2 { animation: orbDrift2 16s ease-in-out infinite; }
            @media (prefers-reduced-motion: reduce) {
                .reveal {
                    opacity: 1;
                    transform: none;
                    transition: none;
                }
                .match-float-1, .match-float-2, .match-float-3,
                .orb-drift-1, .orb-drift-2 {
                    animation: none;
                }
            }
        `}</style>
    )
}
