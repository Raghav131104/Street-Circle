import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function AnimatedBackground() {
  return <div className="ambient" aria-hidden="true"><span className="ambient-orb one"/><span className="ambient-orb two"/><span className="ambient-grid"/></div>;
}

export function LoadingOverlay() {
  const reduce = useReducedMotion();
  return <motion.div className="loading-overlay" initial={{ opacity: 1 }} animate={{ opacity: 0, pointerEvents: "none" }} transition={{ delay: reduce ? .1 : .7, duration: .35 }} aria-hidden="true">
    <motion.div className="loading-mark" initial={reduce ? false : { scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><i className="ri-map-pin-2-fill"/></motion.div>
    <div className="loading-name"><motion.span initial={reduce ? false : { y: "110%" }} animate={{ y: 0 }}>StreetCircle</motion.span></div>
    <div className="loading-track"><motion.div className="loading-line" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: .55 }}/></div>
  </motion.div>;
}

export function ScrollExperience() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const elements = document.querySelectorAll(".public-preview header, .member-heading, .member-console, .listings-header, .card");
    elements.forEach((element) => element.classList.add("reveal-on-scroll"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return null;
}

export function MagneticButton({ children, className = "", ...props }) {
  return <motion.button className={className} whileHover={{ y: -2 }} whileTap={{ scale: .97 }} transition={{ duration: .2 }} {...props}>{children}</motion.button>;
}