"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuLink,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Navigation link configuration
 * Each link has a label, href, and optional description
 */
interface NavLink {
    label: string;
    href: string;
    description?: string;
}

/**
 * Main navigation links for the application
 */
const navLinks: NavLink[] = [{ label: "Home", href: "/" }];

/**
 * Navbar component
 *
 * A sticky navigation bar that appears at the top of all pages.
 * Features:
 * - Logo/brand linking to home
 * - Navigation links (Home, Players, Teams, Matchups)
 * - Sticky positioning with backdrop blur
 * - Mobile hamburger menu for smaller screens
 */
export function Navbar() {
    // State for mobile menu open/close
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    // Close mobile menu when clicking outside
    React.useEffect(() => {
        if (!mobileMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            // Check if click is outside the navbar
            if (!target.closest("[data-navbar]")) {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [mobileMenuOpen]);

    // Close mobile menu on escape key
    React.useEffect(() => {
        if (!mobileMenuOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [mobileMenuOpen]);

    /**
     * Handle navigation link click
     * Closes mobile menu after navigation
     */
    const handleLinkClick = () => {
        setMobileMenuOpen(false);
    };

    return (
        <header
            data-navbar
            className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
        >
            <div className="max-w-5xl mx-auto px-4">
                <div className="flex h-14 items-center justify-between">
                    {/* Logo/Brand */}
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
                        onClick={handleLinkClick}
                    >
                        <span className="text-xl">🏈</span>
                        <span>StatLine</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <NavigationMenu className="hidden md:flex">
                        <NavigationMenuList>
                            {navLinks.map((link) => (
                                <NavigationMenuItem key={link.href}>
                                    <NavigationMenuLink asChild>
                                        <Link
                                            href={link.href}
                                            className={navigationMenuTriggerStyle()}
                                        >
                                            {link.label}
                                        </Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>

                    {/* Mobile Menu Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={mobileMenuOpen}
                    >
                        {mobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>

                {/* Mobile Navigation Menu */}
                <div
                    className={cn(
                        "md:hidden overflow-hidden transition-all duration-200 ease-in-out",
                        mobileMenuOpen
                            ? "max-h-64 opacity-100 pb-4"
                            : "max-h-0 opacity-0"
                    )}
                >
                    <nav className="flex flex-col gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={handleLinkClick}
                                className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
        </header>
    );
}
