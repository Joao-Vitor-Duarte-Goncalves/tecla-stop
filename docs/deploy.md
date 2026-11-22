# Rodar, publicar e testar

## Rodar local

Precisa de um servidor HTTP, porque abrir o `index.html` direto (`file://`) pode bloquear recursos.

```bash
cd ~/tecla-stop && python3 -m http.server 8000
```

Abra http://localhost:8000. Para testar o online com o celular na mesma rede, use o IP do computador
(`http://192.168.x.x:8000`). No WSL, o celular não enxerga o servidor sem configurar o encaminhamento de porta do Windows.

## Publicar

A Vercel está ligada ao repositório: **todo push na `main` vai para produção** em https://tecla-stop.vercel.app.
Não tem build: a Vercel serve os arquivos como estão. O `vercel.json` só define cabeçalhos de segurança:

- **Content-Security-Policy**: scripts só do próprio site, do unpkg e do cdnjs; conexões só com o servidor de mesas do PeerJS (`0.peerjs.com`). Se trocar de servidor de mesas ou adicionar um script de outro lugar, atualize essa linha, senão o navegador bloqueia (o erro aparece no console).
- **X-Content-Type-Options** e **Referrer-Policy**.

### Scripts de CDN com `integrity`

PeerJS, NoSleep e qrcodejs são carregados com `integrity` (hash SHA-384). Se o CDN servir um arquivo diferente, o navegador não roda. Ao mudar a versão de um deles, gere o hash novo:

```bash
curl -sL URL_DO_SCRIPT | openssl dgst -sha384 -binary | openssl base64 -A
```

e ponha `sha384-<resultado>` no atributo `integrity` do `<script>`.

```bash
git push origin main
```

> No WSL, se o `git push` travar, é o Git Credential Manager do Windows esperando uma janela.
> Alternativa usando o login do `gh`:
> `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin main`

## Checklist de teste

Depois de mexer, confira no celular:

- [ ] Home abre sem erro no console; tema claro/escuro alterna.
- [ ] **Um celular só**: adicionar/tirar jogador, começar, tocar letras, estourar o tempo, "Errei a letra", Desfazer, Pausar.
- [ ] **Abrir mesa** num celular e **entrar** em outro pelo código e pelo link do convite.
- [ ] Pelo link do convite, a home mostra só o nome e "Sentar na mesa ABCD"; "Abrir outra mesa ou jogar num celular só" volta pra home normal.
- [ ] Botão Voltar/Sair em todas as telas.
- [ ] Convidado: "Conectando…" até entrar; trocar o próprio nome tocando nele; vibra quando a partida começa; quando quem abriu fecha a mesa, aparece "Fulano fechou a mesa." na hora.
- [ ] Sala: QR code abre o convite; trocar dois nomes de lugar e embaralhar; tirar alguém (ele volta pra home com aviso); Sair com gente na mesa pede confirmação.
- [ ] Recarregar a página no meio da partida (host e convidado voltam).
- [ ] Fim da partida: ranking revelado e "Nova partida".

## App instalável e offline

- `sw.js` guarda os arquivos do site e os scripts/fontes dos CDNs. Os arquivos do site vêm da rede primeiro, então um deploy novo aparece na hora pra quem está online; sem rede (ou com rede travada por mais de 2,5 s), usa a cópia guardada. Ao adicionar um arquivo novo em `js/` ou `css/`, ponha ele na lista `SHELL` do `sw.js` e troque `VERSION` (ex.: `ts-v2`), pra que a cópia offline inclua o arquivo.
- O "Um celular só" funciona sem internet depois de abrir o site uma vez com internet. A mesa online continua precisando de rede.
- Android mostra "Instalar no celular" na home; no iPhone aparece a dica de usar Compartilhar > Adicionar à Tela de Início.

## Ícone e prévia do link

- `icons/icon.svg` é o ícone (a mesa amarela com a tampinha do T). Os PNGs (`icon-32`, `icon-192`, `icon-512`, `apple-touch-icon`) são ele renderizado.
- `icons/og.png` (1200×630) é a imagem que aparece quando o link é mandado no WhatsApp e afins. Ela é gerada a partir de `icons/og-source.html`: abra no navegador com a janela em 1200×630 e tire um print, ou rode o Edge/Chrome em modo headless:

```bash
msedge --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=8000 --screenshot=og.png icons/og-source.html
```

- O WhatsApp guarda a prévia por um tempo; depois de trocar a imagem, pode demorar pra aparecer a nova.
