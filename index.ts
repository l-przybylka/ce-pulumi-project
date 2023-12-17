import * as pulumi from "@pulumi/pulumi";
import { Networking } from "./Components/Networking";
import { SecurityGroups } from "./Components/Security";
import { AppServers } from "./Components/AppServers";
import { DynamoDB } from "./Components/DynamoDB";
import { LoadBalancing } from "./Components/LoadBalancing";
import { AutoScaling } from "./Components/AutoScaling";

interface vpc {
  name: string;
  cidr: string;
  azs: string[];
  public_subnets: string[];
  private_subnets: string[];
}

interface ec2 {
  type: string;
  services: string[];
}

interface yourDetails {
  yourIP: string;
  yourAccessKey: string;
}

interface dynamo {
  tables: string[];
}

let config = new pulumi.Config();
let vpc = config.requireObject<vpc>("vpc");
let yourDetails = config.requireObject<yourDetails>("yourDetails");
let ec2 = config.requireObject<ec2>("ec2");
let dynamo = config.requireObject<dynamo>("dynamo");
let testVpc = config.requireObject("testVpc");

const main = new Networking({
  name: vpc.name,
  cidr: vpc.cidr,
  azs: vpc.azs,
  private_subnets: vpc.private_subnets,
  public_subnets: vpc.public_subnets,
});

const security = new SecurityGroups({
  name: `${vpc.name}-security-groups`,
  vpcId: main.vpc.id,
  yourIP: yourDetails.yourIP,
});

const app_servers = new AppServers("home-management", {
  type: ec2.type,
  services: ec2.services,
  azs: vpc.azs,
  yourAccessKey: yourDetails.yourAccessKey,
  pub_subs: main.public_subnets,
  security_groups_ids: security.sg_groups_ids,
});

const dynamo_tables = new DynamoDB({
  name: "home-management",
  tables: dynamo.tables,
});

const load_balancing = new LoadBalancing({
  name: "home-management-load-balancer",
  services: ec2.services,
  vpcID: main.vpc.id,
  ec2_instances: app_servers.ec2_instances,
  security_groups_ids: security.sg_groups_ids,
  pub_subs: main.public_subnets,
});

const autoscaling = new AutoScaling({
  name: "home-management-auto-scaling",
  services: ec2.services,
  ec2_instances: app_servers.ec2_instances,
  security_groups_ids: security.sg_groups_ids,
  pub_subs: main.public_subnets,
  instance_type: ec2.type,
  yourAccessKey: yourDetails.yourAccessKey,
  azs: vpc.azs,
  target_groups: load_balancing.tg_for_apps,
});
