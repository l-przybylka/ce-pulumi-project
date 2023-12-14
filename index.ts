import * as pulumi from "@pulumi/pulumi";
import { Networking } from "./Components/Networking";
import { SecurityGroups } from "./Components/Security";
import { AppServers } from "./Components/AppServers";

// INTERFACES FOR CONFIG OBJECTS
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

// // DATABASE

// const dynamo_tables = dynamo.tables.map((table, index) => {
//   return new aws.dynamodb.Table(`${table}-table`, {
//     name: `${table}`,
//     hashKey: "id",
//     readCapacity: 20,
//     writeCapacity: 20,

//     attributes: [
//       {
//         name: "id",
//         type: "N",
//       },
//     ],
//   });
// });

// // LOAD BALACING

// const tg_apps = ec2.services.map((service) => {
//   return new aws.lb.TargetGroup(`${service}`, {
//     name: `${service}-tg`,
//     port: 3000,
//     protocol: "HTTP",
//     vpcId: main.id,

//     healthCheck: {
//       matcher: "200",
//       path: `/api/${service}/health`,
//     },
//   });
// });

// const tg_attachments = tg_apps.map((tg, index) => {
//   return new aws.lb.TargetGroupAttachment(`${ec2.services[index]}`, {
//     targetGroupArn: tg.arn,
//     targetId: ec2_instances[index].id,
//   });
// });

// const lb_apps = new aws.lb.LoadBalancer("lb-apps", {
//   name: "lb-apps",
//   internal: false,
//   loadBalancerType: "application",
//   securityGroups: [sg_ssh.id, sg_http.id, sg_https.id, sg_egress.id],
//   subnets: pub_subs.map((sub) => sub.id),
// });

// const lb_apps_listener = new aws.lb.Listener("lb-apps-listener", {
//   loadBalancerArn: lb_apps.arn,
//   port: 80,
//   protocol: "HTTP",

//   defaultActions: [
//     {
//       type: "forward",
//       targetGroupArn: tg_apps[2].arn,
//     },
//   ],
// });

// const lb_apps_listener_rules = tg_apps.map((tg, index) => {
//   return new aws.lb.ListenerRule(`${ec2.services[index]}-rule`, {
//     listenerArn: lb_apps_listener.arn,

//     actions: [
//       {
//         type: "forward",
//         targetGroupArn: tg.arn,
//       },
//     ],

//     conditions: [
//       {
//         pathPattern: { values: [`/api/${ec2.services[index]}*`] },
//       },
//     ],
//   });
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

// const ec2CpuAlarm = new aws.cloudwatch.MetricAlarm("ec2CpuHighAlarm", {
//   // Alarm when the average CPU utilization over the last minute is >= 70%
//   comparisonOperator: "GreaterThanOrEqualToThreshold",
//   evaluationPeriods: 1, // Evaluate the metric once
//   metricName: "CPUUtilization",
//   namespace: "AWS/EC2", // The namespace for EC2 instance metrics
//   period: 60, // The period in seconds over which the metric is applied (1 minute)
//   statistic: "Average",
//   threshold: 70, // 70% CPU utilization
//   alarmDescription: "Alarm when the CPU exceeds 70%",
//   dimensions: {
//     InstanceId: ec2_instances[0].id, // Replace with the actual EC2 instance ID
//   },
//   // Actions can be attached for alarm state changes such as SNS topics
//   // alarmActions: [],
//   // okActions: [],
//   // insufficientDataActions: [],
// });
