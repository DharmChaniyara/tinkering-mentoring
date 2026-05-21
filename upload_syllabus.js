// upload_syllabus.js
const fs = require('fs');
const path = require('path');

// Manually load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Default subjects if database is empty
const defaultSubjects = [
  { name: 'Mathematics - II', code: 'BTCS204', type: 'theory' },
  { name: 'Digital Electronics', code: 'DE', type: 'theory' },
  { name: 'Object Oriented Programming', code: 'OOP', type: 'theory' },
  { name: 'Web Technology', code: 'WT', type: 'theory' },
];

async function main() {
  console.log('🔄 Checking and uploading syllabus PDFs to Supabase Storage and Database...\n');

  // 1. Get files from Syllabus folder
  const syllabusDir = path.join(__dirname, 'Syllabus');
  if (!fs.existsSync(syllabusDir)) {
    console.error(`❌ Syllabus directory not found at: ${syllabusDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(syllabusDir).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`📂 Found ${files.length} PDF syllabus files in Syllabus folder:`, files);

  if (files.length === 0) {
    console.log('⚠️ No PDF files to process.');
    return;
  }

  // 2. Fetch existing subjects from DB
  let { data: subjects, error: subjErr } = await supabase.from('subjects').select('*');
  if (subjErr) {
    console.error('❌ Failed to fetch subjects from DB:', subjErr.message);
    process.exit(1);
  }

  console.log(`📊 Found ${subjects.length} existing subjects in DB.`);

  // If empty, insert default subjects
  if (subjects.length === 0) {
    console.log('🌱 Seeding default subjects into DB...');
    const { data: inserted, error: insertErr } = await supabase.from('subjects').insert(defaultSubjects).select();
    if (insertErr) {
      console.error('❌ Failed to seed default subjects:', insertErr.message);
      process.exit(1);
    }
    subjects = inserted;
    console.log(`✅ Seeded ${subjects.length} default subjects.`);
  }

  // 3. Process each syllabus file
  for (const filename of files) {
    console.log(`\n📄 Processing "${filename}"...`);
    const filePath = path.join(syllabusDir, filename);
    const fileBuffer = fs.readFileSync(filePath);

    // Upload to Supabase Storage 'uploads' bucket
    const storageFileName = `syllabus_${Date.now()}_${filename.replace(/\s+/g, '_')}`;
    console.log(`   Uploading to storage as: ${storageFileName}`);
    
    const { error: uploadErr } = await supabase.storage
      .from('uploads')
      .upload(storageFileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      console.error(`   ❌ Storage upload failed: ${uploadErr.message}`);
      continue;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(storageFileName);
    console.log(`   Public URL: ${publicUrl}`);

    // Match file to a subject
    let matchedSubject = null;
    let maxScore = -1;

    for (const sub of subjects) {
      const score = matchSubjectToFile(sub, filename);
      if (score > maxScore && score > 0) {
        maxScore = score;
        matchedSubject = sub;
      }
    }

    if (matchedSubject) {
      console.log(`   🎯 Matched with subject: "${matchedSubject.name}" (Code: ${matchedSubject.code}, ID: ${matchedSubject.id}) with score: ${maxScore}`);
      
      // Update database row
      const { error: updateErr } = await supabase
        .from('subjects')
        .update({ syllabus_file: publicUrl })
        .eq('id', matchedSubject.id);

      if (updateErr) {
        console.error(`   ❌ Failed to update database for subject: ${updateErr.message}`);
      } else {
        console.log(`   ✅ Database updated successfully!`);
      }
    } else {
      console.log(`   ⚠️ Could not find a matching subject for this syllabus file.`);
    }
  }

  console.log('\n🏁 Syllabus upload and database association complete!');
}

function matchSubjectToFile(subject, filename) {
  const name = subject.name.toLowerCase();
  const code = (subject.code || '').toLowerCase();
  const fn = filename.toLowerCase();

  // Explicit hardcoded overrides/matches
  if (fn.includes('btcs204') || fn.includes('maths')) {
    if (code.includes('btcs204') || code.includes('btce204') || name.includes('math')) {
      return 100;
    }
  }
  if (fn.includes('de ') || fn.includes('digital') || fn.startsWith('de')) {
    if (code.includes('de') || name.includes('digital') || name.includes('electronics')) {
      return 100;
    }
  }
  if (fn.includes('c++') || fn.includes('cpp')) {
    if (code.includes('oop') || code.includes('c++') || name.includes('c++') || name.includes('object') || name.includes('programming')) {
      return 100;
    }
  }
  if (fn.includes('web') || fn.includes('technology')) {
    if (code.includes('wt') || code.includes('web') || name.includes('web') || name.includes('technology')) {
      return 100;
    }
  }

  // Fallback heuristic matches
  let score = 0;
  if (code && fn.includes(code)) score += 50;
  
  const nameWords = name.split(/\s+/);
  nameWords.forEach(word => {
    if (word.length > 2 && fn.includes(word)) score += 10;
  });

  return score;
}

main().catch(console.error);
