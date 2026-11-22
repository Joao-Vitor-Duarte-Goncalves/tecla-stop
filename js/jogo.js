/* ---------- state ---------- */
let MODE=null;      // 'local' | 'host' | 'guest'
let ME=null;        // my player id
let G=null;         // authoritative game (local/host)
let V=null;         // view being rendered
let peer=null, hostConn=null, conns=new Map(), lobbyPl=[], roomCode="";

/* ---------- engine (local / host only) ---------- */
function newMatch(players){
  G={pl:players.map(p=>({id:p.id,name:p.name,drinks:0,wins:0,pts:0,alive:true,on:true})),round:0,maxRounds:S.rounds,starter:-1,
     letters:BASE.concat(S.hard?HARD:[]),lastCat:null,custom:[],molec:S.molec,cat:"",state:"idle",used:[],hist:[],cur:0,dur:S.dur,ov:null,end:0,pausedLeft:0,seq:0};
  newRound();
}
/* temas saem como cartas de um baralho: nenhum repete até todos terem saído.
   O baralho fica guardado no celular do juiz por 12 h, então vale entre partidas da mesma noite. */
function pickCat(){
  const pool=CATS.concat(G.molec?MOLEC:[],G.custom);
  let deck=lsGet("tecla-deck");
  if(!deck||Date.now()-deck.t>12*3600e3)deck={t:Date.now(),seen:[]};
  let left=pool.filter(c=>!deck.seen.includes(c));
  if(!left.length){deck.seen=G.lastCat?[G.lastCat]:[];left=pool.filter(c=>c!==G.lastCat);if(!left.length)left=pool}
  const c=left[Math.floor(Math.random()*left.length)];
  deck.seen.push(c);deck.t=Date.now();lsSet("tecla-deck",deck);
  G.lastCat=c;G.cat=c;G.catBy="draw";
}
function joinable(){return !(G.ov&&(G.ov.kind==="win"||G.ov.kind==="few"||G.ov.kind==="final"))}
function newRound(){
  /* the round only counts once it can actually be played: waiting for people never burns a round */
  G.outs=0;G.pl.forEach(p=>{p.alive=p.on!==false&&!p.bench;p.lost=false});G.used=[];G.hist=[];G.dur=S.dur;G.ov=null;G.roundSnap=null;G.lastOut=null;
  if(G.pl.filter(p=>p.alive).length<2){G.state="idle";G.ov={kind:"few"};G.seq++;return}
  G.round++;
  G.starter=nextAliveFrom(G.starter);G.cur=G.starter;G.state="idle";pickCat();
}
function nextAliveFrom(i){const n=G.pl.length;for(let k=1;k<=n;k++){const j=(i+k+n)%n;if(G.pl[j].alive&&G.pl[j].on!==false)return j}return Math.max(0,i)}
function onlineAlive(){return G.pl.filter(p=>p.alive&&p.on!==false).length}
function curOk(){const c=G.pl[G.cur];return c&&c.alive&&c.on!==false}
function resetTimer(){G.end=performance.now()+G.dur*1000}
function aliveCount(){return G.pl.filter(p=>p.alive).length}
function endIfLastStanding(){
  if(aliveCount()<=1){const w=G.pl.find(p=>p.alive),gain=G.outs||0;if(w){w.wins++;w.pts+=gain}G.state="ov";G.ov={kind:"win",winner:w?w.name:"Ninguém",gain,last:isLastRound()};return true}
  return false;
}
function isLastRound(){return G.maxRounds>0&&G.round>=G.maxRounds}
/* nome repetido ganha número ("João 2"), pra ninguém ficar em dúvida de quem é a vez */
const MAX_PLAYERS=16;
function uniqueName(n,names){const low=names.map(x=>x.toLowerCase());if(!low.includes(n.toLowerCase()))return n;let k=2;while(low.includes((n+" "+k).toLowerCase()))k++;return n+" "+k}
function isHostish(from){return MODE==="local"||from===ME}
/* dá pra refazer a rodada desde o Valendo até alguém tocar "Próxima rodada" */
function canRedo(){return !!G.roundSnap&&(G.state==="run"||G.state==="pause"||(G.state==="ov"&&!!G.ov&&["drink","reset","win"].includes(G.ov.kind)))}

