# Keep Alive do Render

O endpoint público para monitoramento é:

`https://SEU-ENDERECO.onrender.com/health`

Configure um monitor HTTP externo para fazer uma requisição `GET` para esse endereço a cada 10 ou 14 minutos.

Importante: o monitor precisa ser externo ao Render. Um timer dentro do próprio Node não impede a suspensão, porque o processo pode ser desligado antes de executar o próximo timer.

## Configuração recomendada

- Método: `GET`
- URL: endereço público do jogo + `/health`
- Intervalo: 10–14 minutos
- Resposta esperada: HTTP `200`

Isso reduz a chance de o serviço entrar em suspensão, mas não impede reinícios de manutenção, limites do plano gratuito ou eventuais indisponibilidades do Render. A garantia de serviço sempre ativo continua sendo um plano pago.
