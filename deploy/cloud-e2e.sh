#!/bin/bash
# Black-box API workflow test. Usage: deploy/cloud-e2e.sh http://host   (creates throwaway users@cloudtest.invalid)
# Prints one PASS/FAIL line per check; exits non-zero if any failed.
BASE=${1:?base url}; T=$(mktemp -d); trap 'rm -rf $T' EXIT
RAND=$(date +%s)$RANDOM; PW='CloudTest1x!'; fail=0
ok(){ echo "PASS  $1"; }; bad(){ echo "FAIL  $1  ($2)"; fail=1; }
expect(){ [ "$2" = "$3" ] && ok "$1" || bad "$1" "expected $2 got $3"; }
req(){ curl -s -m 20 -o "$T/body" -w '%{http_code}' "$@"; }
J='Content-Type: application/json'
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' > $T/r.pdf
echo "not a pdf" > $T/fake.pdf; echo hello > $T/n.txt; head -c 5300000 /dev/zero > $T/big.bin; (cat $T/r.pdf $T/big.bin) > $T/big.pdf

expect "health" 200 "$(req $BASE/api/health)"
expect "ready (database)" 200 "$(req $BASE/api/ready)"
expect "register candidate" 201 "$(req -c $T/c1 -H "$J" -d "{\"name\":\"Cloud Cand\",\"email\":\"c1.$RAND@cloudtest.invalid\",\"password\":\"$PW\"}" $BASE/api/auth/register)"
expect "register 2nd candidate" 201 "$(req -c $T/c2 -H "$J" -d "{\"name\":\"Other Cand\",\"email\":\"c2.$RAND@cloudtest.invalid\",\"password\":\"$PW\"}" $BASE/api/auth/register)"
expect "register recruiter" 201 "$(req -c $T/r1 -H "$J" -d "{\"name\":\"Cloud Rec\",\"email\":\"r1.$RAND@cloudtest.invalid\",\"password\":\"$PW\",\"role\":\"RECRUITER\",\"companyName\":\"CloudCo\"}" $BASE/api/auth/register)"
expect "register 2nd recruiter" 201 "$(req -c $T/r2 -H "$J" -d "{\"name\":\"Other Rec\",\"email\":\"r2.$RAND@cloudtest.invalid\",\"password\":\"$PW\",\"role\":\"RECRUITER\",\"companyName\":\"OtherCo\"}" $BASE/api/auth/register)"
expect "login wrong password" 401 "$(req -H "$J" -d "{\"email\":\"c1.$RAND@cloudtest.invalid\",\"password\":\"nope12345\"}" $BASE/api/auth/login)"
expect "login ok" 200 "$(req -c $T/c1 -H "$J" -d "{\"email\":\"c1.$RAND@cloudtest.invalid\",\"password\":\"$PW\"}" $BASE/api/auth/login)"
expect "candidate cannot post job" 403 "$(req -b $T/c1 -H "$J" -d '{"title":"x"}' $BASE/api/jobs)"
expect "recruiter posts job" 201 "$(req -b $T/r1 -H "$J" -d "{\"title\":\"Cloud Test Engineer $RAND\",\"location\":\"Remote\",\"employmentType\":\"REMOTE\",\"description\":\"A job created by the cloud test suite.\",\"requirements\":\"Cloud testing skills\"}" $BASE/api/jobs)"
JOB=$(jq -r .data.id $T/body)
expect "job searchable publicly" 200 "$(req "$BASE/api/jobs?q=$RAND")"; [ "$(jq -r '.data|length' $T/body)" = 1 ] && ok "search returns the new job" || bad "search returns the new job" "$(cat $T/body | head -c 100)"
expect "upload text file rejected" 400 "$(req -b $T/c1 -F resume=@$T/n.txt $BASE/api/resumes)"
expect "upload spoofed .pdf rejected" 400 "$(req -b $T/c1 -F "resume=@$T/fake.pdf;type=application/pdf" $BASE/api/resumes)"
expect "upload >5MB rejected" 413 "$(req -b $T/c1 -F "resume=@$T/big.pdf;type=application/pdf" $BASE/api/resumes)"
expect "upload valid PDF" 201 "$(req -b $T/c1 -F "resume=@$T/r.pdf;type=application/pdf;filename=cv.pdf" $BASE/api/resumes)"
RES=$(jq -r .data.id $T/body)
expect "apply for job" 201 "$(req -b $T/c1 -H "$J" -d "{\"jobId\":\"$JOB\",\"resumeId\":\"$RES\"}" $BASE/api/applications)"
APP=$(jq -r .data.id $T/body)
expect "duplicate application blocked" 409 "$(req -b $T/c1 -H "$J" -d "{\"jobId\":\"$JOB\",\"resumeId\":\"$RES\"}" $BASE/api/applications)"
DLCODE=$(curl -s -m 20 -b $T/r1 -o $T/dl.pdf -w '%{http_code}' $BASE/api/resumes/$RES/download); expect "recruiter downloads resume" 200 "$DLCODE"
cmp -s $T/r.pdf $T/dl.pdf && ok "downloaded bytes identical to upload (S3 round trip)" || bad "downloaded bytes identical" "differs"
expect "other recruiter denied resume" 403 "$(req -b $T/r2 $BASE/api/resumes/$RES/download)"
expect "other candidate denied resume" 403 "$(req -b $T/c2 $BASE/api/resumes/$RES/download)"
expect "anonymous denied resume" 401 "$(req $BASE/api/resumes/$RES/download)"
expect "other recruiter cannot change status" 403 "$(req -b $T/r2 -X PATCH -H "$J" -d '{"status":"SHORTLISTED"}' $BASE/api/applications/$APP/status)"
expect "invalid transition rejected" 400 "$(req -b $T/r1 -X PATCH -H "$J" -d '{"status":"OFFER"}' $BASE/api/applications/$APP/status)"
for s in SHORTLISTED INTERVIEW OFFER; do expect "recruiter -> $s" 200 "$(req -b $T/r1 -X PATCH -H "$J" -d "{\"status\":\"$s\"}" $BASE/api/applications/$APP/status)"; done
expect "candidate sees timeline" 200 "$(req -b $T/c1 $BASE/api/applications/$APP)"; [ "$(jq -r '.data.status' $T/body)" = OFFER ] && [ "$(jq -r '.data.history|length' $T/body)" = 4 ] && ok "status OFFER with 4 history entries" || bad "status/timeline" "$(jq -c '[.data.status,(.data.history|length)]' $T/body)"
expect "withdraw of final state refused" 400 "$(req -b $T/c1 -X PATCH $BASE/api/applications/$APP/withdraw)"
expect "candidate dashboard" 200 "$(req -b $T/c1 $BASE/api/dashboard/candidate)"
expect "recruiter dashboard" 200 "$(req -b $T/r1 $BASE/api/dashboard/recruiter)"
expect "admin API denied to recruiter" 403 "$(req -b $T/r1 $BASE/api/admin/users)"
echo "RESULT: $([ $fail = 0 ] && echo ALL PASSED || echo FAILURES) | job=$JOB resume=$RES"
exit $fail
