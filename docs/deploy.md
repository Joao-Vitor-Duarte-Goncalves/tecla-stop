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
Não tem build nem configuração (`vercel.json`): a Vercel serve os arquivos como estão.

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
- [ ] Recarregar a página no meio da partida (host e convidado voltam).
- [ ] Fim da partida: ranking revelado e "Nova partida".