function act(from,a){
  if(!G)return;
  const curP=G.pl[G.cur];
  switch(a.t){
    case "start": if(G.state==="idle"&&isHostish(from)&&!G.ov&&onlineAlive()>=2){if(!curOk())G.cur=nextAliveFrom(G.cur);
      /* foto do placar no Valendo: "Refazer rodada" volta exatamente pra cá */
      G.roundSnap={pl:G.pl.map(p=>({id:p.id,drinks:p.drinks,wins:p.wins,pts:p.pts,alive:p.alive,lost:p.lost})),cur:G.cur,dur:G.dur,outs:G.outs};G.lastOut=null;
      G.state="run";resetTimer()} break;
    case "redo":{
      /* volta pro antes do Valendo: letras, quem saiu, pontos e goles da rodada. Tema e quem começa ficam; a rodada não conta de novo */
      const s=G.roundSnap;if(!isHostish(from)||!canRedo())break;
      G.pl.forEach(p=>{const o=s.pl.find(x=>x.id===p.id);
        if(o){p.drinks=o.drinks;p.wins=o.wins;p.pts=o.pts;p.lost=o.lost;p.alive=o.alive&&!p.bench}
        else{p.alive=p.on!==false&&!p.bench;p.lost=false}});
      G.cur=s.cur;G.dur=s.dur;G.outs=s.outs;G.used=[];G.hist=[];G.ov=null;G.state="idle";G.end=0;G.roundSnap=null;G.lastOut=null;G.seq++;
      if(!curOk())G.cur=nextAliveFrom(G.cur);
      break}
    case "spare":{
      /* "Não valeu": quem acabou de estourar o tempo volta pra roda, sem gole nem ponto, e joga de novo com o tempo cheio */
      const L=G.lastOut;
      if(!isHostish(from)||!L||G.state!=="ov"||!G.ov||!(G.ov.kind==="drink"||(G.ov.kind==="win"&&G.ov.loser)))break;
      const p=G.pl[L.i];if(!p)break;
      p.drinks--;p.pts-=L.gain;p.alive=!p.bench;p.lost=false;G.outs--;
      if(L.w!=null&&G.pl[L.w]){G.pl[L.w].wins--;G.pl[L.w].pts-=L.wg}
      G.cur=L.i;if(!curOk())G.cur=nextAliveFrom(G.cur);
      G.ov=null;G.lastOut=null;G.state="run";resetTimer();G.seq++;break}
    case "bench":{
      /* tirar da roda: a vez da pessoa é pulada até pôr de volta; não bebe nem perde ponto */
      const i=G.pl.findIndex(p=>p.id===a.id),p=G.pl[i];
      if(!isHostish(from)||!p||G.state==="over")break;
      if(a.on){
        if(p.bench)break;
        const was=p.alive;p.bench=true;p.alive=false;
        if(was&&(G.state==="run"||G.state==="pause")){
          if(!endIfLastStanding()&&i===G.cur){G.cur=nextAliveFrom(G.cur);if(G.state==="run")resetTimer();else G.pausedLeft=G.dur*1000}
        }else if(i===G.cur)G.cur=nextAliveFrom(G.cur);
      }else{
        if(!p.bench)break;
        p.bench=false;p.alive=p.on!==false&&!p.lost&&joinable();
      }
      G.seq++;break}
    case "tap":
      if(G.state!=="run"||G.used.includes(a.l)||!G.letters.includes(a.l))break;
      if(MODE!=="local"&&(!curP||from!==curP.id))break;
      G.used.push(a.l);G.hist.push({l:a.l,who:G.cur,at:performance.now(),left:Math.max(1500,G.end-performance.now())});G.seq++;
      if(G.used.length===G.letters.length){G.state="ov";G.dur=Math.max(4,G.dur-2);G.ov={kind:"reset",dur:G.dur};break}
      G.cur=nextAliveFrom(G.cur);resetTimer();break;
    case "heckle":{
      /* quem já saiu da rodada pode apressar quem está na vez */
      if(MODE==="local"||G.state!=="run")break;
      const p=G.pl.find(x=>x.id===from),cur=G.pl[G.cur];
      if(!p||p.alive||!cur||cur.id===from||!HECKLES[a.k])break;
      const now=Date.now();if(p.hkAt&&now-p.hkAt<2500)break;p.hkAt=now;
      G.hk={k:a.k,by:p.name,to:cur.id,n:(G.hk?G.hk.n:0)+1};break}
    case "oops":{
      /* the player who just tapped can take it back for a moment and gets back the time they had */
      const h=G.hist[G.hist.length-1];
      if(!h||h.l!==a.l||G.state!=="run"||performance.now()-h.at>OOPS_MS+800)break;
      const p=G.pl[h.who];if(!p||!p.alive)break;
      if(MODE!=="local"&&from!==p.id)break;
      G.hist.pop();G.used=G.used.filter(x=>x!==h.l);G.cur=h.who;G.end=performance.now()+h.left;G.seq++;break}
    case "undo":{
      if(!isHostish(from)||(G.state!=="run"&&G.state!=="pause"))break;
      const h=G.hist.pop();if(!h)break;G.used=G.used.filter(x=>x!==h.l);
      if(G.pl[h.who]&&G.pl[h.who].alive)G.cur=h.who;
      if(G.state==="run")resetTimer();else G.pausedLeft=G.dur*1000;break}
    case "pause": if(isHostish(from)&&G.state==="run"){G.pausedLeft=G.end-performance.now();G.state="pause"} break;
    case "resume": if(isHostish(from)&&G.state==="pause"&&onlineAlive()>=2){if(!curOk()){G.cur=nextAliveFrom(G.cur);G.pausedLeft=G.dur*1000}G.end=performance.now()+G.pausedLeft;G.state="run"} break;
    case "newcat": if(isHostish(from)&&G.state==="idle")pickCat(); break;
    case "setcat":{
      const c=String(a.cat||"").trim().slice(0,40);
      if(!c||!isHostish(from)||G.state!=="idle"||G.ov)break;
      G.cat=c;G.lastCat=c;G.catBy="typed";if(!CATS.includes(c)&&!G.custom.includes(c))G.custom.push(c);break}
    case "addlocal":{
      const n=uniqueName(String(a.name||"").trim().slice(0,16),G.pl.map(p=>p.name));
      if(MODE!=="local"||!n||G.pl.length>=MAX_PLAYERS)break;
      G.pl.push({id:"p"+Date.now(),name:n,drinks:0,wins:0,pts:0,alive:joinable(),on:true,lost:false});break}
    case "finish":{
      /* Encerrar partida: vai direto pro ranking final (o único jeito de terminar o modo Livre).
         Uma rodada que ainda não teve Valendo não conta. */
      if(!isHostish(from)||G.state==="over")break;
      const played=G.state==="idle"?G.round-1:G.round;if(played<1)break;
      G.round=played;G.state="over";G.ov={kind:"final"};G.roundSnap=null;G.lastOut=null;G.seq++;break}
    case "rematch":{
      if(!isHostish(from)||G.state!=="over")break;
      G.pl=G.pl.filter(p=>p.on);G.pl.forEach(p=>{p.wins=0;p.drinks=0;p.pts=0});G.round=0;G.maxRounds=S.rounds;G.starter=-1;
      /* "Nova partida" usa o que estiver escolhido agora (tempo, rodadas, molecagem, Q/X/Z) */
      G.letters=BASE.concat(S.hard?HARD:[]);G.molec=S.molec;G.seq++;newRound();break}
    case "continue":{
      if(G.state!=="ov"&&!(G.ov&&G.ov.kind==="few"))break;
      const k=G.ov&&G.ov.kind;G.lastOut=null;
      if(k==="drink"){G.ov=null;G.cur=nextAliveFrom(G.cur);G.state="run";resetTimer()}
      else if(k==="reset"){G.ov=null;G.used=[];G.hist=[];G.cur=nextAliveFrom(G.cur);G.state="run";resetTimer()}
      else if(k==="win"&&isLastRound()){G.state="over";G.ov={kind:"final"};G.roundSnap=null;G.seq++}
      else if(k==="win"||k==="few"){newRound()}
      break}
  }
  sync();
}
function timeout(){
  const p=G.pl[G.cur],gain=G.outs?G.outs:-1;G.lastOut={i:G.cur,gain};p.drinks++;p.pts+=gain;G.outs++;p.alive=false;p.lost=true;G.state="ov";
  const place=G.outs-1;
  if(!endIfLastStanding()){G.ov={kind:"drink",name:p.name,gain,place,next:G.pl[nextAliveFrom(G.cur)].name}}
  else{G.ov.loser=p.name;G.ov.loserGain=gain;G.ov.loserPlace=place;const wi=G.pl.findIndex(x=>x.alive);if(wi>=0){G.lastOut.w=wi;G.lastOut.wg=G.ov.gain}}
  G.seq++;sync();
}

