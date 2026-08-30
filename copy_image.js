const fs = require('fs');

const files = [
  {
    src: 'C:/Users/minicomputer/.gemini/antigravity/brain/4a546228-b400-4f34-a16e-087a80b20bd2/visia_machine_1778455294697.png',
    dest: 'client/public/images/visia_machine.png'
  },
  {
    src: 'C:/Users/minicomputer/.gemini/antigravity/brain/4a546228-b400-4f34-a16e-087a80b20bd2/probe_analyzer_1778455309757.png',
    dest: 'client/public/images/probe_analyzer.png'
  },
  {
    src: 'C:/Users/minicomputer/.gemini/antigravity/brain/4a546228-b400-4f34-a16e-087a80b20bd2/skin_scanner_1778455322557.png',
    dest: 'client/public/images/skin_scanner.png'
  },
  {
    src: 'C:/Users/minicomputer/.gemini/antigravity/brain/4a546228-b400-4f34-a16e-087a80b20bd2/lab_microscope_1778455336880.png',
    dest: 'client/public/images/lab_microscope.png'
  }
];

files.forEach(f => {
  try {
    fs.copyFileSync(f.src, f.dest);
    console.log(`Copied to ${f.dest}`);
  } catch (err) {
    console.error(`Failed to copy ${f.src}: ${err.message}`);
  }
});
