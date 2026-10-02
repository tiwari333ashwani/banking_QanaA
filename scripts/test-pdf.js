const fs = require('fs');
const pdf = require('pdf-parse');

async function testPdf() {
  const dataBuffer = fs.readFileSync('./local_storage/inputs/May-Banking-News-Notes.pdf');
  const data = await pdf(dataBuffer);
  console.log('PDF Page count:', data.numpages);
  console.log('Extracted text length:', data.text.length);
  console.log('Sample text snippet (first 1000 chars):');
  console.log(data.text.substring(0, 1000));
}

testPdf().catch(console.error);
