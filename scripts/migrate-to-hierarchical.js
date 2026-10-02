const fs = require('fs');
const path = require('path');

const oldId = 'may-banking-news-notes';
const newId = 'banking_may2026_week1';
const newFileName = 'banking_may2026_week1.pdf';

const inputsDir = path.resolve('./local_storage/inputs');
const processedDir = path.resolve('./local_storage/processed');
const attemptsDir = path.resolve('./local_storage/attempts/timed_quiz');

console.log('=== MIGRATING TO HIERARCHICAL NAMING ===');

// 1. Rename input PDF
const oldPdf = path.join(inputsDir, 'May-Banking-News-Notes.pdf');
const newPdf = path.join(inputsDir, newFileName);
if (fs.existsSync(oldPdf)) {
  fs.copyFileSync(oldPdf, newPdf);
  fs.unlinkSync(oldPdf);
  console.log(`[1] Renamed input PDF: ${oldPdf} -> ${newPdf}`);
} else if (fs.existsSync(newPdf)) {
  console.log(`[1] Input PDF already at: ${newPdf}`);
}

// 2. Migrate processed folder
const oldProcessed = path.join(processedDir, oldId);
const newProcessed = path.join(processedDir, newId);
if (fs.existsSync(oldProcessed)) {
  if (fs.existsSync(newProcessed)) {
    fs.rmSync(newProcessed, { recursive: true, force: true });
  }
  fs.renameSync(oldProcessed, newProcessed);
  console.log(`[2] Renamed processed directory: ${oldProcessed} -> ${newProcessed}`);

  // Update metadata.json inside newProcessed
  const metaPath = path.join(newProcessed, 'metadata.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    meta.id = newId;
    meta.hierarchicalName = newId;
    meta.title = 'Banking Awareness — May 2026 (Week 1)';
    meta.sourceFileName = newFileName;
    meta.periodLabel = 'May 2026 • Week 1';
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    console.log(`[2.1] Updated metadata.json inside ${newProcessed}`);
  }

  // Update questions.json sourcePaperId inside newProcessed
  const qPath = path.join(newProcessed, 'questions.json');
  if (fs.existsSync(qPath)) {
    const questions = JSON.parse(fs.readFileSync(qPath, 'utf-8'));
    questions.forEach(q => {
      q.sourcePaperId = newId;
    });
    fs.writeFileSync(qPath, JSON.stringify(questions, null, 2), 'utf-8');
    console.log(`[2.2] Updated questions.json inside ${newProcessed}`);
  }
}

// 3. Migrate attempts folder
const oldAttempts = path.join(attemptsDir, oldId);
const newAttempts = path.join(attemptsDir, newId);
if (fs.existsSync(oldAttempts)) {
  if (fs.existsSync(newAttempts)) {
    fs.rmSync(newAttempts, { recursive: true, force: true });
  }
  fs.renameSync(oldAttempts, newAttempts);
  console.log(`[3] Renamed attempts directory: ${oldAttempts} -> ${newAttempts}`);

  // Update attempts JSON files paperId & paperTitle
  const files = fs.readdirSync(newAttempts);
  files.filter(f => f.endsWith('.json')).forEach(f => {
    const attPath = path.join(newAttempts, f);
    const att = JSON.parse(fs.readFileSync(attPath, 'utf-8'));
    att.paperId = newId;
    att.paperTitle = 'Banking Awareness — May 2026 (Week 1)';
    fs.writeFileSync(attPath, JSON.stringify(att, null, 2), 'utf-8');
  });
  console.log(`[3.1] Updated all historical attempts in ${newAttempts}`);
}

console.log('=== MIGRATION COMPLETE ===');
