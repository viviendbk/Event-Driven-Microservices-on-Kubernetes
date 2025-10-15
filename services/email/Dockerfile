# Use official Node.js LTS image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json & package-lock.json
COPY package*.json ./

# Add company root certificate
COPY SOLUTEC-RootCA_base64.crt /usr/local/share/cacertificates/ 

# Install certificate tools & update CA store
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    update-ca-certificates

#Configurer npm pour utiliser le certificat
RUN npm config set cafile /usr/local/share/cacertificates/SOLUTEC-RootCA_base64.crt

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Run the service
CMD ["node", "index.js"]
