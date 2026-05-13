# Atualizações na nuvem (EAS Update) — sem `expo start`

## Importante: Expo Go × QR do EAS Update

O QR/link de **Preview** gerado no [expo.dev](https://expo.dev) após um `eas update` abre o pacote no **development build** (app instalado com `expo-dev-client`), **não** no aplicativo genérico **Expo Go**.

A Expo documenta que **Expo Go não é o fluxo recomendado** para revisão/distribuição com EAS Update; o fluxo oficial é **um build instalável** + publicação de updates.

Este projeto está configurado para esse fluxo oficial.

**Projeto EAS (conta Borderless):** [@borderlesspc2/411-Azevedo](https://expo.dev/accounts/borderlesspc2/projects/411-Azevedo) — builds e updates ficam neste projeto (não depende mais da conta `samuelbit`).

## Resumo do fluxo

1. **Uma vez**: gerar e instalar o **development build** (APK interno no Android).
2. **Sempre que mudar JS/assets**: rodar `eas update` no canal correspondente.
3. Testadores abrem a atualização pelo **dashboard** (Preview / QR) ou pela aba **Extensions** dentro do development build.

Seu PC **não** precisa ficar com `expo start` ligado depois disso.

## Pré-requisitos

- Conta Expo e CLI: `npx eas-cli login` (ou `eas login`).
- Variáveis `EXPO_PUBLIC_*` do Firebase: para builds/updates na EAS, configure também em **Project → Environment variables** no expo.dev (os valores do `.env` local não sobem automaticamente para a nuvem).

## 1) Primeiro build (development — APK interno)

Android (padrão dos scripts):

```bash
npm run eas:build:dev
```

No final, o EAS mostra um **link de instalação** (distribuição interna). Envie esse link aos testadores **uma vez**.

## 2) Publicar uma atualização (OTA)

```bash
npx eas-cli update --channel development --message "descreva a mudança"
```

Ou:

```bash
npm run eas:update:dev -- --message "descreva a mudança"
```

(O mesmo vale para o canal `preview` com `npm run eas:update:preview`.)

## 3) Abrir no celular (sem Metro)

- No **expo.dev**: projeto → **Updates** → abra o update → **Preview** → QR/link.
- Ou: abra o **development build** instalado → **Extensions** → login Expo → escolha o update.

Deep link (substitua IDs conforme o dashboard), formato documentado pela Expo:

`plan411azevedo://expo-development-client/?url=...`

(`plan411azevedo` é o `scheme` definido em `app.json`.)

## Canais e perfis (`eas.json`)

| Perfil EAS       | Canal        | Uso                          |
|-----------------|--------------|------------------------------|
| `development`   | `development`| Dev client + updates de dev   |
| `preview`       | `preview`    | APK interno “preview”        |
| `production`    | `production` | Loja / release               |

Publicações devem usar **`eas update --channel ...` igual ao canal do build** que os testadores instalaram.

## Runtime version

Está em `app.json` com `runtimeVersion.policy: "appVersion"`. Quando mudar **código nativo** ou dependências que exijam novo binário, **suba `expo.version`** e gere **novo build**; só então publique updates compatíveis.

## Build só preview (sem menu de dev)

Para testers que não precisam do dev client:

```bash
npm run eas:build:preview
npm run eas:update:preview -- --message "..."
```

Use o mesmo canal `preview` no update que no build `preview`.
