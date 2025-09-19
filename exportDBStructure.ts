/**
 * Script to export Firestore database structure
 * This script will list all collections and document structures in the database
 * Reference: Firebase Admin SDK Documentation
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
const serviceAccountPath = join(process.cwd(), 'service_key.json');
// console.log('Looking for service account key at:', serviceAccountPath);

// Store markdown content
let markdownContent = '# Firestore Database Structure\n\n';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = join(process.cwd(), `database-structure-${timestamp}.md`);

try {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));

  initializeApp({
    credential: cert(serviceAccount as any),
  });

  const db = getFirestore();

  async function analyzeDocument(doc: FirebaseFirestore.DocumentSnapshot, depth: number = 0): Promise<string> {
    let content = '';
    const indent = '  '.repeat(depth);
    const mdIndent = '    '.repeat(depth);
    
    content += `${mdIndent}- 📄 Document: \`${doc.id}\`\n`;
    const data = doc.data();
    if (!data) return content;

    // Add document fields
    for (const [key, value] of Object.entries(data)) {
      const type = Array.isArray(value) ? 'array' : 
                  value instanceof Date ? 'timestamp' :
                  value === null ? 'null' :
                  typeof value;
                  
      content += `${mdIndent}  - 🔑 \`${key}\`: \`${type}\`\n`;
      
      // For arrays and objects, show their structure
      if (type === 'array' && value.length > 0) {
        content += `${mdIndent}    - Array contains: \`${typeof value[0]}\`\n`;
      } else if (type === 'object' && value !== null && !(value instanceof Date)) {
        content += `${mdIndent}    - Object keys: \`${Object.keys(value).join(', ')}\`\n`;
      }
    }

    // Get subcollections of this document
    const subcollections = await doc.ref.listCollections();
    if (subcollections.length > 0) {
      content += `${mdIndent}  - 📚 **Subcollections:**\n`;
      for (const subcol of subcollections) {
        content += await analyzeCollection(subcol, depth + 2);
      }
    }

    return content;
  }

  async function analyzeCollection(collection: FirebaseFirestore.CollectionReference, depth: number = 0): Promise<string> {
    let content = '';
    const mdIndent = '    '.repeat(depth);
    
    content += `${mdIndent}- 📂 Collection: \`${collection.id}\`\n`;
    
    const snapshot = await collection.limit(10).get(); // Increased limit to 10 for better sampling
    if (snapshot.empty) {
      content += `${mdIndent}  - ℹ️ *No documents found in this collection*\n\n`;
      return content;
    }

    for (const doc of snapshot.docs) {
      content += await analyzeDocument(doc, depth + 1);
    }

    return content;
  }

  async function listCollectionsAndStructure() {
    try {
      // console.log('🔍 Starting database structure export...\n');
      
      // Add header information
      markdownContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
      markdownContent += '## Collections Structure\n\n';
      
      const collections = await db.listCollections();
      for (const collection of collections) {
        markdownContent += await analyzeCollection(collection);
        markdownContent += '\n'; // Add spacing between top-level collections
      }
      
      // Save to file
      writeFileSync(outputPath, markdownContent);
      
      // console.log('✅ Database structure export completed!');
      // console.log(`📝 Markdown file saved to: ${outputPath}`);
    } catch (error) {
      console.error('❌ Error while exporting database structure:', error);
      process.exit(1);
    }
  }

  // Execute the function
  listCollectionsAndStructure();

} catch (error: any) {
  if (error.code === 'ENOENT') {
    console.error('❌ Error: service_key.json not found!');
    console.error('Please follow these steps to get your service account key:');
    console.error('1. Go to Firebase Console (https://console.firebase.google.com)');
    console.error('2. Select your project');
    console.error('3. Go to Project Settings (⚙️)');
    console.error('4. Go to Service Accounts tab');
    console.error('5. Click "Generate New Private Key"');
    console.error('6. Save the downloaded file as "service_key.json" in the project root directory');
  } else {
    console.error('❌ Error initializing Firebase Admin:', error);
  }
  process.exit(1);
} 