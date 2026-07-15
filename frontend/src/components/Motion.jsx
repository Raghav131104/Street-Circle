import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function AnimatedBackground(){return <div className="ambient" aria-hidden="true"><span className="ambient-orb one"/><span className="ambient-orb two"/><span className="ambient-grid"/></div>}

export function LoadingOverlay(){
  const reduce=useReducedMotion();
  return <motion.div className="loading-overlay" initial={{opacity:1}} animate={{opacity:0,pointerEvents:"none"}} transition={{delay:reduce?.1:1.35,duration:.45,ease:[.76,0,.24,1]}} aria-hidden="true">
    <motion.div className="loading-mark" initial={reduce?false:{scale:.5,rotate:-18,opacity:0}} animate={{scale:1,rotate:0,opacity:1}} transition={{duration:.55,ease:[.22,1,.36,1]}}><i className="ri-map-pin-2-fill"/></motion.div>
    <div className="loading-name"><motion.span initial={reduce?false:{y:"110%"}} animate={{y:0}} transition={{delay:.18,duration:.55,ease:[.22,1,.36,1]}}>StreetCircle</motion.span></div>
    <div className="loading-track"><motion.div className="loading-line" initial={{scaleX:0}} animate={{scaleX:1}} transition={{delay:.25,duration:.9,ease:[.65,0,.35,1]}}/></div>
    <motion.small initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.45}}>BUILDING YOUR CIRCLE</motion.small>
  </motion.div>
}

export function ScrollExperience(){
  useEffect(()=>{
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context=gsap.context(()=>{
      gsap.fromTo(".hero > div:first-child > *",{y:55,opacity:0},{y:0,opacity:1,duration:1.05,stagger:.1,delay:1.15,ease:"power3.out",clearProps:"transform,opacity"});
      gsap.fromTo(".hero-graphic-container",{scale:.9,opacity:0},{scale:1,opacity:1,duration:1.2,delay:1.25,ease:"expo.out",clearProps:"transform,opacity"});
      gsap.utils.toArray(".public-preview header, .member-heading, .listings-header").forEach(section=>gsap.from(section,{scrollTrigger:{trigger:section,start:"top 82%",once:true},y:80,opacity:0,duration:1,ease:"power3.out"}));
      gsap.from(".manifesto p",{scrollTrigger:{trigger:".manifesto",start:"top 70%",once:true},clipPath:"inset(0 0 100% 0)",y:70,duration:1.2,ease:"power4.out"});
      gsap.utils.toArray(".public-preview h2, .member-heading h2").forEach(title=>gsap.from(title,{scrollTrigger:{trigger:title,start:"top 86%",once:true},clipPath:"inset(0 0 100% 0)",y:65,duration:1.1,ease:"power4.out"}));
      gsap.from(".member-console",{scrollTrigger:{trigger:".member-console",start:"top 88%",once:true},scale:.96,opacity:0,duration:1,ease:"expo.out"});
      gsap.to(".community-orb",{scrollTrigger:{trigger:".hero",start:"top top",end:"bottom top",scrub:1},yPercent:22,scale:.86,rotate:22,ease:"none"});
      gsap.to(".ambient-grid",{scrollTrigger:{trigger:"main",start:"top top",end:"bottom bottom",scrub:1.5},yPercent:18,ease:"none"});
      ScrollTrigger.batch(".card",{start:"top 88%",once:true,onEnter:items=>gsap.fromTo(items,{y:55,opacity:0,scale:.96},{y:0,opacity:1,scale:1,duration:.75,stagger:.09,ease:"power3.out"})});
      gsap.utils.toArray(".card-media img").forEach(image=>gsap.from(image,{scrollTrigger:{trigger:image,start:"top 90%",once:true},scale:1.18,clipPath:"inset(100% 0 0 0)",duration:1.05,ease:"power3.out"}));
      let last=0;ScrollTrigger.create({start:0,end:"max",onUpdate:self=>{const current=self.scroll();if(current>120&&current>last)gsap.to(".navbar",{yPercent:-130,duration:.35,ease:"power3.out"});else gsap.to(".navbar",{yPercent:0,duration:.45,ease:"power3.out"});last=current;}});
    });
    const safety=setTimeout(()=>gsap.set(".hero > div:first-child > *, .hero-graphic-container",{clearProps:"transform,opacity"}),2400);
    return()=>{clearTimeout(safety);context.revert();ScrollTrigger.getAll().forEach(trigger=>trigger.kill())};
  },[]);
  return null;
}

export function CursorFollower(){
  const dot=useRef(null),ring=useRef(null);
  useEffect(()=>{
    if(matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches)return;
    const move=e=>{gsap.to(dot.current,{x:e.clientX,y:e.clientY,duration:.08});gsap.to(ring.current,{x:e.clientX,y:e.clientY,duration:.38,ease:"power3.out"})};
    const over=e=>ring.current?.classList.toggle("is-active",!!e.target.closest("button,a,.card,input"));
    window.addEventListener("pointermove",move);document.addEventListener("pointerover",over);
    return()=>{window.removeEventListener("pointermove",move);document.removeEventListener("pointerover",over)};
  },[]);
  return <div className="cursor-system" aria-hidden="true"><span ref={ring} className="cursor-ring"/><span ref={dot} className="cursor-dot"/></div>;
}

export function MagneticButton({children,className="",onClick,...props}){
  const ref=useRef(null);const [ripples,setRipples]=useState([]);const reduce=useReducedMotion();
  const move=e=>{if(reduce||matchMedia("(pointer: coarse)").matches)return;const rect=ref.current.getBoundingClientRect();gsap.to(ref.current,{x:(e.clientX-rect.left-rect.width/2)*.18,y:(e.clientY-rect.top-rect.height/2)*.18,duration:.35,ease:"power3.out"})};
  const leave=()=>gsap.to(ref.current,{x:0,y:0,duration:.6,ease:"elastic.out(1,.45)"});
  const click=e=>{const rect=ref.current.getBoundingClientRect();const ripple={id:Date.now(),x:e.clientX-rect.left,y:e.clientY-rect.top};setRipples(items=>[...items,ripple]);setTimeout(()=>setRipples(items=>items.filter(item=>item.id!==ripple.id)),650);onClick?.(e)};
  return <motion.button ref={ref} className={`${className} magnetic`} onPointerMove={move} onPointerLeave={leave} onClick={click} whileTap={{scale:.95}} {...props}>{children}{ripples.map(r=><span key={r.id} className="ripple" style={{left:r.x,top:r.y}}/>)}</motion.button>
}



