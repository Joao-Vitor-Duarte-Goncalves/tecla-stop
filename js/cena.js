/* ---------- abertura: a câmera sobe pela garrafa, a tampa estoura e cai virando a mesa ---------- */
let introPlaying=false,introTimers=[];
const BOTTLE_SVG=`<svg class="bottle" viewBox="0 0 400 1600" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
<defs>
 <linearGradient id="glass" gradientUnits="userSpaceOnUse" x1="0" x2="400" y1="0" y2="0">
  <stop offset="0" stop-color="#2a1003"/><stop offset=".16" stop-color="#6b3206"/><stop offset=".27" stop-color="#e0962e"/><stop offset=".33" stop-color="#9a4a0b"/><stop offset=".72" stop-color="#7a3a08"/><stop offset="1" stop-color="#2a1003"/>
 </linearGradient>
 <linearGradient id="neckhi" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
 <linearGradient id="capside" x1="0" x2="1"><stop offset="0" stop-color="#c99a05"/><stop offset=".35" stop-color="#ffd84a"/><stop offset=".6" stop-color="#f6c21c"/><stop offset="1" stop-color="#a77f00"/></linearGradient>
</defs>
<path d="M156 268V540C156 640 0 700 0 900V1600H400V900C400 700 244 640 244 540V268Z" fill="url(#glass)"/>
<path d="M176 280V540C176 610 90 660 70 760" fill="none" stroke="url(#neckhi)" stroke-width="10" stroke-linecap="round"/>
<rect x="0" y="1060" width="400" height="300" fill="#fbf6ea"/>
<rect x="0" y="1072" width="400" height="8" fill="#c0261c"/><rect x="0" y="1084" width="400" height="4" fill="#f6c21c"/>
<rect x="0" y="1332" width="400" height="4" fill="#f6c21c"/><rect x="0" y="1340" width="400" height="8" fill="#c0261c"/>
<text x="200" y="1208" text-anchor="middle" font-family="Bowlby One, Arial Black, Impact, sans-serif" font-size="60" fill="#c0261c">Tecla Stop</text>
<text x="200" y="1262" text-anchor="middle" font-family="Permanent Marker, Comic Sans MS, cursive" font-size="26" fill="#2a2018">gelada, de mesa, pra roda toda</text>
<rect x="146" y="240" width="108" height="30" rx="8" fill="#3a1804"/>
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
/* a tampa cai girando em cima da mesa; no pouso, o giro da 1ª rodada continua o mesmo movimento (spin "full" começa em -720°) */
const DROP_MS=700;
function dropCap(fall){
  const r=$("board").getBoundingClientRect();
  Object.assign(fall.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px"});
  fall.style.display="block";
  fall.animate([{transform:"translateY(-110vh) rotate(-1260deg) scale(.45)"},{transform:"translateY(0) rotate(-720deg) scale(1)"}],{duration:DROP_MS,easing:"cubic-bezier(.5,0,.9,.6)",fill:"forwards"});
}
/* short = "Nova partida": só a tampa caindo, por cima do jogo */
function playIntro(short){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  introPlaying=true;
  const ov=$("intro");
  $("tilt").style.opacity="0";$("floor").style.opacity="0";
  const T=(ms,fn)=>introTimers.push(setTimeout(fn,ms));
  if(short){
    ov.innerHTML=`<div class="fallcap" id="fallcap"></div>`;ov.hidden=false;ov.classList.add("short");
    dropCap($("fallcap"));T(DROP_MS,()=>endIntro(true));ov.onclick=()=>endIntro();return;
  }
  ov.classList.remove("short");
  ov.innerHTML=`<div class="introsky"></div><div class="introbg"></div>`+BOTTLE_SVG+`<div class="introfg"></div><div class="fallcap" id="fallcap"></div><span class="introskip">toque pra pular</span>`;ov.hidden=false;
  const svg=ov.querySelector(".bottle"),cap=ov.querySelector(".capg"),foam=ov.querySelector(".foam"),fall=$("fallcap");
  const bg=ov.querySelector(".introbg"),fg=ov.querySelector(".introfg"),sky=ov.querySelector(".introsky");
  const H=svg.getBoundingClientRect().height,vh=innerHeight,endY=0.875*H-0.62*vh;
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
  /* 3. a garrafa e o céu somem, o jogo aparece por baixo e a tampa cai girando no lugar da mesa */
  T(1900,()=>{
    const out={duration:400,fill:"forwards"},o=[{opacity:1},{opacity:0}];
    svg.animate(o,out);sky.animate(o,out);bg.animate(o,out);fg.animate(o,{duration:250,fill:"forwards"});
    dropCap(fall);
  });
  T(1900+DROP_MS,()=>endIntro(true));
  ov.onclick=()=>endIntro();
}
/* pular pelo teclado também */
document.addEventListener("keydown",e=>{if(introPlaying&&(e.key==="Escape"||e.key===" "||e.key==="Enter")){e.preventDefault();endIntro()}});
/* landed: a tampa pousou exatamente em cima da mesa, então a troca é imediata (a mesa já começa girando por baixo) */
function endIntro(landed){
  if(!introPlaying)return;
  introTimers.forEach(clearTimeout);introTimers=[];introPlaying=false;
  $("tilt").style.opacity="";$("floor").style.opacity="";
  const ov=$("intro"),close=()=>{ov.hidden=true;ov.innerHTML="";ov.classList.remove("short")};
  if(landed)close();else ov.animate([{opacity:1},{opacity:0}],{duration:200}).onfinish=close;
  beep(160,.18,"sine",.12);
  render();
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
  /* convidado sem conexão: o tempo congela até voltar (o juiz é quem conta de verdade) */
  if(V&&V.state==="run"&&!offline){
    const left=(V.end-performance.now())/1000;
    if(MODE!=="guest"&&G&&G.state==="run"&&G.end-performance.now()<=0){timeout()}
    else{
      /* o tempo pode ter 2 s de folga (quando alguém cai na própria vez); o mostrador nunca passa do tempo cheio */
      const s=Math.min(V.dur,Math.max(0,Math.ceil(left)));
      $("prog").setAttribute("stroke-dashoffset",(100-100*Math.min(1,Math.max(0,left)/V.dur)).toFixed(2));
      const el=$("secs");if(el)el.textContent=s;$("hub").classList.toggle("danger",left<=3);
      if(s<=3&&s>0&&lastBeep!==s){lastBeep=s;beep(s===1?880:660,.12)}
      if(s>3)lastBeep=null;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

$("undo").onclick=()=>dispatch({t:"undo"});
$("rkBtn").onclick=()=>openSheet();
$("rkov").onclick=e=>{if(e.target===$("rkov"))closeSheet()};
$("pause").onclick=()=>dispatch({t:V&&V.state==="pause"?"resume":"pause"});
$("newCat").onclick=()=>dispatch({t:"newcat"});
$("catOpen").onclick=()=>{$("catov").hidden=false;$("catIn").value="";$("catIn").focus()};
$("catCancel").onclick=()=>{$("catov").hidden=true};
$("catForm").onsubmit=e=>{e.preventDefault();const c=$("catIn").value.trim();if(!c){$("catIn").focus();return}$("catov").hidden=true;$("catIn").blur();dispatch({t:"setcat",cat:c})};
$("addOpen").onclick=()=>{$("addov").hidden=false;$("addMidIn").value="";$("addMidIn").focus()};
$("addCancel").onclick=()=>{$("addov").hidden=true};
$("addMid").onsubmit=e=>{e.preventDefault();const n=$("addMidIn").value.trim();if(!n){$("addMidIn").focus();return}$("addov").hidden=true;$("addMidIn").blur();dispatch({t:"addlocal",name:n})};


/* tampinhas da mesa da home: tocar faz barulho de tampinha */
$("homeMesa").addEventListener("pointerdown",e=>{
  const c=e.target.closest(".cap");if(!c)return;
  unlockAudio();beep(420+Math.random()*260,.06,"triangle",.06);
  c.classList.remove("hit");void c.offsetWidth;c.classList.add("hit");setTimeout(()=>c.classList.remove("hit"),180);
});
