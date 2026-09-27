# Água Condomínio — V2.1

Aplicativo PWA para leitura de 80 hidrômetros residenciais + 1 medidor principal.

## V2.1
- Sem login.
- Seleção e navegação por mês de referência.
- Fechamento mensal.
- Gráfico de consumo residencial por unidade.
- Controle da diferença entre medidor principal e soma das unidades.
- Percentual da diferença em relação ao principal.
- Alertas automáticos: leitura regressiva, consumo acima de 150% da média histórica e consumo zerado.
- Histórico consolidado por período.
- CSV, impressão/PDF, backup e restauração JSON.
- Fotos e OCR experimental.
- Dados continuam armazenados localmente no aparelho.

## Publicação
Substitua os arquivos da V2 no repositório GitHub pelos arquivos desta pasta e publique pelo GitHub Pages.

## Importante
A V2.1 mantém a mesma chave de armazenamento da V2 (`agua_condominio_v2_data`) para preservar as leituras já registradas no aparelho.


## V2.1.1
- A leitura anterior agora é editável.
- O campo indica o mês de referência anterior (por exemplo, agosto/2026 para setembro/2026).
- O valor informado é usado no cálculo do consumo mensal e é carregado automaticamente como referência nos meses seguintes quando houver leitura registrada.


V2.1.7: tela para cadastro em massa das leituras de referência do mês anterior, preservando o histórico mensal e preenchendo automaticamente a leitura anterior no cadastro das unidades.
