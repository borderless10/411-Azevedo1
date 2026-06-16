# Gerar APK no Android Studio — 411-Azevedo

## Abrir o projeto

1. **Android Studio** → **File → Open**
2. Selecione a pasta **`android`** dentro do repo (não só a raiz do Expo):
   `/home/eduardo/workspaces/Borderless/411-Azevedo1/android`
3. Aguarde o **Gradle Sync** terminar (barra inferior).

O arquivo `android/local.properties` já aponta o SDK:

`sdk.dir=/home/eduardo/Android/Sdk`

Se o sync falhar, confira em **Settings → Android SDK** se o SDK está instalado nesse caminho.

---

## Gerar APK de release (recomendado)

1. Menu **Build → Select Build Variant** (ou aba **Build Variants** à esquerda).
2. Em **app**, escolha **`release`** (não `debug`).
3. Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. Quando terminar, clique em **locate** na notificação ou abra:

   `android/app/build/outputs/apk/release/app-release.apk`

Esse APK usa, por enquanto, a **keystore de debug** (já configurada em `android/app/build.gradle`) — serve para **testes internos**. Para Play Store, use keystore de produção (abaixo).

---

## APK assinado para loja (opcional)

1. **Build → Generate Signed App Bundle or APK…**
2. **APK** → Next
3. Crie ou selecione um **keystore** (guarde senha e alias com segurança).
4. Build variant: **release** → Finish
5. O APK sai na pasta que o assistente indicar (geralmente `release/`).

---

## Se o build falhar por “Gradle lock”

Só pode haver **um** Gradle build por vez neste projeto.

- Feche outros builds no Android Studio, ou
- **File → Invalidate Caches** não resolve lock; pare o sync/build e tente de novo, ou
- Feche o Android Studio e no terminal:

  ```bash
  cd android && ./gradlew --stop && npm run build:apk
  ```

---

## Pelo terminal (mesmo resultado do Android Studio)

```bash
npm run build:apk
```

APK gerado em:

`android/app/build/outputs/apk/release/app-release.apk`

---

## Diferença: APK local × EAS

| Origem | Comando / onde | OTA EAS |
|--------|----------------|---------|
| **Android Studio / Gradle local** | `assembleRelease` | Só se o binário tiver `expo-updates` e canal configurado no native (já tem em `app.json`) |
| **EAS Build** | `npm run eas:build:preview` | Sim, canal `preview` na nuvem |

Depois de mudar só JS, prefira `npm run eas:update:preview` para quem já tem APK **EAS**. APK **só local** precisa de novo build no Android Studio para mudanças nativas; para JS pode usar OTA se o app instalado for build que inclui updates.
