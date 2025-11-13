# Event-Driven Microservices on Kubernetes

This project demonstrates an **event-driven microservices architecture** deployed on **Kubernetes**, using **Kafka** as the message broker. It includes multiple services communicating asynchronously and exposes an API to query Kafka topics.

## Table of Contents

1. [Project Overview](#project-overview)  
2. [Architecture](#architecture)  
3. [Services](#services)  
4. [Local Setup](#local-setup)  
5. [Network Policies](#network-policies)  
6. [Scaling with HPA](#scaling-with-hpa)  

---

## Project Overview

The project implements a microservices system where messages are produced, consumed, and exposed through an API. It demonstrates:

- Event-driven communication via Kafka  
- Service isolation using **NetworkPolicies**  
- Load balancing and routing with **Ingress NGINX**  
- Automatic scaling via **Horizontal Pod Autoscaler (HPA)**  

---

## Architecture

+----------------+ +------------------+ +----------------+
| Producer | ----> | Kafka Cluster | ----> | Consumer |
| Service | | (StatefulSet, | | Service |
| (Node.js) | | KRaft mode) | | (Node.js) |
+----------------+ +------------------+ +----------------+
|
v
+----------------+
| API Service |
| (Node.js/Express|
| KafkaJS client) |
+----------------+


### Components

1. **Kafka Cluster**:  
   - StatefulSet with 3 brokers  
   - KRaft mode (no Zookeeper)  
   - Each broker has a unique ID (`KAFKA_NODE_ID`)  
   - Topics are replicated across brokers with configurable partitions  

2. **Producer Service**:  
   - Sends messages to Kafka topics  

3. **Consumer Service**:  
   - Subscribes to Kafka topics and processes messages  

4. **API Service**:  
   - Provides endpoints to query messages from Kafka  
   - `/messages?topic=...&limit=...` to get the last messages  
   - `/health` for service health check  

5. **Ingress Controller**:  
   - NGINX-based ingress routes external traffic to API service  

6. **Network Policies**:  
   - Restrict traffic between services to enforce security  

7. **HPA (Horizontal Pod Autoscaler)**:  
   - Automatically scales services based on CPU usage  

---

## Services

| Service         | Port | Description                               |
|-----------------|------|-------------------------------------------|
| producer-service | N/A  | Sends messages to Kafka topics             |
| consumer-service | N/A  | Consumes messages from Kafka topics       |
| api-service      | 3000 | Provides HTTP API to query Kafka messages |

---

## Local Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)  
- [Minikube](https://minikube.sigs.k8s.io/docs/)  
- [kubectl](https://kubernetes.io/docs/tasks/tools/)  
- [Helm](https://helm.sh/docs/intro/install/)  

### Steps

1. **Start Minikube**:

```bash
minikube start
```

1. **Install dependencies**

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install ingress ingress-nginx/ingress-nginx -n dev
helm install prometheus prometheus-community/kube-prometheus-stack -n dev
```

2. **Deploy local chart**

```bash
helm repo update
helm install my-chart /chart/mychart -n dev
```

1. **port forwarding & add local host**

```bash
kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n dev & \
kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n dev & \
kubectl port-forward svc/kube-prometheus-stack-alertmanager 9093:9093 -n dev & \
kubectl port-forward svc/api-service 8080:80 -n dev

sudo nano /etc/hosts
add :
127.0.0.1       api.dev.local
```

4. **test api**

```bash
curl api.dev.local:8080/messages
```

5. **monitor application**

localhost:9090 for prometheus
localhost:3000 for grafana

credentials for grafana:
admin
prom-operator
