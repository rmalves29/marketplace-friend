CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  channel text NOT NULL DEFAULT 'shopee',
  city text,
  state text,
  total_spent numeric NOT NULL DEFAULT 0,
  orders_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  channel text NOT NULL DEFAULT 'shopee',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  status text NOT NULL DEFAULT 'pending',
  total numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  items_count integer NOT NULL DEFAULT 1,
  placed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  title text NOT NULL,
  channel text NOT NULL DEFAULT 'shopee',
  price numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access products" ON public.products FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'shopee',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  subject text,
  body text NOT NULL,
  answered boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'tiktok',
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  spend numeric NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  started_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO anon, authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access ad_campaigns" ON public.ad_campaigns FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL UNIQUE,
  label text NOT NULL,
  connected boolean NOT NULL DEFAULT false,
  last_sync_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO anon, authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public access integrations" ON public.integrations FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.integrations (channel, label, connected, notes) VALUES
  ('shopee', 'Shopee', false, 'Conectar via Tiops Marketplace Connect'),
  ('shein', 'Shein', false, 'Conectar via Tiops Marketplace Connect'),
  ('tiktok', 'TikTok Shop', false, 'Conectar via Tiops Marketplace Connect'),
  ('mercadopago', 'Mercado Pago', false, 'Conectar via Tiops Marketplace Connect');

INSERT INTO public.customers (id, name, email, phone, channel, city, state, total_spent, orders_count) VALUES
  ('11111111-1111-1111-1111-111111111111','Ana Souza','ana.souza@email.com','(11) 98888-1010','shopee','São Paulo','SP',1240.50,7),
  ('22222222-2222-2222-2222-222222222222','Bruno Lima','bruno.lima@email.com','(21) 97777-2020','shein','Rio de Janeiro','RJ',689.90,4),
  ('33333333-3333-3333-3333-333333333333','Carla Mendes','carla.mendes@email.com','(31) 96666-3030','tiktok','Belo Horizonte','MG',2310.00,11),
  ('44444444-4444-4444-4444-444444444444','Diego Rocha','diego.rocha@email.com','(41) 95555-4040','mercadopago','Curitiba','PR',432.20,2),
  ('55555555-5555-5555-5555-555555555555','Elaine Castro','elaine.castro@email.com','(51) 94444-5050','shopee','Porto Alegre','RS',158.00,1);

INSERT INTO public.orders (order_number, channel, customer_id, customer_name, status, total, shipping_cost, items_count, placed_at) VALUES
  ('SHP-10231','shopee','11111111-1111-1111-1111-111111111111','Ana Souza','delivered',189.90,19.90,2, now() - interval '2 days'),
  ('SHP-10245','shopee','55555555-5555-5555-5555-555555555555','Elaine Castro','pending',158.00,0,1, now() - interval '5 hours'),
  ('SHE-77120','shein','22222222-2222-2222-2222-222222222222','Bruno Lima','shipped',249.00,24.90,3, now() - interval '1 day'),
  ('TTS-55010','tiktok','33333333-3333-3333-3333-333333333333','Carla Mendes','processing',412.70,0,4, now() - interval '8 hours'),
  ('TTS-55044','tiktok','33333333-3333-3333-3333-333333333333','Carla Mendes','delivered',97.50,12.00,1, now() - interval '6 days'),
  ('MP-90233','mercadopago','44444444-4444-4444-4444-444444444444','Diego Rocha','cancelled',215.10,18.00,2, now() - interval '3 days');

INSERT INTO public.products (sku, title, channel, price, stock, status) VALUES
  ('SKU-001','Fone Bluetooth TWS Pro','shopee',129.90,42,'active'),
  ('SKU-002','Camiseta Oversized Algodão','shein',79.90,8,'active'),
  ('SKU-003','Ring Light 26cm com Tripé','tiktok',159.00,0,'out_of_stock'),
  ('SKU-004','Smartwatch Series 9','mercadopago',349.00,15,'active'),
  ('SKU-005','Case Transparente iPhone','shopee',29.90,120,'active');

INSERT INTO public.messages (channel, customer_id, customer_name, subject, body, answered, received_at) VALUES
  ('shopee','11111111-1111-1111-1111-111111111111','Ana Souza','Prazo de entrega','Oi, meu pedido chega até sexta?', false, now() - interval '3 hours'),
  ('shein','22222222-2222-2222-2222-222222222222','Bruno Lima','Troca de tamanho','Posso trocar a camiseta por M?', false, now() - interval '1 day'),
  ('tiktok','33333333-3333-3333-3333-333333333333','Carla Mendes','Nota fiscal','Preciso da nota fiscal do pedido TTS-55044.', true, now() - interval '4 days');

INSERT INTO public.ad_campaigns (channel, name, status, spend, revenue, clicks, conversions, started_at) VALUES
  ('tiktok','TikTok Ads - Ring Light','active',850.00,3120.00,4210,86, current_date - 14),
  ('shopee','Shopee Ads - Fones','active',420.00,1890.00,2310,54, current_date - 9),
  ('shein','Shein Boost - Verão','paused',180.00,410.00,930,12, current_date - 22);