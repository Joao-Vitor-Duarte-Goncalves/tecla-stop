# Arquitetura

Site estático, sem build e sem backend próprio. HTML, CSS e JS puros, servidos como arquivos.

```
index.html      telas (home, local, lobby, game) e overlays
css/style.css   todo o visual
js/temas.js     CATS (temas normais) e MOLEC (temas de molecagem)
js/base.js      constantes, preferências (S), troca de tela, tema claro/escuro, áudio, tela sempre acesa
js/jogo.js      estado global e motor do jogo: newMatch, newRound, act, timeout, sync, dispatch
js/tela.js      desenho: applyView, render, teclado de letras, roleta de tema, overlays, placar
js/cena.js      abertura da garrafa (e a versão curta da revanche), parallax, loop de frame (timer)
js/rede.js      modo "um celular só", mesa online (host/convidado), reconexão, restauração após recarregar
```

Dependências externas (CDN, no `<head>`):

- [PeerJS 1.5.4](https://peerjs.com/): conexão P2P (WebRTC) entre celulares.
- [NoSleep.js 0.12.0](https://github.com/richtr/NoSleep.js): mantém a tela acesa onde não há Wake Lock API.
- Google Fonts: Bowlby One, Barlow, Permanent Marker.

## Ordem dos scripts importa

Os arquivos JS são **scripts comuns** (não módulos), carregados em ordem no fim do `<body>`:

```
temas → base → jogo → tela → cena → rede
```

Todos compartilham o mesmo escopo global, então uma função de `rede.js` pode ser chamada de dentro
de uma função de `jogo.js`, **desde que a chamada aconteça depois que a página carregou** (num clique,
num timer). O que não pode: código que roda *no carregamento* de um arquivo usar algo declarado num
arquivo que vem depois.

```js
// base.js — ERRADO: leave só existe depois que rede.js carrega
botao.onclick = leave;
// CERTO: a referência só é resolvida no clique
botao.onclick = () => leave();
```

## Estado global

| Variável | Onde | O que é |
|---|---|---|
| `S` | base.js | Preferências do aparelho, salvas no `localStorage` (`tecla-stop`): nome, jogadores locais, tempo, rodadas, molecagem, letras difíceis, som, tema, `key` (id do aparelho) |
| `MODE` | jogo.js | `"local"`, `"host"`, `"guest"` ou `null` (na home) |
| `ME` | jogo.js | id do jogador neste aparelho (`S.key`); `null` no modo local |
| `G` | jogo.js | Partida **autoritativa**. Só existe no modo local e no host |
| `V` | jogo.js | Snapshot que está sendo desenhado na tela (todo mundo tem, inclusive convidado) |
| `peer`, `hostConn`, `conns` | jogo.js | Objetos do PeerJS |

## Fluxo de uma ação

```
toque do jogador
   └─ dispatch(acao)
        ├─ convidado: envia pro host pela conexão PeerJS
        └─ local/host: act(ME, acao)
                         └─ muda G → sync()
                                       ├─ host: manda snapshot() pra todos os convidados
                                       └─ applyView(snapshot) → render()
```

O convidado nunca muda o jogo sozinho: só manda ações e desenha o que o host devolve.

## Telas

`show(id)` alterna entre `home`, `local`, `lobby` e `game`. Entrar em `game` vindo de `local` ou
`lobby` toca a abertura (`playIntro`, em cena.js).

## localStorage

| Chave | Conteúdo | Validade |
|---|---|---|
| `tecla-stop` | Preferências (`S`) | Permanente |
| `tecla-deck` | Temas já sorteados (baralho) | 12 h |
| `tecla-stop-host` | Mesa aberta por este aparelho, com o jogo inteiro | 3 h |
| `tecla-stop-room` | Mesa em que este aparelho entrou como convidado | 3 h |
