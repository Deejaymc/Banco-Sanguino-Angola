# Remix of Blood Bank Connect

Excelente ideia, Dislandis! Um aplicativo de banco de sangue com gestão via portal pode ser estruturado em dois grandes módulos:

📱 Aplicativo para Doadores

Registro de doador: cadastro com dados pessoais, tipo sanguíneo, histórico de doações.

Agendamento de doação: escolha de data, hora e local.

Notificações: lembretes de próxima doação, campanhas urgentes (ex.: falta de sangue O-).

Carteira digital: histórico de doações, pontos de fidelidade ou certificados.

Geolocalização: mapa com centros de coleta próximos.

💻 Portal de Gestão (Administração)

Gestão de doadores: visualizar cadastros, histórico e frequência.

Gestão de estoque: monitorar níveis de sangue por tipo (A+, O-, etc.).

Campanhas: criar e divulgar campanhas de urgência.

Relatórios: estatísticas de doações, estoque e demanda.

Integração com hospitais: permitir que hospitais solicitem unidades de sangue diretamente.

🔗 Fluxo básico

O doador baixa o app e se registra.

O sistema valida dados e vincula ao portal.

O doador agenda uma doação → o centro de coleta recebe notificação.

Após a doação, o estoque é atualizado no portal.

Hospitais podem consultar disponibilidade e solicitar unidades.

Isso cria um ecossistema transparente: o doador vê seu impacto, os gestores controlam o estoque, e os hospitais têm acesso rápido.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/de23616a-e360-46d8-b389-2bf3f44d45ec).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
