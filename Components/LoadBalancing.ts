import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { AppServers } from "./AppServers";

interface loadBalancingArgs {
  name: string;
  services: string[];
  vpcID: pulumi.Output<string>;
  ec2_instances: aws.ec2.Instance[];
  security_groups_ids: pulumi.Output<string>[];
  pub_subs: aws.ec2.Subnet[];
}

export class LoadBalancing extends pulumi.ComponentResource {
  public readonly tg_for_apps: aws.lb.TargetGroup[];
  public readonly tg_attachments: aws.lb.TargetGroupAttachment[];
  public readonly lb_for_apps: aws.lb.LoadBalancer;
  public readonly lb_apps_listener: aws.lb.Listener;
  public readonly lb_for_apps_listener_rules: aws.lb.ListenerRule[];

  constructor(
    lbArgs: loadBalancingArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("components:LoadBalancing", lbArgs.name, opts);

    this.tg_for_apps = lbArgs.services.map((service) => {
      return new aws.lb.TargetGroup(`${service}`, {
        name: `${service}-tg`,
        port: 3000,
        protocol: "HTTP",
        vpcId: lbArgs.vpcID,

        healthCheck: {
          matcher: "200",
          path: `/api/${service}/health`,
        },
      });
    });

    this.tg_attachments = this.tg_for_apps.map((tg, index) => {
      return new aws.lb.TargetGroupAttachment(`${lbArgs.services[index]}`, {
        targetGroupArn: tg.arn,
        targetId: lbArgs.ec2_instances[index].id,
      });
    });

    this.lb_for_apps = new aws.lb.LoadBalancer("lb-apps", {
      name: "lb-apps",
      internal: false,
      loadBalancerType: "application",
      securityGroups: lbArgs.security_groups_ids,
      subnets: lbArgs.pub_subs.map((sub) => sub.id),
    });

    this.lb_apps_listener = new aws.lb.Listener("lb-apps-listener", {
      loadBalancerArn: this.lb_for_apps.arn,
      port: 80,
      protocol: "HTTP",

      defaultActions: [
        {
          type: "forward",
          targetGroupArn: this.tg_for_apps[2].arn,
        },
      ],
    });

    this.lb_for_apps_listener_rules = this.tg_for_apps.map((tg, index) => {
      return new aws.lb.ListenerRule(`${lbArgs.services[index]}-rule`, {
        listenerArn: this.lb_apps_listener.arn,

        actions: [
          {
            type: "forward",
            targetGroupArn: this.tg_for_apps[index].arn,
          },
        ],

        conditions: [
          {
            pathPattern: { values: [`/api/${lbArgs.services[index]}*`] },
          },
        ],
      });
    });

    this.registerOutputs({});
  }
}
