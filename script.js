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
    reader.onerror = () => {
      alert('Error reading file');
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
      console.error(e);
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
  
  // Improved CSV to JSON conversion
  function csvToJson(csvString, options = { hasHeaders: true }) {
    // Normalize line endings and split into lines
    const lines = csvString.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return '[]';
    
    const result = [];
    
    if (options.hasHeaders) {
      // Handle quoted headers and values
      const headers = parseCsvLine(lines[0]);
      
      for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const currentLine = parseCsvLine(lines[i]);
        
        for (let j = 0; j < headers.length; j++) {
          if (j < currentLine.length) {
            obj[headers[j]] = parseValue(currentLine[j]);
          } else {
            obj[headers[j]] = '';
          }
        }
        
        result.push(obj);
      }
    } else {
      // Handle CSV without headers
      for (let i = 0; i < lines.length; i++) {
        result.push(parseCsvLine(lines[i]).map(parseValue));
      }
    }
    
    return JSON.stringify(result, null, 2);
  }
  
  // Helper to parse a single CSV line with quoted values
  function parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current);
    return values.map(v => v.trim());
  }
  
  // Helper to parse values (numbers, booleans, etc.)
  function parseValue(value) {
    if (value === '') return '';
    if (!isNaN(value)) return Number(value);
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    return value;
  }
  
  // Improved JSON to CSV conversion
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
        
        csv += headers.map(escapeCsvValue).join(',') + '\n';
        
        // Add rows
        jsonData.forEach(item => {
          const row = headers.map(header => {
            const value = options.flatten
              ? getFlattenedValue(item, header)
              : item[header];
            return escapeCsvValue(value);
          });
          csv += row.join(',') + '\n';
        });
      } else if (typeof jsonData === 'object') {
        // Handle single object
        const headers = options.flatten 
          ? getFlattenedKeys(jsonData) 
          : Object.keys(jsonData);
        
        csv += headers.map(escapeCsvValue).join(',') + '\n';
        const row = headers.map(header => {
          const value = options.flatten
            ? getFlattenedValue(jsonData, header)
            : jsonData[header];
          return escapeCsvValue(value);
        });
        csv += row.join(',');
      } else {
        throw new Error('Input must be a JSON object or array');
      }
      
      return csv;
    } catch (e) {
      throw new Error('Invalid JSON: ' + e.message);
    }
  }
  
  // Escape CSV values
  function escapeCsvValue(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
  
  // Helper functions for nested objects
  function getFlattenedKeys(obj, prefix = '') {
    if (typeof obj !== 'object' || obj === null) return [prefix];
    
    let keys = [];
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys = keys.concat(getFlattenedKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }
  
  function getFlattenedValue(obj, key) {
    const parts = key.split('.');
    let value = obj;
    for (const part of parts) {
      if (value === null || typeof value !== 'object') return undefined;
      value = value[part];
      if (value === undefined) break;
    }
    return value;
  }
});
