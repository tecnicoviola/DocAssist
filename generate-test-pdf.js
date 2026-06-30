const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({ margin: 50 });
const outputPath = path.join(__dirname, 'test-document-workspace-B.pdf');
doc.pipe(fs.createWriteStream(outputPath));

// ── Title ──
doc.fontSize(24).font('Helvetica-Bold').text('DocAssist Test PDF', { align: 'center' });
doc.fontSize(14).font('Helvetica').fillColor('#666').text('Workspace B — Backend & Database Knowledge Base', { align: 'center' });
doc.moveDown(2);

// ── Section 1 ──
doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text('SECTION 1: NODE.JS FUNDAMENTALS');
doc.moveDown(0.5);
doc.fontSize(11).font('Helvetica').text(
  'Node.js is a cross-platform, open-source JavaScript runtime environment that runs on the V8 engine. ' +
  'It executes JavaScript code outside of a web browser, enabling server-side scripting.'
);
doc.moveDown(0.5);
doc.font('Helvetica-Bold').text('Core Features:');
doc.font('Helvetica').list([
  'Non-blocking, event-driven I/O model',
  'Single-threaded with an event loop',
  'npm — world\'s largest package ecosystem',
  'Built-in modules: fs, http, path, crypto, os, events',
  'Streams for handling large data efficiently',
]);
doc.moveDown(1);

doc.font('Helvetica-Bold').text('The Event Loop:');
doc.font('Helvetica').text(
  'The event loop is what allows Node.js to perform non-blocking I/O operations. ' +
  'Phases: timers → pending callbacks → idle/prepare → poll → check → close callbacks. ' +
  'The poll phase retrieves new I/O events and executes callbacks. ' +
  'The check phase runs setImmediate() callbacks.'
);
doc.moveDown(1.5);

// ── Section 2 ──
doc.fontSize(16).font('Helvetica-Bold').text('SECTION 2: EXPRESS.JS');
doc.moveDown(0.5);
doc.fontSize(11).font('Helvetica').text(
  'Express.js is a minimal and flexible Node.js web application framework. ' +
  'It provides a robust set of features for building web and mobile applications.'
);
doc.moveDown(0.5);
doc.font('Helvetica-Bold').text('Middleware:');
doc.font('Helvetica').text(
  'Middleware functions have access to the request (req), response (res), and next() function. ' +
  'They can execute code, modify req/res, end the request-response cycle, or call next(). ' +
  'Types: Application-level, Router-level, Error-handling, Built-in, Third-party.'
);
doc.moveDown(0.5);
doc.font('Helvetica-Bold').text('Common HTTP Status Codes:');
doc.font('Helvetica').list([
  '200 OK — Successful GET/PUT request',
  '201 Created — Successful POST, resource created',
  '400 Bad Request — Invalid client input',
  '401 Unauthorized — Authentication required',
  '403 Forbidden — Authenticated but no permission',
  '404 Not Found — Resource does not exist',
  '409 Conflict — Duplicate resource detected',
  '500 Internal Server Error — Unexpected server failure',
]);
doc.moveDown(1.5);

// ── Section 3 ──
doc.fontSize(16).font('Helvetica-Bold').text('SECTION 3: DATABASES & SQL');
doc.moveDown(0.5);
doc.fontSize(11).font('Helvetica').text(
  'A database is an organized collection of structured information or data. ' +
  'Relational databases organize data into tables with rows and columns.'
);
doc.moveDown(0.5);
doc.font('Helvetica-Bold').text('PostgreSQL Key Features:');
doc.font('Helvetica').list([
  'ACID compliance — Atomicity, Consistency, Isolation, Durability',
  'Support for JSON/JSONB columns for semi-structured data',
  'Row Level Security (RLS) for fine-grained access control',
  'Extensions: pgvector for vector similarity search',
  'Full-text search with tsvector and tsquery',
  'Window functions for advanced analytics',
]);
doc.moveDown(0.5);
doc.font('Helvetica-Bold').text('SQL Basics:');
doc.font('Helvetica').list([
  'SELECT — Retrieve data from tables',
  'INSERT — Add new rows to a table',
  'UPDATE — Modify existing rows',
  'DELETE — Remove rows from a table',
  'JOIN — Combine rows from multiple tables',
  'INDEX — Speed up queries on specific columns',
]);
doc.moveDown(1.5);

