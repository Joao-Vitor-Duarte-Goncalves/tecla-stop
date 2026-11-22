/* ---------- abertura: a câmera sobe pela garrafa, a tampa estoura e cai virando a mesa ---------- */
let introPlaying=false,introTimers=[];
const BOTTLE_SVG=`<svg class="bottle" viewBox="0 0 400 1600" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
<defs>
 <linearGradient id="glass" gradientUnits="userSpaceOnUse" x1="0" x2="400" y1="0" y2="0">
  <stop offset="0" stop-color="#030b24"/><stop offset=".16" stop-color="#0a2463"/><stop offset=".27" stop-color="#6f9cff"/><stop offset=".33" stop-color="#1a3f9c"/><stop offset=".72" stop-color="#0f2c74"/><stop offset="1" stop-color="#030b24"/>
 </linearGradient>
 <linearGradient id="neckhi" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <linearGradient id="capside" x1="0" x2="1"><stop offset="0" stop-color="#c99a05"/><stop offset=".35" stop-color="#ffd84a"/><stop offset=".6" stop-color="#f6c21c"/><stop offset="1" stop-color="#a77f00"/></linearGradient>
</defs>
<path d="M156 268V540C156 640 0 700 0 900V1600H400V900C400 700 244 640 244 540V268Z" fill="url(#glass)"/>
<path d="M176 280V540C176 610 90 660 70 760" fill="none" stroke="url(#neckhi)" stroke-width="10" stroke-linecap="round"/>
<rect x="0" y="1060" width="400" height="300" fill="#fdfdfb"/>
<rect x="0" y="1072" width="400" height="6" fill="#d7262e"/><rect x="0" y="1342" width="400" height="6" fill="#d7262e"/>
<text x="200" y="1205" text-anchor="middle" font-family="Alfa Slab One, Rockwell, Georgia, serif" font-size="64" fill="#d7262e">Tecla Stop</text>
<text x="200" y="1260" text-anchor="middle" font-family="Permanent Marker, cursive" font-size="26" fill="#1f4fa3">gelada, de mesa, pra roda toda</text>
<rect x="146" y="240" width="108" height="30" rx="8" fill="#0a1f55"/>
<g class="foam">
 <circle cx="200" cy="238" r="26" fill="#fff"/><circle cx="176" cy="226" r="18" fill="#fff"/><circle cx="226" cy="224" r="20" fill="#fff"/><circle cx="196" cy="206" r="16" fill="#fff"/><circle cx="214" cy="198" r="10" fill="#fff"/><circle cx="182" cy="196" r="8" fill="#fff"/>
</g>
<g class="capg">
 <path d="M138 202H262V238L256 246L250 238L244 246L238 238L232 246L226 238L220 246L214 238L208 246L202 238L196 246L190 238L184 246L178 238L172 246L166 238L160 246L154 238L148 246L142 238L138 242Z" fill="url(#capside)"/>
 <rect x="138" y="198" width="124" height="10" rx="4" fill="#ffd84a"/>
</g>
</svg>`;
function introSound(){
  if(!S.sound||!ac)return;
  try{
    const len=ac.sampleRate*.5,buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);
    const src=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
    f.type="bandpass";f.frequency.value=3200;f.Q.value=.7;g.gain.value=.35;
    src.buffer=buf;src.connect(f);f.connect(g);g.connect(ac.destination);src.start();
    setTimeout(()=>beep(1250,.12,"triangle",.08),120);
  }catch(e){}
}
/* luzes do bar fora de foco: bolinhas com degradê radial (sem filter:blur, que pesa no celular) */
function bokeh(el,n,minS,maxS,colors,minO,maxO){
  let h="";
  for(let i=0;i<n;i++){
    const s=minS+Math.random()*(maxS-minS),c=colors[i%colors.length],o=(minO+Math.random()*(maxO-minO)).toFixed(2);
    h+=`<i style="left:${(Math.random()*100).toFixed(1)}%;top:${(Math.random()*100).toFixed(1)}%;width:${s|0}px;height:${s|0}px;opacity:${o};background:radial-gradient(circle,${c} 0 35%,transparent 70%)"></i>`;
  }
  el.innerHTML=h;
}
function playIntro(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  introPlaying=true;
  const ov=$("intro");ov.innerHTML=`<div class="introbg"></div>`+BOTTLE_SVG+`<div class="introfg"></div><div class="fallcap" id="fallcap"></div><span class="introskip">toque pra pular</span>`;ov.hidden=false;
  const svg=ov.querySelector(".bottle"),cap=ov.querySelector(".capg"),foam=ov.querySelector(".foam"),fall=$("fallcap");
  const bg=ov.querySelector(".introbg"),fg=ov.querySelector(".introfg");
  $("tilt").style.opacity="0";$("floor").style.opacity="0";
  const H=svg.getBoundingClientRect().height,vh=innerHeight,endY=0.875*H-0.62*vh;
  const T=(ms,fn)=>introTimers.push(setTimeout(fn,ms));
  /* parallax: o fundo anda a 30% da garrafa e as bolhas da frente a 160%, então cada camada parece estar a uma distância */
  const BG=.3,FG=1.6;
  bg.style.height=(vh+endY*BG)+"px";fg.style.height=(vh+endY*FG)+"px";
  bokeh(bg,22,40,130,["#ffd84a","#f6a91c","#e5402f","#6f9cff"],.18,.45);
  bokeh(fg,7,60,150,["#fff","#ffd84a"],.08,.2);
  /* 1. a câmera sobe do rótulo até o gargalo */
  const cam={duration:1200,easing:"cubic-bezier(.5,0,.2,1)",fill:"forwards"};
  svg.animate([{transform:"translateY(0)"},{transform:`translateY(${endY}px)`}],cam);
  bg.animate([{transform:"translateY(0)"},{transform:`translateY(${endY*BG}px)`}],cam);
  fg.animate([{transform:"translateY(0)"},{transform:`translateY(${endY*FG}px)`}],cam);
  /* 2. a tampa treme e estoura com espuma */
  T(1250,()=>cap.animate([{transform:"translate(0,0)"},{transform:"translate(-3px,-2px) rotate(-3deg)"},{transform:"translate(3px,-3px) rotate(3deg)"},{transform:"translate(0,-2px)"}],{duration:260,iterations:1}));
  T(1520,()=>{
    introSound();
    cap.animate([{transform:"translate(0,0) rotate(0)"},{transform:"translate(40px,-700px) rotate(-560deg)"}],{duration:700,easing:"cubic-bezier(.2,.7,.4,1)",fill:"forwards"});
    foam.animate([{transform:"scale(.2)",opacity:0},{transform:"scale(1.3)",opacity:1,offset:.4},{transform:"scale(1.6) translateY(-30px)",opacity:0}],{duration:1100,easing:"ease-out",fill:"forwards"});
  });
  /* 3. a tampa cai do alto e vira a mesa; a garrafa some */
  T(2050,()=>{
    const r=$("board").getBoundingClientRect();
    Object.assign(fall.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px"});
    fall.style.display="block";
    svg.animate([{opacity:1},{opacity:0}],{duration:450,fill:"forwards"});
    fg.animate([{opacity:1},{opacity:0}],{duration:300,fill:"forwards"});
    fall.animate([{transform:"translateY(-110vh) rotate(-540deg) scale(.45)"},{transform:"translateY(0) rotate(0) scale(1.06)",offset:.8},{transform:"translateY(0) rotate(0) scale(1)"}],{duration:900,easing:"cubic-bezier(.35,0,.25,1)",fill:"forwards"});
  });
  T(2980,()=>endIntro());
  ov.onclick=()=>endIntro();
}
function endIntro(){
  if(!introPlaying)return;
  introTimers.forEach(clearTimeout);introTimers=[];introPlaying=false;
  $("tilt").style.opacity="";$("floor").style.opacity="";
  const ov=$("intro");ov.animate([{opacity:1},{opacity:0}],{duration:200}).onfinish=()=>{ov.hidden=true;ov.innerHTML=""};
  beep(160,.18,"sine",.12);
  render();
}

/* ---------- the bottle is a real cylinder ----------
   The label is painted once on a canvas as the whole circumference. The screen is cut into thin
   vertical slices; each slice looks at the point of the glass in front of it (x = R·sinφ) and
   squeezes the label by cosφ, so the label wraps around instead of sliding like a flat strip.
   θ is how far the bottle is turned: 0 = front label, π = back label. */
const CYL={K:30,theta:0,C:0,url:"",slices:[]};
const botR=()=>innerWidth*.78;
function paintLabel(){
  const box=$("bottleLabel");if(!box)return;
  const R=botR(),C=Math.round(2*Math.PI*R),H=Math.max(120,Math.round(box.clientHeight||innerHeight*.34));
  const cv=document.createElement("canvas");cv.width=C;cv.height=H;const g=cv.getContext("2d");
  const sign=getComputedStyle(document.documentElement).getPropertyValue("--sign")||"Georgia,serif";
  const hand=getComputedStyle(document.documentElement).getPropertyValue("--hand")||"cursive";
  /* front label: 160° wide, centred at the middle of the canvas */
  const Lw=R*2.8,x0=C/2-Lw/2;
  g.fillStyle="#fbf7ec";g.fillRect(x0,0,Lw,H);
  g.fillStyle="#d7262e";g.fillRect(x0,0,Lw,H*.07);g.fillRect(x0,H*.93,Lw,H*.07);
  g.fillStyle="#f6c21c";g.fillRect(x0,H*.07,Lw,H*.04);g.fillRect(x0,H*.89,Lw,H*.04);
  g.textAlign="center";g.textBaseline="middle";
  g.fillStyle="#d7262e";g.font=`${Math.round(H*.3)}px ${sign}`;g.fillText("Tecla Stop",C/2,H*.47);
  g.fillStyle="#1f4fa3";g.font=`${Math.round(H*.12)}px ${hand}`;g.fillText("gelada, de mesa, pra roda toda",C/2,H*.72);
  for(const sx of [x0+Lw*.1,x0+Lw*.9]){
    g.strokeStyle="#1f4fa3";g.lineWidth=3;g.beginPath();g.arc(sx,H*.5,H*.24,0,Math.PI*2);g.stroke();
    g.fillStyle="#1f4fa3";g.font=`${Math.round(H*.07)}px ${sign}`;g.fillText("desde a",sx,H*.44);g.fillText("1ª rodada",sx,H*.56);
  }
  /* back label: 70° wide, centred on the seam (drawn at both ends of the canvas) */
  const Bw=R*1.55,bh=H*.62,by=(H-bh)/2;
  for(const cx of [0,C]){
    const bx=cx-Bw/2;
    g.fillStyle="#fbf7ec";g.fillRect(bx,by,Bw,bh);
    g.strokeStyle="#d7262e";g.lineWidth=4;g.strokeRect(bx+8,by+8,Bw-16,bh-16);
    g.fillStyle="#1f4fa3";g.textAlign="center";
    g.font=`${Math.round(H*.085)}px ${sign}`;g.fillText("Tecla Stop",cx,by+bh*.2);
    g.font=`600 ${Math.round(Math.min(H*.052,Bw/26))}px Barlow, system-ui, sans-serif`;
    ["Ingredientes: água, malte, lúpulo e resenha.","Modo de usar: sente na roda e toque a tampinha.","Validade: até a última rodada."].forEach((t,i)=>g.fillText(t,cx,by+bh*(.45+i*.17)));
  }
  CYL.C=C;CYL.url=cv.toDataURL("image/png");
  buildLabelSlices();
}
function buildLabelSlices(){
  const box=$("bottleLabel");box.innerHTML="";CYL.slices=[];
  const W=innerWidth,R=botR(),w=W/CYL.K;
  for(let i=0;i<CYL.K;i++){
    const cx=(i+.5)*w,phi=Math.asin(Math.max(-.999,Math.min(.999,(cx-W/2)/R)));
    const sl=document.createElement("div");sl.className="lslice";sl.style.left=(i*w)+"px";sl.style.width=(w+1)+"px";
    const inner=document.createElement("div");inner.className="lsliceIn";
    inner.style.width=(CYL.C*3)+"px";inner.style.backgroundImage=`url(${CYL.url})`;inner.style.backgroundSize=`${CYL.C}px 100%`;
    sl.appendChild(inner);box.appendChild(sl);
    CYL.slices.push({inner,phi,c:Math.cos(phi),w});
  }
  drawLabel(CYL.theta);
}
function drawLabel(theta){
  CYL.theta=theta;const R=botR(),C=CYL.C;if(!C)return;
  for(const s of CYL.slices){
    let X=R*(theta+s.phi)+C/2;X=((X%C)+C)%C+C;
    s.inner.style.transform=`translateX(${(s.w/2).toFixed(1)}px) scaleX(${s.c.toFixed(4)}) translateX(${(-X).toFixed(1)}px)`;
  }
}
/* the screen being left and the one arriving are printed on the same glass, on opposite sides */
function sliceScreen(el){
  const W=innerWidth,N=14,w=W/N,r=el.getBoundingClientRect();
  const box=document.createElement("div");box.className="cylbox";
  const parts=[];
  for(let i=0;i<N;i++){
    const sl=document.createElement("div");sl.className="cslice";sl.style.left=(i*w)+"px";sl.style.width=(w+.6)+"px";
    const cl=el.cloneNode(true);cl.removeAttribute("id");cl.querySelectorAll("[id]").forEach(n=>n.removeAttribute("id"));
    cl.hidden=false;cl.classList.add("cylclone");Object.assign(cl.style,{left:(r.left-i*w)+"px",top:r.top+"px",width:r.width+"px"});
    sl.appendChild(cl);box.appendChild(sl);parts.push({sl,u:(i+.5)*w-W/2});
  }
  document.body.appendChild(box);
  return {box,parts};
}
function placeSlices(set,theta,side,k){
  const R=botR();
  for(const p of set.parts){
    let a=p.u/R-theta+side;a=Math.atan2(Math.sin(a),Math.cos(a));
    const ca=Math.cos(a),xc=R*Math.sin(a)-p.u;
    const dx=xc*k,sc=1+(ca-1)*k,op=k>0?(ca<=0?0:Math.min(1,ca*1.6)):1;
    p.sl.style.transform=`translateX(${dx.toFixed(1)}px) scaleX(${Math.max(sc,.001).toFixed(3)})`;
    p.sl.style.opacity=(1+(op-1)*Math.min(1,k*1.5)).toFixed(3);
    p.sl.style.visibility=(k>0&&ca<=0)?"hidden":"visible";
  }
}
let turning=null;
function turnBottle(a,b,id,fromId){
  const t0=a*Math.PI,t1=b*Math.PI;
  if(turning){turning.finish();}
  if(matchMedia("(prefers-reduced-motion: reduce)").matches||!CYL.C){drawLabel(t1);return}
  const outEl=$(fromId),inEl=$(id);
  /* freeze the outgoing screen as slices where it is now, then bring the new one to the top */
  outEl.hidden=false;const outSet=sliceScreen(outEl);outEl.hidden=true;
  scrollTo(0,0);
  const inSet=sliceScreen(inEl);inEl.style.visibility="hidden";
  const D=1300,start=performance.now(),ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  let raf=0;
  const finish=()=>{cancelAnimationFrame(raf);drawLabel(t1);outSet.box.remove();inSet.box.remove();inEl.style.visibility="";turning=null};
  const step=now=>{
    const t=Math.min(1,(now-start)/D),e=ease(t),th=t0+(t1-t0)*e;
    drawLabel(th);
    placeSlices(outSet,th,a*Math.PI,Math.min(1,t/.15));
    placeSlices(inSet,th,b*Math.PI,Math.min(1,(1-t)/.15));
    if(t<1)raf=requestAnimationFrame(step);else finish();
  };
  turning={finish};
  raf=requestAnimationFrame(step);
}



/* ---------- chão do boteco: piso de caquinho vermelho visto de cima, desenhado uma vez num canvas ----------
   Cacos = células de Voronoi com bordas que se repetem sem emenda; rejunte claro entre eles;
   por cima, umas tampinhas jogadas e marca de copo. */
var floorCache;
function makeFloor(dark){
  floorCache=floorCache||{};const key=dark?"d":"l";if(floorCache[key])return floorCache[key];
  const W=360,H=360,N=58,cv=document.createElement("canvas");cv.width=W;cv.height=H;
  const g=cv.getContext("2d"),img=g.createImageData(W,H),d=img.data;
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const pts=[];for(let i=0;i<N;i++){
    const tone=rnd(),warm=rnd();
    /* vermelho-tijolo com variação de caco pra caco; alguns cacos mais escuros, uns poucos amarelados como no piso de verdade */
    let r=150+tone*55,gg=42+tone*22+(warm>.93?60:0),b=34+tone*16;
    if(warm<.08){r*=.72;gg*=.72;b*=.72}
    pts.push({x:rnd()*W,y:rnd()*H,r,g:gg,b});
  }
  const grout=dark?[46,40,42]:[222,214,203];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    let d1=1e9,d2=1e9,k=0;
    for(let i=0;i<N;i++){
      let dx=Math.abs(x-pts[i].x),dy=Math.abs(y-pts[i].y);if(dx>W/2)dx=W-dx;if(dy>H/2)dy=H-dy;
      const dd=dx*dx+dy*dy;if(dd<d1){d2=d1;d1=dd;k=i}else if(dd<d2)d2=dd;
    }
    const edge=Math.sqrt(d2)-Math.sqrt(d1),o=(y*W+x)*4,p=pts[k],n=(rnd()-.5)*14;
    let c=edge<2.4?grout.map(v=>v+n*.5):[p.r+n,p.g+n*.6,p.b+n*.6];
    if(edge>=2.4&&edge<4){c=c.map(v=>v*.86)}            /* borda do caco levemente gasta */
    if(dark)c=c.map((v,i)=>v*(edge<2.4?1:.5));
    d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255;
  }
  g.putImageData(img,0,0);
  /* marca de copo e tampinhas */
  const ring=(x,y,r)=>{g.strokeStyle=dark?"rgba(0,0,0,.35)":"rgba(70,20,10,.28)";g.lineWidth=5;g.beginPath();g.arc(x,y,r,.3,Math.PI*1.85);g.stroke()};
  const cap=(x,y,r,rot)=>{g.save();g.translate(x,y);g.rotate(rot);
    g.fillStyle="rgba(0,0,0,.35)";g.beginPath();g.arc(2,3,r+1,0,7);g.fill();
    for(let i=0;i<21;i++){g.fillStyle=i%2?(dark?"#7e7a72":"#b9b5ab"):(dark?"#5c5952":"#8f8b82");g.beginPath();g.moveTo(0,0);g.arc(0,0,r,i*Math.PI*2/21,(i+1)*Math.PI*2/21);g.fill()}
    g.fillStyle=dark?"#8a867d":"#e9e6df";g.beginPath();g.arc(0,0,r*.78,0,7);g.fill();
    g.fillStyle=dark?"#7a2018":"#c0261c";g.font=`bold ${r*.9}px Georgia,serif`;g.textAlign="center";g.textBaseline="middle";g.fillText("TS",0,1);g.restore()};
  ring(250,90,30);ring(80,270,24);
  cap(60,70,14,.4);cap(300,250,13,2.1);cap(190,320,12,-.8);
  return floorCache[key]=cv.toDataURL("image/png");
}
function applyFloor(){
  try{document.body.style.setProperty("--floor",`url(${makeFloor(isDark())})`)}catch(e){}
}

