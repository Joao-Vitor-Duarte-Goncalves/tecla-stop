const BASE="ABCDEFGHIJLMNOPRSTUV".split(""), HARD=["Q","X","Z"];
const PREFIX="teclastop-v1-";
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- prefs ---------- */
let S={players:[],dur:10,rounds:10,molec:true,heckle:true,theme:"auto",hard:false,sound:true,name:"",key:""};
try{const s=JSON.parse(localStorage.getItem("tecla-stop")||"null");if(s)S=Object.assign(S,s)}catch(e){}
if(!S.key)S.key=Math.random().toString(36).slice(2,10);
const save=()=>{try{localStorage.setItem("tecla-stop",JSON.stringify(S))}catch(e){}};
save();

/* ---------- screens ---------- */
let curScreen="home";
/* home shows the label from the front; opening an option turns the bottle half a turn, going back turns it back */
const TURN={home:0,local:1,lobby:1};
function show(id){
  const from=curScreen;curScreen=id;["home","local","lobby","game"].forEach(s=>$(s).hidden=s!==id);
  document.body.classList.toggle("ingame",id==="game");
  if(id==="game"&&from!=="game"&&(from==="local"||from==="lobby"))playIntro();
}
/* o erro aparece junto do campo que precisa de correção: "name", "join" ou, sem campo, embaixo do bloco online */
function homeErr(msg,where){
  const t={name:"nameErr",join:"joinErr"}[where]||"homeErr";
  ["nameErr","joinErr","homeErr"].forEach(id=>{const e=$(id);e.textContent=id===t?msg||"":"";e.hidden=!(id===t&&msg)});
}
$("myName").value=S.name;
$("myName").oninput=e=>{S.name=e.target.value.trim();save()};
$("sound").checked=S.sound;$("sound").onchange=e=>{S.sound=e.target.checked;save()};
/* theme: one sun/moon button; the new theme spreads out from the button as a growing circle */
const SUN='<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
const MOON='<svg class="moon" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg>';
function isDark(){return S.theme==="dark"||(S.theme!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)}
function applyTheme(){
  const r=document.documentElement;if(S.theme==="auto")r.removeAttribute("data-theme");else r.setAttribute("data-theme",S.theme);
  const d=isDark();$("themeBtn").innerHTML=d?SUN:MOON;$("themeBtn").setAttribute("aria-label",d?"Mudar para modo claro":"Mudar para modo escuro");
}
function toggleTheme(){
  const next=isDark()?"light":"dark";
  const b=$("themeBtn").getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2;
  const R=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
  const set=()=>{S.theme=next;save();applyTheme()};
  const from=`circle(0px at ${x}px ${y}px)`,to=`circle(${R}px at ${x}px ${y}px)`;
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){set();return}
  if(document.startViewTransition){
    const t=document.startViewTransition(set);
    t.ready.then(()=>{document.documentElement.animate({clipPath:[from,to]},{duration:650,easing:"cubic-bezier(.65,0,.35,1)",pseudoElement:"::view-transition-new(root)"})}).catch(()=>{});
    return;
  }
  /* older browsers: a circle of the new background grows from the button, then the theme switches under it */
  const w=document.createElement("div");w.className="themewipe";w.style.background=next==="dark"?"#0b1226":"#efe9e1";document.body.appendChild(w);
  const a=w.animate({clipPath:[from,to]},{duration:550,easing:"cubic-bezier(.65,0,.35,1)",fill:"forwards"});
  a.onfinish=()=>{set();w.animate({opacity:[1,0]},{duration:220}).onfinish=()=>w.remove()};
}
$("themeBtn").onclick=toggleTheme;
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{if(S.theme==="auto")applyTheme()});
applyTheme();
$("molec").checked=S.molec;$("molec").onchange=e=>{S.molec=e.target.checked;save()};
$("face").checked=S.face!==false;$("face").onchange=e=>{S.face=e.target.checked;save()};
$("heckle").checked=S.heckle!==false;$("heckle").onchange=e=>{S.heckle=e.target.checked;save()};
$("hard").checked=S.hard;$("hard").onchange=e=>{S.hard=e.target.checked;save()};
function renderSeg(){$("seg").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.s===S.dur))}
$("seg").onclick=e=>{const b=e.target.closest("button");if(b){S.dur=+b.dataset.s;save();renderSeg()}};
function renderSegR(){$("segR").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.r===S.rounds));$("livreNote").hidden=S.rounds!==0}
$("segR").onclick=e=>{const b=e.target.closest("button");if(b){S.rounds=+b.dataset.r;save();renderSegR()}};
renderSeg();renderSegR();
/* provocações só existem no online: a chave some na preparação do "Um celular só" */
function mountSettings(where){$(where).appendChild($("settings"));$("settings").hidden=false;$("heckleRow").hidden=where==="localSettings"||MODE==="local"}
document.querySelectorAll("[data-home]").forEach(b=>b.onclick=()=>leave());
const hashCode=(location.hash||"").replace("#","").toUpperCase();
/* modo convite: quem chega pelo link vê só o nome e "Sentar na mesa ABCD", pra não abrir uma mesa própria sem querer */
function setInvite(code){$("home").classList.toggle("invited",!!code);$("inviteCode").textContent=code||"";$("joinBtn").textContent=code?"Sentar na mesa "+code:"Sentar"}
function clearInvite(){setInvite(null);try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}}
if(/^[A-Z]{4}$/.test(hashCode)){$("joinCode").value=hashCode;setInvite(hashCode)}
$("otherWays").onclick=()=>{clearInvite();$("myName").focus()};

function needName(){const n=$("myName").value.trim();if(!n){homeErr("Coloca seu nome primeiro.","name");$("myName").focus();return null}homeErr("");S.name=n;save();return n}

/* ---------- audio + wake lock ---------- */
let ac=null, wake=null;
function unlockAudio(){try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();ac.resume&&ac.resume()}catch(e){}}
function beep(f,d,type="square",vol=.08){if(!S.sound||!ac)return;try{const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=f;g.gain.value=vol;o.connect(g);g.connect(ac.destination);const t=ac.currentTime;g.gain.exponentialRampToValueAtTime(.0001,t+d);o.start(t);o.stop(t+d)}catch(e){}}
/* keep the screen on: native wake lock where it exists, NoSleep (silent looping video) for iPhones and in-app browsers */
let noSleep=null;
function keepAwake(){
  try{if(typeof NoSleep!=="undefined"){noSleep=noSleep||new NoSleep();if(!noSleep.isEnabled)noSleep.enable().catch(()=>{})}}catch(e){}
  try{navigator.wakeLock&&navigator.wakeLock.request("screen").then(w=>wake=w).catch(()=>{})}catch(e){}
}
document.addEventListener("click",()=>{if(MODE)keepAwake()},{capture:true});
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&MODE)keepAwake()});

