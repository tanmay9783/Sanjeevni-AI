import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, 'patient_records.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize database schema
db.pragma('journal_mode = WAL');

const initDB = () => {
  // Create Patients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      abhaId TEXT,
      name TEXT,
      age TEXT,
      mobile TEXT,
      language TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Visits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patientId TEXT,
      date TEXT,
      selectedBodyPart TEXT,
      painSeverity INTEGER,
      summary TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patients (id)
    );
  `);

  console.log("Database initialized successfully.");
};

// Seed with default data if empty
const seedDB = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM patients').get().count;
  if (count === 0) {
    const insertPatient = db.prepare('INSERT INTO patients (id, abhaId, name, age, mobile, language) VALUES (?, ?, ?, ?, ?, ?)');
    insertPatient.run('1001', 'ABHA-9876-5432-1098', 'Ramesh Kumar', '45', '9876543210', 'hi-IN');

    const insertVisit = db.prepare('INSERT INTO visits (patientId, date, selectedBodyPart, painSeverity, summary) VALUES (?, ?, ?, ?, ?)');
    insertVisit.run('1001', '2026-08-15', 'Lower Back', 6, 'Patient complained of dull aching lower back pain after lifting heavy weight. Recommended hot compress and rest.');
    insertVisit.run('1001', '2026-07-02', 'Right Knee', 4, 'Mild stiffness in right knee joint during morning walks.');
    
    console.log("Database seeded with initial patient data.");
  }
};

initDB();
seedDB();

export default db;