/* ---------- parallax da mesa ----------
   O giroscópio desloca o ponto de vista da mesa (perspective-origin), então as camadas que já
   estão em profundidades diferentes (borda atrás, tampinhas e Valendo na frente) se mexem cada uma
   num tanto. O tampo fica parado, então o toque nas letras continua certo.
   Só vale com a mesa parada: quando o tempo corre (state "run"), volta suavemente pro centro. */
const PX={x:0,y:0,tx:0,ty:0,b0:null,g0:null,raf:0,on:false,asked:false};
function pxStep(){
  const live=curScreen==="game"&&V&&V.state!=="run"&&!introPlaying,k=live?1:0,b=$("board");
  PX.x+=(PX.tx*k-PX.x)*.12;PX.y+=(PX.ty*k-PX.y)*.12;
  b.style.setProperty("--px",PX.x.toFixed(3));b.style.setProperty("--py",PX.y.toFixed(3));
  PX.raf=(Math.abs(PX.tx*k-PX.x)>.002||Math.abs(PX.ty*k-PX.y)>.002)?requestAnimationFrame(pxStep):0;
}
function onOrient(e){
  if(e.beta==null||e.gamma==null)return;
  if(PX.b0===null){PX.b0=e.beta;PX.g0=e.gamma}
  /* o "reto" acompanha devagar o jeito que a pessoa segura o celular: o efeito aparece no movimento */
  PX.b0+=(e.beta-PX.b0)*.01;PX.g0+=(e.gamma-PX.g0)*.01;
  const c=v=>Math.max(-1,Math.min(1,v/15));
  PX.tx=c(e.gamma-PX.g0);PX.ty=c(e.beta-PX.b0);
  if(!PX.raf)PX.raf=requestAnimationFrame(pxStep);
}
function startParallax(){
  if(PX.on||PX.asked||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const D=window.DeviceOrientationEvent;if(!D)return;
  const go=()=>{PX.on=true;addEventListener("deviceorientation",onOrient)};
  /* iPhone pede permissão, e só a partir de um toque; Android e o resto liberam direto */
  if(typeof D.requestPermission==="function"){PX.asked=true;D.requestPermission().then(r=>{if(r==="granted")go()}).catch(()=>{})}
  else go();
}
if(!(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==="function"))startParallax();
/* no iPhone, o pedido sai nos botões que levam pra partida, nunca no meio de uma vez */
document.addEventListener("click",e=>{if(e.target.closest("#localGo,#hostGo,#joinForm button,#mCreate"))startParallax()},true);

/* ---------- frame loop ---------- */
function frame(){
  if(V&&V.state==="run"){
    const left=(V.end-performance.now())/1000;
    if(MODE!=="guest"&&G&&G.state==="run"&&G.end-performance.now()<=0){timeout()}
    else{
      const s=Math.max(0,Math.ceil(left));
      $("prog").setAttribute("stroke-dashoffset",(100-100*Math.max(0,left)/V.dur).toFixed(2));
      const el=$("secs");if(el)el.textContent=s;$("hub").classList.toggle("danger",left<=3);
      if(s<=3&&s>0&&lastBeep!==s){lastBeep=s;beep(s===1?880:660,.12)}
      if(s>3)lastBeep=null;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

$("undo").onclick=()=>dispatch({t:"undo"});
$("rkBtn").onclick=()=>{$("rkov").hidden=false;renderSheet()};
$("rkov").onclick=e=>{if(e.target===$("rkov"))$("rkov").hidden=true};
$("pause").onclick=()=>dispatch({t:V&&V.state==="pause"?"resume":"pause"});
$("newCat").onclick=()=>dispatch({t:"newcat"});
$("catOpen").onclick=()=>{$("catov").hidden=false;$("catIn").value="";$("catIn").focus()};
$("catCancel").onclick=()=>{$("catov").hidden=true};
$("catForm").onsubmit=e=>{e.preventDefault();const c=$("catIn").value.trim();if(!c){$("catIn").focus();return}$("catov").hidden=true;$("catIn").blur();dispatch({t:"setcat",cat:c})};
$("addOpen").onclick=()=>{$("addov").hidden=false;$("addMidIn").value="";$("addMidIn").focus()};
$("addCancel").onclick=()=>{$("addov").hidden=true};
$("addMid").onsubmit=e=>{e.preventDefault();const n=$("addMidIn").value.trim();if(!n){$("addMidIn").focus();return}$("addov").hidden=true;$("addMidIn").blur();dispatch({t:"addlocal",name:n})};

