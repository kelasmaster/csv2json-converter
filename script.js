document.addEventListener('DOMContentLoaded', () => {
  // Sample data
  const sampleCSV = `name,age,email
John Doe,30,john@example.com
Jane Smith,25,jane@example.com
Bob Johnson,40,bob@example.com`;

  const sampleJSON = `[
  {
    "name": "John Doe",
    "age": 30,
    "email": "john@example.com"
  },
  {
    "name": "Jane Smith",
    "age": 25,
    "email": "jane@example.com"
  },
  {
    "name": "Bob Johnson",
    "age": 40,
    "email": "bob@example.com"
  }
]`;

  // Format selection
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const format = btn.dataset.format;
      document.querySelectorAll('[data-visible]').forEach(el => {
        el.style.display = el.dataset.visible === format ? 'block' : 'none';
      });
      
      const inputTextarea = document.getElementById('input-data');
      inputTextarea.placeholder = format === 'csv-to-json' 
        ? 'Paste your CSV data here...' 
        : 'Paste your JSON data here...';
      
      // Clear output when switching formats
      document.getElementById('output-data').textContent = 'Your converted data will appear here...';
    });
  });
  
  // File upload handling
  document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById('input-data').value = event.target.result;
      document.querySelector('.file-name').textContent = file.name;
    };
    reader.readAsText(file);
  });
  
  // Load sample data
  document.querySelector('.sample-btn').addEventListener('click', () => {
    const isCsvToJson = document.querySelector('.format-btn.active').dataset.format === 'csv-to-json';
    document.getElementById('input-data').value = isCsvToJson ? sampleCSV : sampleJSON;
    document.querySelector('.file-name').textContent = 'No file selected';
    document.getElementById('file-input').value = '';
  });
  
  // Conversion button
  document.querySelector('.convert-btn').addEventListener('click', () => {
    const input = document.getElementById('input-data').value.trim();
    if (!input) {
      alert('Please enter or upload data to convert');
      return;
    }
    
    try {
      const isCsvToJson = document.querySelector('.format-btn.active').dataset.format === 'csv-to-json';
      const options = {
        hasHeaders: document.getElementById('header-row')?.checked || false,
        flatten: document.getElementById('flatten-nested')?.checked || false
      };
      
      const output = isCsvToJson 
        ? csvToJson(input, options) 
        : jsonToCsv(input, options);
      
      document.getElementById('output-data').textContent = output;
    } catch (e) {
      alert(`Conversion failed: ${e.message}`);
    }
  });
  
  // Output actions
  document.querySelector('.copy-btn').addEventListener('click', () => {
    const output = document.getElementById('output-data').textContent;
    if (!output || output === 'Your converted data will appear here...') {
      alert('No data to copy');
      return;
    }
    
    navigator.clipboard.writeText(output)
      .then(() => alert('Copied to clipboard!'))
      .catch(err => alert('Failed to copy: ' + err));
  });
  
  document.querySelector('.download-btn').addEventListener('click', () => {
    const output = document.getElementById('output-data').textContent;
    if (!output || output === 'Your converted data will appear here...') {
      alert('No data to download');
      return;
    }
    
    const isCsv = output.includes(',') && !output.startsWith('[') && !output.startsWith('{');
    const blob = new Blob([output], { type: isCsv ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = isCsv ? 'converted.csv' : 'converted.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  
  document.querySelector('.clear-btn').addEventListener('click', () => {
    document.getElementById('input-data').value = '';
    document.getElementById('output-data').textContent = 'Your converted data will appear here...';
    document.querySelector('.file-name').textContent = 'No file selected';
    document.getElementById('file-input').value = '';
  });
  
  // Conversion functions
  function csvToJson(csvString, options = { hasHeaders: true }) {
    const lines = csvString.split('\n').filter(line => line.trim() !== '');
    const result = [];
    
    if (options.hasHeaders && lines.length > 0) {
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const currentLine = lines[i].split(',');
        
        for (let j = 0; j < headers.length; j++) {
          let value = currentLine[j] ? currentLine[j].trim() : '';
          // Try to parse numbers and booleans
          if (!isNaN(value)) value = Number(value);
          else if (value.toLowerCase() === 'true') value = true;
          else if (value.toLowerCase() === 'false') value = false;
          
          obj[headers[j]] = value;
        }
        
        result.push(obj);
      }
    } else {
      // Handle CSV without headers
      for (let i = 0; i < lines.length; i++) {
        result.push(lines[i].split(',').map(item => {
          let value = item.trim();
          if (!isNaN(value)) value = Number(value);
          return value;
        });
      }
    }
    
    return JSON.stringify(result, null, 2);
  }
  
  function jsonToCsv(jsonString, options = { flatten: true }) {
    try {
      const jsonData = JSON.parse(jsonString);
      let csv = '';
      
      if (Array.isArray(jsonData)) {
        if (jsonData.length === 0) return '';
        
        // Get headers
        const headers = options.flatten 
          ? getFlattenedKeys(jsonData[0]) 
          : Object.keys(jsonData[0]);
        
        csv += headers.join(',') + '\n';
        
        // Add rows
        jsonData.forEach(item => {
          const row = headers.map(header => {
            const value = options.flatten
              ? getFlattenedValue(item, header)
              : item[header];
            return JSON.stringify(value);
          });
          csv += row.join(',') + '\n';
        });
      } else {
        // Handle single object
        const headers = Object.keys(jsonData);
        csv += headers.join(',') + '\n';
        const row = headers.map(header => JSON.stringify(jsonData[header]));
        csv += row.join(',');
      }
      
      return csv;
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message);
    }
  }
  
  // Helper functions for nested objects
  function getFlattenedKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys = keys.concat(getFlattenedKeys(obj[key], `${prefix}${key}.`));
      } else {
        keys.push(`${prefix}${key}`);
      }
    }
    return keys;
  }
  
  function getFlattenedValue(obj, key) {
    const parts = key.split('.');
    let value = obj;
    for (const part of parts) {
      value = value[part];
      if (value === undefined) break;
    }
    return value;
  }
});
