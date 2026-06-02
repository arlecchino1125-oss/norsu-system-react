import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketList = (process.env.SUPABASE_STORAGE_BUCKETS || 'profile-pictures,attendance_proofs,support_documents')
  .split(',')
  .map((bucket) => bucket.trim())
  .filter(Boolean);
const dryRun = process.argv.includes('--dry-run');
const removeBatchSize = 1000;
const pageSize = 1000;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const isFolderLike = (item) => {
  if (!item) return false;
  return !item.id && !item.metadata && !item.created_at && !item.updated_at;
};

const listObjects = async (bucket, prefix = '') => {
  const paths = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      const message = String(error.message || error);
      if (message.toLowerCase().includes('not found')) {
        console.warn(`Bucket "${bucket}" not found. Skipping.`);
        return paths;
      }
      throw error;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (isFolderLike(item)) {
        paths.push(...await listObjects(bucket, path));
      } else {
        paths.push(path);
      }
    }

    if (data.length < pageSize) break;
    offset += data.length;
  }

  return paths;
};

const removeObjects = async (bucket, paths) => {
  let removed = 0;

  for (let index = 0; index < paths.length; index += removeBatchSize) {
    const batch = paths.slice(index, index + removeBatchSize);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) throw error;
    removed += batch.length;
  }

  return removed;
};

for (const bucket of bucketList) {
  const paths = await listObjects(bucket);

  if (paths.length === 0) {
    console.log(`${bucket}: empty`);
    continue;
  }

  if (dryRun) {
    console.log(`${bucket}: ${paths.length} object(s) would be removed`);
    continue;
  }

  const removed = await removeObjects(bucket, paths);
  console.log(`${bucket}: removed ${removed} object(s)`);
}

console.log(dryRun ? 'Dry run complete.' : 'Storage cleanup complete.');
