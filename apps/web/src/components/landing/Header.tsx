"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/landing/mode-toggle";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AgentTraceLogo } from "@/components/ui/logo";

export const Header = () => {
  const pathname = usePathname();
  const isPricing = pathname === "/pricing";

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    if (pathname === "/") {
      e.preventDefault();
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-b border-border" />

      <div className="container relative">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-foreground/5 border border-foreground/10 flex items-center justify-center">
              <AgentTraceLogo size={18} className="text-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-foreground">
              AgentTrace
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-7">
            <Link
              href="/#architecture"
              onClick={(e) => scrollToSection(e, "architecture")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link
              href="/#features"
              onClick={(e) => scrollToSection(e, "features")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="/#compare"
              onClick={(e) => scrollToSection(e, "compare")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Compare
            </Link>
            <Link
              href="/waitlist"
              className="text-sm font-medium text-brand hover:text-brand/80 transition-colors font-semibold"
            >
              Waitlist
            </Link>
            <Link
              href="/docs"
              className={`text-sm font-medium transition-colors ${pathname.startsWith('/docs') ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Docs
            </Link>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <ModeToggle />

            <div className="hidden md:flex items-center gap-3">
              {/* <Link href="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent text-xs">
                  Tester Login
                </Button>
              </Link> */}
              <Link href="/#waitlist" onClick={(e) => scrollToSection(e, "waitlist")}>
                <Button size="sm" className="bg-foreground text-background hover:bg-brand hover:text-brand-foreground hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all font-semibold">
                  Join Waitlist
                </Button>
              </Link>
            </div>
            <div className="md:hidden flex items-center gap-2">
              <Link href="/waitlist">
                <Button size="sm" className="bg-foreground text-background">Waitlist</Button>
              </Link>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="-mr-2">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[80vw] sm:w-[350px]">
                  <div className="flex flex-col gap-8 mt-8">
                    <Link href="/" className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-foreground/5 border border-foreground/10 flex items-center justify-center">
                        <AgentTraceLogo size={18} className="text-foreground" />
                      </div>
                      <span className="font-semibold text-lg tracking-tight text-foreground">
                        AgentTrace
                      </span>
                    </Link>
                    <nav className="flex flex-col gap-5">
                      <Link
                        href="/#architecture"
                        onClick={(e) => scrollToSection(e, "architecture")}
                        className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        How it works
                      </Link>
                      <Link
                        href="/#features"
                        onClick={(e) => scrollToSection(e, "features")}
                        className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Features
                      </Link>
                      <Link
                        href="/#compare"
                        onClick={(e) => scrollToSection(e, "compare")}
                        className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Compare Matrix
                      </Link>
                      <Link
                        href="/waitlist"
                        className="text-base font-medium text-brand font-semibold"
                      >
                        Priority Waitlist
                      </Link>
                      {/* <Link
                        href="/login"
                        className="text-base font-medium text-muted-foreground hover:text-foreground"
                      >
                        Tester Login
                      </Link> */}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};
