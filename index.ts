import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

interface vpc {
  name: string;
  cidr: string;
  azs: string[];
  public_subnets: string[];
  private_subnets: string[];
}

let config = new pulumi.Config();
let vpc = config.requireObject<vpc>("vpc");

const main = new aws.ec2.Vpc("main", {
  cidrBlock: vpc.cidr,
  enableDnsHostnames: true,
  enableDnsSupport: true,

  tags: {
    Name: vpc.name,
  },
});

const pub_subs = vpc.public_subnets.map(
  (cidr, index) =>
    new aws.ec2.Subnet(`public-${index}`, {
      vpcId: main.id,
      cidrBlock: cidr,
      availabilityZone: vpc.azs[index],
      mapPublicIpOnLaunch: true,

      tags: {
        Name: `public-sub-${index}`,
      },
    })
);

const pri_subs = vpc.private_subnets.map(
  (cidr, index) =>
    new aws.ec2.Subnet(`private-${index}`, {
      vpcId: main.id,
      cidrBlock: cidr,
      availabilityZone: vpc.azs[index],
      mapPublicIpOnLaunch: false,

      tags: {
        Name: `private-sub-${index}`,
      },
    })
);

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

const pub_rt_association = pub_subs.map(
  (subnet, index) =>
    new aws.ec2.RouteTableAssociation(`routeTableAssociation-${index}`, {
      subnetId: subnet.id,
      routeTableId: pub_rt.id,
    })
);

// export const public_subnets = pub_subs;