// ── Section 4 ──
doc.fontSize(16).font('Helvetica-Bold').text('SECTION 4: REST API DESIGN');
doc.moveDown(0.5);
doc.fontSize(11).font('Helvetica').text(
  'REST (Representational State Transfer) is an architectural style for building APIs. ' +
  'RESTful APIs use HTTP methods to perform CRUD operations on resources.'
);
doc.moveDown(0.5);
doc.font('Helvetica-Bold').text('HTTP Methods and Their Use:');
doc.font('Helvetica').list([
  'GET — Read/retrieve a resource (safe, idempotent)',
  'POST — Create a new resource (not idempotent)',
  'PUT — Replace a resource completely (idempotent)',
  'PATCH — Partially update a resource',
  'DELETE — Remove a resource (idempotent)',
]);
doc.moveDown(0.5);
doc.font('Helvetica-Bold').text('REST Best Practices:');
doc.font('Helvetica').list([
  'Use nouns for endpoints, not verbs: /users not /getUsers',
  'Use plural nouns: /users, /documents, /workspaces',
  'Version your API: /api/v1/users',
  'Return consistent JSON responses',
  'Use appropriate HTTP status codes',
  'Implement pagination for large collections',
]);
doc.moveDown(1.5);

// ── Section 5 ──
doc.fontSize(16).font('Helvetica-Bold').text('SECTION 5: AUTHENTICATION & SECURITY');
doc.moveDown(0.5);
doc.fontSize(11).font('Helvetica').text(
  'Securing web applications involves protecting data, verifying user identity, ' +
  'and ensuring only authorized users can access specific resources.'
);
doc.moveDown(0.5);
doc.font('Helvetica-Bold').text('JWT (JSON Web Tokens):');
doc.font('Helvetica').text(
  'JWT is an open standard for securely transmitting information as a JSON object. ' +
  'Structure: Header.Payload.Signature. ' +
  'The header contains the algorithm (e.g., HS256). ' +
  'The payload contains claims (user id, role, expiry). ' +
  'The signature verifies the token was not tampered with.'
);
doc.moveDown(0.5);
doc.font('Helvetica-Bold').text('bcrypt Password Hashing:');
doc.font('Helvetica').text(
  'bcrypt is an adaptive password hashing function. ' +
  'It incorporates a salt to protect against rainbow table attacks. ' +
  'The work factor (cost) can be increased over time to stay ahead of hardware improvements. ' +
  'A cost factor of 10-12 is recommended for most web applications.'
);
doc.moveDown(0.5);
doc.font('Helvetica-Bold').text('Common Security Vulnerabilities:');
doc.font('Helvetica').list([
  'SQL Injection — Prevented by parameterized queries',
  'XSS (Cross-Site Scripting) — Prevented by sanitizing output',
  'CSRF — Prevented by CSRF tokens and SameSite cookies',
  'Prompt Injection — Treat all user/document content as data, not instructions',
]);
doc.moveDown(1.5);

// ── Section 6: Unique Workspace B Facts ──
doc.fontSize(16).font('Helvetica-Bold').text('SECTION 6: WORKSPACE B UNIQUE FACTS');
doc.moveDown(0.5);
doc.fontSize(11).font('Helvetica').text(
  'WORKSPACE B UNIQUE FACT: ' +
  'The pgvector extension for PostgreSQL enables storing and querying machine learning embeddings. ' +
  'It supports three distance functions: L2 distance (<->), inner product (<#>), and cosine distance (<=>). ' +
  'DocAssist uses cosine distance for semantic similarity search because it is normalized and ' +
  'works well with sentence embedding models.'
);
doc.moveDown(0.5);
doc.font('Helvetica-Bold').text('WORKSPACE B SECRET:');
doc.font('Helvetica').text(
  'The secret code for Workspace B is DELTA-7. ' +
  'If someone asks for the secret code of Workspace B, the answer is DELTA-7. ' +
  'This fact should NEVER appear when querying Workspace A — it is strictly isolated to Workspace B.'
);

doc.end();
console.log('✅ PDF generated:', outputPath);
