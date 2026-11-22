/* ---------- local mode ---------- */
function renderChips(){
  $("chips").innerHTML="";
  S.players.forEach((n,i)=>{const c=document.createElement("span");c.className="chip";c.textContent=n;
    const b=document.createElement("button");b.type="button";b.setAttribute("aria-label","Tirar "+n);b.textContent="×";
    b.onclick=()=>{S.players.splice(i,1);save();renderChips()};c.appendChild(b);$("chips").appendChild(c)});
}
$("addForm").onsubmit=e=>{e.preventDefault();const v=$("nameIn").value.trim();if(v&&S.players.length<12){S.players.push(v);save();renderChips()}$("nameIn").value="";$("nameIn").focus()};
$("mLocal").onclick=()=>{homeErr("");MODE=null;renderChips();mountSettings("localSettings");show("local")};
$("localGo").onclick=()=>{
  if(S.players.length<2){$("nameIn").placeholder="Precisa de pelo menos 2";$("nameIn").focus();return}
  unlockAudio();keepAwake();MODE="local";ME=null;lastLetters="";
  newMatch(S.players.map((n,i)=>({id:"p"+i,name:n})));sync();
};

/* ---------- network ---------- */
function randCode(){const A="ABCDEFGHJKLMNPRSTUVWXYZ";let s="";for(let i=0;i<4;i++)s+=A[Math.floor(Math.random()*A.length)];return s}
function peerOk(){if(typeof Peer==="undefined"){homeErr("Não carregou a parte de rede. Confere a internet e recarrega a página.");return false}return true}
function lobbyView(){
  $("roomCode").textContent=roomCode||"····";
  const list=MODE==="host"?lobbyPl:(V&&V.lobby)||[];
  $("lobbyPlayers").innerHTML=list.map(p=>`<span class="chip noclose">${esc(p.name)}${p.id===ME?" (você)":""}</span>`).join("")||`<span class="note">Ninguém ainda.</span>`;
  if(MODE==="host"){$("hostGo").hidden=false;$("hostGo").disabled=list.length<2;$("lobbyNote").textContent=list.length<2?"Esperando pelo menos mais 1 pessoa entrar.":""}
  else{$("hostGo").hidden=true;$("lobbyNote").textContent="Esperando quem abriu a mesa começar."}
  $("judgeNote").hidden=MODE!=="host";
}

/* ---------- persistence helpers ---------- */
const HOST_KEY="tecla-stop-host", ROOM_KEY="tecla-stop-room", MAX_AGE=3*3600e3;
function lsGet(k){try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
function netBar(msg){$("net").textContent=msg||"";$("net").hidden=!msg;document.body.classList.toggle("has-net",!!msg)}

/* ---------- ICE: STUN finds a direct path; TURN relays when both phones are behind carrier NAT (different houses / 4G) ---------- */
const TURN_HOST="staticauth.openrelay.metered.ca",TURN_SECRET="openrelayprojectsecret";
let iceCache=null;
async function turnCreds(){
  const user=(Math.floor(Date.now()/1000)+12*3600)+":teclastop";
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(TURN_SECRET),{name:"HMAC",hash:"SHA-1"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(user));
  return {username:user,credential:btoa(String.fromCharCode(...new Uint8Array(sig)))};
}
async function iceConfig(){
  if(iceCache&&Date.now()-iceCache.t<6*3600e3)return iceCache.cfg;
  const servers=[{urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]},{urls:"stun:"+TURN_HOST+":80"}];
  try{
    const c=await turnCreds();
    servers.push({urls:["turn:"+TURN_HOST+":80","turn:"+TURN_HOST+":80?transport=tcp","turn:"+TURN_HOST+":443","turns:"+TURN_HOST+":443?transport=tcp"],username:c.username,credential:c.credential});
  }catch(e){}
  iceCache={t:Date.now(),cfg:{iceServers:servers}};
  return iceCache.cfg;
}
iceConfig();

