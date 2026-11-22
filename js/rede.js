/* ---------- local mode ---------- */
/* ordem da roda (local e sala): a vez passa na ordem da lista. Toca num nome e depois em outro pra trocar os dois de lugar */
const SEAT_HINT="A vez passa nessa ordem. Toque num nome e depois em outro pra trocar os dois de lugar.";
function seatChip(name,i,picked,removeLabel,me){
  return `<span class="chip${picked?" picked":""}${removeLabel?"":" noclose"}${me?" me":""}"><button type="button" class="seat" data-i="${i}" aria-pressed="${picked}"><i>${i+1}</i>${esc(name)}</button>${removeLabel?`<button type="button" class="x" data-x="${i}" aria-label="${esc(removeLabel)}">×</button>`:""}</span>`;
}
function seatTap(list,i,pick){if(pick<0)return i;if(pick===i)return -1;const t=list[pick];list[pick]=list[i];list[i]=t;return -1}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}}
let pickLocal=-1;
function renderChips(){
  const L=S.players;if(pickLocal>=L.length)pickLocal=-1;
  $("chips").innerHTML=L.map((n,i)=>seatChip(n,i,i===pickLocal,"Tirar "+n)).join("");
  $("localHint").textContent=L.length<2?"Ponha os nomes na ordem em que vocês estão sentados na roda.":pickLocal>=0?`Agora toque em quem vai trocar de lugar com ${L[pickLocal]}.`:SEAT_HINT;
  $("localShuffle").hidden=L.length<3;$("localClear").hidden=L.length<3;
  /* igual à sala online: sem 2 pessoas, o botão fica desligado e o texto acima diz o que falta */
  $("localGo").disabled=L.length<2;
}
$("chips").onclick=e=>{
  const x=e.target.closest(".x");if(x){S.players.splice(+x.dataset.x,1);pickLocal=-1;save();renderChips();return}
  const b=e.target.closest(".seat");if(!b)return;pickLocal=seatTap(S.players,+b.dataset.i,pickLocal);save();renderChips();
};
$("localShuffle").onclick=()=>{shuffle(S.players);pickLocal=-1;save();renderChips()};
armConfirm($("localClear"),()=>"Limpar lista",()=>"Apagar todos?",()=>{S.players=[];pickLocal=-1;save();localMsg("");renderChips();$("nameIn").focus()});
function localMsg(t){$("localMsg").textContent=t||"";$("localMsg").hidden=!t}
$("addForm").onsubmit=e=>{
  e.preventDefault();const v=$("nameIn").value.trim();$("nameIn").focus();if(!v)return;
  if(S.players.length>=MAX_PLAYERS){localMsg(`A roda já tem ${MAX_PLAYERS} pessoas, o máximo.`);return}
  const n=uniqueName(v,S.players);
  localMsg(n!==v?`Já tinha ${v} na roda, então ficou ${n}.`:"");
  S.players.push(n);save();renderChips();$("nameIn").value="";
};
$("mLocal").onclick=()=>{homeErr("");MODE=null;pickLocal=-1;localMsg("");renderChips();mountSettings("localSettings");show("local");if(!S.players.length)$("nameIn").focus()};
$("localGo").onclick=()=>{
  if(S.players.length<2){$("nameIn").focus();return}
  unlockAudio();keepAwake();MODE="local";ME=null;lastLetters="";
  newMatch(S.players.map((n,i)=>({id:"p"+i,name:n})));sync();
};

