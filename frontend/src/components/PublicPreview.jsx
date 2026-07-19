import { motion } from "framer-motion";
import { MagneticButton } from "./Motion";
const samples=[
  {icon:"ri-tools-line",type:"SKILL",title:"Bike tune-up",meta:"0.4 KM · TODAY",tone:"lime"},
  {icon:"ri-plant-line",type:"ITEM",title:"Three houseplants",meta:"0.8 KM · FREE",tone:"violet"},
  {icon:"ri-book-open-line",type:"ITEM",title:"Design book set",meta:"1.1 KM · SHARED",tone:"orange"}
];
export default function PublicPreview({onJoin}){return <section className="public-preview"><header><span className="preview-index">( Open circle )</span><div><h2>See what moves<br/><em>around you.</em></h2><p>A live glimpse of the items, skills, and small acts of generosity moving through a neighborhood.</p></div></header><div className="preview-stage"><div className="preview-radar"><span/><span/><span/><i className="ri-navigation-fill"/></div>{samples.map((item,index)=><motion.article key={item.title} className={`preview-card preview-card-${index+1} ${item.tone}`} whileHover={{scale:1.035,rotate:index===1?1.5:-1.5}}><div className="preview-card-top"><span>{item.type}</span><i className={item.icon}/></div><h3>{item.title}</h3><footer>{item.meta}<i className="ri-arrow-right-up-line"/></footer></motion.article>)}<span className="drag-note"><i className="ri-sparkling-2-line"/> NEIGHBORHOOD PREVIEW</span></div><div className="preview-cta"><p>There’s more happening closer than you think.</p><MagneticButton className="public-join" onClick={onJoin}>Enter your neighborhood <i className="ri-arrow-right-line"/></MagneticButton></div></section>}