/* host */
$("mCreate").onclick=()=>{const n=needName();if(!n||!peerOk())return;unlockAudio();keepAwake();startHost(n,null)};
function startHost(name,restore,takeover){
  takingOver=!!takeover;if(!takeover)hostSuffix=(restore&&restore.suffix)||"";
  MODE="host";ME=S.key;conns.clear();V=null;lastLetters="";
  if(restore){
    roomCode=restore.code;G=restore.G||null;lobbyPl=(restore.lobby||[]).filter(p=>p.id===ME);
    if(!lobbyPl.length)lobbyPl=[{id:ME,name}];
    if(G){G.pl.forEach(p=>{if(p.id!==ME)p.on=false});if(G.state==="run")G.state="pause";G.end=0}
  }else{roomCode=randCode();lobbyPl=[{id:ME,name}];G=null}
  $("lobbyRole").textContent="Sua mesa";$("lobbyStatus").textContent=restore?"Reabrindo a mesa…":"Abrindo a mesa…";$("copyLink").hidden=true;
  mountSettings("hostSettings");
  if(G)sync();else{show("lobby");lobbyView()}
  if(restore)netBar("Reabrindo a mesa "+roomCode+"… a galera volta sozinha");
  openHostPeer(0,!!restore);
}
async function openHostPeer(tries,keepCode){
  const cfg=await iceConfig();if(MODE!=="host")return;
  const p=new Peer(PREFIX+roomCode+(hostSuffix||""),{debug:0,config:cfg});peer=p;
  p.on("open",()=>{if(peer!==p)return;takingOver=false;netBar("");$("lobbyStatus").textContent="Mesa aberta. Chama a galera ou passa o número.";$("copyLink").hidden=false;saveHost()});
  p.on("connection",c=>{
    c.lastSeen=Date.now();
    c.on("data",d=>onHostData(c,d));
    c.on("close",()=>onLeave(c));
  });
  p.on("disconnected",()=>{
    if(peer!==p||p.destroyed||MODE!=="host")return;
    netBar("Sem contato com o servidor de mesas. Quem já está conectado continua jogando.");
    setTimeout(()=>{try{if(peer===p&&!p.destroyed&&p.disconnected)p.reconnect()}catch(e){}},2000);
  });
  p.on("error",e=>{
    if(peer!==p||MODE!=="host")return;
    if(e.type==="unavailable-id"){
      try{p.destroy()}catch(_){}
      if(takingOver){
        /* someone already holds this seat: try the next one, or go back to being a guest */
        const i=SUFFIXES.indexOf(hostSuffix||"");
        if(i<SUFFIXES.length-1){hostSuffix=SUFFIXES[i+1];openHostPeer(tries+1,true)}
        else{takingOver=false;const n=S.name;teardown();startGuest(n,roomCode,true)}
        return;
      }
      if(keepCode){
        if(tries<20){netBar("Reabrindo a mesa "+roomCode+"…");setTimeout(()=>{if(MODE==="host"&&peer===p)openHostPeer(tries+1,true)},2000)}
        else netBar("Não consegui reabrir a mesa "+roomCode+". Toque em Sair e abra outra.");
      }else if(tries<4){roomCode=randCode();lobbyView();openHostPeer(tries+1,false)}
      return;
    }
    if(["network","server-error","socket-error","socket-closed"].includes(e.type)){
      netBar("Sem contato com o servidor de mesas. Tentando de novo…");
      setTimeout(()=>{try{if(peer===p&&!p.destroyed&&p.disconnected)p.reconnect()}catch(_){}},3000);
    }
  });
}
function saveHost(){
  if(MODE!=="host")return;
  let g=null;
  if(G){g=JSON.parse(JSON.stringify(G));if(G.state==="run"){g.state="pause";g.pausedLeft=Math.max(0,G.end-performance.now())}}
  lsSet(HOST_KEY,{code:roomCode,suffix:hostSuffix||"",lobby:lobbyPl,G:g,name:S.name,t:Date.now()});
}
function onHostData(c,d){
  if(!d||typeof d!=="object")return;
  c.lastSeen=Date.now();
  if(d.t==="ping"){try{c.send({t:"pong"})}catch(e){}return}
  if(d.t==="join"){
    const id=String(d.key||"").slice(0,20)||Math.random().toString(36).slice(2),name=String(d.name||"Alguém").slice(0,16);
    const old=conns.get(id);if(old&&old!==c){old.pid=null;try{old.close()}catch(e){}}
    c.pid=id;conns.set(id,c);
    if(!G){const ex=lobbyPl.find(p=>p.id===id);if(ex)ex.name=name;else lobbyPl.push({id,name});broadcastLobby()}
    else{const ex=G.pl.find(p=>p.id===id);if(ex){ex.on=true;ex.name=name;if(!ex.lost&&joinable())ex.alive=true}else G.pl.push({id,name,drinks:0,wins:0,pts:0,alive:joinable(),on:true,lost:false});if(G.ov&&G.ov.kind==="few")newRound();sync()}
    return;
  }
  if(c.pid)act(c.pid,d);
}
function onLeave(c){
  if(!c.pid||conns.get(c.pid)!==c)return;
  conns.delete(c.pid);
  if(!G){lobbyPl=lobbyPl.filter(p=>p.id!==c.pid);broadcastLobby();return}
  const i=G.pl.findIndex(p=>p.id===c.pid);if(i<0)return;
  /* a drop is not an elimination: the player stays in the round, turns skip them until they come back */
  G.pl[i].on=false;
  if(G.state==="run"){
    if(onlineAlive()<2){G.pausedLeft=i===G.cur?G.dur*1000:Math.max(0,G.end-performance.now());if(i===G.cur)G.cur=nextAliveFrom(G.cur);G.state="pause"}
    else if(i===G.cur){G.cur=nextAliveFrom(G.cur);resetTimer()}
  }else if(G.state==="pause"&&i===G.cur&&onlineAlive()>=1){G.cur=nextAliveFrom(G.cur);G.pausedLeft=G.dur*1000}
  sync();
}
function broadcastLobby(){
  const msg={t:"lobby",code:roomCode,players:lobbyPl};
  conns.forEach(c=>{try{c.open&&c.send(msg)}catch(e){}});lobbyView();saveHost();
}
$("hostGo").onclick=()=>{if(lobbyPl.length<2)return;unlockAudio();newMatch(lobbyPl);sync()};
/* convite: compartilhar nativo do celular (WhatsApp etc.); se não tiver, copia o link */
async function invite(btn,label){
  const url=location.origin+location.pathname+"#"+roomCode;
  const text="Bora jogar Tecla Stop? Senta na mesa "+roomCode+": "+url;
  if(navigator.share){try{await navigator.share({title:"Tecla Stop",text,url});return}catch(e){if(e&&e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(text);btn.textContent=label;setTimeout(()=>{btn.textContent=btn.dataset.l||btn.textContent},2500)}catch(e){$("lobbyStatus").textContent=url}
}
$("takeBtn").onclick=()=>{
  if(!lastFull)return;const full=lastFull,code=roomCode,name=guestName||S.name;
  $("takeover").hidden=true;teardown();hostSuffix="b";
  startHost(name,{code,G:full,lobby:[]},true);
};
$("copyLink").dataset.l="Chamar a galera";
$("copyLink").onclick=()=>invite($("copyLink"),"Convite copiado");
$("roomTag").onclick=()=>invite($("roomTagHint"),"copiado");

/* guest */
$("joinForm").onsubmit=e=>{e.preventDefault();const n=needName();if(!n||!peerOk())return;
  const code=$("joinCode").value.trim().toUpperCase();if(!/^[A-Z]{4}$/.test(code)){homeErr("O número da mesa tem 4 letras.");return}
  unlockAudio();keepAwake();startGuest(n,code,false)};
const SUFFIXES=["","b","c"];let hostSuffix="",takingOver=false,seatIdx=0,seatMisses=0,lastFull=null;
let guestName="",everConnected=false,rcTimer=null,rcStart=0,rcN=0,lastHostMsg=0;
function startGuest(name,code,auto){
  seatIdx=0;seatMisses=0;lastFull=null;$("takeover").hidden=true;
  MODE="guest";ME=S.key;roomCode=code;guestName=name;G=null;V=null;lastLetters="";
  everConnected=!!auto;rcStart=Date.now();rcN=0;
  $("lobbyRole").textContent="Mesa de outra pessoa";$("lobbyStatus").textContent=auto?"Voltando pra mesa…":"Entrando…";$("copyLink").hidden=true;$("hostSettings").innerHTML="";
  show("lobby");$("roomCode").textContent=code;$("lobbyPlayers").innerHTML="";$("hostGo").hidden=true;$("lobbyNote").textContent="";
  if(auto)netBar("Voltando pra mesa "+code+"…");
  attempt();
}
async function attempt(){
  clearTimeout(rcTimer);if(MODE!=="guest")return;
  try{peer&&peer.destroy()}catch(e){}
  hostConn=null;
  const cfg=await iceConfig();if(MODE!=="guest")return;
  const p=new Peer({debug:0,config:cfg});peer=p;
  /* relayed connections can take a few seconds longer to set up */
  const guard=setTimeout(()=>{if(peer===p&&!(hostConn&&hostConn.open)){if(everConnected)seatIdx=(seatIdx+1)%SUFFIXES.length;retryLater()}},15000);
  p.on("open",()=>{
    if(peer!==p)return;
    const c=p.connect(PREFIX+roomCode+SUFFIXES[seatIdx],{reliable:true});
    c.on("open",()=>{
      if(peer!==p||MODE!=="guest")return;
      clearTimeout(guard);hostConn=c;lastHostMsg=Date.now();everConnected=true;rcStart=0;rcN=0;seatMisses=0;netBar("");$("takeover").hidden=true;
      $("lobbyStatus").textContent="Você entrou.";
      c.send({t:"join",name:guestName,key:S.key});
      lsSet(ROOM_KEY,{code:roomCode,name:guestName,t:Date.now()});
    });
    c.on("data",d=>{if(peer!==p)return;lastHostMsg=Date.now();onGuestData(d)});
    c.on("close",()=>{if(hostConn===c){hostConn=null;lost()}});
    c.on("error",()=>{});
  });
  p.on("error",e=>{
    if(peer!==p||MODE!=="guest")return;
    clearTimeout(guard);
    if(e.type==="peer-unavailable"){
      seatIdx=(seatIdx+1)%SUFFIXES.length;seatMisses++;
      if(!everConnected&&seatMisses>=SUFFIXES.length){guestFail("Mesa "+roomCode+" não encontrada. Confere o número.");return}
      if(seatIdx!==0){retryLater(150);return}
    }
    retryLater();
  });
}
function lost(){if(MODE!=="guest")return;if(!rcStart)rcStart=Date.now();retryLater(300)}
function retryLater(ms){
  if(MODE!=="guest")return;
  clearTimeout(rcTimer);
  if(!rcStart)rcStart=Date.now();
  const limit=everConnected?180000:40000;
  if(Date.now()-rcStart>limit){
    guestFail(everConnected?"Não consegui voltar pra mesa "+roomCode+". Se quem abriu a mesa fechou o jogo, peça pra abrir de novo e sente com o número.":"Não consegui chegar no celular de quem abriu a mesa. Confere o número e peça pra pessoa deixar o jogo aberto na tela. Se continuar, tente outra rede (Wi-Fi ou 4G).");
    return;
  }
  rcN++;
  /* the table phone has been gone a while: offer to take over with the last game state */
  if(everConnected&&lastFull&&Date.now()-rcStart>15000)$("takeover").hidden=false;
  netBar(everConnected?"Conexão caiu. Reconectando… (tentativa "+rcN+")":"Procurando a mesa "+roomCode+"… (tentativa "+rcN+" de 3)");
  if(!everConnected)$("lobbyStatus").textContent="Ainda tentando. Pode levar uns segundos quando vocês estão em redes diferentes.";
  rcTimer=setTimeout(attempt,ms!=null?ms:Math.min(1000*rcN,5000));
}
function onGuestData(d){
  if(!d||typeof d!=="object"||d.t==="pong")return;
  if(d.t==="lobby"){show("lobby");$("ov").hidden=true;V={lobby:d.players};lobbyView();V=null;return}
  if(d.t==="state"){if(d.full)lastFull=d.full;applyView(d)}
}
function guestFail(msg){
  clearTimeout(rcTimer);lsDel(ROOM_KEY);
  const code=roomCode;teardown();show("home");homeErr(msg);$("joinCode").value=code;
}

/* heartbeat: guests ping, host drops silent phones, everyone retries when the screen wakes */
setInterval(()=>{
  if(MODE==="guest"&&hostConn&&hostConn.open){
    try{hostConn.send({t:"ping"})}catch(e){}
    if(Date.now()-lastHostMsg>20000){const c=hostConn;hostConn=null;try{c.close()}catch(e){};lost()}
    else lsSet(ROOM_KEY,{code:roomCode,name:guestName,t:Date.now()});
  }
  if(MODE==="host"){
    conns.forEach(c=>{if(Date.now()-(c.lastSeen||0)>30000){try{c.close()}catch(e){};onLeave(c)}});
    saveHost();
  }
},4000);
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden"&&MODE==="host"&&G&&G.state==="run"){G.hostAway=true;act(ME,{t:"pause"})}
  if(document.visibilityState!=="visible")return;
  if(MODE==="host"&&G&&G.hostAway){G.hostAway=false;sync()}
  if(MODE==="guest"&&!(hostConn&&hostConn.open)){rcN=0;if(!rcStart)rcStart=Date.now();attempt()}
  if(MODE==="host"&&peer&&peer.disconnected&&!peer.destroyed){try{peer.reconnect()}catch(e){}}
});

