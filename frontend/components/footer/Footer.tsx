import Link from "next/link";
import { Github, Twitter, Linkedin, Mail, Phone } from "lucide-react";

const socialLinks = [
  {
    name: "GitHub",
    icon: Github,
    href: "https://github.com/sovereign-amm",
  },
  {
    name: "Twitter",
    icon: Twitter,
    href: "https://twitter.com/sovereign_amm",
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    href: "https://linkedin.com/company/sovereign-amm",
  },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Three-column grid — stacks to single column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left column: Contact */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Contact</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <a
                  href="mailto:info@sovereign-amm.com"
                  className="hover:text-white transition-colors"
                >
                  info@sovereign-amm.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>+1 (555) 123-4567</span>
              </div>
            </div>
          </div>

          {/* Center column: Legal */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Legal</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <Link
                href="/privacy"
                className="block hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="block hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>

          {/* Right column: Social */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Follow Us</h3>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: copyright + version */}
        <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-400">
          <span>© 2026 Sovereign-AMM. All rights reserved.</span>
          <span className="font-mono text-xs text-slate-500">
            Sovereign-AMM v1.0.0 — Deterministic Mode ON
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
