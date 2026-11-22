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
| `{t:"join", name, key}` | Logo que conecta. `key` é o id fixo do aparelho, então reconectar não duplica o jogador |
| `{t:"ping"}` | A cada 4 s |
| qualquer ação de [regras.md](regras.md#ações-act) | Toques e botões |

Host → convidado:

| Mensagem | Quando |
|---|---|
| `{t:"lobby", code, players}` | Na sala de espera, a cada entrada ou saída |
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
