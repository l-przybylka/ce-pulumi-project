import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

let config = new pulumi.Config();
let cidr = config.require("cidr");
let instance_type = config.require("instance_type");
let public_subnets = config.require("public_subnets");
let private_subnets = config.require("private_subnets");
let azs = config.require("azs");
console.log(Array.isArray(azs));

export const zones = azs;
