#Docker build command for local
docker build -t gbsapinvoice01acr-gtasdmh9a5f3anbk.azurecr.io/fe/invoice-web:0.0.3 -f Dockerfile .

#Docker run command for local
docker run -d  -p 5173:5173 --name invoice-web-0.0.1 gbsapinvoice01acr-gtasdmh9a5f3anbk.azurecr.io/fe/invoice-web:0.0.3

#Push
docker push gbsapinvoice01acr-gtasdmh9a5f3anbk.azurecr.io/fe/invoice-web:0.0.3

