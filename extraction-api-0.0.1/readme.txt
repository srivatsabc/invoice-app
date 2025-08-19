#Start in local
uvicorn main:app --port 8090

az acr login -n crmaznazone1dev01.azurecr.io

#Docker build command for local
docker build -t crmaznazone1dev01.azurecr.io/ai/extraction-api:0.0.1 -f Dockerfile .

#Docker run command for local
docker run -d -p 8090:8090 --name extraction-api-0.0.1 crmaznazone1dev01.azurecr.io/ai/extraction-api:0.0.1

#Push
docker push crmaznazone1dev01.azurecr.io/ai/extraction-api:0.0.1



# Build the image
docker build -t gbsapinvoice01acr-gtasdmh9a5f3anbk.azurecr.io/ai/extraction-api:0.0.4 .

# Run in background (detached mode) with all the fixes
docker run -d \
  --name invoice-api \
  --shm-size=2g \
  --tmpfs /tmp:rw,size=2g \
  -p 8090:8090 \
  --restart unless-stopped \
  -e PYTHONUNBUFFERED=1 \
  -v $(pwd)/logs:/code/logs \
  -v $(pwd)/invoice_store:/code/invoice_store \
  -v $(pwd)/output:/code/output \
  gbsapinvoice01acr-gtasdmh9a5f3anbk.azurecr.io/ai/extraction-api:0.0.4
