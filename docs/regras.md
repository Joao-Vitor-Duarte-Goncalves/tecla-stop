# Regras do jogo

Como o motor em `js/jogo.js` funciona. Se o código mudar, atualize aqui.

## Configuração da partida

| Opção | Valores | Padrão |
|---|---|---|
| Tempo por vez | 6, 8, 10, 15 s | 10 s |
| Rodadas | 5, 10, 15 ou Livre (`0`, sem fim) | 10 |
| Temas de molecagem | liga/desliga | ligado |
| Letras difíceis (Q, X, Z) | liga/desliga | desligado |
| Som | liga/desliga | ligado |

Letras normais: `A B C D E F G H I J L M N O P R S T U V` (sem K, Q, W, X, Y, Z).

## Rodada

1. Sorteia um tema (ver *Temas*). O host pode trocar ("Outro tema") ou escrever um próprio, antes de começar.
2. Quem começa gira a cada rodada (`starter` anda um para frente). Antes do Valendo, o nome de quem começa fica marcado com "começa" na lista; durante a rodada, o centro da mesa mostra quem vem depois.
3. O host toca **Valendo**: o timer começa para o jogador da vez.
4. O jogador fala uma palavra do tema e toca a letra inicial. A letra fica usada e a vez passa, com o timer cheio.
5. Estourou o tempo: o jogador **bebe** e sai da rodada.
6. Sobrou um: ele **vence a rodada**.

Uma rodada só conta quando dá pra jogar: com menos de 2 pessoas conectadas, aparece "Esperando a galera" e o número da rodada não avança.

### Tabuleiro zerado

Se todas as letras forem usadas, as letras voltam, o tempo cai 2 s (mínimo 4 s) e o tema continua o mesmo.

### Errei a letra

Por 2,2 s depois de tocar, quem tocou pode desfazer ("Errei a letra") e recupera o tempo que tinha.

### Comandos do juiz (host ou modo local)

- **Desfazer**: volta a última letra.
- **Pausar / Voltar**.
- **Outro tema** / **Escrever tema** (só antes do "Valendo").
- **+ Adicionar** (só no modo local, até 16): entra na rodada atual se ela ainda está aberta. Nome repetido ganha número ("João 2"), aqui e na lista antes da partida, que também tem o limite de 16.
- **Virar o nome pra quem está na vez** (modo local, ligado por padrão): com o celular deitado no meio da roda, o centro da mesa gira pro lugar de quem joga. O lugar *i* de *n* fica a *i*·360/*n* graus, em sentido horário a partir da base do celular.
- **Refazer rodada** (segundo toque confirma): do Valendo até alguém tocar "Próxima rodada", volta tudo pro momento antes do Valendo: letras, quem saiu, pontos, goles e vitória da rodada. O tema e quem começa ficam, e o número da rodada não avança. Dá pra trocar o tema em seguida. Funciona com a rodada rolando, pausada ou com a tela de "bebe"/"venceu" aberta. A foto do placar fica em `G.roundSnap`, tirada no `start`.
- **Não valeu** (na tela de quem bebeu): quem acabou de estourar o tempo volta pra roda sem gole nem ponto e joga de novo com o tempo cheio. Se tinha encerrado a rodada, a vitória também é desfeita. Usa `G.lastOut`.
- **Encerrar partida** (no Placar, segundo toque confirma): vai direto pro ranking final. É o único jeito de terminar o modo Livre. Uma rodada sem Valendo não conta; o que já aconteceu na rodada atual (goles, pontos) fica.
- **Tirar da roda / Pôr de volta** (tocar no nome): a vez da pessoa é pulada até pôr de volta, sem gole nem ponto (`p.bench`). Se tirar alguém deixa só um na rodada, esse vence. Pondo de volta, entra na rodada atual se ela ainda está aberta.

### Provocações

No online, quem já saiu da rodada pode mandar "TIC-TAC!", "VAI BEBER!" ou "HAHAHA" pra quem está na vez (1 a cada 2,5 s). O alvo sente vibração e som.

## Pontos

Quanto mais você dura, mais ganha:

| Quem | Pontos |
|---|---|
| 1º a sair | −1 |
| N-ésimo a sair (N ≥ 2) | +(N − 1), um por cada um que saiu antes |
| Vencedor da rodada | + número de pessoas que saíram |

Além dos pontos, conta `wins` (rodadas vencidas) e `drinks` (goles).

**Ranking:** pontos → mais vitórias → menos goles → nome.

**Suspense:** nas últimas 3 rodadas o placar fica coberto e as telas de "bebe" não mostram pontos. Tudo é revelado no fim, do último para o campeão, com o título de **Esponja da noite** pra quem mais bebeu.

**Nova partida:** zera pontos, vitórias e goles e remove quem estiver desconectado. Na tela do fim, quem abriu a mesa pode abrir "Mudar tempo, rodadas e temas" e a nova partida já usa o que estiver escolhido (tempo, rodadas, molecagem e Q/X/Z).

**Som:** o alto-falante no topo do jogo liga e desliga o som; é a mesma preferência da home e vale só pro próprio celular.

## Temas

- `CATS`: temas normais; `MOLEC`: molecagem (se ligado); mais os temas escritos na partida.
- Critério de um bom tema: dá pra achar palavra comum pra quase todas as letras.
- Sorteio como **baralho**: nenhum tema repete até todos saírem. O baralho fica salvo no aparelho do juiz por 12 h, então vale entre partidas da mesma noite. Quando acaba, reembaralha sem repetir o último.

## Ações (`act`)

| Ação | Quem pode | Efeito |
|---|---|---|
| `start` | juiz | Começa o timer (precisa de 2+ vivos e online) |
| `tap` `{l}` | jogador da vez | Usa a letra e passa a vez |
| `oops` `{l}` | quem acabou de tocar | Desfaz o próprio toque (2,2 s + folga) |
| `undo` | juiz | Desfaz a última letra |
| `redo` | juiz | Refaz a rodada (volta pro antes do Valendo) |
| `spare` | juiz | "Não valeu": desfaz o último estouro de tempo |
| `bench` `{id, on}` | juiz | Tira da roda (`on: true`) ou põe de volta |
| `finish` | juiz | Encerra a partida e mostra o ranking final |
| `pause` / `resume` | juiz | Pausa e volta |
| `newcat` / `setcat` `{cat}` | juiz | Sorteia outro tema / usa tema escrito (até 40 caracteres) |
| `heckle` `{k}` | eliminado (online) | Provocação |
| `addlocal` `{name}` | modo local | Adiciona jogador |
| `continue` | qualquer um | Fecha o overlay e segue (bebe, zerou, venceu, esperando) |
| `rematch` | juiz | Nova partida |

Estados de `G.state`: `idle` (antes do Valendo), `run`, `pause`, `ov` (overlay na tela), `over` (fim da partida).
Tipos de overlay `G.ov.kind`: `drink`, `win`, `reset`, `few`, `final`.
