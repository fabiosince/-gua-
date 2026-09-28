# Tangará Residencial — pacote Android

Este diretório é um **kit de empacotamento Android (TWA)** para transformar a PWA publicada no GitHub Pages em um APK instalável.

A aplicação continua sendo a mesma PWA; o APK abre o endereço publicado como Trusted Web Activity.

## Endereço da PWA

https://fabiosince.github.io/-gua-/

## Gerar o APK

No computador com Node.js, Java e Android Build Tools:

```bash
npx @bubblewrap/cli build --manifest=twa-manifest.json
```

O Bubblewrap gera um APK assinado quando a chave de assinatura está configurada. Para uma distribuição permanente, mantenha a mesma chave de assinatura para futuras atualizações.

O arquivo `twa-manifest.json` já está configurado para:

- pacote: `io.github.fabiosince.tangara`
- versão: `2.30.0`
- orientação: retrato
- nome no Android: `Tangará Água`
- URL inicial: `/-gua-/`

A documentação do Bubblewrap informa que o comando `build` gera um APK assinado e também um App Bundle; o primeiro build instala os Android Build Tools necessários. 
