import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

interface asArgs {
  name: string;
  ec2_instances: aws.ec2.Instance[];
  services: string[];
  instance_type: string;
  yourAccessKey: string;
  pub_subs: aws.ec2.Subnet[];
  security_groups_ids: pulumi.Output<string>[];
  azs: string[];
  target_groups: aws.lb.TargetGroup[];
}

export class AutoScaling extends pulumi.ComponentResource {
  public readonly ami_from_ec2_instances: aws.ec2.AmiFromInstance[];
  public readonly launch_template_from_amis: aws.ec2.LaunchTemplate[];
  public readonly autoscaling_groups: aws.autoscaling.Group[];
  public readonly autoscaling_attachment: aws.autoscaling.Attachment[];

  constructor(args: asArgs, opts?: pulumi.ComponentResourceOptions) {
    super("components:AutoScaling", args.name, opts);

    this.ami_from_ec2_instances = args.ec2_instances.map((instance, index) => {
      return new aws.ec2.AmiFromInstance(`${args.services[index]}`, {
        sourceInstanceId: instance.id,
      });
    });

    this.launch_template_from_amis = this.ami_from_ec2_instances.map(
      (ami, index) => {
        return new aws.ec2.LaunchTemplate(
          `${this.ami_from_ec2_instances[index].name}-launch-template`,
          {
            imageId: ami.id,
            instanceType: args.instance_type,
            keyName: args.yourAccessKey,

            networkInterfaces: [
              {
                subnetId: args.pub_subs[index].id,
                associatePublicIpAddress: "true",
                securityGroups: args.security_groups_ids,
              },
            ],
          }
        );
      }
    );

    this.autoscaling_groups = args.ec2_instances.map((instance, index) => {
      return new aws.autoscaling.Group(`${args.services[index]}-ag`, {
        desiredCapacity: 2,
        maxSize: 1,
        minSize: 1,
        vpcZoneIdentifiers: args.pub_subs.map((subnet) => subnet.id),

        launchTemplate: {
          id: this.launch_template_from_amis[index].id,
          version: "$Latest",
        },
      });
    });

    this.autoscaling_attachment = this.autoscaling_groups.map((gp, index) => {
      return new aws.autoscaling.Attachment("example", {
        autoscalingGroupName: gp.id,
        lbTargetGroupArn: args.target_groups[index].arn,
      });
    });

    this.registerOutputs({});
  }
}
