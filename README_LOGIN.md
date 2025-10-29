# Sistema de Login - Configuração

## 1. Criar tabela de administradores

Execute o SQL no banco de dados:

```sql
CREATE TABLE IF NOT EXISTS `administradores` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario` varchar(100) COLLATE utf8mb4_general_ci NOT NULL UNIQUE,
  `senha` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `nome` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `ultimo_acesso` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

## 2. Criar usuário admin

Execute o script para criar o usuário admin padrão:

```bash
npm run create-admin
```

Isso criará um usuário com:
- **Usuário:** admin
- **Senha:** admin123
- **Nome:** Administrador

⚠️ **IMPORTANTE:** Altere a senha após o primeiro acesso!

## 3. Configurar variáveis de ambiente

Adicione no arquivo `.env`:

```
JWT_SECRET=sua-chave-secreta-super-segura-aqui
```

## 4. Rotas de Autenticação

- `POST /auth/login` - Login
- `GET /auth/verify` - Verificar token

## 5. Rotas Protegidas

Todas as rotas `/admin/*` agora requerem autenticação via JWT.

