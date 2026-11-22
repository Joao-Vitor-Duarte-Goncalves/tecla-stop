# Documentação do Tecla Stop

| Documento | O que tem |
|---|---|
| [arquitetura.md](arquitetura.md) | Como o código está organizado, ordem dos scripts, estado global |
| [regras.md](regras.md) | Regras do jogo como o código implementa: rodada, timer, pontos, temas |
| [rede.md](rede.md) | Multiplayer: PeerJS, mesa, reconexão, troca de juiz, mensagens |
| [deploy.md](deploy.md) | Como rodar local, publicar na Vercel e testar |

Produção: https://tecla-stop.vercel.app (deploy automático a cada push na `main`).

## Como manter esta documentação

- Mudou uma regra em `js/jogo.js`? Atualize `regras.md` no mesmo commit.
- Nova mensagem de rede ou ação (`act`)? Atualize a tabela em `rede.md` ou `regras.md`.
- Novo arquivo JS? Coloque na ordem certa no `index.html` e registre em `arquitetura.md`.
