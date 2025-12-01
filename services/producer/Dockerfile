# Use official Node.js LTS image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json & package-lock.json
COPY ./services/producer/src/package*.json ./

# Add company root certificate
COPY certs/SOLUTEC-RootCA_base64.crt /usr/local/share/ca-certificates/

# Install certificate tools & update CA store
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    update-ca-certificates

#Configurer npm pour utiliser le certificat
RUN npm config set cafile /usr/local/share/cacertificates/SOLUTEC-RootCA_base64.crt
RUN npm config set strict-ssl false

# Install dependencies
RUN npm install --production

# Copy source code
COPY services/producer/src/ .

# Expose port (optional, if service needs HTTP)
EXPOSE 3000

# This allows it to run the "node --require ./instrumentation.js ..." command defined in package.json
CMD ["npm", "start"]
