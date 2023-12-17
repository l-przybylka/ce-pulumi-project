# Welcome to Infrastructure as Code for smart home applications 👋

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000)

> The goal of the project was to build IaC on AWS using Pulumi instead of Terraform which will allow the deployment of three smart home monitoring apps heating and lights, and the status of the previous two. To achieve this goal I've provisioned a VPC on AWS and used EC2 Unbuntu instances on which the apps were deployed. The apps made use of DynamoDB tables as their databases.
>
> To ensure that the infrastructure is as failsafe as possible, I've implemented a load balancer and autoscaling groups which ensure that multiple versions of the applications are running.
>
> My biggest challenge in this project was to learn how to use Pulumi with TypeScript and OOP to provision IaC.


## Install
<br>

[Follow the Pulumi installation steps for your system](https://www.pulumi.com/docs/install)

## Usage
<br>
### Step 1: After logging in to AWS in the CLI, initialise Pulumi in its directory
<br>

```
~$ cd pulumi-project
~/pulumi-project$ npm i
```

### Step 2: Update the Pulumi.dev.yaml file
<br>

> You must add your IP address and Access Key generated in AWS to be able to use the project. Here you can also customise the project specifications
```diff

config:
# sets region where the IaC will be provisioned
  aws:region: eu-west-2
# sets object with DynamoDB table names
  pulumi-project:dynamo:
    tables:
      - lights
      - heating
# sets object with services to be deployed on EC2 instances as well as the type of the instances
  pulumi-project:ec2:
    services:
      - lights
      - heating
      - status
    type: t2.micro
# sets the object with the VPC specifications: availability zones, cidr block, cidr blocks for public and private subnets 
  pulumi-project:vpc:
    azs:
      - eu-west-2a
      - eu-west-2b
      - eu-west-2c
    cidr: 10.0.0.0/20
    name: home-management-pulumi
    private_subnets:
      - 10.0.8.0/24
      - 10.0.9.0/24
      - 10.0.10.0/24
    public_subnets:
      - 10.0.0.0/24
      - 10.0.1.0/24
      - 10.0.2.0/24
# sets the object with your IP and the access key
  pulumi-project:yourDetails:
    yourAccessKey: YOUR_ACCESS_KEY
    yourIP: YOUR_IP


```

### Step 3: Run pulumi up to create the infrastructure on AWS
<br>

```
~/pulumi-project$ pulumi up
```

### Step 4: SSH into your servers and install your microservers
<br>

a) Set up node, npm and pm2 on each of the servers using the command below.
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash &&
. ~/.nvm/nvm.sh &&
nvm install --lts &&
npm install pm2@latest -g
```
<br>
b) Clone and install the services.
<br>
<br>
c) Use the following commands in your ec2 to make sure the autoscaling servers will run the application on start-up.

```
ec2-server-ssh$ pm2 start <your application>
ec2-server-ssh$ pm2 startup
ec2-server-ssh$ pm2 save
```

## Modules
<br>

> The project is divided into the following modules:
### Networking
> The Networking module provisions VPC and creates public and private subnets. As well as set up a route table and internet gateway for the public subnets.
### Security
> The security module creates security groups to be used throughout the infrastructure, it controls the incoming and outgoing traffic. By default, the security groups will allow SSH connections from the provided IP, HTTP and HTTPS traffic on ports 80 and 3000 as well as allow all outgoing traffic.
### App servers
> The app servers module looks up the latest Ubuntu version and provisions three EC2 instances on which our apps will be deployed.
### Database
> The database module creates two DynamoDB tables which are required for Heating and Lights applications.
### Load balancing
> The load balancing module creates target groups for each of the deployed services and attaches them to the load balancer. The load balancer has a listener rule for each of the apps to direct the traffic accordingly.
### Auto-scaling
> This module should be used after the deployment of the applications on the EC2 services. It creates AMI from those instances as well as launch templates which are then used in the auto-scaling group which is responsible for keeping up the desirable amount of instances.

## Author

👤 **Lukasz Przybylka**

- LinkedIn: [@lukasz-przybylka\/](https://linkedin.com/in/lukasz-przybylka/)
