# EAS Update (OTA) + Expo Go — 411-Azevedo

**Conta dona (owner):** `visao`  
**Projeto no Expo:** [@visao/411-Azevedo](https://expo.dev/accounts/visao/projects/411-Azevedo)  
**Slug (`app.json`):** `411-Azevedo`  
**Entrypoint:** `index.ts` + `App.tsx` (não usa `expo-router`).

Quem **só consome** o app **não** precisa do Metro no PC do desenvolvedor: o JS/assets vêm da nuvem (EAS Update). O time publica com `eas update`.

---

## Links para o cliente — 26/05/2026

São **dois fluxos diferentes**. Não existe um único link que faça as duas coisas.

| O que o cliente quer | Tem APK? | Link para enviar |
|----------------------|----------|------------------|
| **Abrir no Expo Go** (sem instalar seu app) | Não | QR abaixo |
| **Baixar e instalar o app (APK)** | Sim | **Link de download direto** abaixo |

### A) Expo Go (preview OTA — código mais recente na nuvem)

Update: **Preview cliente 2026-05-26** · canal `preview` · runtime `1.0.0`

| Uso | Link |
|-----|------|
| **Dashboard (Preview + QR)** | https://expo.dev/accounts/visao/projects/411-Azevedo/updates/f9df13a6-1047-4f54-9d0a-16cc9bb0f735 |
| **QR / abrir no Expo Go** | https://qr.expo.dev/eas-update?projectId=be2008b3-c7c7-453f-af2c-2cf82fcfcd56&runtimeVersion=1.0.0&channel=preview&slug=exp |
| **URL para WhatsApp (Expo Go)** | https://qr.expo.dev/eas-update?projectId=be2008b3-c7c7-453f-af2c-2cf82fcfcd56&runtimeVersion=1.0.0&channel=preview&slug=exp&format=url |

**Cliente:** instalar **Expo Go** → login na **conta Expo convidada** (§6) → abrir o link ou escanear o QR.

### B) Download do APK (inicia o download ao clicar)

**Envie este link** (não a página `/builds/...` do dashboard — essa só mostra detalhes e botão Install):

| Uso | Link |
|-----|------|
| **Download direto do APK** (recomendado para WhatsApp) | https://expo.dev/artifacts/eas/7bWSba9oMTwKa8vtr8grEx.apk |
| Página do build (só se precisar ver logs / QR Orbit) | https://expo.dev/accounts/visao/projects/411-Azevedo/builds/321e14db-5a80-485f-a850-24909db607e7 |

**Cliente (Android):** abrir o link → o navegador **baixa o `.apk`** → instalar → permitir “fontes desconhecidas” se pedir.

**Link fixo na sua hospedagem (opcional):** suba `distribution/android-download.html` no Firebase Hosting (ou similar) com URL curta; o HTML redireciona para o APK acima. Atualize a URL dentro do arquivo após cada `eas:build:preview` novo (`npm run eas:apk-url` mostra o link atual).

Esse APK (build de 13/05) está no canal **`preview`**: com internet, recebe **OTA** (mesmo JS do Expo Go) sem novo APK.

> **Não** use o link `qr.expo.dev` para APK — só abre **Expo Go**.  
> Após um **novo** build preview, rode `npm run eas:apk-url` e atualize o link enviado ao cliente.

Para **APK novo**: `npm run eas:build:preview` → `npm run eas:apk-url`.

---

## 1) Pré-requisitos

- CLI: `npx eas-cli login` na conta certa.
- Variáveis `EXPO_PUBLIC_*` (Firebase etc.): para updates na EAS, configure também em **Project → Environment variables** no [expo.dev](https://expo.dev) (o `.env` local **não** sobe sozinho).
- **CI / não interativo:** o bundler pode avisar que `--non-interactive` não é suportado; use `CI=1` (ex.: `CI=1 npx eas-cli update --branch preview --message "..."`).

---

## 2) `eas.json` — perfis

| Perfil        | Canal        | Uso principal                          |
|---------------|--------------|----------------------------------------|
| `development` | `development` | Dev client + OTA branch/canal dev     |
| `preview`     | `preview`    | APK interno + OTA **preview** / Expo Go |
| `production`  | `production` | Loja / release                         |

O **canal `preview`** está mapeado à **branch `preview`** (OTA). Comandos úteis:

```bash
npx eas-cli channel:edit preview --branch preview --non-interactive
```

---

## 3) `app.json` — EAS Update

- `owner`: `visao`
- `extra.eas.projectId`: UUID do projeto (não troque sem `eas project:init` na conta dona).
- `updates.url`: `https://u.expo.dev/<projectId>`
- `runtimeVersion`: **`1.0.0`** (explícito; deve bater com o QR e com o binário/Expo Go).
- Ao mudar **código nativo** ou dependências incompatíveis com o runtime atual: **subir `runtimeVersion` e/ou `expo.version`**, gerar **novo build** quando necessário, depois publicar OTA compatível.

---

## 4) Publicar update na branch `preview`

```bash
cd /caminho/do/repo
npx eas-cli whoami
CI=1 npx eas-cli update --branch preview --message "Descreva a mudança" --non-interactive
```

Scripts no `package.json`:

- `npm run eas:update:preview` — publica na branch `preview` (defina mensagem: `npm run eas:update:preview -- --message "..."`).
- `npm run eas:publish:expo-go` — atalho com mensagem fixa para pré-visualização no Expo Go.

**Lista geral de updates (dashboard):**  
https://expo.dev/accounts/visao/projects/411-Azevedo/updates  

*(Substitua o último segmento pelo **Update group ID** retornado no terminal após cada `eas update`.)*

---

## 5) QR / link oficial para Expo Go (`qr.expo.dev`)

Referência: [QR codes (Expo)](https://docs.expo.dev/more/qr-codes/).

Substitua na URL se mudar `runtimeVersion` ou `channel`:

- **PROJECT_ID:** `be2008b3-c7c7-453f-af2c-2cf82fcfcd56`
- **RUNTIME:** `1.0.0`
- **Canal:** `preview`

**Importante — parâmetro `slug` (causa comum de QR “ir a lugar nenhum”):**

Na [documentação oficial de QR codes](https://docs.expo.dev/more/qr-codes/), o parâmetro `slug` **padrão é `exp`**, que significa **Expo Go**. Se você usar o slug do app (`411-Azevedo`), o QR passa a apontar para **development build** (`exp+411-Azevedo://expo-development-client/...`), **não** para o Expo Go — sem o dev client instalado, o sistema não abre o app (parece “link morto”).

- **Expo Go (testador com app da loja):** use **`slug=exp`** ou **omit** `slug` (o default já é `exp`).
- **Development build / APK com dev client:** aí sim use `slug=411-Azevedo` (igual ao `expo.slug` em `app.json`).

**QR — Expo Go (recomendado para preview com Expo Go):**  
https://qr.expo.dev/eas-update?projectId=be2008b3-c7c7-453f-af2c-2cf82fcfcd56&runtimeVersion=1.0.0&channel=preview&slug=exp

**URL em texto (WhatsApp / abrir no celular):**  
https://qr.expo.dev/eas-update?projectId=be2008b3-c7c7-453f-af2c-2cf82fcfcd56&runtimeVersion=1.0.0&channel=preview&slug=exp&format=url

**QR — somente se o testador tiver o *development build* instalado (slug do app):**  
https://qr.expo.dev/eas-update?projectId=be2008b3-c7c7-453f-af2c-2cf82fcfcd56&runtimeVersion=1.0.0&channel=preview&slug=411-Azevedo

Fluxo do testador (Expo Go): instalar **Expo Go** da loja → **entrar na conta Expo convidada** (ver §6) → usar os links com **`slug=exp`** acima.

---

## 6) Colaboradores — evitar **403** “not viewable in Expo Go”

Updates em projeto de conta **privada** só abrem para **membros** com acesso.

1. Dono do projeto: **Account / Project → Members** e convide o e-mail da **conta Expo** de cada testador (ex.: papel *Viewer* pode bastar para abrir no Expo Go).
2. No celular, o testador abre o **Expo Go**, faz **login** com essa conta **antes** de escanear o QR de novo.

Links úteis:

- Membros da conta: https://expo.dev/accounts/visao/settings/members  
- Ou membros só do projeto: https://expo.dev/accounts/visao/projects/411-Azevedo/settings → **Members**.

---

## 7) Checklist de validação (humano)

1. `npx eas-cli whoami` → conta com acesso ao projeto `@visao/411-Azevedo` (ou membro convidado).
2. Dashboard → **Updates** → existe update na **branch** `preview` / canal `preview`.
3. Celular: Expo Go atualizado → login com conta **convidada** → QR/link abre **sem 403**.
4. `runtimeVersion` e `channel` no QR batem com `app.json` e com o mapeamento de canal no EAS.
5. Se algo falhar com “não compatível com Expo Go”: ver **§8** (limites).

---

## 8) Limites (obrigatório ler)

- **Expo Go** só executa o que for **compatível** com o runtime/SDK do Expo Go da loja. Pacotes nativos **fora** do conjunto suportado exigem **development build** ou app de **loja** (EAS Build).
- **EAS Build iOS** (IPA / TestFlight) exige **Apple Developer**; isso **não** substitui o fluxo “sem conta Apple” para teste rápido: use **Expo Go + EAS Update + convite de membro** como acima.
- O fluxo **OTA não substitui** um binário nativo quando você muda algo que exige novo app instalado — aí é novo `eas build` + OTA na mesma `runtimeVersion` (ou bump de runtime conforme a doc).

---

## 9) App instalável (release) — o que já existe e o que falta

**Projeto:** [@visao/411-Azevedo](https://expo.dev/accounts/visao/projects/411-Azevedo)

| Tipo | Perfil EAS | Já gerado? | Para quem |
|------|------------|------------|-----------|
| Dev client (menu dev, Extensions) | `development` | Sim (05/05) | Desenvolvimento |
| **APK “release interno”** (app normal, sem Expo Go) | `preview` | **Sim (13/05)** | Clientes / QA — **é o instalável mais próximo de release** |
| **Play Store (AAB production)** | `production` | **Não** | Publicação na loja |

### APK preview (já pronto — instalar no Android)

1. Abra o build: [preview — 13/05/2026](https://expo.dev/accounts/visao/projects/411-Azevedo/builds/321e14db-5a80-485f-a850-24909db607e7)
2. Use **Install** / link de distribuição interna no dashboard, ou o artefato direto (se ainda válido):  
   `https://expo.dev/artifacts/eas/7bWSba9oMTwKa8vtr8grEx.apk`
3. No celular: permitir instalação de fontes desconhecidas → instalar o APK.

**Não é Expo Go** — é o app `com.borderlesspc2.plan411azevedo` empacotado.

### Production (loja) — ainda não foi feito

```bash
npm run eas:build:production
```

Gera **AAB** para Google Play (`profile production`). Depois: `eas submit` ou upload manual no Play Console.

### Gerar APK preview de novo (versão nova)

```bash
npm run eas:build:preview
```

Para testadores com **development build** ou **APK preview** instalado, o OTA no canal `preview` chega sem Metro. Scripts: `eas:build:dev`, `eas:build:preview`, `eas:build:production`.

Deep link do dev client (`scheme` em `app.json`):

`plan411azevedo://expo-development-client/?url=...`
