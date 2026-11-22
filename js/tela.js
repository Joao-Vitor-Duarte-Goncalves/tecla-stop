/* ---------- view ---------- */
let lastOvKey=null, lastLetters="", wasMyTurn=false, lastBeep=null;
function applyView(snap){
  const prev=V;V=snap;
  /* "Nova partida" no fim também abre a garrafa de novo */
  if(prev&&prev.state==="over"&&snap.round===1&&!introPlaying){spunRound=-1;playIntro(true)}
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
let lastHk=-1,lastNote=-1,wasAway=false,lastFx=null;
/* aviso curto no topo, pra todo mundo ler sem tocar em nada */
function showToast(text,ms){
  const t=$("toast");t.textContent=text;t.hidden=false;t.classList.remove("in");void t.offsetWidth;t.classList.add("in");
  clearTimeout(showToast.tm);showToast.tm=setTimeout(()=>{t.hidden=true},ms||3000);
}
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
  if(!l||offline||!myTurn()||V.used.includes(l))return;
  beep(520,.06,"triangle",.06);try{navigator.vibrate&&navigator.vibrate(18)}catch(e){}
  const k=$("ring").querySelector(`.key[data-l="${l}"]`);if(k){k.classList.add("hit");setTimeout(()=>k.classList.remove("hit"),220)}
  dispatch({t:"tap",l});showOops(l);
}
function showOops(l){
  clearTimeout(oopsTimer);let n=$("tapnote");if(n)n.remove();
  n=document.createElement("div");n.id="tapnote";n.className="tapnote";n.setAttribute("role","status");n.setAttribute("aria-live","polite");
  /* a barrinha encolhe no tempo que dá pra corrigir */
  n.innerHTML=`<span>Tocou <b>${l}</b></span><button type="button">Errei a letra</button><i class="oopsbar" style="animation-duration:${OOPS_MS}ms" aria-hidden="true"></i>`;
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
  /* full = 1ª rodada (continua o giro da tampa que acabou de cair: 2 voltas freando e um quique), round = rodadas seguintes (1 volta rápida), false = só troca de tema */
  const full=mode==="full",quick=mode==="round";
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){setCat(V.cat);shownCat=V.cat;return}
  spinning=true;$("reel").classList.add("spinning");$("catTxt").style.fontSize="";
  const pool=CATS.concat(MOLEC),total=full?1500:quick?1100:900;
  if(full){try{
    /* a mesa recebe a tampa: quica de leve no pouso e freia as 2 últimas voltas */
    const D=total+100;
    $("tilt").animate([{transform:"rotateX(16deg) scale(1.03)"},{transform:"rotateX(-5deg) scale(.99)",offset:.18},{transform:"rotateX(2deg)",offset:.36},{transform:"rotateX(0deg)"}],{duration:900,easing:"ease-out"});
    $("spinner").animate([{transform:"rotateZ(-720deg)"},{transform:"rotateZ(0deg)"}],{duration:D,easing:"cubic-bezier(.15,.6,.25,1)"});
    $("floor").animate([{transform:"scale(1.15)",opacity:.5},{transform:"scale(1)",opacity:1}],{duration:500,easing:"ease-out"});
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
/* som liga e desliga dentro do jogo; é a mesma preferência da caixinha da home */
const SND_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const SND_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>';
function renderSnd(){const b=$("sndBtn");b.innerHTML=S.sound?SND_ON:SND_OFF;b.setAttribute("aria-pressed",S.sound?"true":"false");b.classList.toggle("off",!S.sound)}
$("sndBtn").onclick=()=>{S.sound=!S.sound;save();$("sound").checked=S.sound;if(S.sound){unlockAudio();beep(660,.08,"triangle",.06)}renderSnd()};
renderSnd();
/* um celular só, deitado no meio da roda: o centro da mesa gira pra quem está na vez.
   Lugar i de n fica a i·360/n graus, no sentido horário a partir da base do celular; sempre gira pelo caminho mais curto */
let faceAng=0;
function faceHub(){
  const on=MODE==="local"&&S.face!==false&&V&&V.pl.length>1&&V.state!=="over";
  const target=on?V.cur*360/V.pl.length:0,d=((target-faceAng)%360+540)%360-180;
  faceAng+=d;$("hubin").style.transform=faceAng%360?`rotate(${faceAng}deg)`:"";
}
function nextUp(){const n=V.pl.length;for(let k=1;k<n;k++){const p=V.pl[(V.cur+k)%n];if(p.alive&&p.on!==false)return p}return null}
function myTurn(){return V&&V.state==="run"&&(MODE==="local"||(V.pl[V.cur]&&V.pl[V.cur].id===ME))}
function render(prev){
  if(!V)return;
  trackBase();
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
    else if(V.hostAway)hi.innerHTML=`<span class="wait">${esc(V.host||"Quem abriu a mesa")} saiu do jogo. Esperando voltar</span>`;
    else{const st=curP,me=st&&st.id===ME;
      hi.innerHTML=st&&!V.ov?`<span class="wait">${me?`<b class="who">Você começa</b>`:`<b class="who">${esc(st.name)}</b> começa.`} Esperando o valendo</span>`:`<span class="wait">Esperando quem abriu a mesa dar o valendo</span>`}
  }else if(V.state==="pause"){
    const online=V.pl.filter(p=>p.alive&&p.on!==false).length;
    if(hostish&&online<2)hi.innerHTML=`<span class="wait">Pausado: esperando a galera reconectar</span>`;
    else if(hostish){hi.innerHTML=`<button class="hubbtn small" id="hubgo">Continuar a rodada</button>`;$("hubgo").onclick=()=>dispatch({t:"resume"})}
    else{const h=esc(V.host||"quem abriu a mesa");hi.innerHTML=`<span class="wait">${V.hostAway?`${h} saiu do jogo. Esperando voltar`:`Pausado. Esperando ${h} continuar`}</span>`}
  }else{
    /* quem vem depois aparece pequeno, pra já ir pensando na palavra */
    const nx=V.state==="run"?nextUp():null;
    hi.innerHTML=`<span class="secs" id="secs">${V.state==="run"?Math.min(V.dur,Math.ceil(Math.max(0,V.end-performance.now())/1000)):0}</span><span class="who${mine&&MODE!=="local"?" mine":""}">${mine&&MODE!=="local"?"Sua vez!":curP?esc(curP.name):""}</span>${nx?`<span class="nextup">depois: ${nx.id===ME&&MODE!=="local"?"você":esc(nx.name)}</span>`:""}`;
  }
  faceHub();
  if(mine&&!wasMyTurn&&MODE!=="local"){try{navigator.vibrate&&navigator.vibrate(120)}catch(e){};beep(980,.08,"sine",.07)}
  wasMyTurn=mine;
  const tapNames=hostish&&V.state!=="over";
  $("plist").innerHTML=V.pl.map((p,i)=>{
    /* antes do Valendo, quem começa já fica marcado */
    const starts=V.state==="idle"&&!V.ov&&i===V.cur&&p.alive;
    const cls=`pl ${i===V.cur&&V.state!=="ov"&&V.state!=="idle"?"cur":""}${starts?" starts":""} ${p.bench?"bench":p.on===false?"off":p.alive?"":"out"}`;
    const inner=`<span class="nm">${esc(p.name)}${p.id===ME&&MODE!=="local"?" (você)":""}${p.bench?" (fora)":p.on===false?" (caiu)":""}</span>${starts?"<b>começa</b>":""}`;
    return tapNames?`<button type="button" class="${cls}" data-id="${esc(p.id)}" aria-label="${esc(p.name)}: opções">${inner}</button>`:`<span class="${cls}">${inner}</span>`}).join("");
  $("redo").hidden=!hostish||!V.canRedo;
  const lk=isLocked();$("rkBtn").textContent=lk?"🔒 Placar":"Placar";$("rkBtn").classList.toggle("locked",lk);
  renderSheet();
  $("undo").hidden=!hostish;$("pause").hidden=!hostish;
  const meP=V.pl.find(p=>p.id===ME);$("heckles").hidden=!(MODE!=="local"&&V.heckle!==false&&V.state==="run"&&meP&&!meP.alive&&meP.on!==false);
  {const n=V.hk?V.hk.n:0;if(lastHk<0)lastHk=n;else if(n!==lastHk){lastHk=n;if(V.hk)showHeckle(V.hk)}}
  /* avisos do juiz pra todo mundo (ex.: alguém caiu na própria vez) */
  {const n=V.note?V.note.n:0;if(lastNote<0)lastNote=n;else if(n!==lastNote){lastNote=n;if(V.note)showToast(V.note.text)}}
  /* quem abriu a mesa saiu do app: avisa uma vez, em qualquer tela */
  if(MODE==="guest"&&V.hostAway&&!wasAway)showToast(`${V.host||"Quem abriu a mesa"} saiu do jogo. A partida espera voltar.`,5000);
  wasAway=MODE==="guest"&&!!V.hostAway;
  $("game").classList.toggle("hk",!$("heckles").hidden);$("newCat").hidden=!hostish;renderSnd();
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
/* a janela é anunciada como aviso e o foco vai pro botão principal (no fim da partida, pra própria lousa) */
function focusOv(){
  const b=$("ovbox"),t=b.querySelector(".slipname,.big"),go=$("ovgo");
  b.setAttribute("aria-label",t?t.textContent+(b.querySelector(".stamp")?" bebe":""):"Aviso");
  try{(V&&V.ov&&V.ov.kind!=="final"&&go?go:b).focus({preventScroll:true})}catch(e){}
}
/* o painel de configurações pode estar dentro da caixa do fim da partida: tira de lá antes de redesenhar a caixa */
function parkSettings(){const s=$("settings");if(s&&$("ovbox").contains(s)){s.hidden=true;document.body.appendChild(s)}}
function renderOverlay(){
  const o=V.ov;
  if(!o){$("ov").hidden=true;lastOvKey=null;parkSettings();stopReveal();return}
  const key=V.seq+":"+o.kind+":"+V.round;
  if(key===lastOvKey)return;lastOvKey=key;parkSettings();stopReveal();
  let html="";
  /* quem bebe sai numa comanda: o nome escrito à mão e o carimbo de "bebe" */
  const slip=o.kind==="drink"||o.kind==="win";
  $("ovbox").classList.toggle("slip",slip);$("ovbox").classList.toggle("lousa",o.kind==="final");
  /* no celular de quem bebeu, o nome vira "Você" e o celular vibra forte */
  const meDrinks=MODE!=="local"&&((o.kind==="drink"&&o.id===ME)||(o.kind==="win"&&o.loserId===ME));
  const drinker=n=>`<div class="slipname">${meDrinks?"Você":esc(n)}</div><div class="stamp">Bebe!</div>`;
  if(o.kind==="drink")html=`${drinker(o.name)}${isLocked()?"":outLine(o.place,o.gain)}<p>Próxima vez: <span class="name">${esc(o.next)}</span></p>`;
  else if(o.kind==="win"){
    /* fim da rodada na comanda: quem bebeu por último em cima, quem venceu escrito à mão embaixo, e a escolha do gole */
    const meWins=MODE!=="local"&&o.winnerId===ME,canGive=MODE==="local"||MODE==="host"||meWins,W=esc(o.winner);
    let give;
    if(o.given)give=`<p class="given">${o.given.id?`${meWins?"Você deu":W+" deu"} o gole pra <span class="name">${o.given.id===ME&&MODE!=="local"?"você":esc(o.given.name)}</span>.`:"Ninguém leva o gole dessa vez."}</p>`;
    else if(canGive)give=`<div class="give"><span class="lbl">${meWins?"Quem leva o gole?":W+", quem leva o gole?"}</span><div class="chips" id="giveList">${V.pl.filter(p=>p.id!==o.winnerId).map(p=>`<button type="button" class="chip" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join("")}<button type="button" class="chip none" data-id="">Ninguém</button></div></div>`;
    else give=`<p>${W} escolhe quem leva o gole.</p>`;
    html=(o.loser?`${drinker(o.loser)}${isLocked()?"":outLine(o.loserPlace,o.loserGain)}`:"")
      +`<div class="winline${o.loser?"":" solo"}">${meWins?"Você venceu a rodada!":W+" venceu a rodada"}</div>${isLocked()?"":`<p class="ptsline"><b>${ptsTxt(o.gain)}</b> por ficar até o fim, 1 por cada um que saiu antes</p>`}${give}`;
  }
  else if(o.kind==="reset")html=`<div class="big win">Zerou o tabuleiro</div><p>As letras voltam e o tempo cai para <span class="name">${o.dur}s</span>. Mesmo tema.</p>${o.next?`<p>Próxima vez: <span class="name">${esc(o.next)}</span></p>`:""}`;
  else if(o.kind==="few")html=`<div class="big win mid">Esperando a galera</div><p>Precisa de pelo menos 2 pessoas conectadas. A rodada começa sozinha quando alguém voltar.</p>`;
  if(o.kind==="final"){
    const host=MODE!=="guest";
    /* quem abriu a mesa pode mudar tempo, rodadas e temas antes da próxima, sem sair */
    const opts=host?`<details class="ovset"><summary>Mudar tempo, rodadas e temas</summary><div id="ovSettings"></div></details>`:"";
    const acts=opts+(host?`<button class="btn" id="ovgo">Nova partida</button>`:`<p>Esperando quem abriu a mesa começar outra.</p>`)+`<button class="btn ghost small" id="ovshare" type="button">Compartilhar resultado</button>`+quitBtn();
    $("ovbox").innerHTML=finalHtml(acts);
    if(host)mountSettings("ovSettings");
    $("ov").hidden=false;wireQuit();
    if(host)$("ovgo").onclick=()=>{unlockAudio();dispatch({t:"rematch"})};
    $("ovshare").onclick=()=>shareResult($("ovshare"));
    startReveal(V.pl.length);focusOv();
    return;
  }
  const host=MODE!=="guest",who=o.kind==="drink"?o.name:o.loser;
  /* bebe e zerou começam o tempo de quem vem depois: no online só essa pessoa (ou o juiz) vê o botão */
  const starts=o.kind==="drink"||o.kind==="reset",imNext=MODE!=="local"&&o.nextId===ME;
  const imWinner=MODE!=="local"&&o.kind==="win"&&o.winnerId===ME;
  const canGo=o.kind==="win"?(MODE==="local"||host||imWinner):(!starts||MODE==="local"||host||imNext);
  const btn=o.kind==="win"?(o.last?"Ver ranking":"Próxima rodada"):o.kind==="few"?"Tentar de novo":imNext?"Tô pronto, valendo":starts&&o.next?`Valendo pra ${o.next}`:"Continuar";
  /* correções de quem abriu a mesa: devolver quem bebeu injustamente, ou refazer a rodada inteira */
  const fix=host&&((slip&&V.canSpare)||V.canRedo)?`<div class="ovfix">${slip&&V.canSpare?`<button class="btn ghost small" id="ovspare" type="button">Não valeu: ${esc(who)} volta</button>`:""}${V.canRedo?`<button class="btn ghost small" id="ovredo" type="button">Refazer rodada</button>`:""}</div>`:"";
  /* sair não fica nas telas que aparecem toda hora (bebe, zerou): o Sair do topo está a um toque depois */
  const go=canGo?`<button class="btn" id="ovgo">${esc(btn)}</button>`:o.kind==="win"?`<p class="waitnext">Esperando ${esc(o.winner)}.</p>`:`<p class="waitnext">Esperando ${esc(o.next||"a próxima pessoa")} dar o valendo.</p>`;
  $("ovbox").innerHTML=html+go+fix+(starts?"":quitBtn());
  $("ov").hidden=false;wireQuit();
  if($("ovgo"))$("ovgo").onclick=()=>{unlockAudio();dispatch({t:"continue"})};
  if($("giveList"))$("giveList").onclick=e=>{const b=e.target.closest("button");if(b)dispatch({t:"give",id:b.dataset.id||null})};
  /* som e vibração só na primeira vez que essa tela aparece (escolher o gole redesenha a comanda) */
  const fresh=o.n!=null&&o.n!==lastFx;if(o.n!=null)lastFx=o.n;
  if(fresh&&imNext){try{navigator.vibrate&&navigator.vibrate(60)}catch(e){}}
  if(fresh&&meDrinks){try{navigator.vibrate&&navigator.vibrate([220,90,220])}catch(e){}}
  if(fresh&&imWinner){try{navigator.vibrate&&navigator.vibrate([60,40,60])}catch(e){}setTimeout(()=>{beep(523,.12,"triangle",.07);setTimeout(()=>beep(784,.2,"triangle",.07),120)},650)}
  focusOv();
  if($("ovspare"))$("ovspare").onclick=()=>dispatch({t:"spare"});
  if($("ovredo"))armConfirm($("ovredo"),()=>"Refazer rodada",()=>"Apaga a rodada?",()=>dispatch({t:"redo"}));
  if(fresh&&(o.kind==="drink"||o.kind==="win"&&o.loser)){beep(140,.6,"sawtooth",.12);const b=$("ovbox");b.classList.remove("shake");void b.offsetWidth;b.classList.add("shake")}
}

function ptsTxt(n){n=n||0;return (n>0?"+":n<0?"−":"")+Math.abs(n)+" ponto"+(Math.abs(n)===1?"":"s")}
/* the scoring rule shown at the moment it applies */
function outLine(place,gain){
  const pos=(place||0)+1;
  return `<p class="ptsline">${pos}º a sair: <b>${ptsTxt(gain)}</b>${pos===1?", quem sai primeiro perde 1":", 1 por cada um que saiu antes"}</p>`;
}
const RULE_LINE="Quanto mais você dura na rodada, mais ganha: +1 ponto por cada pessoa que sai antes de você. Quem sai primeiro perde 1.";
const TIE_LINE="Empate: quem venceu mais rodadas, depois quem bebeu menos.";
const num=n=>(n<0?"−":"")+Math.abs(n);
/* goles em risquinhos de giz, como a conta do bar: 4 em pé e o 5º cortando */
function tally(n){
  if(!n)return `<span class="tally none">nenhum gole</span>`;
  let h="";
  for(let g=0;g<Math.ceil(n/5);g++){
    const k=Math.min(5,n-g*5),w=k===5?22:k*5+1;let l="";
    for(let j=0;j<Math.min(k,4);j++){const x=3+j*5;l+=`<line x1="${x}" y1="2" x2="${x+.6}" y2="15"/>`}
    if(k===5)l+=`<line x1="0" y1="12.5" x2="21" y2="4"/>`;
    h+=`<svg viewBox="0 0 ${w} 17" width="${w}" height="17" aria-hidden="true">${l}</svg>`;
  }
  return `<span class="tally" role="img" aria-label="${n} gole${n===1?"":"s"}">${h}</span>`;
}
/* ordem: pontos, depois mais vitórias, depois menos goles; empate total divide a posição */
function ranked(){
  const rk=V.pl.slice().sort((a,b)=>(b.pts||0)-(a.pts||0)||(b.wins||0)-(a.wins||0)||a.drinks-b.drinks||a.name.localeCompare(b.name));
  let pos=0,prev=null;
  return rk.map((p,i)=>{const k=(p.pts||0)+":"+(p.wins||0)+":"+p.drinks;if(k!==prev){pos=i+1;prev=k}return {p,pos}});
}
/* posições no começo da rodada, pra mostrar quem subiu ou desceu desde a rodada anterior */
let baseRound=-1,basePos={};
function trackBase(){if(!V||!V.pl||V.round===baseRound)return;baseRound=V.round;basePos={};ranked().forEach(r=>{basePos[r.p.id]=r.pos})}
function rowHtml({p,pos},o){
  const me=p.id===ME&&MODE!=="local"?" (você)":"",w=p.wins||0;
  let mv="";
  if(o.moves&&basePos[p.id]){const d=basePos[p.id]-pos;if(d)mv=`<span class="rkmove ${d>0?"up":"down"}" aria-label="${d>0?"subiu":"desceu"} ${Math.abs(d)}">${d>0?"↑":"↓"}${Math.abs(d)}</span>`}
  const ring=o.ring&&pos===1?`<span class="chalkring" aria-hidden="true"></span>`:"";
  return `<li class="rk${pos===1?" first":""}${o.reveal?" reveal":""}"${o.st||""}>${ring}<span class="rkpos">${pos}º</span><span class="rkmain"><span class="rkname">${esc(p.name)}${me}</span>${tally(p.drinks)}</span><span class="rkstat"><span class="rkpts">${num(p.pts||0)} pt${Math.abs(p.pts||0)===1?"":"s"}</span><span class="rkwins">${w} vitória${w===1?"":"s"}</span>${mv}</span></li>`;
}
function rankList(reveal,moves){
  const r=ranked(),n=r.length;
  const rows=r.map((x,i)=>rowHtml(x,{reveal,moves,st:reveal?` style="animation-delay:${(n-1-i)*0.6}s"`:""})).join("");
  return {rk:r.map(x=>x.p),html:`<ol class="ranking">${rows}</ol>`,revealTime:(n-1)*0.6};
}
/* nas últimas 3 rodadas: a lousa mostra os nomes em ordem alfabética e os pontos ficam cobertos de giz apagado */
function coveredList(){
  const ps=V.pl.slice().sort((a,b)=>a.name.localeCompare(b.name));
  return `<ul class="ranking covered">${ps.map(p=>`<li class="rk"><span class="rkpos" aria-hidden="true">?</span><span class="rkmain"><span class="rkname">${esc(p.name)}${p.id===ME&&MODE!=="local"?" (você)":""}</span></span><span class="smudge" role="img" aria-label="pontos cobertos"></span></li>`).join("")}</ul>`;
}
const joinNames=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" e "+a[a.length-1];
/* destaques do fim: quem levou (ou quem empatou em primeiro), Esponja e, se der pra destacar até 2 pessoas, mais vitórias e menos goles */
function finalStats(){
  const r=ranked(),top=r.filter(x=>x.pos===1).map(x=>x.p.name);
  const ds=V.pl.map(p=>p.drinks),maxD=Math.max(...ds),minD=Math.min(...ds),maxW=Math.max(...V.pl.map(p=>p.wins||0));
  const sponge=maxD>0?V.pl.filter(p=>p.drinks===maxD).map(p=>p.name):[];
  const wins=maxW>0?V.pl.filter(p=>(p.wins||0)===maxW).map(p=>p.name):[];
  const sober=minD<maxD?V.pl.filter(p=>p.drinks===minD).map(p=>p.name):[];
  return {r,top,sponge,maxD,wins:wins.length<=2?wins:[],maxW,sober:sober.length<=2?sober:[],minD};
}
const goles=n=>n===0?"nenhum gole":n+" gole"+(n===1?"":"s");
function finalHtml(tail){
  const st=finalStats(),n=st.r.length,T=(n-1)*0.6+0.5,E=a=>a.map(esc);
  const rows=st.r.map((x,i)=>rowHtml(x,{reveal:true,ring:true,st:` style="animation-delay:${(n-1-i)*0.6}s"`})).join("");
  const champ=st.top.length>1?`${joinNames(E(st.top))} empataram em primeiro`:`${esc(st.top[0]||"")} levou a partida`;
  return `<span class="lbl">Fim da partida, ${V.round} rodada${V.round===1?"":"s"}</span>
    <ol class="ranking">${rows}</ol>
    <div class="finaltail reveal" style="animation-delay:${T}s">
      <div class="big win mid">${champ}</div>
      ${st.sponge.length?`<p>Esponja da noite: <span class="name">${joinNames(E(st.sponge))}</span>, com ${goles(st.maxD)}.</p>`:""}
      ${st.wins.length?`<p>Mais rodadas vencidas: <span class="name">${joinNames(E(st.wins))}</span>, com ${st.maxW}.</p>`:""}
      ${st.sober.length?`<p>Menos goles: <span class="name">${joinNames(E(st.sober))}</span>, com ${goles(st.minD)}.</p>`:""}
      <p class="note">Ordem por pontos. ${TIE_LINE}</p>
      ${tail||""}
    </div>`;
}
/* revelação: um tic de giz por linha, do último pro primeiro; no fim, a musiquinha e o círculo de giz em volta de quem levou.
   Tocar na lousa pula direto pro fim. Os botões só aparecem (e só funcionam) depois disso */
let finalTimers=[];
function stopReveal(){finalTimers.forEach(clearTimeout);finalTimers=[];const b=$("ovbox");b.classList.remove("revealed");b.onclick=null}
function startReveal(n){
  stopReveal();const box=$("ovbox");let ended=false;
  const finish=()=>{
    if(ended)return;ended=true;finalTimers.forEach(clearTimeout);finalTimers=[];box.onclick=null;
    box.classList.add("revealed");box.querySelectorAll(".rk.first").forEach(li=>li.classList.add("circled"));
    beep(523,.15,"triangle",.08);setTimeout(()=>beep(659,.15,"triangle",.08),160);setTimeout(()=>beep(784,.3,"triangle",.08),320);
  };
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){finish();return}
  for(let i=0;i<n;i++)finalTimers.push(setTimeout(()=>beep(240+Math.random()*120,.03,"square",.03),i*600));
  finalTimers.push(setTimeout(finish,(n-1)*600+500));
  box.onclick=e=>{if(!e.target.closest("button,summary,input,label"))finish()};
}
/* resultado em texto pro grupo: compartilhar do celular ou, sem isso, copiar */
async function shareResult(btn){
  const st=finalStats();
  const lines=st.r.map(x=>`${x.pos}º ${x.p.name}: ${num(x.p.pts||0)} pt${Math.abs(x.p.pts||0)===1?"":"s"}, ${goles(x.p.drinks)}`);
  const champ=st.top.length>1?`${joinNames(st.top)} empataram em primeiro.`:`${st.top[0]} levou a partida.`;
  const text=[`Tecla Stop: fim da partida, ${V.round} rodada${V.round===1?"":"s"}`,"",...lines,"",champ,st.sponge.length?`Esponja da noite: ${joinNames(st.sponge)}, com ${goles(st.maxD)}.`:"","",location.origin+location.pathname].filter((l,i,a)=>l||a[i-1]).join("\n").trim();
  if(navigator.share){try{await navigator.share({title:"Tecla Stop",text});return}catch(e){if(e&&e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(text);btn.textContent="Resultado copiado";setTimeout(()=>{if(btn.isConnected)btn.textContent="Compartilhar resultado"},2500)}catch(e){}
}
function isLocked(){return !!(V&&V.maxRounds>0&&V.round>V.maxRounds-3&&V.state!=="over")}
function lockMsg(){return `A lousa fica coberta nas últimas 3 rodadas. O placar aparece quando acabar a rodada ${V.maxRounds}.`}
/* só redesenha quando o placar muda de verdade: assim a lista não volta pro topo a cada letra
   e o segundo toque do "Encerrar partida" não se perde */
let sheetSig="",sheetPaused=false;
function renderSheet(force){
  if($("rkov").hidden||!V)return;
  const lk=isLocked(),played=V.state==="idle"?V.round-1:V.round,canFinish=MODE!=="guest"&&V.state!=="over"&&played>=1;
  const sig=JSON.stringify([MODE==="host"&&tableLocked,lk,V.round,V.maxRounds,canFinish,played,V.pl.map(p=>[p.id,p.name,p.pts,p.wins,p.drinks])]);
  if(!force&&sig===sheetSig)return;sheetSig=sig;
  const body=lk
    ?`<div class="big win mid">Suspense</div><p>${lockMsg()}</p>${coveredList()}`
    :`<span class="lbl">Placar até a rodada ${V.round}${V.maxRounds?" de "+V.maxRounds:""}</span>${rankList(false,V.round>=2).html}<details class="pointshow"><summary>Como os pontos contam</summary><p class="note">${RULE_LINE} ${TIE_LINE}</p></details>${V.maxRounds>3?`<p class="note">Nas últimas 3 rodadas a lousa fica coberta até o fim.</p>`:""}`;
  $("rkbox").innerHTML=body+`<button class="btn" id="rkclose" type="button">Voltar pro jogo</button>`+(canFinish?`<button class="btn ghost small" id="rkfinish" type="button">Encerrar partida</button>`:"")+(MODE==="host"?`<button class="btn ghost small" id="rklock" type="button">${tableLocked?"Destrancar a mesa":"Trancar a mesa"}</button>`:"");
  if($("rklock"))$("rklock").onclick=toggleLock;
  $("rkclose").onclick=()=>closeSheet();
  if(canFinish)armConfirm($("rkfinish"),()=>"Encerrar partida",()=>`Encerrar com ${played} rodada${played===1?"":"s"}?`,()=>{closeSheet(true);dispatch({t:"finish"})});
}
function openSheet(){
  if(!V)return;
  /* um celular só: o placar cobre a mesa, então o tempo pausa enquanto ele está aberto */
  sheetPaused=MODE==="local"&&V.state==="run";if(sheetPaused)dispatch({t:"pause"});
  $("rkov").hidden=false;renderSheet(true);$("rkclose").focus();
}
function closeSheet(noResume){
  if($("rkov").hidden)return;
  $("rkov").hidden=true;
  if(sheetPaused&&!noResume&&V&&V.state==="pause")dispatch({t:"resume"});
  sheetPaused=false;$("rkBtn").focus();
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("rkov").hidden)closeSheet()});

