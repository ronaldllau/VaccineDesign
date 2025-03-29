# AWS ECS Deployment Guide for TransHLA Predictor

This guide provides step-by-step instructions for deploying the TransHLA Predictor application to AWS Elastic Container Service (ECS).

## Prerequisites

- AWS account with necessary permissions
- AWS CLI installed and configured
- Docker installed locally
- Git for cloning repositories

## Build and Push Docker Image

1. **Build the Docker image locally**:

```bash
# Clone the repository
git clone https://github.com/yourusername/VaccineDesign.git
cd VaccineDesign

# Build the Docker image
docker build -t transhla-predictor .
```

2. **Create an ECR repository**:

```bash
aws ecr create-repository --repository-name transhla-predictor
```

3. **Tag and push the image to ECR**:

```bash
# Get the ECR login command
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag the image
docker tag transhla-predictor:latest YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/transhla-predictor:latest

# Push the image
docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/transhla-predictor:latest
```

## Set Up ECS Cluster

1. **Create an ECS cluster**:
   - Go to the ECS console at https://console.aws.amazon.com/ecs/
   - Click "Create Cluster"
   - Select "EC2 Linux + Networking"
   - Enter a cluster name (e.g., "transhla-cluster")
   - Configure instance type (recommended at least t3.medium or larger for ML models)
   - Set the number of instances (start with 1)
   - Create or select a key pair for SSH access
   - Configure networking options (VPC, subnets)
   - Click "Create"

## Create Task Definition

1. **Create a task definition**:
   - In the ECS console, go to "Task Definitions"
   - Click "Create new Task Definition"
   - Select "EC2" launch type
   - Enter a task definition name (e.g., "transhla-task")
   - Set Task memory to at least 2GB and CPU to at least 1 vCPU
   - Add a container:
     - Container name: "transhla-predictor"
     - Image: YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/transhla-predictor:latest
     - Memory Limits: Set hard limit to at least 2048 MB
     - Port mappings: 5000:5000
   - Click "Add" to add the container
   - Click "Create" to create the task definition

## Create ECS Service

1. **Create a service**:
   - In the ECS console, navigate to your cluster
   - Click "Services" and then "Create"
   - Service name: "transhla-service"
   - Task definition: Select the task definition you created
   - Number of tasks: 1
   - Deployment type: Rolling update
   - Configure networking:
     - Select your VPC and subnets
     - Security groups: Create a new one with inbound TCP port 5000 open
   - Load balancing (optional):
     - Add an Application Load Balancer for better availability
     - Configure health checks
   - Auto Scaling (optional):
     - Configure if needed based on expected traffic
   - Click "Create Service"

## Access the Application

1. **Find the public IP**:
   - Once your service is running, go to the "Tasks" tab
   - Click on the running task
   - Find the "Public IP" in the details
   - Access your application at http://PUBLIC_IP:5000

2. **If you used a load balancer**:
   - Find the DNS name of your load balancer
   - Access your application at http://YOUR_LOAD_BALANCER_DNS

## Optimizations for Production

1. **Use AWS Fargate** for serverless container execution if your application doesn't need constant running (pay-per-use)

2. **Set up CloudWatch Alarms** to monitor:
   - CPU and memory utilization
   - Application errors
   - Request latency

3. **Configure Auto Scaling** based on:
   - CPU utilization
   - Memory utilization
   - Number of requests

4. **Set up CI/CD pipeline** with:
   - AWS CodeBuild
   - AWS CodePipeline
   - Amazon ECR for container registry

5. **Consider using AWS EFS** for persistent storage if needed

6. **Use AWS Secrets Manager** for storing sensitive information

7. **Set up proper IAM roles** with the principle of least privilege

## Cost-Saving Tips

1. **Right-size your instances** - Start with smaller instances and scale up as needed

2. **Use Spot Instances** for development/testing environments

3. **Schedule scaling** - If your application has predictable usage patterns, schedule scaling to reduce instances during low-traffic periods

4. **Use Application Auto Scaling** to automatically adjust the desired count of tasks in your service

5. **Monitor your costs** with AWS Cost Explorer and AWS Budgets 