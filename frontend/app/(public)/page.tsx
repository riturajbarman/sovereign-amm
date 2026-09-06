/**
 * Public Landing Page
 *
 * Composes the public-facing marketing page: hero section, feature carousel,
 * and sidebar laid out in a responsive flex row.
 *
 * This page renders without authentication (Requirement 1.2). The layout
 * mirrors the trading dashboard's carousel + sidebar proportions so that
 * first-time visitors get an accurate preview of the product.
 *
 * Requirements: 1.1, 1.2, 1.4
 */

import dynamic from 'next/dynamic';
import { HeroSection } from '@/components/hero/HeroSection';

// Dynamic imports with ssr:false prevent the recharts / zustand store from
// being evaluated during Next.js static prerender, which causes a
// "clientModules" error in production builds.
const FeatureCarousel = dynamic(
  () => import('@/components/carousel/FeatureCarousel').then((m) => m.FeatureCarousel),
  { ssr: false },
);

const Sidebar = dynamic(
  () => import('@/components/sidebar/Sidebar').then((m) => m.Sidebar),
  { ssr: false },
);

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero section: headline, subheading, CTA buttons ───────────────── */}
      <HeroSection />

      {/* ── Carousel + Sidebar preview row ───────────────────────────────── */}
      <section
        aria-label="Product feature preview"
        className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto px-4 py-12"
      >
        <FeatureCarousel />
        <Sidebar />
      </section>
    </main>
  );
}
