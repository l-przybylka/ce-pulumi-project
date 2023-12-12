import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

interface NetworkingArgs {
  name: string;
  cidr: string;
  azs: string[];
  public_subnets: string[];
  private_subnets: string[];
}

export class Networking extends pulumi.ComponentResource {
  public readonly vpc: aws.ec2.Vpc;
  public readonly public_subnets: aws.ec2.Subnet[];
  public readonly private_subnets: aws.ec2.Subnet[];
  public readonly igw: aws.ec2.InternetGateway;
  public readonly public_route_table: aws.ec2.RouteTable;
  public readonly public_route_table_association: aws.ec2.RouteTableAssociation[];

  constructor(vpc: NetworkingArgs, opts?: pulumi.ComponentResourceOptions) {
    super("components:Networking", vpc.name, opts);
    this.vpc = new aws.ec2.Vpc("main", {
      cidrBlock: vpc.cidr,
      enableDnsHostnames: true,
      enableDnsSupport: true,

      tags: {
        Name: vpc.name,
      },
    });

    this.public_subnets = vpc.public_subnets.map((cidr, index) => {
      return new aws.ec2.Subnet(`public-${index + 1}`, {
        vpcId: this.vpc.id,
        cidrBlock: cidr,
        availabilityZone: vpc.azs[index],
        mapPublicIpOnLaunch: true,

        tags: {
          Name: `public-sub-${index + 1}`,
        },
      });
    });

    this.private_subnets = vpc.private_subnets.map((cidr, index) => {
      return new aws.ec2.Subnet(`private-${index + 1}`, {
        vpcId: this.vpc.id,
        cidrBlock: cidr,
        availabilityZone: vpc.azs[index],
        mapPublicIpOnLaunch: false,

        tags: {
          Name: `private-sub-${index + 1}`,
        },
      });
    });

    this.igw = new aws.ec2.InternetGateway("gw", {
      vpcId: this.vpc.id,

      tags: {
        Name: `${vpc.name}-igw`,
      },
    });

    this.public_route_table = new aws.ec2.RouteTable("public", {
      vpcId: this.vpc.id,

      routes: [
        {
          cidrBlock: "0.0.0.0/0",
          gatewayId: this.igw.id,
        },
      ],

      tags: {
        Name: "public-route-table",
      },
    });

    this.public_route_table_association = this.public_subnets.map(
      (subnet, index) => {
        return new aws.ec2.RouteTableAssociation(
          `routeTableAssociation-${index + 1}`,
          {
            subnetId: subnet.id,
            routeTableId: this.public_route_table.id,
          }
        );
      }
    );

    this.registerOutputs({
      vpcId: this.vpc.id,
    });
  }
}
