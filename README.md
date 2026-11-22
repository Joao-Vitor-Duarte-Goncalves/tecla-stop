# Tecla Stop do Bar

Jogo de festa estilo Tapple para jogar com os amigos: sai um tema, cada um fala uma palavra e toca a letra inicial antes do tempo acabar. Estourou o tempo, bebe.

Sem build: é só HTML, CSS e JS puros.

```
index.html      estrutura das telas
css/style.css   visual
js/temas.js     listas de temas (normal e molecagem)
js/base.js      preferências, troca de tela, tema claro/escuro, som
js/jogo.js      regras: rodada, timer, pontos, sorteio de tema
js/tela.js      desenha o jogo, teclado de letras, roleta, placar
js/cena.js      abertura da garrafa, parallax e loop do timer
js/rede.js      um celular só, mesa online (PeerJS) e reconexão
sw.js           service worker: deixa o jogo abrir sem internet depois da 1ª visita
manifest.webmanifest  app instalável (nome, cores, ícones)
icons/          ícone (SVG e PNGs) e og.png, a prévia do link; og-source.html gera a og.png
vercel.json     cabeçalhos de segurança (CSP etc.)
```

A ordem dos `<script>` no `index.html` importa: cada arquivo usa o que foi declarado nos anteriores. Funciona em qualquer hospedagem estática (Vercel, Netlify, GitHub Pages).

Documentação completa em [`docs/`](docs/README.md): arquitetura, regras, rede e deploy.
