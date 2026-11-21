# AWS cost analysis (plan, not yet incurred)

Region `us-east-1`. Budget cap: **$50** (hard rule). Lab counter at planning time: **$0 of $50**.

> **Price source caveat.** The Pricing API is denied for this Learner Lab role, so the unit prices below are typical published us-east-1 on-demand list prices recalled by the assistant, **not verified against an official source in this session**. Treat all numbers as estimates. Ground truth = the lab header counter and Cost Explorer; observed costs will be recorded in the table at the bottom. Standard AWS Free Tier is **not** assumed.

## Proposed architecture (cheapest that meets the brief)

- Custom VPC 10.0.0.0/16, 2 AZs, 2 public + 2 private subnets, IGW, **no NAT gateway**.
- App servers (staging, prod) in **public subnets** (no NAT ⇒ they need direct internet for `npm`, S3, CodeDeploy). Inbound: ALB SG only for the app port; no SSH, access via SSM Session Manager (LabInstanceProfile).
- **One** RDS PostgreSQL 16 db.t3.micro, Single-AZ, 20 GB, private subnets, with two databases (`jobportal_staging`, `jobportal_prod`) to avoid paying for two instances. Only app SGs may reach port 5432.
- Private S3 buckets: resumes (per environment prefix) + release artifacts.
- CI/CD: GitHub Actions (outside AWS, free tier of GitHub) + real CodeDeploy.

## Unit prices used (unverified list prices)

| Item | Unit price |
|---|---|
| EC2 t3.micro | ~$0.0104 / h |
| EC2 t3.small | ~$0.0208 / h |
| RDS db.t3.micro PostgreSQL Single-AZ | ~$0.018 / h |
| RDS storage gp3/gp2 | ~$0.115 / GB-month |
| ALB | ~$0.0225 / h + ~$0.008 / LCU-h |
| Public IPv4 address | ~$0.005 / h each (incl. ALB nodes) |
| EBS gp3 | ~$0.08 / GB-month |
| EBS / RDS snapshots | ~$0.05 / GB-month (stored data only) |
| S3 Standard | ~$0.023 / GB-month |
| CloudWatch Logs ingest | ~$0.50 / GB |
| VPC, subnets, route tables, IGW, security groups, SNS email, CodeDeploy (EC2) | $0 |

## Estimate by phase

| Phase | Resources | Approx. $/h | Duration | Est. cost |
|---|---|---|---|---|
| A. Base (always on while testing) | 2× t3.micro + 2 public IPv4 + RDS db.t3.micro | ≈ 0.049 | 7 days (168 h) | ≈ **$8.2** |
| A. Storage | 2×8 GB EBS, 20 GB RDS, <1 GB S3, logs | – | 1 month pro-rated | ≈ **$1.5** |
| B. Load-balancing demo | +1 t3.micro, ALB (+2–3 IPv4), light traffic | ≈ 0.05 | ~3 h | ≈ **$0.20** |
| C. EBS snapshot + restored test volume | 8 GB snapshot, temp 8 GB volume | – | ~2 h | < **$0.10** |
| D. RDS snapshot + restore to temp db.t3.micro | temp instance ~1 h + snapshot | ≈ 0.02 | ~1–2 h | ≈ **$0.10** |
| **Total expected** | | | | **≈ $10–12** |
| Safety margin (retries, longer idle) | | | | up to ~$25 worst case |

Always-on burn if left running: **≈ $1.2 / day** (≈ $0.05/h with the ALB demo removed). Everything stays far below the $50 cap; the biggest risk is forgetting the ALB or the RDS instance.

## Cost controls

1. Create resources in stages and ask for approval before each billable stage.
2. Tag everything `Project=JobApplicationPortal`.
3. ALB, third EC2 and every restore-test resource exist only during their demo, then are removed **after approval**.
4. No NAT gateway, no Multi-AZ, no Elastic IPs, no CloudFront, 7-day log retention.
5. Shutdown procedure: stop both EC2 instances and the RDS instance (RDS auto-restarts after 7 days) when idle; full teardown in `docs/aws-cleanup-guide.md` (written later).
6. Record the lab counter at the start and end of each stage in the table below.

## Observed costs (to be filled in with real values)

| Date/time | Stage | Lab counter before → after | Notes |
|---|---|---|---|
| 2026-11-21 | Planning / audit | $0 → $0 | read-only calls only |