/* ---------- network ---------- */
/* mesa trancada: quem já sentou volta, gente nova é recusada ({t:"locked"}) */
let tableLocked=false;
function toggleLock(){tableLocked=!tableLocked;saveHost();renderLock();if(typeof renderSheet==="function")renderSheet(true)}
function renderLock(){const b=$("lockBtn");b.textContent=tableLocked?"Destrancar a mesa":"Trancar a mesa";b.setAttribute("aria-pressed",tableLocked?"true":"false");$("lockNote").hidden=!tableLocked}
function randCode(){const A="ABCDEFGHJKLMNPRSTUVWXYZ";let s="";for(let i=0;i<4;i++)s+=A[Math.floor(Math.random()*A.length)];return s}
function peerOk(){if(typeof Peer==="undefined"){homeErr("Não carregou a parte de rede. Confere a internet e recarrega a página.");return false}return true}
let pickLobby=-1;
function summaryText(s){return `${s.dur} s por vez, ${s.rounds?s.rounds+" rodadas":"rodadas livres"}${s.molec?", com molecagem":""}${s.hard?", com Q, X e Z":""}${s.heckle===false?", sem provocações":""}.`}
function lobbyView(){
  $("roomCode").textContent=roomCode||"····";
  const host=MODE==="host",list=host?lobbyPl:(V&&V.lobby)||[];
  if(pickLobby>=list.length)pickLobby=-1;
  $("lobbyPlayers").innerHTML=list.map((p,i)=>host
    ?seatChip(p.name+(p.id===ME?" (você)":""),i,i===pickLobby,p.id===ME?"":"Tirar "+p.name+" da mesa",p.id===ME)
    :p.id===ME
      ?`<span class="chip noclose me"><button type="button" class="seat rename" aria-label="Seu nome: ${esc(p.name)}. Tocar pra trocar"><i>${i+1}</i>${esc(p.name)} (você) <span class="pen" aria-hidden="true">✎</span></button></span>`
      :`<span class="chip noclose"><span class="seat"><i>${i+1}</i>${esc(p.name)}</span></span>`).join("")||`<span class="note">Ninguém ainda.</span>`;
  $("lobbyHint").hidden=!host||list.length<2;
  $("lobbyHint").textContent=pickLobby>=0?`Agora toque em quem vai trocar de lugar com ${list[pickLobby].name}.`:SEAT_HINT;
  $("lobbyShuffle").hidden=!host||list.length<3;
  $("lockBtn").hidden=!host;if(host)renderLock();else $("lockNote").hidden=true;
  if(host){$("hostGo").hidden=false;$("hostGo").disabled=list.length<2;$("lobbyNote").textContent=list.length<2?"Esperando pelo menos mais 1 pessoa entrar.":""}
  else{
    const owner=V&&V.host;$("hostGo").hidden=true;
    $("lobbyNote").textContent=owner?`Esperando ${owner} começar.`:"Esperando quem abriu a mesa começar.";
    if(owner)$("lobbyRole").textContent="Mesa de "+owner;
    /* já dentro: o botão volta a ser Sair, e quem entrou também pode chamar mais gente */
    $("lobbyQuit").textContent="Sair";$("copyLink").hidden=false;
    $("lobbyStatus").textContent="Você entrou. Toque no seu nome se quiser trocar.";
  }
  /* quem entrou vê como vai ser a partida; quem abriu vê o painel de opções */
  const st=!host&&V&&V.set;$("lobbySummary").hidden=!st;if(st)$("lobbySummary").textContent=summaryText(st);
  $("judgeNote").hidden=!host;
  renderQR();
}
/* QR code com o link de convite (biblioteca qrcodejs; sem ela, a sala segue sem o QR) */
let qrFor="";
function inviteUrl(){return location.origin+location.pathname+"#"+roomCode}
function renderQR(){
  const ready=/^[A-Z]{4}$/.test(roomCode)&&typeof QRCode!=="undefined"&&(MODE==="host"?!$("copyLink").hidden:MODE==="guest");
  $("qrWrap").hidden=!ready;if(!ready||qrFor===roomCode)return;
  qrFor=roomCode;$("qr").innerHTML="";
  try{new QRCode($("qr"),{text:inviteUrl(),width:336,height:336,colorDark:"#2a2018",colorLight:"#fbf6ea",correctLevel:QRCode.CorrectLevel.M})}catch(e){qrFor="";$("qrWrap").hidden=true}
}
/* alguém sentou: tic de tampinha e uma vibração curta pra quem abriu a mesa */
function seatSound(){beep(700,.05,"triangle",.06);setTimeout(()=>beep(1000,.07,"triangle",.06),70);try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}}
/* quem entrou troca o próprio nome: manda "join" de novo com o mesmo aparelho e o juiz só atualiza o nome */
function openRename(){
  $("plbox").innerHTML=`<form id="renameForm" style="display:contents"><div class="big win mid">Seu nome</div><input type="text" id="renameIn" maxlength="16" autocomplete="off" autocapitalize="words" aria-label="Seu nome" value="${esc(guestName)}"><button class="btn" type="submit">Trocar o nome</button><button class="btn ghost small" type="button" id="renameCancel">Cancelar</button></form>`;
  $("plov").hidden=false;const inp=$("renameIn");inp.focus();inp.select();
  $("renameCancel").onclick=()=>{$("plov").hidden=true};
  $("renameForm").onsubmit=e=>{
    e.preventDefault();const n=inp.value.trim().slice(0,16);if(!n){inp.focus();return}
    $("plov").hidden=true;if(n===guestName)return;
    guestName=n;S.name=n;save();$("myName").value=n;lsSet(ROOM_KEY,{code:roomCode,name:n,t:Date.now()});
    try{hostConn&&hostConn.open&&hostConn.send({t:"join",name:n,key:S.key})}catch(e){}
  };
}
function kick(p){
  if(!p||p.id===ME)return;
  lobbyPl=lobbyPl.filter(q=>q!==p);pickLobby=-1;
  const c=conns.get(p.id);conns.delete(p.id);
  if(c){c.pid=null;try{c.send({t:"kicked"})}catch(e){}setTimeout(()=>{try{c.close()}catch(e){}},400)}
  broadcastLobby();
}
$("lobbyPlayers").onclick=e=>{
  if(MODE==="guest"&&e.target.closest(".rename")){openRename();return}
  if(MODE!=="host"||G)return;
  const x=e.target.closest(".x");if(x){kick(lobbyPl[+x.dataset.x]);return}
  const b=e.target.closest(".seat");if(!b)return;pickLobby=seatTap(lobbyPl,+b.dataset.i,pickLobby);broadcastLobby();
};
$("lobbyShuffle").onclick=()=>{shuffle(lobbyPl);pickLobby=-1;broadcastLobby()};
/* opções mudaram na sala: manda o resumo de novo pra quem já sentou */
["click","change"].forEach(ev=>$("settings").addEventListener(ev,()=>{if(MODE==="host"&&!G)broadcastLobby()}));

