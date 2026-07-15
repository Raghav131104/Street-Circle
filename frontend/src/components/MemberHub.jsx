import { motion } from "framer-motion";
import { MagneticButton } from "./Motion";

export default function MemberHub({user,listings,myListings,radius,onPost,onShowMine,onShowCommunity}){
  const skills=listings.filter(item=>item.type==="skill").length;
  const firstName=user?.username||"Neighbor";
  const hour=new Date().getHours();const greeting=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
  return <section className="member-hub">
    <header className="member-heading"><div><span className="member-kicker"><i/> MEMBER CIRCLE / LIVE</span><h2>{greeting},<br/><em>{firstName}.</em></h2></div><div className="member-intro"><p>Your neighborhood is moving. Pick up where you left off or put something useful into the circle.</p><MagneticButton className="member-post" onClick={onPost}><i className="ri-add-line"/> Share something</MagneticButton></div></header>
    <div className="member-console">
      <motion.div className="local-map" whileHover={{scale:1.008}} transition={{duration:.35}}>
        <div className="map-grid"/><div className="map-sweep"/><span className="map-ring ring-1"/><span className="map-ring ring-2"/><span className="map-center"><i className="ri-home-5-fill"/></span>
        {listings.slice(0,5).map((item,index)=><motion.button key={item._id||index} className={`map-point point-${index+1}`} initial={{scale:0}} whileInView={{scale:1}} transition={{delay:index*.08,type:"spring"}} title={item.title}><span/>{item.title}</motion.button>)}
        <span className="map-label">LIVE ACTIVITY · {radius} KM</span>
      </motion.div>
      <div className="member-side">
        <button className="stat-block" onClick={onShowCommunity}><span>NEAR YOU</span><strong>{String(listings.length).padStart(2,"0")}</strong><small>Open community feed <i className="ri-arrow-right-line"/></small></button>
        <button className="stat-block accent" onClick={onShowMine}><span>YOUR SHARES</span><strong>{String(myListings.length).padStart(2,"0")}</strong><small>Manage your listings <i className="ri-arrow-right-line"/></small></button>
        <div className="pulse-block"><span>SKILLS IN CIRCULATION</span><div><b>{skills}</b><span className="pulse-bars">{[1,2,3,4,5,6,7].map(n=><i key={n}/>)}</span></div></div>
      </div>
    </div>
    <div className="member-ticker"><span>YOUR CIRCLE IS ACTIVE</span><div>SHARE WHAT YOU HAVE <i/> FIND WHAT YOU NEED <i/> KEEP VALUE LOCAL <i/> SHARE WHAT YOU HAVE</div></div>
  </section>
}
