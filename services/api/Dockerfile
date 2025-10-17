FROM node:20-slim

WORKDIR /app

# Add company root certificate
COPY SOLUTEC-RootCA_base64.crt /usr/local/share/cacertificates/ 

# Install certificate tools & update CA store
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    update-ca-certificates

#Configurer npm pour utiliser le certificat
RUN npm config set cafile /usr/local/share/cacertificates/SOLUTEC-RootCA_base64.crt

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
