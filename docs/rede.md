# Rede (multiplayer)

Código em `js/rede.js`. Não existe servidor do jogo: os celulares conversam direto por WebRTC, usando PeerJS.

## Peças

| Peça | Para que serve | Quem mantém |
|---|---|---|
| Servidor de sinalização do PeerJS (`0.peerjs.com`, padrão da lib) | Apresenta um celular ao outro pelo id | PeerJS, grátis, sem garantia |
| STUN do Google | Descobre o caminho direto entre os celulares | Google |
| TURN `staticauth.openrelay.metered.ca` (Open Relay) | Repassa o tráfego quando não dá conexão direta (4G, redes diferentes) | Metered, grátis, sem garantia |

As credenciais do TURN são geradas no próprio navegador (HMAC-SHA1 com o segredo público do Open Relay) e valem 12 h. A configuração ICE fica em cache por 6 h.

> Esses três serviços são públicos e gratuitos. Se algum cair ou mudar, o modo online para de funcionar
> (o modo "um celular só" continua). É o principal motivo pra um dia considerar um servidor próprio.

## Mesa

- **Código da mesa**: 4 letras (sem I, O e Q, pra não confundir).
- **Id do host no PeerJS**: `teclastop-v1-` + código + sufixo (`""`, `"b"` ou `"c"`).
- **Convite**: link `https://…/#CODE`. Abrir o link preenche o código. Usa o compartilhar nativo do celular, ou copia o texto.
- O host é o **juiz**: guarda `G`, aplica as ações e manda o estado pra todos.

## Mensagens

Convidado → host:

| Mensagem | Quando |
|---|---|
| `{t:"join", name, key}` | Logo que conecta. `key` é o id fixo do aparelho, então reconectar não duplica o jogador. Mandar de novo com outro `name` troca o nome (é assim que o convidado se renomeia na sala) |
| `{t:"ping"}` | A cada 4 s |
| qualquer ação de [regras.md](regras.md#ações-act) | Toques e botões |

Host → convidado:

| Mensagem | Quando |
|---|---|
| `{t:"lobby", code, players, host, set}` | Na sala de espera, a cada entrada, saída, troca de ordem ou mudança de opção. `players` está na ordem da roda; `host` é o nome de quem abriu; `set` traz `dur`, `rounds`, `molec`, `hard` pro resumo |
| `{t:"closed", by}` | Quem abriu a mesa tocou Sair/Fechar a mesa. Os convidados voltam pra home com "Ana fechou a mesa." em vez de ficar tentando reconectar; as conexões fecham 0,5 s depois, pra mensagem chegar |
| `{t:"kicked"}` | Quem abriu a mesa tirou a pessoa da sala. O convidado volta pra home com o aviso e pode sentar de novo |
| `{t:"state", …snapshot, full}` | A cada mudança no jogo. `full` é a cópia inteira do jogo (sem relógios), usada na troca de juiz |
| `{t:"pong"}` | Resposta ao ping |

O timer viaja como **tempo restante** (`left`), não como horário, porque o relógio de cada celular é diferente.

## Quedas e reconexão

- **Caiu um convidado**: ele *não* é eliminado. Fica marcado `on:false` e a vez pula ele até voltar. Se sobrar menos de 2 online, a rodada pausa.
- **Convidado sem notícia do host por 20 s**: fecha a conexão e tenta de novo, por até 3 min (40 s se nunca chegou a conectar).
- **Host sem notícia de um convidado por 30 s**: derruba a conexão.
- **Host saiu do app** (tela apagada / outro app): a rodada pausa e os convidados veem "Quem abriu a mesa saiu do jogo".
- **Recarregou a página**: host e convidado voltam sozinhos pra mesa se foi há menos de 3 h (`tecla-stop-host` / `tecla-stop-room`).

## Troca de juiz

Se o host some por mais de 15 s, os convidados veem a opção de **continuar com o próprio celular como juiz**. Esse convidado vira host com o último `full` recebido, usando o id com sufixo `b` (depois `c`). Os outros convidados, ao não achar o host no sufixo atual, testam os próximos sufixos e acabam nele. Se o sufixo já estiver ocupado (outro convidado foi mais rápido), ele tenta o próximo e, se não sobrar nenhum, volta a ser convidado.

## O que cada um vê quando a conexão falha

- **Convidado sem conexão:** a faixa vermelha mostra há quanto tempo está reconectando, a mesa fica cinza com "Sem conexão, voltando…", o tempo congela e os toques são ignorados (`offline` em `jogo.js`). Quando volta, aparece "Conectado de novo" e o estado do juiz corrige o tempo.
- **Alguém cai na própria vez:** o juiz passa a vez, avisa todo mundo ("Bia caiu. A vez passou pra Caio.", via `G.note`) e dá 2 s de folga antes do tempo do próximo cair. O mostrador nunca passa do tempo cheio.
- **Quem abriu a mesa sai do app:** em qualquer tela os convidados veem "Ana saiu do jogo" (`G.hostAway`); se a rodada estava rolando, ela pausa. Ao voltar, o botão do centro diz "Continuar a rodada" e os convidados veem "Pausado. Esperando Ana continuar".
- **Quem abriu a mesa sumiu de vez:** "Assumir a mesa" aparece primeiro só pra próxima pessoa da roda depois do juiz (15 s sem contato) e, 15 s depois, pra todo mundo (`takeoverRank`). O juiz é identificado por `G.hostId`.
- **Faixa do topo:** vermelha quando atrapalha o jogo; neutra (`netBar(msg,"info")`) pra avisos como "Sem contato com o servidor de mesas" e "Reabrindo a mesa".
