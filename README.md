# Acompanhamento — app Android nativo

Este é o mesmo aplicativo de acompanhamento de desmame, agora como um app
Android nativo (não mais um PWA hospedado). A interface (telas, formulários,
gráficos) continua sendo o mesmo HTML/CSS/JS de sempre — o que mudou foi
a camada de armazenamento: em vez de IndexedDB (dados de navegador, sujeitos
à limpeza automática do sistema), os dados agora ficam em **SQLite dentro do
armazenamento privado do app**, que o Android só remove se você desinstalar
o app ou limpar os dados dele manualmente em Configurações.

## O que muda na prática

- Os dados NUNCA são apagados automaticamente pelo sistema por falta de espaço
  (o problema original que motivou esta mudança).
- O app não usa internet em nenhum momento — não há sequer a permissão de
  internet declarada no `AndroidManifest.xml`.
- Exportar backup agora salva o arquivo diretamente na pasta **Downloads**
  do celular (em vez do mecanismo de "download do navegador").
- Importar backup abre o seletor de arquivos nativo do Android.
- **Os backups são compatíveis com a versão web**: um arquivo `.json`
  exportado do PWA antigo (hospedado no GitHub Pages) pode ser importado
  aqui, e vice-versa — o formato do arquivo é idêntico.

## Como compilar (três caminhos, do mais simples ao mais avançado)

### Caminho A — Nuvem via GitHub Actions (recomendado, nada para instalar)

1. Crie um repositório novo no GitHub (pode ser público ou privado) chamado,
   por exemplo, `desmame-app-android`.
2. Faça upload de **todo o conteúdo desta pasta** `android-app/` para a
   **raiz** desse repositório (ou seja, `build.gradle.kts` e `settings.gradle.kts`
   ficam direto na raiz do repositório, não dentro de uma subpasta) — inclua
   também a pasta oculta `.github/`, que contém o arquivo de automação
   (`.github/workflows/build-apk.yml`). Alguns uploaders do GitHub escondem
   pastas que começam com ponto; se o "Upload files" da interface web não
   mostrar essa pasta, você pode criá-la manualmente pela própria interface
   do GitHub (Add file → Create new file → digite o caminho completo
   `.github/workflows/build-apk.yml` e cole o conteúdo).
3. Vá na aba **Actions** do repositório. Se aparecer um aviso pedindo para
   habilitar Actions, clique para habilitar.
4. Clique no workflow **"Compilar APK"** na lista à esquerda, depois no
   botão **"Run workflow"** (canto superior direito) → **Run workflow**
   de novo para confirmar.
5. Aguarde de 3 a 6 minutos (a página atualiza sozinha o status).
6. Quando terminar com um ✅ verde, clique na execução concluída, role até
   **Artifacts** e baixe **acompanhamento-debug-apk** (vem como .zip contendo
   o `.apk` dentro).
7. Transfira o `.apk` para o celular (Google Drive, e-mail para si mesmo,
   cabo USB) e toque nele para instalar — talvez seja preciso permitir
   "instalar de fontes desconhecidas" na primeira vez.

Esse caminho não instala nada no seu computador — tudo roda nos servidores
do GitHub.

### Caminho B — Só as ferramentas de linha de comando (sem Android Studio)

1. Instale o JDK 17 (ex.: [Eclipse Temurin](https://adoptium.net/)).
2. Baixe as **"Command line tools only"** em
   https://developer.android.com/studio#command-tools (bem mais leve que o
   Android Studio completo).
3. Extraia e use o `sdkmanager` para instalar as peças necessárias:
   ```
   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
   ```
4. Dentro da pasta `android-app`, rode:
   ```
   gradle assembleDebug
   ```
   (se não tiver o Gradle instalado, baixe em https://gradle.org/install/ —
   é só um .zip, sem instalador).
5. O `.apk` aparece em `app/build/outputs/apk/debug/app-debug.apk`.

### Caminho C — Android Studio completo

Descrito mais abaixo, para quem preferir a experiência com interface gráfica.


1. Instale o [Android Studio](https://developer.android.com/studio) (gratuito).
2. Abra o Android Studio → **Open** → selecione a pasta `android-app` (a pasta
   que contém `settings.gradle.kts`).
3. Se o Android Studio perguntar sobre o Gradle Wrapper ausente, aceite —
   ele baixa e configura sozinho (**precisa de internet nesta etapa,
   só na primeira vez**).
4. Aguarde a sincronização do Gradle terminar (barra de progresso embaixo).
5. Conecte seu celular Android por USB com a **depuração USB** ativada
   (Configurações → Sobre o telefone → toque 7x em "Número da versão" para
   liberar as "Opções do desenvolvedor", depois ative "Depuração USB" lá).
6. Clique no botão verde ▶ (Run) no topo do Android Studio, escolha seu
   aparelho na lista e aguarde a instalação.

Alternativamente, para gerar um `.apk` instalável sem precisar do cabo USB:
**Build → Build Bundle(s) / APK(s) → Build APK(s)**. O arquivo gerado fica em
`app/build/outputs/apk/debug/app-debug.apk` — copie esse arquivo para o
celular (por cabo, e-mail para si mesmo, etc.) e toque nele para instalar
(pode ser preciso permitir "instalar de fontes desconhecidas" nas
configurações do Android na primeira vez).

## Requisitos

- Android 10 (API 29) ou mais recente no celular.
- Só a primeira compilação precisa de internet (para baixar o Gradle e as
  ferramentas de build). O app instalado funciona 100% offline, sempre.

## Migrando seus dados da versão web (PWA) para este app

1. Na versão web (GitHub Pages), vá em **Mais → Exportar backup (JSON)**.
2. Instale este app nativo no celular.
3. Abra o app nativo → **Mais → Importar backup (JSON)** → selecione o
   arquivo exportado no passo 1.

## Estrutura do projeto

```
android-app/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/desmame/tracker/
│       │   ├── MainActivity.kt       (WebView + seletor de arquivo nativo)
│       │   ├── WebAppInterface.kt    (ponte JS ↔ Android)
│       │   └── DbHelper.kt           (SQLite)
│       ├── res/                       (ícones, tema)
│       └── assets/www/                (o mesmo app HTML/CSS/JS de sempre)
├── build.gradle.kts
└── settings.gradle.kts
```
