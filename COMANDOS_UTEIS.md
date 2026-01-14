# 🔧 Comandos Úteis - Controle Financeiro

## 📦 NPM / Instalação

```bash
# Instalar dependências
npm install

# Instalar dependência específica
npm install nome-do-pacote

# Remover dependência
npm uninstall nome-do-pacote

# Atualizar dependências
npm update

# Limpar cache do npm
npm cache clean --force
```

## 🚀 Executar Projeto

```bash
# Iniciar servidor Expo
npm start

# Iniciar e limpar cache
npx expo start -c

# Web
npm run web

# Android
npm run android

# iOS
npm run ios

# Modo de desenvolvimento
npm start -- --dev-client
```

## 🧹 Limpeza

```bash
# Limpar cache do Expo
npx expo start -c

# Limpar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install

# Windows PowerShell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Limpar tudo e recomeçar
npx expo start -c --clear
```

## 🔥 Firebase

```bash
# Instalar Firebase CLI (global)
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicializar Firebase no projeto
firebase init

# Deploy (quando configurado)
firebase deploy

# Ver logs
firebase functions:log
```

## 📱 Dispositivos

```bash
# Ver dispositivos Android conectados
adb devices

# Abrir emulador Android
emulator -avd Nome_Do_Emulador

# iOS Simulator (Mac)
open -a Simulator

# Instalar Expo Go
# Android: via Google Play
# iOS: via App Store
```

## 🧪 Testes

```bash
# Rodar testes (quando implementados)
npm test

# Testes com cobertura
npm test -- --coverage

# Testes em modo watch
npm test -- --watch

# Rodar ESLint
npm run lint

# Corrigir problemas do ESLint automaticamente
npm run lint -- --fix
```

## 📦 Build

```bash
# Build para Android (EAS)
eas build --platform android

# Build para iOS (EAS)
eas build --platform ios

# Build para ambos
eas build --platform all

# Build local Android
eas build --platform android --local

# Preview build
eas build --profile preview
```

## 🔍 Debug

```bash
# Ver logs em tempo real
npx react-native log-android
npx react-native log-ios

# Debug remoto
# Shake o dispositivo > "Debug JS Remotely"

# Reload rápido
# Android: R+R (duplo R)
# iOS: Cmd+R

# Dev Menu
# Android: Cmd+M ou Ctrl+M
# iOS: Cmd+D
```

## 📊 TypeScript

```bash
# Verificar tipos
npx tsc --noEmit

# Watch mode para TypeScript
npx tsc --watch --noEmit

# Gerar tipos
npx tsc --declaration
```

## 🌐 Publicação

```bash
# Publicar no Expo
eas update

# Build de produção
eas build --profile production

# Submeter para lojas
eas submit -p android
eas submit -p ios
```

## 🗄️ Banco de Dados (Firestore)

```bash
# Exportar dados do Firestore
firebase firestore:export backup-folder

# Importar dados
firebase firestore:import backup-folder

# Limpar coleção
# (Fazer via Firebase Console ou script)
```

## 📝 Git

```bash
# Status
git status

# Adicionar arquivos
git add .

# Commit
git commit -m "Mensagem do commit"

# Push
git push origin main

# Pull
git pull origin main

# Criar branch
git checkout -b nome-da-branch

# Ver branches
git branch

# Mudar de branch
git checkout nome-da-branch

# Merge
git merge nome-da-branch

# Ver histórico
git log --oneline
```

## 🔐 Ambiente

```bash
# Copiar template de ambiente
cp .env.template .env

# Editar ambiente
nano .env
# ou
code .env

# Ver variáveis de ambiente (Node.js)
node -e "console.log(process.env)"
```

## 📱 Expo Go

```bash
# Instalar Expo CLI globalmente
npm install -g expo-cli

# Login no Expo
expo login

# Logout
expo logout

# Ver perfil
expo whoami

# Publicar projeto
expo publish
```

## 🎨 Desenvolvimento

```bash
# Abrir projeto no VS Code
code .

# Abrir arquivo específico
code src/screens/Auth/LoginScreen.tsx

# Procurar em arquivos
grep -r "texto" src/

# Encontrar arquivos
find . -name "*.tsx"

# Contar linhas de código
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l
```

## ⚡ Atalhos do Expo Dev Tools

No terminal onde o Expo está rodando:

```
w - Abrir no navegador
a - Abrir no Android
i - Abrir no iOS
c - Limpar cache
r - Reload
m - Toggle menu
d - Open DevTools
```

## 🐛 Solução de Problemas

```bash
# Erro de porta ocupada
# Matar processo na porta 19000
npx kill-port 19000

# Erro de permissão (Linux/Mac)
sudo chown -R $USER ~/.npm
sudo chown -R $USER /usr/local/lib/node_modules

# Reinstalar tudo
rm -rf node_modules package-lock.json
rm -rf .expo .expo-shared
npm install
npx expo start -c

# Resetar projeto Expo
expo start --clear
```

## 📚 Documentação Rápida

```bash
# Abrir documentação do Expo
open https://docs.expo.dev

# Abrir Firebase Console
open https://console.firebase.google.com

# Abrir React Native docs
open https://reactnative.dev

# Abrir React Navigation docs
open https://reactnavigation.org
```

## 🔧 Configuração do VS Code

Extensões recomendadas:
```
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
```

## 📦 Package.json Scripts

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

## 🎯 Comandos Mais Usados

```bash
# Top 5 comandos que você vai usar:
1. npm start              # Iniciar projeto
2. npx expo start -c      # Limpar cache e iniciar
3. git add . && git commit -m "msg"  # Commit rápido
4. npm install pacote     # Instalar dependência
5. code .                 # Abrir no VS Code
```

## 💡 Dicas

```bash
# Criar alias no terminal (adicione ao ~/.bashrc ou ~/.zshrc)
alias expo-clean="rm -rf node_modules .expo && npm install && npx expo start -c"
alias expo-start="npx expo start -c"
alias git-save="git add . && git commit -m"

# Uso:
expo-clean        # Limpar e reinstalar tudo
expo-start        # Iniciar com cache limpo
git-save "msg"    # Commit rápido
```

## 🚨 Emergência

Se nada funcionar:

```bash
# O "apagar e reiniciar" definitivo:
rm -rf node_modules
rm -rf .expo
rm -rf .expo-shared
rm package-lock.json
npm cache clean --force
npm install
npx expo start -c --clear
```

---

**💡 Dica:** Salve os comandos que você mais usa em um arquivo ou crie aliases!

**🔖 Favoritos:** Marque este arquivo para acesso rápido aos comandos.
