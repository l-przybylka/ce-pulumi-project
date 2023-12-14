import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

interface AppsArgs {
  type: string;
  services: string[];
  azs: string[];
  yourAccessKey: string;
  pub_subs: aws.ec2.Subnet[];
  security_groups_ids: pulumi.Output<string>[];
}

export class AppServers extends pulumi.ComponentResource {
  public readonly ec2_instances: aws.ec2.Instance[];

  constructor(
    name: string,
    args: AppsArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("components:AppServers", name, opts);

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

    this.ec2_instances = args.pub_subs.map((subnet, index) => {
      return new aws.ec2.Instance(`${args.services[index]}-app`, {
        ami: ubuntu.then((ubuntu) => ubuntu.id),
        instanceType: args.type,
        availabilityZone: args.azs[index],
        vpcSecurityGroupIds: args.security_groups_ids,
        subnetId: subnet.id,
        keyName: args.yourAccessKey,

        tags: {
          Name: `${args.services[index]}-app`,
        },
      });
    });
  }
}
