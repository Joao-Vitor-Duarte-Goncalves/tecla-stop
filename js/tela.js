/* ---------- view ---------- */
let lastOvKey=null, lastLetters="", wasMyTurn=false, lastBeep=null;
function applyView(snap){
  const prev=V;V=snap;
  /* "Nova partida" no fim também abre a garrafa de novo */
  if(prev&&prev.state==="over"&&snap.round===1&&!introPlaying){spunRound=-1;playIntro()}
  if(snap.state==="run")V.end=performance.now()+snap.left;
  if(snap.state==="pause")V.pausedLeft=snap.left;
  show("game");
  render(prev);
}
function buildKeys(letters){
  const key=letters.join("");if(key===lastLetters)return;lastLetters=key;
  $("board").querySelectorAll(".key").forEach(k=>k.remove());
  const n=letters.length,rad=40.5,size=Math.min(15.5,2*Math.PI*rad/n*.96);
  letters.forEach((l,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,b=document.createElement("button");
    b.className="key cap";b.textContent=l;b.dataset.l=l;b.setAttribute("aria-label","Letra "+l);
    b.style.left=(50+rad*Math.cos(a))+"%";b.style.top=(50+rad*Math.sin(a))+"%";b.style.width=b.style.height=size+"%";
    $("ring").appendChild(b)});
}
/* ---------- tapping the table: the whole wedge around each cap counts, so a near miss still picks the letter you aimed at ---------- */
const OOPS_MS=2200;
const HECKLES={tic:"TIC-TAC!",bebe:"VAI BEBER!",ri:"HAHAHA"};
let lastHk=-1;
function showHeckle(h){
  const el=document.createElement("div");el.className="hkpop";el.innerHTML=`<b>${HECKLES[h.k]}</b><span>${esc(h.by)}</span>`;
  $("board").appendChild(el);setTimeout(()=>el.remove(),1700);
  if(h.to===ME){try{navigator.vibrate&&navigator.vibrate([70,50,70])}catch(e){};beep(1200,.06,"square",.06);setTimeout(()=>beep(900,.06,"square",.06),110);
    try{$("board").animate([{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(6px)"},{transform:"translateX(0)"}],{duration:260})}catch(e){}}
}
document.addEventListener("click",e=>{const b=e.target.closest("#heckles button");if(!b)return;dispatch({t:"heckle",k:b.dataset.k});b.disabled=true;setTimeout(()=>b.disabled=false,2500)});let oopsTimer=null;
function letterAt(cx,cy){
  const r=$("board").getBoundingClientRect(),x=cx-(r.left+r.width/2),y=cy-(r.top+r.height/2),d=Math.hypot(x,y)/(r.width/2);
  if(d<.5||d>1.06||!V)return null;
  const n=V.letters.length;let ang=Math.atan2(y,x)+Math.PI/2;ang=(ang+2*Math.PI)%(2*Math.PI);
  return V.letters[Math.round(ang/(2*Math.PI/n))%n];
}
function pressLetter(l){
  if(!l||!myTurn()||V.used.includes(l))return;
  beep(520,.06,"triangle",.06);try{navigator.vibrate&&navigator.vibrate(18)}catch(e){}
  const k=$("ring").querySelector(`.key[data-l="${l}"]`);if(k){k.classList.add("hit");setTimeout(()=>k.classList.remove("hit"),220)}
  dispatch({t:"tap",l});showOops(l);
}
function showOops(l){
  clearTimeout(oopsTimer);let n=$("tapnote");if(n)n.remove();
  n=document.createElement("div");n.id="tapnote";n.className="tapnote";n.innerHTML=`<span>Tocou <b>${l}</b></span><button type="button">Errei a letra</button>`;
  $("board").appendChild(n);
  n.querySelector("button").onclick=e=>{e.stopPropagation();dispatch({t:"oops",l});n.remove();clearTimeout(oopsTimer)};
  oopsTimer=setTimeout(()=>n.remove(),OOPS_MS);
}
$("board").addEventListener("click",e=>{
  if(e.target.closest(".hubbtn,.tapnote,#hubgo"))return;
  const k=e.target.closest(".key");
  if(k&&e.detail===0){pressLetter(k.dataset.l);return}   /* keyboard */
  pressLetter(letterAt(e.clientX,e.clientY));
});

/* round intro: the table spins and the comanda flips through themes, then lands on the real one */
let spinning=false,spunRound=-1,shownCat=null,spinTimer=null,justSpun=false;
function maybeSpin(){
  if(!V||introPlaying)return;
  if(V.state!=="idle"||V.ov){if(!spinning&&shownCat!==V.cat){setCat(V.cat);shownCat=V.cat}return}
  if(spinning)return;
  if(V.round!==spunRound){spunRound=V.round;spin(V.round===1?"full":"round")}
  else if(V.cat!==shownCat){if(V.catBy==="typed"){setCat(V.cat);shownCat=V.cat;popCat()}else spin(false)}
}
/* the comanda never changes size: long themes shrink their font until they fit in two lines */
function setCat(t){const el=$("catTxt"),box=$("reel");el.textContent=t;let f=1.55;el.style.fontSize=f+"rem";while(el.offsetHeight>box.clientHeight&&f>.95){f-=.1;el.style.fontSize=f.toFixed(2)+"rem"}}
function popCat(){const c=$("catTxt");c.classList.remove("pop");void c.offsetWidth;c.classList.add("pop")}
function spin(mode){
  /* full = 1ª rodada (mesa inclina e dá 3 voltas), round = rodadas seguintes (1 volta rápida), false = só troca de tema */
  const full=mode==="full",quick=mode==="round";
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){setCat(V.cat);shownCat=V.cat;return}
  spinning=true;$("reel").classList.add("spinning");$("catTxt").style.fontSize="";
  const pool=CATS.concat(MOLEC),total=full?2400:quick?1100:900;
  if(full){try{
    /* the table tips toward the camera, spins three turns and settles back */
    const D=total+200;
    $("tilt").animate([{transform:"rotateX(0deg)"},{transform:"rotateX(58deg) translateY(3%) scale(.94)",offset:.2},{transform:"rotateX(58deg) translateY(3%) scale(.94)",offset:.72},{transform:"rotateX(0deg)"}],{duration:D,easing:"ease-in-out"});
    $("spinner").animate([{transform:"rotateZ(-1080deg)"},{transform:"rotateZ(0deg)"}],{duration:D,easing:"cubic-bezier(.2,.55,.12,1)"});
    $("floor").animate([{transform:"scale(1)",opacity:1},{transform:"scale(.8,1.25)",opacity:.7,offset:.2},{transform:"scale(.8,1.25)",opacity:.7,offset:.72},{transform:"scale(1)",opacity:1}],{duration:D,easing:"ease-in-out"});
  }catch(e){}}
  if(quick){try{$("spinner").animate([{transform:"rotateZ(-360deg)"},{transform:"rotateZ(0deg)"}],{duration:total+100,easing:"cubic-bezier(.25,.6,.2,1)"})}catch(e){}}
  let t=0,step=quick?38:45;
  const tick=()=>{
    if(!V||!spinning){spinning=false;return}
    if(t>=total-80){
      spinning=false;justSpun=true;$("reel").classList.remove("spinning");
      setCat(V.cat);shownCat=V.cat;popCat();beep(740,.14,"triangle",.07);render();return;
    }
    $("catTxt").textContent=pool[Math.floor(Math.random()*pool.length)];
    beep(260+Math.random()*180,.025,"square",.025);
    t+=step;step=Math.min(step*1.14,360);spinTimer=setTimeout(tick,step);
  };
  render();tick();
}
function myTurn(){return V&&V.state==="run"&&(MODE==="local"||(V.pl[V.cur]&&V.pl[V.cur].id===ME))}
function render(prev){
  if(!V)return;
  buildKeys(V.letters);
  const hostish=MODE!=="guest", mine=myTurn(), curP=V.pl[V.cur];
  $("board").querySelectorAll(".key").forEach(k=>{const u=V.used.includes(k.dataset.l);k.classList.toggle("used",u);k.disabled=u||!mine});
  $("roundLbl").textContent="Rodada "+V.round+(V.maxRounds?"/"+V.maxRounds:"");
  $("pips").innerHTML=V.maxRounds&&V.maxRounds<=10?Array.from({length:V.maxRounds},(_,i)=>`<span class="pip ${i+1<V.round?"done":i+1===V.round?"now":""}"></span>`).join(""):"";
  const hi=$("hubin");$("hub").classList.remove("danger");
  if(V.state==="idle"){
    $("prog").setAttribute("stroke-dashoffset",0);
    if((spinning||introPlaying)&&!V.ov)hi.innerHTML=`<span class="wait">Sorteando…</span>`;
    else if(hostish&&!V.ov){hi.innerHTML=`<button class="hubbtn" id="hubgo">Valendo</button>`;$("hubgo").onclick=()=>{unlockAudio();dispatch({t:"start"})};if(justSpun){$("hubgo").classList.add("pop");justSpun=false}}
    else hi.innerHTML=`<span class="wait">Esperando quem abriu a mesa dar o valendo</span>`;
  }else if(V.state==="pause"){
    const online=V.pl.filter(p=>p.alive&&p.on!==false).length;
    if(hostish&&online<2)hi.innerHTML=`<span class="wait">Pausado: esperando a galera reconectar</span>`;
    else if(hostish){hi.innerHTML=`<button class="hubbtn" id="hubgo">Voltar</button>`;$("hubgo").onclick=()=>dispatch({t:"resume"})}
    else hi.innerHTML=`<span class="wait">${V.hostAway?"Quem abriu a mesa saiu do jogo. Esperando voltar":"Pausado"}</span>`;
  }else{
    hi.innerHTML=`<span class="secs" id="secs">${V.state==="run"?Math.ceil(Math.max(0,V.end-performance.now())/1000):0}</span><span class="who${mine&&MODE!=="local"?" mine":""}">${mine&&MODE!=="local"?"Sua vez!":curP?esc(curP.name):""}</span>`;
  }
  if(mine&&!wasMyTurn&&MODE!=="local"){try{navigator.vibrate&&navigator.vibrate(120)}catch(e){};beep(980,.08,"sine",.07)}
  wasMyTurn=mine;
  const tapNames=hostish&&V.state!=="over";
  $("plist").innerHTML=V.pl.map((p,i)=>{
    const cls=`pl ${i===V.cur&&V.state!=="ov"&&V.state!=="idle"?"cur":""} ${p.bench?"bench":p.on===false?"off":p.alive?"":"out"}`;
    const inner=`<span class="nm">${esc(p.name)}${p.id===ME&&MODE!=="local"?" (você)":""}${p.bench?" (fora)":p.on===false?" (caiu)":""}</span>`;
    return tapNames?`<button type="button" class="${cls}" data-id="${esc(p.id)}" aria-label="${esc(p.name)}: opções">${inner}</button>`:`<span class="${cls}">${inner}</span>`}).join("");
  $("redo").hidden=!hostish||!V.canRedo;
  const lk=isLocked();$("rkBtn").textContent=lk?"🔒 Placar":"Placar";$("rkBtn").classList.toggle("locked",lk);
  renderSheet();
  $("undo").hidden=!hostish;$("pause").hidden=!hostish;
  const meP=V.pl.find(p=>p.id===ME);$("heckles").hidden=!(MODE!=="local"&&V.state==="run"&&meP&&!meP.alive&&meP.on!==false);
  {const n=V.hk?V.hk.n:0;if(lastHk<0)lastHk=n;else if(n!==lastHk){lastHk=n;if(V.hk)showHeckle(V.hk)}}
  $("game").classList.toggle("hk",!$("heckles").hidden);$("newCat").hidden=!hostish;$("catSpacer").hidden=hostish;
  $("pause").textContent=V.state==="pause"?"Retomar":"Pausar";
  $("undo").disabled=!V.canUndo||(V.state!=="run"&&V.state!=="pause");
  $("newCat").disabled=V.state!=="idle";
  $("addOpen").hidden=MODE!=="local";
  $("roomTag").hidden=MODE==="local"||!roomCode;$("roomTagCode").textContent=roomCode;$("comandaLeft").hidden=!$("roomTag").hidden;
  const canEdit=hostish&&V.state==="idle"&&!V.ov&&!spinning;$("catOpen").hidden=!canEdit;$("comandaRight").hidden=canEdit;
  maybeSpin();
  renderOverlay();
}
function quitBtn(){return `<button class="btn ghost small" id="ovquit">${MODE==="host"?"Fechar a mesa":"Sair da partida"}</button>`}
/* ações que não têm volta pedem um segundo toque em até 3 s (sair fecha a partida de todo mundo; refazer apaga a rodada) */
function armConfirm(b,label,armedLabel,onConfirm){
  let armed=false,t=null;
  b.onclick=()=>{
    if(armed){clearTimeout(t);armed=false;b.classList.remove("armed");b.textContent=label();onConfirm();return}
    armed=true;b.classList.add("armed");b.textContent=armedLabel();
    t=setTimeout(()=>{armed=false;b.classList.remove("armed");if(b.isConnected)b.textContent=label()},3000);
  };
}
function wireQuit(){
  const b=$("ovquit");if(!b)return;
  armConfirm(b,()=>MODE==="host"?"Fechar a mesa":"Sair da partida",()=>"Toque de novo pra confirmar",()=>leave());
}
armConfirm($("gameQuit"),()=>"Sair",()=>MODE==="host"?"Fechar a mesa?":"Sair mesmo?",()=>leave());
armConfirm($("redo"),()=>"Refazer rodada",()=>"Apaga a rodada?",()=>dispatch({t:"redo"}));

/* tocar no nome (quem abriu a mesa): tirar da roda ou pôr de volta */
function openPlayer(id){
  const p=V&&V.pl.find(x=>x.id===id);if(!p)return;
  const nm=esc(p.name);
  $("plbox").innerHTML=p.bench
    ?`<div class="big win mid">${nm}</div><p>Está fora da roda. Pondo de volta, entra já na rodada que estiver rolando.</p><button class="btn" id="plgo" type="button">Pôr de volta na roda</button>`
    :`<div class="big win mid">${nm}</div><p>A vez de ${nm} é pulada até você pôr de volta. Não bebe nem perde ponto.</p><button class="btn" id="plgo" type="button">Tirar da roda</button>`;
  $("plbox").insertAdjacentHTML("beforeend",`<button class="btn ghost small" id="plcancel" type="button">Cancelar</button>`);
  $("plov").hidden=false;
  $("plgo").onclick=()=>{$("plov").hidden=true;dispatch({t:"bench",id,on:!p.bench})};
  $("plcancel").onclick=()=>{$("plov").hidden=true};
}
$("plov").onclick=e=>{if(e.target===$("plov"))$("plov").hidden=true};
$("plist").addEventListener("click",e=>{const b=e.target.closest("button.pl");if(b)openPlayer(b.dataset.id)});
function renderOverlay(){
  const o=V.ov;
  if(!o){$("ov").hidden=true;lastOvKey=null;return}
  const key=V.seq+":"+o.kind+":"+V.round;
  if(key===lastOvKey)return;lastOvKey=key;
  let html="";
  /* quem bebe sai numa comanda: o nome escrito à mão e o carimbo de "bebe" */
  const slip=o.kind==="drink"||(o.kind==="win"&&!!o.loser);
  $("ovbox").classList.toggle("slip",slip);
  const drinker=n=>`<div class="slipname">${esc(n)}</div><div class="stamp">Bebe!</div>`;
  if(o.kind==="drink")html=`${drinker(o.name)}${isLocked()?"":outLine(o.place,o.gain)}<p>Próxima vez: <span class="name">${esc(o.next)}</span></p>`;
  else if(o.kind==="win")html=(o.loser?`${drinker(o.loser)}${isLocked()?"":outLine(o.loserPlace,o.loserGain)}`:"")+`<div class="big win mid">${esc(o.winner)} venceu a rodada</div>${isLocked()?"":`<p class="ptsline"><b>${ptsTxt(o.gain)}</b> por ficar até o fim, 1 por cada um que saiu antes</p>`}<p>Escolhe alguém pra dar um gole.</p>`;
  else if(o.kind==="reset")html=`<div class="big win">Zerou o tabuleiro</div><p>As letras voltam e o tempo cai para <span class="name">${o.dur}s</span>. Mesmo tema.</p>`;
  else if(o.kind==="few")html=`<div class="big win mid">Esperando a galera</div><p>Precisa de pelo menos 2 pessoas conectadas. A rodada começa sozinha quando alguém voltar.</p>`;
  else if(o.kind==="final")html=finalHtml();
  if(o.kind==="final"){
    const host=MODE!=="guest";
    $("ovbox").innerHTML=html+(host?`<button class="btn" id="ovgo">Nova partida</button>`:`<p>Esperando quem abriu a mesa começar outra.</p>`)+quitBtn();
    $("ov").hidden=false;wireQuit();
    if(host)$("ovgo").onclick=()=>{unlockAudio();dispatch({t:"rematch"})};
    beep(523,.15,"triangle",.08);setTimeout(()=>beep(659,.15,"triangle",.08),160);setTimeout(()=>beep(784,.3,"triangle",.08),320);
    return;
  }
  const btn=o.kind==="win"?(o.last?"Ver ranking":"Próxima rodada"):o.kind==="few"?"Tentar de novo":"Continuar";
  /* correções de quem abriu a mesa: devolver quem bebeu injustamente, ou refazer a rodada inteira */
  const host=MODE!=="guest",who=o.kind==="drink"?o.name:o.loser;
  const fix=host&&((slip&&V.canSpare)||V.canRedo)?`<div class="ovfix">${slip&&V.canSpare?`<button class="btn ghost small" id="ovspare" type="button">Não valeu: ${esc(who)} volta</button>`:""}${V.canRedo?`<button class="btn ghost small" id="ovredo" type="button">Refazer rodada</button>`:""}</div>`:"";
  $("ovbox").innerHTML=html+`<button class="btn" id="ovgo">${btn}</button>`+fix+quitBtn();
  $("ov").hidden=false;wireQuit();
  $("ovgo").onclick=()=>{unlockAudio();dispatch({t:"continue"})};
  if($("ovspare"))$("ovspare").onclick=()=>dispatch({t:"spare"});
  if($("ovredo"))armConfirm($("ovredo"),()=>"Refazer rodada",()=>"Apaga a rodada?",()=>dispatch({t:"redo"}));
  if(o.kind==="drink"||o.kind==="win"&&o.loser){beep(140,.6,"sawtooth",.12);const b=$("ovbox");b.classList.remove("shake");void b.offsetWidth;b.classList.add("shake")}
}

function ptsTxt(n){n=n||0;return (n>0?"+":n<0?"−":"")+Math.abs(n)+" ponto"+(Math.abs(n)===1?"":"s")}
/* the scoring rule shown at the moment it applies */
function outLine(place,gain){
  const pos=(place||0)+1;
  return `<p class="ptsline">${pos}º a sair: <b>${ptsTxt(gain)}</b>${pos===1?", quem sai primeiro perde 1":", 1 por cada um que saiu antes"}</p>`;
}
const RULE_LINE="Quanto mais você dura na rodada, mais ganha: +1 ponto por cada pessoa que sai antes de você. Quem sai primeiro perde 1.";
function rankList(reveal){
  const rk=V.pl.slice().sort((a,b)=>(b.pts||0)-(a.pts||0)||(b.wins||0)-(a.wins||0)||a.drinks-b.drinks||a.name.localeCompare(b.name));
  let pos=0,prevKey=null;const n=rk.length;
  const rows=rk.map((p,i)=>{const k=(p.pts||0)+":"+(p.wins||0)+":"+p.drinks;if(k!==prevKey){pos=i+1;prevKey=k}
    /* on the final reveal, rows appear from last place up to the champion */
    const st=reveal?` style="animation-delay:${(n-1-i)*0.6}s"`:"";
    return `<li class="rk${pos===1?" first":""}${reveal?" reveal":""}"${st}><span class="rkpos">${pos}º</span><span class="rkname">${esc(p.name)}${p.id===ME&&MODE!=="local"?" (você)":""}</span><span class="rkstat"><span class="rkpts">${p.pts||0} pt${Math.abs(p.pts||0)===1?"":"s"}</span>${p.drinks} gole${p.drinks===1?"":"s"}</span></li>`}).join("");
  return {rk,html:`<ol class="ranking">${rows}</ol>`,revealTime:(n-1)*0.6};
}
function finalHtml(){
  const {rk,html,revealTime}=rankList(true);
  const maxD=Math.max(...V.pl.map(p=>p.drinks));
  const sponge=maxD>0?V.pl.filter(p=>p.drinks===maxD).map(p=>p.name):[];
  const champ=rk[0],d=`style="animation-delay:${revealTime+0.5}s"`;
  return `<span class="lbl">Fim da partida, ${V.round} rodada${V.round===1?"":"s"}</span>
    ${html}
    <div class="big win mid reveal" ${d}>${esc(champ?champ.name:"")} é o campeão</div>
    ${sponge.length?`<p class="reveal" ${d}>Esponja da noite: <span class="name">${sponge.map(esc).join(", ")}</span>, com ${maxD} gole${maxD===1?"":"s"}.</p>`:""}
    <p class="note">Ordem por pontos. Empate: quem venceu mais rodadas, depois quem bebeu menos.</p>`;
}
function isLocked(){return !!(V&&V.maxRounds>0&&V.round>V.maxRounds-3&&V.state!=="over")}
function lockMsg(){return `A lousa fica coberta nas últimas 3 rodadas. O placar aparece quando acabar a rodada ${V.maxRounds}.`}
function renderSheet(){
  if($("rkov").hidden||!V)return;
  let body;
  if(isLocked())body=`<div class="lockbig" aria-hidden="true">🔒</div><div class="big win mid">Suspense</div><p>${lockMsg()}</p>`;
  else body=`<span class="lbl">Placar até a rodada ${V.round}${V.maxRounds?" de "+V.maxRounds:""}</span><p class="note">${RULE_LINE}</p>${rankList(false).html}${V.maxRounds>3?`<p class="note">Nas últimas 3 rodadas a lousa fica coberta até o fim.</p>`:""}`;
  $("rkbox").innerHTML=body+`<button class="btn" id="rkclose">Voltar pro jogo</button>`;
  $("rkclose").onclick=()=>{$("rkov").hidden=true};
}

