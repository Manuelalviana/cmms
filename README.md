# CMMS

Sistema de gestão de máquinas e manutenções com interface web, API REST, Node.js, Express e MySQL/MariaDB.

## Requisitos

- Node.js 18 ou superior
- MySQL ou MariaDB em execução

## Executar localmente

1. Clone o repositório e abra a pasta do projeto:

   ```cmd
   git clone git@github.com:Manuelalviana/cmms.git
   cd cmms
   ```

2. Crie o banco e importe `cmms.sql` pelo phpMyAdmin ou cliente MySQL.
   O arquivo cria o banco `cmms` e inclui dados de exemplo. A collation foi
   definida como `utf8mb4_unicode_ci` para compatibilidade com MariaDB.

3. Se necessário, ajuste host, porta, usuário, senha e nome do banco em
   `database.js` para corresponder à configuração local do MySQL/MariaDB.

4. Instale as dependências e inicie a aplicação:

   ```cmd
   npm install
   npm run startfrontend
   ```

5. Acesse <http://localhost:3000>.

O comando `npm start` também inicia o mesmo servidor, que entrega a interface
da pasta `frontend` e atende à API.

## API REST

| Método | Rota | Operação |
| --- | --- | --- |
| GET | `/api/health` | Verifica se a API está ativa |
| GET, POST | `/api/maquinas` | Lista ou cadastra máquinas |
| PUT, DELETE | `/api/maquinas/:id` | Atualiza ou exclui uma máquina |
| GET, POST | `/api/manutencoes` | Lista ou cadastra manutenções |
| PUT, DELETE | `/api/manutencoes/:id` | Atualiza ou exclui uma manutenção |

As rotas `GET /maquinas` e `GET /manutencoes` também permanecem disponíveis
para compatibilidade.
