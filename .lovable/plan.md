# Alinhar métricas aos painéis dos vendedores

## Implementação
- Shopee: agrupar vendas pela data de pagamento e somar o valor dos produtos com desconto, reproduzindo 27 vendas, R$ 3.352,42 e 28 itens em 10/09.
- TikTok Shop: agrupar pela data de pagamento, preservar vendas posteriormente canceladas e somar o total pago, reproduzindo 42 pedidos, R$ 2.713,24 e 47 itens em 10/09.
- Ampliar internamente a busca para capturar pedidos criados antes, mas pagos dentro do período escolhido.
- Manter os detalhes e status originais para consulta.

## Validação
- Conferir novamente o dia 10/09 e testar outros períodos no painel.
- Verificar tipos e carregamento das telas afetadas.

## Pendências externas
- Mercado Livre: a única conta conectada é uma conta sem qualquer histórico de vendas; a loja correta precisa ser reconectada no Tiops.
- Shein: os 15 pedidos e 18 itens estão corretos, mas nenhum campo disponível nos pedidos reproduz R$ 1.183,69. O valor financeiro oficial exige outra referência/relatório do painel.

## Detalhes técnicos
- A API da Shopee e a do TikTok filtram a busca por criação, mas seus painéis consolidam por pagamento. A aplicação buscará uma margem adicional e filtrará localmente pelo horário de pagamento em Brasília.
