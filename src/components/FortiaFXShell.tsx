"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ForexTicker from "@/components/ForexTicker";
const NAV = [

];

export default function FortiaFXShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      <header className={`fxnav ${scrolled ? "fxnav-scrolled" : ""}`}>
        <div className="fxnav-inner">
          <Link href="/" className="fxnav-logo">
            <span className="fxlogo-bracket">[</span>
            <span className="fxlogo-name">Fortia</span>
            <span className="fxlogo-accent">FX</span>
            <span className="fxlogo-bracket">]</span>
            <span className="fxlogo-cursor" />
          </Link>

          <nav className="fxnav-links">
            {NAV.map((item) => (
              <Link key={item.label} href={item.href} className="fxnav-link">
                <span className="fxnav-num">{item.num}</span>
                {item.label}
              </Link>
            ))}
            <Link href="/contacto" className="fxnav-cta">Contactar →</Link>
          </nav>

          <button
            className="fxnav-hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menú"
          >
            <span className={`fxham ${menuOpen ? "fxham-1" : ""}`} />
            <span className={`fxham ${menuOpen ? "fxham-2" : ""}`} />
            <span className={`fxham ${menuOpen ? "fxham-3" : ""}`} />
          </button>
        </div>

        <div className={`fxmobile-menu ${menuOpen ? "fxmobile-open" : ""}`}>
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="fxmobile-link"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/contacto" className="fxmobile-link fxmobile-cta" onClick={() => setMenuOpen(false)}>
            Contactar →
          </Link>
        </div>
      </header>

      <ForexTicker />

      <main>{children}</main>

      <footer className="fxfooter">
        <div className="fxfooter-inner">
          <p>FortiaFX · Automatización y simulación educativa.</p>
          <p>Tu capital, tu cuenta.</p>
        </div>
      </footer>
    </>
  );
}