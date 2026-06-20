"use client";

import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { MainButton } from "@/components/common/MainButton";

export interface TextFieldWithButtonProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onSubmit"> {
    buttonContent: React.ReactNode;
    onSubmit?: (value: string) => void;
    wrapperClassName?: string;
}

const TextFieldWithButton = React.forwardRef<
    HTMLInputElement,
    TextFieldWithButtonProps
>(({ className, wrapperClassName, buttonContent, onSubmit, ...props }, ref) => {
    // Handler internal untuk mengurus FormEvent
    const handleInternalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const inputName = props.name || "arenaCode";
        const value = formData.get(inputName) as string;

        if (onSubmit && value?.trim() !== "") {
            onSubmit(value);
        }
    };

    return (
        <form
            onSubmit={handleInternalSubmit}
            className={cn(
                "flex items-center rounded-xl border border-gray-300 bg-white p-1.5 shadow-sm transition-all focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-400",
                wrapperClassName,
            )}
        >
            <input
                ref={ref}
                name="arenaCode"
                className={cn(
                    "min-w-0 flex-1 truncate bg-transparent px-4 py-2 text-sm font-semibold text-gray-700 placeholder-gray-300 outline-none md:text-base",
                    className,
                )}
                {...props}
            />
            <MainButton
                type="submit"
                variant="blue"
                className="h-8 shrink-0 rounded-lg px-4 text-sm font-bold md:h-10 md:px-8 md:text-base"
                disabled={props.disabled}
            >
                {buttonContent}
            </MainButton>
        </form>
    );
});

TextFieldWithButton.displayName = "TextFieldWithButton";

export { TextFieldWithButton };
