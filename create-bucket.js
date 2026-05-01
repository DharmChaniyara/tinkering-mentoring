/**
 * create-bucket.js
 * Run this once to create the 'uploads' public bucket in Supabase Storage.
 * Usage: node create-bucket.js
 *
 * Set your Supabase credentials below OR in environment variables:
 *   $env:SUPABASE_URL = "https://xxxx.supabase.co"
 *   $env:SUPABASE_SERVICE_KEY = "your-service-role-key"
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌  Missing credentials.\n');
  console.error('Set them first:\n');
  console.error('  $env:SUPABASE_URL = "https://your-ref.supabase.co"');
  console.error('  $env:SUPABASE_SERVICE_KEY = "your-service-role-key"');
  console.error('\nThen run: node create-bucket.js\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('🔧 Creating "uploads" bucket in Supabase Storage...\n');

  // Check if bucket already exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('❌  Failed to list buckets:', listError.message);
    process.exit(1);
  }

  const existing = buckets.find(b => b.name === 'uploads');
  if (existing) {
    console.log('ℹ️   Bucket "uploads" already exists (id:', existing.id + ')');
    console.log('    Public:', existing.public);
    if (!existing.public) {
      console.log('\n⚠️   Bucket is not public! Updating...');
      const { error: updateError } = await supabase.storage.updateBucket('uploads', { public: true });
      if (updateError) {
        console.error('❌  Failed to make bucket public:', updateError.message);
      } else {
        console.log('✅  Bucket is now public!');
      }
    } else {
      console.log('\n✅  Bucket already exists and is public. Nothing to do.');
    }
    return;
  }

  // Create the bucket as public
  const { data, error } = await supabase.storage.createBucket('uploads', {
    public: true,
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/png',
      'image/jpeg',
    ],
    fileSizeLimit: 10485760, // 10 MB
  });

  if (error) {
    console.error('❌  Failed to create bucket:', error.message);
    process.exit(1);
  }

  console.log('✅  Bucket "uploads" created successfully!');
  console.log('    Name:', data.name);
  console.log('\n🎉  You can now upload files from the StudyShare dashboard.');
}

main().catch(console.error);
