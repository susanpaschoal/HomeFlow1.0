# HomeFlow - Product Requirements

## Visão
Aplicativo mobile premium (React Native / Expo) para casais e famílias organizarem casa, finanças, tarefas, compras e agenda em um único lugar, com assistente de IA integrada.

## Stack
- Frontend: Expo Router + React Native + expo-blur + expo-linear-gradient + Ionicons
- Backend: FastAPI + MongoDB + Motor
- Auth: JWT customizado com bcrypt
- IA: Emergent Universal LLM Key com GPT-4o-mini via `emergentintegrations`

## Escopo do MVP (implementado)
### Autenticação
- Login, Cadastro (JWT) com email/senha
- Persistência do token em AsyncStorage
- Sistema de papéis: admin (padrão)
- **Founder Access** vitalício via lista no backend (`FOUNDER_EMAILS`): susanrodriguesp@gmail.com, martins.kmsp@gmail.com
- Emails Founder recebem badge "Premium Founder ✔" e `is_premium = true` automaticamente

### Tela Inicial (Home)
- Hero com imagem + gradient + glass card com saldo total, receitas e despesas do mês
- Cards inteligentes (grid 2x2): carteiras, tarefas pendentes, compras pendentes, eventos
- Próximas tarefas
- Metas com barra de progresso
- Frase motivacional da IA
- Botões rápidos: agenda, IA, perfil

### Finanças (3 abas: Visão Geral / Metas / Cartões)
- **Carteiras**: Corrente, Poupança, Dinheiro, PIX, Investimentos, Compartilhada
- **Transações**: receita/despesa com categoria e descrição — atualiza saldo da carteira automaticamente
- **Metas**: com barra de progresso (nome, alvo, economizado)
- **Cartões**: com limite, fechamento e vencimento

### Tarefas (Kanban leve)
- Categorias: Casa, Limpeza, Pets, Filhos, Mercado, Documentos, Outros
- Status: A fazer / Em andamento / Concluído (toggle circular)
- Prioridade: baixa / média / alta

### Mercado
- Lista compartilhada com categorias (Mercado, Farmácia, Construção, Pets, Eletrônicos, Outros)
- Quantidade, preço opcional, prioridade
- Estimativa total do carrinho pendente
- Marcar como comprado

### Agenda
- Eventos com data, hora, categoria (Evento, Consulta, Viagem, Reunião, Aniversário, Pagamento, Lembrete)

### Perfil
- Avatar, nome, email
- Badge "Premium Founder" ou "Premium"
- Aparência: Claro / Escuro / Sistema
- Sair da conta

### IA Assistente
- Chat integrado que recebe contexto financeiro do usuário
- 4 sugestões prontas
- Persistência do histórico no MongoDB

## Design
- Paleta Sage Green (`#2D5A46`/`#5CB88E`) — sem azul/roxo/índigo
- Modo claro e escuro (respeita sistema)
- Tipografia Plus Jakarta Sans (System fallback)
- Chip rows horizontais que rolam (sem quebra de linha)
- Bottom tabs com blur no iOS
- Modais bottom-sheet-like para criação
- Copy em Português-BR

## Fora do MVP (próximas iterações)
- Google Login / Apple Login
- Recuperação de senha por email
- Google Calendar sync
- Notificações push
- Organização da Casa (cômodos, garantias)
- Inventário (objetos, QR code)
- Documentos criptografados
- Gamificação e ranking
- Compartilhamento em tempo real entre membros da família
- Modo offline com sync

## APIs (backend)
- `/api/auth/{register,login,me}`
- `/api/wallets` (GET/POST/DELETE)
- `/api/transactions` (GET/POST/DELETE)
- `/api/cards` (GET/POST/DELETE)
- `/api/goals` (GET/POST/PATCH/DELETE)
- `/api/tasks` (GET/POST/PATCH/DELETE)
- `/api/shopping` (GET/POST/PATCH/DELETE)
- `/api/events` (GET/POST/DELETE)
- `/api/dashboard/summary`
- `/api/ai/chat`, `/api/ai/history`
- `/api/founders`
