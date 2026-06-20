"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { PickedAbility } from "@/store/useStarboxStore";

interface BuffItemProps {
    buff: PickedAbility;
    onClick?: () => void;
}

export const BuffItem = ({ buff, onClick }: BuffItemProps) => {
    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="group flex cursor-pointer flex-col items-center justify-center gap-1"
        >
            {/* Icon Container */}
            <div className="relative h-12 w-12 md:h-14 md:w-14">
                {/* Glow Effect on Hover */}
                <div className="absolute inset-0 rounded-full bg-white/0 blur-xl transition-all duration-300 group-hover:bg-white/10" />

                <Image
                    src={
                        buff.image?.replace("-card", "") ||
                        "/default-ability.webp"
                    }
                    alt={buff.name}
                    fill
                    sizes="(max-width: 768px) 48px, 56px"
                    className="relative z-10 object-contain drop-shadow-md"
                />

                {/* Badge Jumlah Stock — tampil selalu agar player tahu sisa item */}
                <motion.span
                    key={buff.stock}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="absolute -right-2 top-0 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-black bg-yellow-400 text-xs font-black leading-none text-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                >
                    {buff.stock}
                </motion.span>
            </div>

            {/* Label Text */}
            <span className="text-center text-xs font-semibold text-white md:text-sm">
                {buff.name}
            </span>
        </motion.div>
    );
};
