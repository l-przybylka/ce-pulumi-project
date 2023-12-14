import * as pulumi from "@pulumi/pulumi";
import { Networking } from "./Components/Networking";
import { SecurityGroups } from "./Components/Security";
import { AppServers } from "./Components/AppServers";
import { DynamoDB } from "./Components/DynamoDB";
import { LoadBalancing } from "./Components/LoadBalancing";

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

const main = new Networking({
  name: vpc.name,
  cidr: vpc.cidr,
  azs: vpc.azs,
  private_subnets: vpc.private_subnets,
  public_subnets: vpc.public_subnets,
});

// const security = new SecurityGroups({
//   name: `${vpc.name}-security-groups`,
//   vpcId: main.vpc.id,
//   yourIP: yourDetails.yourIP,
// });

// const app_servers = new AppServers("home-management", {
//   type: ec2.type,
//   services: ec2.services,
//   azs: vpc.azs,
//   yourAccessKey: yourDetails.yourAccessKey,
//   pub_subs: main.public_subnets,
//   security_groups_ids: security.sg_groups_ids,
// });

// const dynamo_tables = new DynamoDB({
//   name: "home-management",
//   tables: dynamo.tables,
// });

// const load_balancing = new LoadBalancing({
//   name: "home-management-load-balancer",
//   services: ec2.services,
//   vpcID: main.vpc.id,
//   ec2_instances: app_servers.ec2_instances,
//   security_groups_ids: security.sg_groups_ids,
//   pub_subs: main.public_subnets,
// });

// // AUTO SCALING

// const ami_from_ec2_instances = ec2_instances.map((instance, index) => {
//   return new aws.ec2.AmiFromInstance(`${ec2.services[index]}`, {
//     sourceInstanceId: instance.id,
//   });
// });

// const launch_template_from_amis = ami_from_ec2_instances.map((ami, index) => {
//   return new aws.ec2.LaunchTemplate(
//     `${ami_from_ec2_instances[index].name}-launch-template`,
//     {
//       imageId: ami.id,
//       instanceType: ec2.type,
//       keyName: yourDetails.yourAccessKey,

//       networkInterfaces: [
//         {
//           subnetId: vpc.public_subnets[index],
//           associatePublicIpAddress: "true",
//           securityGroups: [sg_ssh.id, sg_http.id, sg_https.id, sg_egress.id],
//         },
//       ],
//     }
//   );
// });
