import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

interface SecurityArgs {
  name: string;
  vpcId: pulumi.Output<string>;
  yourIP: string;
}

export class SecurityGroups extends pulumi.ComponentResource {
  public readonly sg_ssh: aws.ec2.SecurityGroup;
  public readonly sg_ssh_ingress: aws.vpc.SecurityGroupIngressRule;
  public readonly sg_http: aws.ec2.SecurityGroup;
  public readonly sg_http_ingress80: aws.vpc.SecurityGroupIngressRule;
  public readonly sg_http_ingress3000: aws.vpc.SecurityGroupIngressRule;
  public readonly sg_https: aws.ec2.SecurityGroup;
  public readonly sg_https_ingress80: aws.vpc.SecurityGroupIngressRule;
  public readonly sg_https_ingress3000: aws.vpc.SecurityGroupIngressRule;
  public readonly sg_egress: aws.ec2.SecurityGroup;
  public readonly sg_egress_rule: aws.vpc.SecurityGroupEgressRule;
  public readonly sg_groups_ids: pulumi.Output<string>[];

  constructor(sg: SecurityArgs, opts?: pulumi.ComponentResourceOptions) {
    super("components:Security", sg.name, opts);

    this.sg_ssh = new aws.ec2.SecurityGroup("allow-ssh", {
      description: "Allows SSH connections from the provided IP address",
      vpcId: sg.vpcId,

      tags: {
        Name: "allow-ssh",
      },
    });

    this.sg_ssh_ingress = new aws.vpc.SecurityGroupIngressRule("ssh-ingress", {
      securityGroupId: this.sg_ssh.id,
      cidrIpv4: sg.yourIP,
      fromPort: 22,
      ipProtocol: "tcp",
      toPort: 22,
    });

    this.sg_http = new aws.ec2.SecurityGroup("allow-http", {
      description: "Allow HTTP connections",
      vpcId: sg.vpcId,

      tags: {
        Name: "allow-http",
      },
    });

    this.sg_http_ingress80 = new aws.vpc.SecurityGroupIngressRule(
      "http-80-ingress",
      {
        securityGroupId: this.sg_http.id,
        cidrIpv4: "0.0.0.0/0",
        fromPort: 80,
        ipProtocol: "tcp",
        toPort: 80,
      }
    );

    this.sg_http_ingress3000 = new aws.vpc.SecurityGroupIngressRule(
      "http-3000-ingress",
      {
        securityGroupId: this.sg_http.id,
        cidrIpv4: "0.0.0.0/0",
        fromPort: 3000,
        ipProtocol: "tcp",
        toPort: 3000,
      }
    );

    this.sg_https = new aws.ec2.SecurityGroup("allow-https", {
      description: "Allow HTTPS connections",
      vpcId: sg.vpcId,

      tags: {
        Name: "allow-https",
      },
    });

    this.sg_https_ingress80 = new aws.vpc.SecurityGroupIngressRule(
      "https-80-ingress",
      {
        securityGroupId: this.sg_https.id,
        cidrIpv4: "0.0.0.0/0",
        fromPort: 80,
        ipProtocol: "tcp",
        toPort: 80,
      }
    );

    this.sg_https_ingress3000 = new aws.vpc.SecurityGroupIngressRule(
      "https-3000-ingress",
      {
        securityGroupId: this.sg_https.id,
        cidrIpv4: "0.0.0.0/0",
        fromPort: 3000,
        ipProtocol: "tcp",
        toPort: 3000,
      }
    );

    this.sg_egress = new aws.ec2.SecurityGroup("allow-egress", {
      description: "Allow Egress connections",
      vpcId: sg.vpcId,

      tags: {
        Name: "allow-egress",
      },
    });

    this.sg_egress_rule = new aws.vpc.SecurityGroupEgressRule("egress", {
      securityGroupId: this.sg_egress.id,
      cidrIpv4: "0.0.0.0/0",
      ipProtocol: "-1",
    });

    this.sg_groups_ids = [
      this.sg_ssh.id,
      this.sg_http.id,
      this.sg_https.id,
      this.sg_egress.id,
    ];
  }
}
