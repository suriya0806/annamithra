const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\ea0f7335-613a-4635-a424-71d8a306989c\\.system_generated\\logs\\transcript_full.jsonl')
});

const chunks = {};

rl.on('line', (line) => {
  const data = JSON.parse(line);
  if ([136, 98, 197, 199, 76, 78, 80, 110, 112, 201, 203].includes(data.step_index)) {
    chunks[data.step_index] = data.content;
  }
});

rl.on('close', () => {
  function getLines(str) {
    const map = new Map();
    str.split('\n').forEach(l => {
      const m = l.match(/^(\d+): (.*)$/);
      if (m) map.set(parseInt(m[1]), m[2]);
    });
    return map;
  }

  const c136 = getLines(chunks[136]);
  const c98 = getLines(chunks[98]);
  const c197 = getLines(chunks[197]);
  const c199 = getLines(chunks[199]);
  const c76 = getLines(chunks[76]);
  const c78 = getLines(chunks[78]);
  const c80 = getLines(chunks[80]);
  const c110 = getLines(chunks[110]);
  const c112 = getLines(chunks[112]);
  const c201 = getLines(chunks[201]);
  const c203 = getLines(chunks[203]);

  let lines = [];
  // Section 1: Lines 1-120 from step 136
  for (let i = 1; i <= 120; i++) {
    lines.push(c136.get(i));
  }
  console.log('After c136, total lines:', lines.length, 'last:', lines[lines.length-1]);

  // Section 2: Lines 121-245 from step 98
  for (let i = 121; i <= 245; i++) {
    lines.push(c98.get(i));
  }
  console.log('After c98, total lines:', lines.length, 'last:', lines[lines.length-1]);

  // Section 3: Lines 246-350 from step 197
  for (let i = 246; i <= 350; i++) {
    lines.push(c197.get(i));
  }
  console.log('After c197, total lines:', lines.length, 'last:', lines[lines.length-1]);

  // Section 4: Lines 351-450 from step 199
  for (let i = 351; i <= 450; i++) {
    lines.push(c199.get(i));
  }
  console.log('After c199, total lines:', lines.length, 'last:', lines[lines.length-1]);

  // Between 450 of step 199 and 420 of step 76:
  lines.push('          <div className="operation-list">');
  lines.push('            <Operation label={user.organizationName || "Organization"} text={`Role: ${user.role}`} icon={Building2} />');
  lines.push('            <Operation label={user.branchName || "All branches"} text="Scope of active session" icon={Store} />');
  lines.push('          </div>');
  lines.push('        </div>');
  lines.push('      </div>');
  lines.push('    </>');
  lines.push('  );');
  lines.push('}');
  lines.push('');
  lines.push('function Operation({ label, text, icon: Icon }) {');

  // Step 76: from line 420 to line 500
  for (let i = 420; i <= 500; i++) {
    lines.push(c76.get(i));
  }
  console.log('After c76, total lines:', lines.length, 'last:', lines[lines.length-1]);

  // Step 78: lines 501 to 650
  for (let i = 501; i <= 650; i++) {
    lines.push(c78.get(i));
  }
  console.log('After c78, total lines:', lines.length, 'last:', lines[lines.length-1]);

  // Step 80: lines 651 to 800
  for (let i = 651; i <= 800; i++) {
    lines.push(c80.get(i));
  }
  console.log('After c80, total lines:', lines.length, 'last:', lines[lines.length-1]);

  // Step 110: lines 801 to 950
  for (let i = 801; i <= 950; i++) {
    lines.push(c110.get(i));
  }
  console.log('After c110, total lines:', lines.length, 'last:', lines[lines.length-1]);

  // Step 112: lines 951 to 1099
  for (let i = 951; i <= 1099; i++) {
    lines.push(c112.get(i));
  }
  console.log('After c112, total lines:', lines.length, 'last:', lines[lines.length-1]);

  // Step 201: lines 1143 to 1280
  for (let i = 1143; i <= 1280; i++) {
    lines.push(c201.get(i));
  }
  console.log('After c201, total lines:', lines.length, 'last:', lines[lines.length-1]);

  // Step 203: lines 1281 to 1324
  for (let i = 1281; i <= 1324; i++) {
    lines.push(c203.get(i));
  }
  console.log('After c203, total lines:', lines.length, 'last:', lines[lines.length-1]);

  fs.writeFileSync('frontend/src/App.reconstructed.jsx', lines.join('\n'));
  console.log('Successfully written frontend/src/App.reconstructed.jsx!');
});
