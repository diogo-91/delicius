# Kamanda AI

Base inicial de um SaaS multitenant para restaurantes, pizzarias, hamburguerias, marmitarias e operacoes de delivery pelo WhatsApp.

## Stack

- Next.js App Router com TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL e RLS
- Preparado para Evolution API em `src/integrations/whatsapp`
- Preparado para agente OpenAI em `src/ai-agent`

## Fluxo MVP

1. O restaurante acessa `/dashboard/produtos` e cadastra produtos.
2. O cliente acessa `/cardapio/kamanda-burger`, adiciona itens ao carrinho e finaliza o pedido.
3. O pedido fica salvo no navegador via mock store e aparece em `/dashboard/pedidos`.
4. O operador muda o status no kanban.

Nesta primeira entrega, a persistencia funcional usa `localStorage` para permitir validar o fluxo sem credenciais. O schema real do Supabase esta em `supabase/migrations/001_initial_schema.sql`.

## Estrutura

- `src/app/(auth)`: login, cadastro e recuperacao de senha
- `src/app/(admin)/dashboard`: painel administrativo
- `src/app/cardapio/[slug]`: cardapio publico
- `src/components`: componentes reutilizaveis
- `src/lib/data`: seed e store local temporario
- `src/lib/supabase`: clients Supabase
- `src/types`: tipos de dominio
- `supabase/migrations`: schema PostgreSQL inicial

## Rodando localmente

```bash
npm install
npm run dev
```

Crie `.env.local` a partir de `.env.example` quando for conectar no Supabase.
