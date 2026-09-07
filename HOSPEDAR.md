# Hospedar o jogo na internet

O caminho mais simples é GitHub + Render. O projeto já contém `package.json`, `render.yaml` e o servidor configurado para a porta da hospedagem.

## 1. Enviar o projeto para o GitHub

1. Instale e abra o [GitHub Desktop](https://desktop.github.com/).
2. Escolha **File > Add local repository**.
3. Selecione esta pasta do jogo.
4. Clique em **Publish repository**.
5. Escolha um nome, por exemplo `nocturne-investigation`.
6. Para o Render acessar o projeto, deixe o repositório público ou conecte sua conta GitHub ao Render.

Não envie nenhuma chave de API para o GitHub.

## 2. Criar o site no Render

1. Abra [render.com](https://render.com/) e entre com GitHub.
2. Clique em **New > Web Service**.
3. Selecione o repositório `nocturne-investigation`.
4. Use estas configurações:

   - **Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

5. Clique em **Create Web Service**.

Depois do deploy, o Render fornecerá um endereço parecido com:

`https://nocturne-investigation.onrender.com`

Esse endereço funcionará em computador e celular.

## 3. Atualizar o jogo depois

No GitHub Desktop:

1. Faça as alterações no projeto.
2. Escreva uma mensagem em **Summary**.
3. Clique em **Commit to main**.
4. Clique em **Push origin**.

O Render fará um novo deploy automaticamente quando detectar o envio para o GitHub.

## Observação

No plano gratuito, o serviço pode “dormir” quando fica sem acesso. O primeiro carregamento depois de algum tempo pode demorar alguns segundos. As imagens e a lógica do jogo estão incluídas no próprio projeto.