/* ---------- sync ---------- */
function snapshot(){
  const left=G.state==="run"?Math.max(0,G.end-performance.now()):G.state==="pause"?G.pausedLeft:null;
  return {t:"state",pl:G.pl,round:G.round,maxRounds:G.maxRounds,letters:G.letters,cat:G.cat,catBy:G.catBy,hk:G.hk||null,hostAway:!!G.hostAway,state:G.state,used:G.used,cur:G.cur,dur:G.dur,ov:G.ov,left,canUndo:G.hist.length>0,canRedo:canRedo(),canSpare:!!G.lastOut&&G.state==="ov",seq:G.seq,full:fullCopy()};
}
/* a copy of the whole game (without device clocks) so a guest can take over the table */
function fullCopy(){const c=JSON.parse(JSON.stringify(G));if(G.state==="run"){c.state="pause";c.pausedLeft=Math.max(1500,G.end-performance.now())}c.end=0;(c.hist||[]).forEach(h=>{h.at=0});return c}
function sync(){
  const snap=snapshot();
  if(MODE==="host"){conns.forEach(c=>{try{c.open&&c.send(snap)}catch(e){}});saveHost()}
  applyView(snap);
}
function dispatch(a){
  if(MODE==="guest"){try{hostConn&&hostConn.open&&hostConn.send(a)}catch(e){}}
  else act(ME,a);
}

