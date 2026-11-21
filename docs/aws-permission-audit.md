# AWS permission audit (Learner Lab)

Audited 2026-11-21 with read-only calls (plus deliberately invalid create requests that cannot create anything, used only to read the authorization result). Nothing was created or modified.

- Account `543565956032`, identity `assumed-role/voclabs/…` (AWS Academy Learner Lab). Budget shown by the lab: **$0 of $50 used**.
- Region: `us-east-1` (6 AZs, a–f). `us-west-2` also reachable. All 17 commercial regions are listed, but Learner Lab normally restricts usage to us-east-1 / us-west-2.
- Pre-existing, lab-provisioned (leave untouched): CloudFormation stack `c231702a…` (CREATE_COMPLETE), SNS topic `RedshiftSNS`, Lambda log groups `RedshiftEventSubscription`, `RedshiftOverwatch`, `RoleCreationFunction`.
- Clean slate in us-east-1 and us-west-2: 0 EC2 instances, 0 EBS volumes/snapshots, 0 RDS, 0 ALBs, 0 NAT gateways, 0 Elastic IPs, 0 S3 buckets; only the default VPC (172.31.0.0/16) exists in each region.

## Service matrix

| AWS Service | Required permissions | Available | Limitation / evidence | Planned solution |
|---|---|---|---|---|
| EC2 / VPC / EBS / SG / IGW / route tables | Describe + create | Yes (read verified; create not yet attempted) | Instance types offered: t2.micro, t3.micro, t3.small, t3.medium. AL2023 AMI available via SSM parameter. | Custom VPC 10.0.0.0/16, public subnets, t3.micro/small |
| EBS snapshots | CreateSnapshot / CreateVolume | Read OK; create untested | – | Snapshot + restore test |
| S3 | Create bucket, put/get | Read OK (0 buckets) | – | Private encrypted resume + artifact buckets |
| RDS PostgreSQL | Create instance / snapshot | Read OK; PostgreSQL 16.9–16.15 orderable | `rds.amazonaws.com` is in LabRole trust | db.t3.micro Single-AZ |
| ELBv2 (ALB) | Create ALB / target groups | Read OK | `elasticloadbalancing.amazonaws.com` in LabRole trust | Temporary ALB demo |
| CloudFormation | Create stacks | Read OK (1 lab stack) | `cloudformation.amazonaws.com` in LabRole trust (stack role = LabRole) | IaC where possible |
| CodeDeploy | App / deployment group / deploy | **Yes** (`list-applications` OK) | `codedeploy.amazonaws.com` is in LabRole trust, so LabRole can be the service role | Used for staging + production deploys |
| **CodePipeline** | CreatePipeline + service role | **BLOCKED** | `CreatePipeline` with LabRole → *"CodePipeline is not authorized to perform AssumeRole on role LabRole"*. `codepipeline.amazonaws.com` is not in LabRole's trust policy. `iam:CreateRole` / `iam:PassRole` are implicitly denied, so no new role can be made. | Fallback required (see below) |
| **CodeBuild** | CreateProject etc. | **BLOCKED** | `AccessDeniedException: no identity-based policy allows codebuild:ListProjects` and `codebuild:CreateProject`. `codebuild.amazonaws.com` is also not in LabRole trust. | Fallback required |
| **CodeConnections / CodeStar Connections** (GitHub source) | CreateConnection | **BLOCKED** | `AccessDeniedException` on `ListConnections` (both API names). | Source must come from outside AWS (GitHub) |
| SNS | Create topic / publish | Yes (read OK) | `sns.amazonaws.com` in LabRole trust | Approval/alarm notifications; email subscription needs the user's address |
| CloudWatch (metrics, alarms, logs) | Put alarms, logs | Yes (read OK) | `logs.amazonaws.com` in LabRole trust | Alarms + agent logs, short retention |
| Systems Manager | Session Manager / Run Command | Likely (0 managed instances yet) | `ssm.amazonaws.com` in LabRole trust; LabInstanceProfile → LabRole | Prefer SSM over SSH |
| Secrets Manager | Create secret | Read OK | `secretsmanager.amazonaws.com` in LabRole trust | Store DB password / JWT secret |
| ACM | Request certificate | Read OK | A public cert needs a domain you own (none known) | HTTPS limitation, see below |
| CloudFront | Create distribution | **Denied** (`ListDistributions`) | No CloudFront-provided `*.cloudfront.net` TLS | Cannot use for HTTPS |
| Cost Explorer | Read cost | Yes (returned 0) | Lab-wide spend also visible in lab header | Track spend manually |
| AWS Budgets | Create budgets | Denied | – | Use the lab "Used $X of $50" counter + our own cost log |
| IAM | CreateRole / OIDC provider | Denied (implicit) | `LabRole` + `LabInstanceProfile` (contains LabRole) exist and are usable | Use only LabRole / LabInstanceProfile |

`LabInstanceRole` (named in the brief) does not exist in this account; the instance profile is **`LabInstanceProfile`**, containing `LabRole`.

## Blockers affecting the brief

1. **CodePipeline + CodeBuild + CodeConnections cannot be created** in this Learner Lab. This is an IAM trust/policy restriction, not a mistake in our configuration, and it will not be bypassed. The required "GitHub → CodePipeline → CodeBuild → CodeDeploy" chain therefore cannot be built literally.
2. **No trusted HTTPS endpoint is available without a domain** (ACM needs one; CloudFront is denied).
3. **GitHub → AWS credentials**: no IAM role / OIDC provider can be created, so any outside CI (e.g. GitHub Actions) would have to use the short-lived Learner Lab keys stored as GitHub secrets and refreshed every lab session.

## Closest practical fallback (needs the owner's approval)

| Pipeline stage | Brief | Fallback (not equivalent; documented as such) |
|---|---|---|
| Source / trigger | CodePipeline + GitHub connection | GitHub push to `main` triggers a **GitHub Actions** workflow |
| Build + test + package | CodeBuild | GitHub Actions runner runs `npm ci`, lint, tests, build; zips one release artifact |
| Artifact store | CodePipeline artifact bucket | Same zip uploaded to a private S3 artifact bucket |
| Deploy staging / production | CodeDeploy | **CodeDeploy (real)**, started by the workflow with the **same S3 artifact** |
| Manual approval | CodePipeline approval action | GitHub Environment "production" with required reviewer |
| Rollback | CodeDeploy auto-rollback | CodeDeploy auto-rollback on failed deployment / alarm (real) |

Caveat: this is a CI/CD pipeline built from GitHub Actions + AWS CodeDeploy, **not** AWS CodePipeline/CodeBuild, and must be described that way in the final report.
