import { motion, useReducedMotion } from "framer-motion";

export default function HeroGraphic() {
  const reduce = useReducedMotion();
  return <motion.div className="hero-graphic-container" initial={reduce ? false : { opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .8, delay: .2 }} aria-hidden="true">
    <div className="scene-kicker">LIVE / NEARBY</div>
    <div className="community-orb css-orb">
      <span className="orb-ring ring-a"/><span className="orb-ring ring-b"/><span className="orb-ring ring-c"/>
      <span className="node node-a"/><span className="node node-b"/><span className="node node-c"/><span className="node node-d"/>
      <div className="orb-core"><i className="ri-home-heart-fill"/><small>YOUR CIRCLE</small></div>
    </div>
    <motion.div className="signal-card signal-one" animate={reduce ? undefined : { y: [-5, 5, -5] }} transition={{ duration: 5, repeat: Infinity }}><span>01</span><div><b>Ladder to share</b><small>300m · just now</small></div></motion.div>
    <motion.div className="signal-card signal-two" animate={reduce ? undefined : { y: [4, -4, 4] }} transition={{ duration: 6, repeat: Infinity }}><span>02</span><div><b>Design help</b><small>1.2km · available</small></div></motion.div>
    <div className="scene-coordinates">40.7128° N<br/>74.0060° W</div>
  </motion.div>;
}