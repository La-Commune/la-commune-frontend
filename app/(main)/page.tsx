"use client";

import { useRouter } from "next/navigation";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import React, { useRef } from "react";

/* ===============================
   Animated Text (línea por línea)
================================= */
const AnimatedLines = ({ text }: { text: string }) => {
  const lines = text.split("\n");

  return (
    <div className="overflow-hidden">
      {lines.map((line, index) => (
        <motion.div
          key={index}
          initial={{ y: 80, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 1,
            delay: index * 0.2,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="overflow-hidden"
        >
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-light leading-tight tracking-wide">
            {line}
          </h2>
        </motion.div>
      ))}
    </div>
  );
};

/* ===============================
   Premium Section
================================= */
interface SectionProps {
  title: string;
  subtitle?: string;
  videoSrc: string;
  ctaText?: string;
  ctaLink?: string;
}

const PremiumSection: React.FC<SectionProps> = ({
  title,
  subtitle,
  videoSrc,
  ctaText,
  ctaLink,
}) => {
  const router = useRouter();
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Parallax effect
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  const smoothY = useSpring(y, { stiffness: 50, damping: 20 });

  return (
    <section
      ref={ref}
      className="relative h-screen w-full snap-start flex items-center justify-center text-center overflow-hidden"
    >
      {/* Background Video with Parallax */}
      <motion.video
        style={{ y: smoothY }}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-[120%] object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
      </motion.video>

      {/* Dark cinematic overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative z-10 px-6 max-w-4xl text-white">
        <AnimatedLines text={title} />

        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.6 }}
            className="mt-8 text-lg sm:text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}

        {ctaText && ctaLink && (
          <motion.button
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 1 }}
            onClick={() => router.push(ctaLink)}
            className="mt-12 uppercase tracking-[0.4em] text-sm border-b border-white/50 pb-2 hover:border-white transition-all duration-500"
          >
            {ctaText}
          </motion.button>
        )}
      </div>
    </section>
  );
};

/* ===============================
   MAIN
================================= */
export default function Home() {
  return (
    <main className="h-screen overflow-y-scroll snap-y snap-mandatory bg-black scroll-smooth">

      <PremiumSection
        title={`Café\nque despierta`}
        subtitle="Explora nuestro menú y descubre sabores que cuentan historias."
        videoSrc="/videos/coffee-slow.mp4"
        ctaText="Ver menú"
        ctaLink="/menu"
      />

      <PremiumSection
        title={`Registra tus visitas y recibe beneficios`}
        subtitle="Después de cinco bebidas, la siguiente es cortesía de la casa."
        videoSrc="/videos/coffee-hero.mp4"
      />

      <footer className="h-screen snap-start flex items-center justify-center bg-black text-neutral-500 uppercase tracking-widest text-sm">
        © {new Date().getFullYear()} La Commune. Hecho con amor.
      </footer>
    </main>
  );
}