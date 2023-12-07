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
  yourIp: string;
  yourAccessKey: string;
}

let config = new pulumi.Config();
let vpc = config.requireObject<vpc>("vpc");
let yourDetails = config.requireObject<yourDetails>("yourDetails");
let ec2 = config.requireObject<ec2>("ec2");

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
  cidrIpv4: yourDetails.yourIp,
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
  });
});
