import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

interface dbArgs {
  name: string;
  tables: string[];
}

export class DynamoDB extends pulumi.ComponentResource {
  public readonly dynamo_tables: aws.dynamodb.Table[];

  constructor(args: dbArgs, opts?: pulumi.ComponentResourceOptions) {
    super("components:Database", args.name, opts);

    this.dynamo_tables = args.tables.map((table, index) => {
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
  }
}
