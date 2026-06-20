"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type BuffEffectType = "heal" | "attack" | "shield" | null;

interface BuffEffectOverlayProps {
    type: BuffEffectType;
    onComplete: () => void;
}

/** Partikel terbang ke atas untuk efek Heal */
const HealParticles = () => {
    const particles = Array.from({ length: 8 }, (_, i) => i);
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {particles.map((i) => (
                <motion.div
                    key={i}
                    className="absolute text-lg font-bold text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.9)]"
                    style={{
                        left: `${15 + i * 10}%`,
                        bottom: "20%",
                    }}
                    initial={{ opacity: 1, y: 0, scale: 0.8 }}
                    animate={{
                        opacity: [1, 1, 0],
                        y: -120 - i * 15,
                        scale: [0.8, 1.2, 0.8],
                        x: [0, (i % 2 === 0 ? 1 : -1) * (10 + i * 3), 0],
                    }}
                    transition={{
                        duration: 1.5,
                        delay: i * 0.08,
                        ease: "easeOut",
                    }}
                >
                    +HP
                </motion.div>
            ))}
        </div>
    );
};

/** Flash hijau untuk efek Heal */
const HealFlash = () => (
    <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl bg-green-400/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0] }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
    />
);

/** Efek ledakan teks untuk Attack */
const AttackBurst = () => (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        {/* Ring meledak */}
        <motion.div
            className="absolute h-40 w-40 rounded-full border-4 border-orange-400"
            initial={{ scale: 0.2, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.div
            className="absolute h-40 w-40 rounded-full border-2 border-yellow-300"
            initial={{ scale: 0.2, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: "easeOut" }}
        />
        {/* Teks utama */}
        <motion.div
            className="relative z-10 text-center"
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: [0, 1.4, 1.1], rotate: [-15, 5, 0] }}
            transition={{ duration: 0.45, ease: "backOut" }}
        >
            <div className="text-4xl font-black tracking-tight text-orange-400 drop-shadow-[0_0_20px_rgba(251,146,60,0.9)]">
                ⚡ +10
            </div>
            <div className="text-sm font-bold uppercase tracking-widest text-yellow-300">
                Attack Buff!
            </div>
        </motion.div>
        {/* Kilatan latar */}
        <motion.div
            className="absolute inset-0 bg-orange-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.3 }}
        />
    </div>
);

/** Efek cincin pelindung untuk Shield */
const ShieldBurst = () => (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        {/* Ring berdenyut */}
        {[0, 1, 2].map((i) => (
            <motion.div
                key={i}
                className="absolute rounded-full border-2 border-blue-400"
                style={{ width: 80 + i * 60, height: 80 + i * 60 }}
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 0.8, delay: i * 0.12, ease: "easeOut" }}
            />
        ))}
        {/* Teks utama */}
        <motion.div
            className="relative z-10 text-center"
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: [0, 1.3, 1], y: [20, -5, 0] }}
            transition={{ duration: 0.5, ease: "backOut" }}
        >
            <div className="text-4xl font-black tracking-tight text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.9)]">
                🛡 -20
            </div>
            <div className="text-sm font-bold uppercase tracking-widest text-cyan-300">
                Shield Active!
            </div>
        </motion.div>
        {/* Flash biru */}
        <motion.div
            className="absolute inset-0 bg-blue-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            transition={{ duration: 0.4 }}
        />
    </div>
);

const EFFECT_DURATION: Record<NonNullable<BuffEffectType>, number> = {
    heal: 1700,
    attack: 1400,
    shield: 1500,
};

export const BuffEffectOverlay = ({
    type,
    onComplete,
}: BuffEffectOverlayProps) => {
    // Auto-dismiss setelah animasi selesai
    useEffect(() => {
        if (!type) return;
        const timer = setTimeout(onComplete, EFFECT_DURATION[type]);
        return () => clearTimeout(timer);
    }, [type, onComplete]);

    return (
        <AnimatePresence>
            {type && (
                <motion.div
                    key={type}
                    className="pointer-events-none fixed inset-0 z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    {type === "heal" && (
                        <>
                            <HealFlash />
                            <HealParticles />
                        </>
                    )}
                    {type === "attack" && <AttackBurst />}
                    {type === "shield" && <ShieldBurst />}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
