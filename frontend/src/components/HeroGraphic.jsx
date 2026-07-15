import { motion, useReducedMotion } from "framer-motion";
import { lazy, Suspense } from "react";
const ParticleScene = lazy(() => import("./ParticleScene"));

export default function HeroGraphic() {
  const reduce = useReducedMotion();
  return (
    <motion.div className="hero-graphic-container" initial={reduce ? false : { opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: .35, ease: [.22, 1, .36, 1] }} aria-hidden="true">
      <Suspense fallback={<div className="three-fallback" />}><ParticleScene /></Suspense>
      <div className="scene-kicker">LIVE / NEARBY</div>
      <motion.div className="community-orb" animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 38, repeat: Infinity, ease: "linear" }}>
        <span className="orb-ring ring-a"/><span className="orb-ring ring-b"/><span className="orb-ring ring-c"/>
        <span className="node node-a"/><span className="node node-b"/><span className="node node-c"/><span className="node node-d"/>
        <div className="orb-core"><i className="ri-home-heart-fill"/><small>YOUR CIRCLE</small></div>
      </motion.div>
      <motion.div className="signal-card signal-one" animate={reduce ? undefined : { y: [-7, 7, -7] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}><span>01</span><div><b>Ladder to share</b><small>300m · just now</small></div></motion.div>
      <motion.div className="signal-card signal-two" animate={reduce ? undefined : { y: [6, -6, 6] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}><span>02</span><div><b>Design help</b><small>1.2km · available</small></div></motion.div>
      <div className="scene-coordinates">40.7128° N<br/>74.0060° W</div>
    </motion.div>
  );
}