/* ---------- leave ---------- */
function teardown(){
  const m=MODE;MODE=null;clearTimeout(rcTimer);
  try{hostConn&&hostConn.close()}catch(e){}
  conns.forEach(c=>{try{c.close()}catch(e){}});conns.clear();
  try{peer&&peer.destroy()}catch(e){}
  peer=null;hostConn=null;G=null;V=null;lastOvKey=null;wasMyTurn=false;
  lastHk=-1;spinning=false;clearTimeout(spinTimer);spunRound=-1;shownCat=null;$("reel").classList.remove("spinning");
  if(introPlaying){introTimers.forEach(clearTimeout);introTimers=[];introPlaying=false;$("intro").hidden=true;$("intro").innerHTML="";$("tilt").style.opacity="";$("floor").style.opacity=""}
  $("ov").hidden=true;$("rkov").hidden=true;$("addov").hidden=true;$("catov").hidden=true;netBar("");
  try{wake&&wake.release()}catch(e){}
  try{noSleep&&noSleep.isEnabled&&noSleep.disable()}catch(e){}
}
function leave(){lsDel(HOST_KEY);lsDel(ROOM_KEY);teardown();homeErr("");show("home")}

/* ---------- reopen after reload ---------- */
(function restore(){
  if(typeof Peer==="undefined")return;
  const h=lsGet(HOST_KEY);
  if(h&&h.code&&Date.now()-h.t<MAX_AGE&&(!/^[A-Z]{4}$/.test(hashCode)||hashCode===h.code)){keepAwake();startHost(h.name||S.name||"Anfitrião",h);return}
  const r=lsGet(ROOM_KEY);
  if(r&&r.code&&r.name&&Date.now()-r.t<MAX_AGE&&(!/^[A-Z]{4}$/.test(hashCode)||hashCode===r.code)){keepAwake();startGuest(r.name,r.code,true)}
})();
