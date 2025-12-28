"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Props for the BackButton component
 */
interface BackButtonProps {
    /** Additional CSS classes */
    className?: string;
    /** Button text (defaults to "Back") */
    children?: React.ReactNode;
}

/**
 * BackButton component
 *
 * A reusable back navigation button that uses the browser's history
 * to navigate to the previous page. Falls back to home page if there's
 * no history entry.
 *
 * @example
 * ```tsx
 * <BackButton className="mb-6" />
 * ```
 */
export function BackButton({ className, children = "Back" }: BackButtonProps) {
    const router = useRouter();

    /**
     * Handle back navigation
     *
     * Uses router.back() to navigate to the previous page in browser history.
     * This ensures proper navigation flow (e.g., matchup -> player -> back to matchup).
     */
    const handleBack = React.useCallback(() => {
        router.back();
    }, [router]);

    return (
        <Button
            variant="secondary"
            size="sm"
            onClick={handleBack}
            className={cn("hover:cursor-pointer", className)}
        >
            {/* Back arrow icon */}
            <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                />
            </svg>
            {children}
        </Button>
    );
}

