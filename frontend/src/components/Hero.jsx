import { motion } from "framer-motion";
import HeroGraphic from "./HeroGraphic";

export default function Hero({ radius, setRadius, count }) {
  const radii = [2, 5, 10];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section className="hero">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.small variants={itemVariants}>
          <i className="ri-map-pin-2-line"></i>
          Hyperlocal sharing
        </motion.small>

        <motion.h1 variants={itemVariants}>
          Share with your <span>neighbors</span>
        </motion.h1>

        <motion.p variants={itemVariants} className="desc">
          Give away items you don't need or share your skills with people in
          your neighborhood. Safe, local, and community-first.
        </motion.p>

        <motion.div variants={itemVariants} className="radius">
          <p>Show listings within:</p>
          <div className="radius-buttons">
            {radii.map((r) => (
              <button
                key={r}
                className={radius === r ? "active" : ""}
                onClick={() => setRadius(r)}
              >
                {r} km
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="meta">
          <span>
            <i className="ri-group-line"></i>
            <span id="nearbyCount">{count}</span> nearby listings
          </span>

          <span>
            <i className="ri-shield-line"></i>
            Privacy first
          </span>

          <span>
            <i className="ri-time-line"></i>
            48h listings
          </span>
        </motion.div>
      </motion.div>

      <HeroGraphic />
    </section>
  );
}
