import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

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

// NETWORKING
const main = new aws.ec2.Vpc("main", {
  cidrBlock: vpc.cidr,
  enableDnsHostnames: true,
  enableDnsSupport: true,

  tags: {
    Name: vpc.name,
  },
});

const pub_subs = vpc.public_subnets.map((cidr, index) => {
  return new aws.ec2.Subnet(`public-${index}`, {
    vpcId: main.id,
    cidrBlock: cidr,
    availabilityZone: vpc.azs[index],
    mapPublicIpOnLaunch: true,

    tags: {
      Name: `public-sub-${index}`,
    },
  });
});

const pri_subs = vpc.private_subnets.map((cidr, index) => {
  return new aws.ec2.Subnet(`private-${index}`, {
    vpcId: main.id,
    cidrBlock: cidr,
    availabilityZone: vpc.azs[index],
    mapPublicIpOnLaunch: false,

    tags: {
      Name: `private-sub-${index}`,
    },
  });
});

const igw = new aws.ec2.InternetGateway("gw", {
  vpcId: main.id,

  tags: {
    Name: `${vpc.name}-igw`,
  },
});

const pub_rt = new aws.ec2.RouteTable("public", {
  vpcId: main.id,

  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      gatewayId: igw.id,
    },
  ],

  tags: {
    Name: "public-route-table",
  },
});

const pub_rt_association = pub_subs.map((subnet, index) => {
  return new aws.ec2.RouteTableAssociation(`routeTableAssociation-${index}`, {
    subnetId: subnet.id,
    routeTableId: pub_rt.id,
  });
});

// SECURITY
const sg_ssh = new aws.ec2.SecurityGroup("allow-ssh", {
  description: "Allows SSH connections from the provided IP address",
  vpcId: main.id,

  tags: {
    Name: "allow-ssh",
  },
});

const sg_ssh_ingress = new aws.vpc.SecurityGroupIngressRule("ssh-ingress", {
  securityGroupId: sg_ssh.id,
  cidrIpv4: yourDetails.yourIP,
  fromPort: 22,
  ipProtocol: "tcp",
  toPort: 22,
});

const sg_http = new aws.ec2.SecurityGroup("allow-http", {
  description: "Allow HTTP connections",
  vpcId: main.id,

  tags: {
    Name: "allow-http",
  },
});

const sg_http_ingress80 = new aws.vpc.SecurityGroupIngressRule(
  "http-80-ingress",
  {
    securityGroupId: sg_http.id,
    cidrIpv4: "0.0.0.0/0",
    fromPort: 80,
    ipProtocol: "tcp",
    toPort: 80,
  }
);

const sg_http_ingress3000 = new aws.vpc.SecurityGroupIngressRule(
  "http-3000-ingress",
  {
    securityGroupId: sg_http.id,
    cidrIpv4: "0.0.0.0/0",
    fromPort: 3000,
    ipProtocol: "tcp",
    toPort: 3000,
  }
);

const sg_https = new aws.ec2.SecurityGroup("allow-https", {
  description: "Allow HTTPS connections",
  vpcId: main.id,

  tags: {
    Name: "allow-https",
  },
});

const sg_https_ingress80 = new aws.vpc.SecurityGroupIngressRule(
  "https-80-ingress",
  {
    securityGroupId: sg_https.id,
    cidrIpv4: "0.0.0.0/0",
    fromPort: 80,
    ipProtocol: "tcp",
    toPort: 80,
  }
);

const sg_https_ingress3000 = new aws.vpc.SecurityGroupIngressRule(
  "https-3000-ingress",
  {
    securityGroupId: sg_https.id,
    cidrIpv4: "0.0.0.0/0",
    fromPort: 3000,
    ipProtocol: "tcp",
    toPort: 3000,
  }
);

const sg_egress = new aws.ec2.SecurityGroup("allow-egress", {
  description: "Allow Egress connections",
  vpcId: main.id,

  tags: {
    Name: "allow-egress",
  },
});

const sg_egress_rule = new aws.vpc.SecurityGroupEgressRule("egress", {
  securityGroupId: sg_egress.id,
  cidrIpv4: "0.0.0.0/0",
  ipProtocol: "-1",
});

// APP SERVERS

const ubuntu = aws.ec2.getAmi({
  mostRecent: true,
  filters: [
    {
      name: "name",
      values: ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"],
    },
    {
      name: "virtualization-type",
      values: ["hvm"],
    },
  ],
  owners: ["099720109477"],
});

const ec2_instances = pub_subs.map((subnet, index) => {
  return new aws.ec2.Instance(`${ec2.services[index]}-app`, {
    ami: ubuntu.then((ubuntu) => ubuntu.id),
    instanceType: ec2.type,
    availabilityZone: vpc.azs[index],
    vpcSecurityGroupIds: [sg_ssh.id, sg_http.id, sg_https.id, sg_egress.id],
    subnetId: subnet.id,
    keyName: yourDetails.yourAccessKey,

    tags: {
      Name: `${ec2.services[index]}-app`,
    },
  });
});

// DATABASE

const dynamo_tables = dynamo.tables.map((table, index) => {
  return new aws.dynamodb.Table(`${table}-table`, {
    name: `${table}`,
    hashKey: "id",
    readCapacity: 20,
    writeCapacity: 20,

    attributes: [
      {
        name: "id",
        type: "N",
      },
    ],
  });
});

// LOAD BALACING

const tg_apps = ec2.services.map((service) => {
  return new aws.lb.TargetGroup(`${service}`, {
    name: `${service}-tg`,
    port: 3000,
    protocol: "HTTP",
    vpcId: main.id,

    healthCheck: {
      matcher: "200",
      path: `/api/${service}/health`,
    },
  });
});

const tg_attachments = tg_apps.map((tg, index) => {
  return new aws.lb.TargetGroupAttachment(`${ec2.services[index]}`, {
    targetGroupArn: tg.arn,
    targetId: ec2_instances[index].id,
  });
});

const lb_apps = new aws.lb.LoadBalancer("lb-apps", {
  name: "lb-apps",
  internal: false,
  loadBalancerType: "application",
  securityGroups: [sg_ssh.id, sg_http.id, sg_https.id, sg_egress.id],
  subnets: pub_subs.map((sub) => sub.id),
});

const lb_apps_listener = new aws.lb.Listener("lb-apps-listener", {
  loadBalancerArn: lb_apps.arn,
  port: 80,
  protocol: "HTTP",

  defaultActions: [
    {
      type: "forward",
      targetGroupArn: tg_apps[2].arn,
    },
  ],
});

const lb_apps_listener_rules = tg_apps.map((tg, index) => {
  return new aws.lb.ListenerRule(`${ec2.services[index]}-rule`, {
    listenerArn: lb_apps_listener.arn,

    actions: [
      {
        type: "forward",
        targetGroupArn: tg.arn,
      },
    ],

    conditions: [
      {
        pathPattern: { values: [`/api/${ec2.services[index]}*`] },
      },
    ],
  });
});

export const l_balancer = lb_apps.dnsName;
