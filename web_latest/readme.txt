#Docker build command for local
docker build -t crmaznazone1dev01.azurecr.io/fe/invoice-web:0.0.9 -f Dockerfile .

#Docker run command for local
docker run -d  -p 5173:5173 --name invoice-web:0.0.8 crmaznazone1dev01.azurecr.io/fe/invoice-web:0.0.8

#Push
docker push crmaznazone1dev01.azurecr.io/fe/invoice-web:0.0.9

