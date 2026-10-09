# Database Backup, Restoration & Disaster Recovery Runbook

**Service**: Livex Production Data Stores (Google Cloud Firestore & Supabase PostgreSQL)  
**Classification**: Operational Standard Operating Procedure (SOP)  
**Last Verified**: 2026-10-09  
**Target RTO**: < 15 Minutes  
**Target RPO**: < 1 Hour  

---

## 1. Overview & Architecture

Livex utilizes a dual data-store architecture to guarantee real-time collaborative speed and persistent relational integrity:

1. **Google Cloud Firestore**:
   - **Data Stored**: Real-time band session rooms, device presence rosters, live chord/lyrics teleprompter synchronizer state, and ephemeral band codes.
   - **Primary Engine**: Google Cloud Firestore Native Mode (`studio-30f44`).
2. **Supabase PostgreSQL**:
   - **Data Stored**: Relational user library, songs, chord charts, arrangements, setlists, and band metadata.
   - **Security**: PostgreSQL Row Level Security (RLS) bridged to Firebase Auth JWTs.

---

## 2. Google Cloud Firestore: Backup & Restore

### A. Manual / Scheduled Point-in-Time Export

Export all production collections to the secured Google Cloud Storage backup bucket:

```bash
# 1. Authenticate with Google Cloud SDK
gcloud auth login
gcloud config set project studio-30f44

# 2. Define timestamped target bucket path
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_BUCKET="gs://livex-production-backups/firestore/${TIMESTAMP}"

# 3. Trigger managed asynchronous export
gcloud firestore export ${BACKUP_BUCKET} \
  --collection-ids='bands','rooms','presence','user_preferences','setlists'

# 4. Monitor export job status
gcloud firestore operations list
```

### B. Firestore Recovery & Restoration Procedure

To restore data from an existing snapshot without corrupting in-flight user traffic:

```bash
# 1. (Recommended) Perform dry-run restore into staging project first
gcloud config set project studio-staging-test
gcloud firestore import ${BACKUP_BUCKET}

# 2. Verify document integrity in staging
pnpm ts-node scripts/verify-db-integrity.ts --project=studio-staging-test

# 3. Emergency Production Restoration
# CAUTION: Importing into production overwrites matching document IDs
gcloud config set project studio-30f44
gcloud firestore import ${BACKUP_BUCKET} \
  --collection-ids='bands','rooms','presence','user_preferences','setlists'
```

### C. Post-Restoration Verification Checklist

- [ ] Verify total document count matches the pre-incident baseline:
  ```bash
  gcloud firestore operations describe [OPERATION_NAME]
  ```
- [ ] Confirm security rules remained intact (`firestore.rules` active on target database).
- [ ] Test client connectivity: create a test room, connect two clients, confirm real-time delta propagation.

---

## 3. Supabase PostgreSQL: Backup & Restore

### A. Snapshot Dump Creation

```bash
# 1. Login to Supabase CLI
supabase login

# 2. Dump schema and data (excluding sensitive auth credentials)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
supabase db dump \
  --project-ref livex-prod-ref \
  -f "backups/supabase_dump_${TIMESTAMP}.sql" \
  --data-only=false

# 3. Generate SHA-256 checksum for audit and integrity verification
sha256sum "backups/supabase_dump_${TIMESTAMP}.sql" > "backups/supabase_dump_${TIMESTAMP}.sql.sha256"
```

### B. Database Restoration Procedure

```bash
# 1. Verify dump integrity against checksum
sha256sum -c "backups/supabase_dump_${TIMESTAMP}.sql.sha256"

# 2. Dry-run restore against isolated staging database
psql "postgresql://postgres:[PASSWORD]@staging-db.livex.internal:5432/postgres" \
  -f "backups/supabase_dump_${TIMESTAMP}.sql"

# 3. Execute Production Restoration (if primary database corrupted)
psql "postgresql://postgres:[PASSWORD]@prod-db.livex.internal:5432/postgres" \
  -f "backups/supabase_dump_${TIMESTAMP}.sql"
```

### C. Integrity Validation Queries

Run the following SQL queries to ensure zero data loss and valid constraints:

```sql
-- 1. Check total song count and user isolation
SELECT COUNT(*) AS total_songs, COUNT(DISTINCT user_id) AS distinct_users FROM songs;

-- 2. Validate Row Level Security (RLS) is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- 3. Check foreign key integrity between setlists and songs
SELECT COUNT(*) AS orphaned_items 
FROM setlist_items si
LEFT JOIN songs s ON si.song_id = s.id
WHERE s.id IS NULL;
```

---

## 4. Disaster Recovery Matrix & Escalation

| Scenario | Primary Action | Target Recovery Time (RTO) | Max Data Loss (RPO) |
| :--- | :--- | :--- | :--- |
| **Accidental Collection Deletion** | Point-in-time Firestore Import from `gs://livex-production-backups/` | 10 minutes | < 1 hour |
| **Corrupt Migration / Bad Schema** | Rollback migration via `supabase migration repair` & dump restore | 8 minutes | 0 (transaction rolled back) |
| **Cloud Region Outage** | Failover DNS to secondary read-replica / alternate region snapshot | 15 minutes | < 5 minutes |

---

## 5. Automation & Routine Verification Schedule

1. **Automated Firestore Snapshots**: Triggered daily at `02:00 UTC` via Google Cloud Scheduler and Cloud Function.
2. **Automated Supabase PITR**: Retained continuously for 7 days with point-in-time recovery to the second.
3. **Monthly Fire-Drill**: On the first Monday of every month, staging environment is restored from the previous day's production backup to verify script functionality.
