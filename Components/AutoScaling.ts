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
}

export class AutoScaling extends pulumi.ComponentResource {
  public readonly ami_from_ec2_instances: aws.ec2.AmiFromInstance[];
  public readonly launch_template_from_amis: aws.ec2.LaunchTemplate[];
  public readonly autoscaling_groups: aws.autoscaling.Group[];
  public readonly autoscaling_attachment: aws.autoscaling.Attachment;

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

    // https://www.pulumi.com/registry/packages/aws/api-docs/autoscaling/

    this.autoscaling_groups = args.ec2_instances.map((instance, index) => {
     return new aws.autoscaling.Group(`${args.services[index]}-ag`, {
        availabilityZones: args.azs,
        desiredCapacity: 2,
        maxSize: 1,
        minSize: 1,
        vpcZoneIdentifiers: args.pub_subs.map(subnet => subnet.id)

        
        launchTemplate: {
            id: foobar.id,
            version: "$Latest",
        },
    });
    })

    // const example = new aws.autoscaling.Attachment("example", {
    //     autoscalingGroupName: aws_autoscaling_group.example.id,
    //     elb: aws_elb.example.id,
    // });

    this.registerOutputs({});
  }
}
