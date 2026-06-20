import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/utils";

const mainButtonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
    {
        variants: {
            variant: {
                blue: "bg-[#3D79F3] text-white hover:bg-[#3269d6]",
                white: "bg-white text-[#3D79F3] hover:bg-gray-50",
                green: "bg-[#67C48B] text-white hover:bg-[#59ad7a]",
                red: "bg-[#E11D48] text-white hover:bg-[#BE123C]",
            },
            size: {
                default: "h-12 px-8 py-3 text-lg",
                sm: "h-10 px-6 text-base",
                lg: "h-14 px-10 py-4 text-xl",
                icon: "h-12 w-12",
            },
            hasShadow: {
                true: "",
                false: "shadow-none",
            },
        },
        compoundVariants: [
            {
                variant: "blue",
                hasShadow: true,
                className:
                    "shadow-[0_8px_20px_rgba(61,121,243,0.3)] hover:shadow-[0_10px_25px_rgba(61,121,243,0.4)] hover:-translate-y-0.5 cursor-pointer",
            },
            {
                variant: "white",
                hasShadow: true,
                className:
                    "shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_10px_25px_rgba(0,0,0,0.12)] border border-gray-100 hover:-translate-y-0.5 cursor-pointer",
            },
            {
                variant: "green",
                hasShadow: true,
                className:
                    "shadow-[0_8px_20px_rgba(103,196,139,0.3)] hover:shadow-[0_10px_25px_rgba(103,196,139,0.4)] hover:-translate-y-0.5 cursor-pointer",
            },
            {
                variant: "red",
                hasShadow: true,
                className:
                    "shadow-[0_8px_20px_rgba(225,29,72,0.3)] hover:shadow-[0_10px_25px_rgba(225,29,72,0.4)] hover:-translate-y-0.5 cursor-pointer",
            },
        ],
        defaultVariants: {
            variant: "blue",
            size: "default",
            hasShadow: false,
        },
    },
);

export interface MainButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof mainButtonVariants> {
    asChild?: boolean;
    isLoading?: boolean;
}

const MainButton = React.forwardRef<HTMLButtonElement, MainButtonProps>(
    (
        {
            className,
            variant,
            size,
            hasShadow,
            type = "button",
            isLoading,
            children,
            ...props
        },
        ref,
    ) => {
        return (
            <button
                type={type}
                className={cn(
                    mainButtonVariants({ variant, size, hasShadow, className }),
                    isLoading && "cursor-not-allowed opacity-80",
                )}
                disabled={isLoading || props.disabled}
                ref={ref}
                {...props}
            >
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Memproses...</span>
                    </div>
                ) : (
                    children
                )}
            </button>
        );
    },
);
MainButton.displayName = "MainButton";

export { MainButton, mainButtonVariants };
