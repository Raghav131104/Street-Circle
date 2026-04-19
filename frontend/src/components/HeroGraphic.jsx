import { motion } from "framer-motion";

export default function HeroGraphic() {
  const floatVariants = {
    initial: { y: 0 },
    animate: {
      y: [-12, 12, -12],
      transition: {
        duration: 4,
        ease: "easeInOut",
        repeat: Infinity,
      }
    }
  };

  const floatVariantsReverse = {
    initial: { y: 0 },
    animate: {
      y: [10, -10, 10],
      transition: {
        duration: 5,
        ease: "easeInOut",
        repeat: Infinity,
      }
    }
  };
  
  const floatVariantsSlow = {
    initial: { y: 0 },
    animate: {
      y: [15, -5, 15],
      transition: {
        duration: 6,
        ease: "easeInOut",
        repeat: Infinity,
      }
    }
  };

  return (
    <div className="hero-graphic-container">
      {/* Background glowing orb */}
      <div className="glow-orb"></div>
      <div className="glow-orb" style={{ top: "10%", right: "10%", background: "radial-gradient(circle, rgba(46,196,182,0.2) 0%, rgba(46,196,182,0) 70%)" }}></div>
      
      {/* Map Element */}
      <motion.div 
        className="glass-card map-card"
        variants={floatVariants}
        initial="initial"
        animate="animate"
      >
        <div className="pulse-pin">
          <i className="ri-map-pin-user-fill"></i>
        </div>
      </motion.div>

      {/* Item Share Element */}
      <motion.div 
        className="glass-card share-card"
        variants={floatVariantsReverse}
        initial="initial"
        animate="animate"
      >
        <div className="icon-wrapper" style={{ background: "#e6f5f0", color: "#0f9d7a" }}>
          <i className="ri-hand-coin-line"></i>
        </div>
        <div>
          <h4>Sarah shared a Ladder</h4>
          <small>300m away • 2 mins ago</small>
        </div>
      </motion.div>

      {/* Skill Share Element */}
      <motion.div 
        className="glass-card skill-card"
        variants={floatVariantsSlow}
        initial="initial"
        animate="animate"
      >
        <div className="icon-wrapper" style={{ background: "#fdeee7", color: "#c86a2d" }}>
          <i className="ri-macbook-line"></i>
        </div>
        <div>
          <h4>Web Design Help</h4>
          <small>Community Skill • Free</small>
        </div>
      </motion.div>
      
      {/* Trust Badge */}
      <motion.div 
        className="glass-card badge-card"
        variants={floatVariantsReverse}
        initial="initial"
        animate="animate"
      >
        <i className="ri-shield-star-fill" style={{ color: "#0f9d7a" }}></i>
        <span>Verified Neighbors</span>
      </motion.div>
    </div>
  );
}
