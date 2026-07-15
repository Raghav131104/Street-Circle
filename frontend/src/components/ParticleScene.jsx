import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Network(){
  const group=useRef();
  const particles=useMemo(()=>{const data=new Float32Array(75*3);for(let i=0;i<data.length;i+=3){const r=2.1+Math.random()*1.6,theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);data[i]=r*Math.sin(phi)*Math.cos(theta);data[i+1]=r*Math.sin(phi)*Math.sin(theta);data[i+2]=r*Math.cos(phi)}return data},[]);
  useFrame((state,delta)=>{if(!group.current)return;group.current.rotation.y+=delta*.075;group.current.rotation.x=THREE.MathUtils.lerp(group.current.rotation.x,-state.pointer.y*.12,.035);group.current.rotation.y=THREE.MathUtils.lerp(group.current.rotation.y,state.pointer.x*.18+group.current.rotation.y,.025)});
  return <group ref={group}>
    <Float speed={1.1} rotationIntensity={.25} floatIntensity={.35}><mesh><icosahedronGeometry args={[1.48,2]}/><meshStandardMaterial color="#c7ff37" wireframe transparent opacity={.58}/></mesh><mesh scale={.72}><icosahedronGeometry args={[1.48,2]}/><meshPhysicalMaterial color="#151712" emissive="#435714" emissiveIntensity={.6} roughness={.45} metalness={.15}/></mesh></Float>
    <Points positions={particles} stride={3} frustumCulled><PointMaterial transparent color="#c7ff37" size={.035} sizeAttenuation depthWrite={false}/></Points>
  </group>
}
export default function ParticleScene(){return <div className="three-scene"><Canvas dpr={[1,1.35]} gl={{antialias:false,alpha:true,powerPreference:"low-power"}} camera={{position:[0,0,6],fov:43}}><ambientLight intensity={.45}/><pointLight position={[3,3,4]} color="#dfff82" intensity={18}/><pointLight position={[-4,-2,2]} color="#6c77ff" intensity={7}/><Network/></Canvas></div>}
