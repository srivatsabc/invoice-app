#Start in local
uvicorn app.main:app --port 8080

#Docker build command for local
docker build -t crmaznazone1dev01.azurecr.io/be/invoice-api:0.0.2 -f Dockerfile .

#Docker run command for local
docker run -d  -p 8088:8088 --name invoice-api-0.0.2 crmaznazone1dev01.azurecr.io/be/invoice-api:0.0.2

#Push
docker push crmaznazone1dev01.azurecr.io/be/invoice-api:0.0.2