/* ---------- persistence helpers ---------- */
const HOST_KEY="tecla-stop-host", ROOM_KEY="tecla-stop-room", MAX_AGE=3*3600e3;
function lsGet(k){try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
/* faixa do topo: "warn" (vermelha) quando atrapalha o jogo, "info" (neutra) quando é só aviso */
function netBar(msg,kind){$("net").textContent=msg||"";$("net").hidden=!msg;$("net").classList.toggle("info",kind==="info");document.body.classList.toggle("has-net",!!msg)}
function setOffline(on){offline=!!on;$("offline").hidden=!on;$("board").classList.toggle("frozen",!!on);if(on){const n=$("tapnote");if(n)n.remove()}}

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
  MODE="host";ME=PUB;conns.clear();V=null;lastLetters="";
  if(restore){
    roomCode=restore.code;G=restore.G||null;tableLocked=!!restore.locked;
    /* mesa salva antes da troca de identidade: o juiz era guardado pela chave crua */
    const mig=p=>{if(p.id===S.key)p.id=ME};if(G){G.pl.forEach(mig)}(restore.lobby||[]).forEach(mig);
    if(G)G.hostId=ME;lobbyPl=(restore.lobby||[]).filter(p=>p.id===ME);
    if(!lobbyPl.length)lobbyPl=[{id:ME,name}];
    if(G){G.pl.forEach(p=>{if(p.id!==ME)p.on=false});if(G.state==="run")G.state="pause";G.end=0}
  }else{roomCode=randCode();lobbyPl=[{id:ME,name}];G=null;tableLocked=false}
  $("lobbyRole").textContent="Sua mesa";$("lobbyQuit").textContent="Sair";$("lobbyStatus").textContent=restore?"Reabrindo a mesa…":"Abrindo a mesa…";$("copyLink").hidden=true;
  mountSettings("hostSettings");
  if(G)sync();else{show("lobby");lobbyView()}
  if(restore)netBar("Reabrindo a mesa "+roomCode+"… a galera volta sozinha","info");
  openHostPeer(0,!!restore);
}
async function openHostPeer(tries,keepCode){
  const cfg=await iceConfig();if(MODE!=="host")return;
  const p=new Peer(PREFIX+roomCode+(hostSuffix||""),{debug:0,config:cfg});peer=p;
  p.on("open",()=>{if(peer!==p)return;takingOver=false;netBar("");$("lobbyStatus").textContent="Mesa aberta. Chama a galera ou passa o número.";$("copyLink").hidden=false;renderQR();saveHost()});
  p.on("connection",c=>{
    c.lastSeen=Date.now();
    c.on("data",d=>onHostData(c,d));
    c.on("close",()=>onLeave(c));
  });
  p.on("disconnected",()=>{
    if(peer!==p||p.destroyed||MODE!=="host")return;
    netBar("Sem contato com o servidor de mesas. Quem já está conectado continua jogando.","info");
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
        if(tries<20){netBar("Reabrindo a mesa "+roomCode+"…","info");setTimeout(()=>{if(MODE==="host"&&peer===p)openHostPeer(tries+1,true)},2000)}
        else netBar("Não consegui reabrir a mesa "+roomCode+". Toque em Sair e abra outra.");
      }else if(tries<4){roomCode=randCode();lobbyView();openHostPeer(tries+1,false)}
      return;
    }
    if(["network","server-error","socket-error","socket-closed"].includes(e.type)){
      netBar("Sem contato com o servidor de mesas. Tentando de novo…","info");
      setTimeout(()=>{try{if(peer===p&&!p.destroyed&&p.disconnected)p.reconnect()}catch(_){}},3000);
    }
  });
}
function saveHost(){
  if(MODE!=="host")return;
  let g=null;
  if(G){g=JSON.parse(JSON.stringify(G));if(G.state==="run"){g.state="pause";g.pausedLeft=Math.max(0,G.end-performance.now())}}
  lsSet(HOST_KEY,{code:roomCode,suffix:hostSuffix||"",lobby:lobbyPl,G:g,name:S.name,locked:tableLocked,t:Date.now()});
}
function onHostData(c,d){
  if(!d||typeof d!=="object")return;
  c.lastSeen=Date.now();
  if(d.t==="ping"){try{c.send({t:"pong"})}catch(e){}return}
  if(d.t==="join"){
    /* a chave é secreta; o jogador é identificado pelo hash dela (o mesmo que o convidado calcula pra si) */
    const raw=String(d.key||"").slice(0,64),name=String(d.name||"Alguém").slice(0,16);
    (raw?pubId(raw):Promise.resolve(Math.random().toString(36).slice(2))).then(id=>{
    if(MODE!=="host"||id===ME)return;
    /* migração: jogador salvo antes da troca de identidade, pela chave crua */
    const legacy=p=>{if(raw&&p.id===raw)p.id=id};lobbyPl.forEach(legacy);if(G)G.pl.forEach(legacy);
    const known=G?G.pl.some(p=>p.id===id):lobbyPl.some(p=>p.id===id);
    /* mesa trancada: só quem já sentou volta */
    if(tableLocked&&!known){try{c.send({t:"locked"})}catch(e){}setTimeout(()=>{try{c.close()}catch(e){}},400);return}
    const old=conns.get(id);if(old&&old!==c){old.pid=null;try{old.close()}catch(e){}}
    c.pid=id;conns.set(id,c);
    if(!G){const ex=lobbyPl.find(p=>p.id===id);if(ex)ex.name=name;else{lobbyPl.push({id,name});seatSound()}broadcastLobby()}
    else{const ex=G.pl.find(p=>p.id===id);if(ex){ex.on=true;ex.name=name;if(!ex.lost&&!ex.bench&&joinable())ex.alive=true}else{G.pl.push({id,name,drinks:0,wins:0,pts:0,alive:joinable(),on:true,lost:false});seatSound()}if(G.ov&&G.ov.kind==="few")newRound();sync()}
    });
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
    else if(i===G.cur){
      /* caiu na própria vez: avisa todo mundo e dá 2 s de folga pro próximo antes do tempo começar a cair */
      G.cur=nextAliveFrom(G.cur);G.end=performance.now()+G.dur*1000+2000;
      G.note={text:`${G.pl[i].name} caiu. A vez passou pra ${G.pl[G.cur].name}.`,n:(G.note?G.note.n:0)+1};
    }
  }else if(G.state==="pause"&&i===G.cur&&onlineAlive()>=1){G.cur=nextAliveFrom(G.cur);G.pausedLeft=G.dur*1000}
  sync();
}
function broadcastLobby(){
  const me=lobbyPl.find(p=>p.id===ME);
  const msg={t:"lobby",code:roomCode,players:lobbyPl,host:me?me.name:"",set:{dur:S.dur,rounds:S.rounds,molec:S.molec,hard:S.hard,heckle:S.heckle!==false}};
  conns.forEach(c=>{try{c.open&&c.send(msg)}catch(e){}});lobbyView();saveHost();
}
$("hostGo").onclick=()=>{if(lobbyPl.length<2)return;unlockAudio();newMatch(lobbyPl);sync()};
/* convite: compartilhar nativo do celular (WhatsApp etc.); se não tiver, copia o link */
async function invite(btn,label){
  const url=inviteUrl();
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
$("lockBtn").onclick=toggleLock;
$("roomTag").onclick=()=>invite($("roomTagHint"),"copiado");

/* guest */
$("joinForm").onsubmit=e=>{e.preventDefault();const n=needName();if(!n||!peerOk())return;
  const code=$("joinCode").value.trim().toUpperCase();if(!/^[A-Z]{4}$/.test(code)){homeErr("O número da mesa tem 4 letras.","join");$("joinCode").focus();return}
  unlockAudio();keepAwake();startGuest(n,code,false)};
const SUFFIXES=["","b","c"];let hostSuffix="",takingOver=false,seatIdx=0,seatMisses=0,lastFull=null;
let guestName="",everConnected=false,rcTimer=null,rcStart=0,rcN=0,lastHostMsg=0;
function startGuest(name,code,auto){
  seatIdx=0;seatMisses=0;lastFull=null;$("takeover").hidden=true;
  MODE="guest";ME=PUB;roomCode=code;guestName=name;G=null;V=null;lastLetters="";
  everConnected=!!auto;rcStart=Date.now();rcN=0;
  $("lobbyRole").textContent="Entrando na mesa";$("qrWrap").hidden=true;$("lobbySummary").hidden=true;$("lobbyQuit").textContent="Cancelar";$("lobbyStatus").textContent=auto?"Voltando pra mesa…":"Entrando…";$("copyLink").hidden=true;$("hostSettings").innerHTML="";
  show("lobby");$("roomCode").textContent=code;$("lobbyPlayers").innerHTML=`<span class="note">Conectando…</span>`;$("lobbyHint").hidden=true;$("lobbyShuffle").hidden=true;$("hostGo").hidden=true;$("lobbyNote").textContent="";
  if(auto)netBar("Voltando pra mesa "+code+"…","info");
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
      const back=everConnected&&rcN>0;
      clearTimeout(guard);hostConn=c;lastHostMsg=Date.now();everConnected=true;rcStart=0;rcN=0;seatMisses=0;netBar("");$("takeover").hidden=true;
      setOffline(false);if(back)showToast("Conectado de novo");
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
/* 0 = próxima pessoa da roda depois de quem abriu a mesa (e conectada); 1 = qualquer outra */
function takeoverRank(){
  const f=lastFull;if(!f||!f.pl)return 1;
  const n=f.pl.length,h=Math.max(0,f.pl.findIndex(p=>p.id===f.hostId));
  for(let k=1;k<n;k++){const p=f.pl[(h+k)%n];if(p.on!==false)return p.id===ME?0:1}
  return 1;
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
  if(everConnected&&curScreen==="game")setOffline(true);
  /* quem abriu a mesa sumiu: oferece virar juiz primeiro pra próxima pessoa da roda (15 s) e, 15 s depois, pra todo mundo */
  if(everConnected&&lastFull&&Date.now()-rcStart>15000+15000*takeoverRank())$("takeover").hidden=false;
  const secs=Math.round((Date.now()-rcStart)/1000);
  netBar(everConnected?`Conexão caiu. Reconectando… (há ${secs} s)`:`Procurando a mesa ${roomCode}… (há ${secs} s)`);
  if(!everConnected)$("lobbyStatus").textContent="Ainda tentando. Pode levar uns segundos quando vocês estão em redes diferentes.";
  rcTimer=setTimeout(attempt,ms!=null?ms:Math.min(1000*rcN,5000));
}
function onGuestData(d){
  if(!d||typeof d!=="object"||d.t==="pong")return;
  if(d.t==="closed"){guestFail(`${d.by||"Quem abriu a mesa"} fechou a mesa.`);return}
  /* a partida começou: vibra e toca, pra quem deixou o celular de lado */
  if(d.t==="state"&&curScreen==="lobby"){try{navigator.vibrate&&navigator.vibrate([90,60,90])}catch(e){}beep(660,.08,"triangle",.07);setTimeout(()=>beep(990,.12,"triangle",.07),90)}
  if(d.t==="locked"){guestFail(`A mesa ${roomCode} está trancada. Peça pra quem abriu destrancar.`);return}
  if(d.t==="kicked"){guestFail("Quem abriu a mesa te tirou dela. Se foi engano, é só sentar de novo.");return}
  if(d.t==="lobby"){show("lobby");$("ov").hidden=true;V={lobby:d.players,host:d.host,set:d.set};lobbyView();V=null;return}
  if(d.t==="state"){if(d.full)lastFull=d.full;applyView(d)}
}
function guestFail(msg){
  clearTimeout(rcTimer);lsDel(ROOM_KEY);
  const code=roomCode;teardown();show("home");homeErr(msg,"join");$("joinCode").value=code;
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
  /* quem abriu a mesa saiu do app: a rodada pausa se estiver rolando, e todo mundo fica sabendo em qualquer tela */
  if(document.visibilityState==="hidden"&&MODE==="host"&&G&&G.state!=="over"){G.hostAway=true;if(G.state==="run")act(ME,{t:"pause"});else sync()}
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
  $("ov").hidden=true;$("rkov").hidden=true;$("addov").hidden=true;$("catov").hidden=true;netBar("");setOffline(false);$("toast").hidden=true;
  try{wake&&wake.release()}catch(e){}
  try{noSleep&&noSleep.isEnabled&&noSleep.disable()}catch(e){}
}
function leave(){
  /* quem abriu a mesa avisa todo mundo antes de fechar; as conexões fecham meio segundo depois, pra mensagem chegar */
  if(MODE==="host"){
    const cs=[...conns.values()],p=peer;
    cs.forEach(c=>{try{c.open&&c.send({t:"closed",by:S.name||""})}catch(e){}});
    conns.clear();peer=null;
    setTimeout(()=>{cs.forEach(c=>{try{c.close()}catch(e){}});try{p&&p.destroy()}catch(e){}},500);
  }
  lsDel(HOST_KEY);lsDel(ROOM_KEY);teardown();homeErr("");clearInvite();show("home");
}

/* ---------- reopen after reload ---------- */
/* espera o id público ficar pronto (é calculado com hash, de forma assíncrona) */
PUB_READY.then(function restore(){
  if(typeof Peer==="undefined")return;
  const h=lsGet(HOST_KEY);
  if(h&&h.code&&Date.now()-h.t<MAX_AGE&&(!/^[A-Z]{4}$/.test(hashCode)||hashCode===h.code)){keepAwake();startHost(h.name||S.name||"Anfitrião",h);return}
  const r=lsGet(ROOM_KEY);
  if(r&&r.code&&r.name&&Date.now()-r.t<MAX_AGE&&(!/^[A-Z]{4}$/.test(hashCode)||hashCode===r.code)){keepAwake();startGuest(r.name,r.code,true)}
});

/* Sair da sala: quem abriu a mesa com gente sentada precisa confirmar, porque fecha a mesa de todo mundo */
armConfirm($("lobbyQuit"),()=>"Sair",()=>"Fechar a mesa?",()=>leave());
{const b=$("lobbyQuit"),armed=b.onclick;b.onclick=e=>{if(MODE==="host"&&lobbyPl.length>1)armed(e);else leave()}}
