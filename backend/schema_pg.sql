-- =========================================
-- StudyShare — PostgreSQL Schema v2.0
-- Run this inside your Supabase SQL editor
-- or via install_db.php after first deploy.
-- =========================================

-- Drop existing tables (safe re-run)
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS notes                 CASCADE;
DROP TABLE IF EXISTS units                 CASCADE;
DROP TABLE IF EXISTS subjects              CASCADE;
DROP TABLE IF EXISTS users                 CASCADE;

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    google_id     VARCHAR(255) UNIQUE DEFAULT NULL,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) DEFAULT NULL,
    profile_pic   VARCHAR(500) DEFAULT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Subjects ───────────────────────────────────────────────────────────────
CREATE TABLE subjects (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    code          VARCHAR(60),
    type          VARCHAR(20)  DEFAULT 'theory' CHECK (type IN ('theory','practical')),
    parent_id     INT          DEFAULT NULL REFERENCES subjects(id) ON DELETE SET NULL,
    total_units   INT          DEFAULT 0,
    syllabus_file VARCHAR(500) DEFAULT NULL
);

-- ── Units ──────────────────────────────────────────────────────────────────
CREATE TABLE units (
    id          SERIAL PRIMARY KEY,
    subject_id  INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    unit_number INT NOT NULL,
    unit_name   VARCHAR(500) NOT NULL,
    UNIQUE (subject_id, unit_number)
);

-- ── Notes / Documents ──────────────────────────────────────────────────────
CREATE TABLE notes (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    subject_id  INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title       VARCHAR(300) NOT NULL,
    unit_number INT          DEFAULT 1,
    file_path   VARCHAR(600) NOT NULL,
    file_type   VARCHAR(50),
    category    VARCHAR(100) DEFAULT 'Notes',
    uploaded_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Password Reset Tokens ──────────────────────────────────────────────────
CREATE TABLE password_reset_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN DEFAULT FALSE
);

-- =========================================
-- SEED SUBJECTS
-- =========================================
INSERT INTO subjects (id, name, code, type, parent_id, total_units, syllabus_file) VALUES
(1, 'Data Structures & Algorithms',    'BTCS203',  'theory',    NULL, 2, 'Syllabus/Syllabus DSA-Data Structure and Algorithm Sem 2.pdf'),
(2, 'DSA - Practical',                 'BTCS203P', 'practical', 1,    5, NULL),
(3, 'Mathematics II',                  'BTCE204',  'theory',    NULL, 3, 'Syllabus/2. Syllabus_BTCS204.pdf'),
(4, 'OOP with C++',                    'BTCS201',  'theory',    NULL, 5, 'Syllabus/Syllabus C++.pdf'),
(5, 'OOP with C++ - Practical',        'BTCS201P', 'practical', 4,    5, NULL),
(6, 'Web Technologies',                'BTCE203',  'theory',    NULL, 5, 'Syllabus/Web Technology UPDATED AY 2024-25 05042025.pdf'),
(7, 'Web Technologies - Practical',    'BTCE203P', 'practical', 6,    5, NULL),
(8, 'Digital Electronics',             'BTCS205',  'theory',    NULL, 5, 'Syllabus/DE Course Sem 2.pdf'),
(9, 'Digital Electronics - Practical', 'BTCS205P', 'practical', 8,    5, NULL)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence after manual IDs
SELECT setval('subjects_id_seq', (SELECT MAX(id) FROM subjects));

-- =========================================
-- SEED UNITS
-- =========================================
INSERT INTO units (subject_id, unit_number, unit_name) VALUES
-- DSA
(1, 1, 'Introduction to Data Structures & Algorithms'),
(1, 2, 'Linear Data Structures: Stacks, Queues, Linked Lists'),
-- Math II
(3, 1, 'Probability'),
(3, 2, 'Distributions'),
(3, 3, 'Statistical Methods'),
-- OOP with C++
(4, 1, 'Principles of OOP & Intro to C++'),
(4, 2, 'Classes, Objects & Functions'),
(4, 3, 'Arrays, Pointers, Constructors & Op Overload'),
(4, 4, 'Inheritance, Polymorphism & Exception Handling'),
(4, 5, 'Streams, File Handling & Templates'),
-- Web Technologies
(6, 1, 'HTML Elements, Forms, Media, Canvas, CSS3'),
(6, 2, 'JavaScript Basics & Events'),
(6, 3, 'jQuery DOM & Animations'),
(6, 4, 'Bootstrap, XML & XSLT'),
(6, 5, 'PHP Backend & Object Oriented PHP'),
-- Digital Electronics
(8, 1, 'Number Systems and Codes'),
(8, 2, 'Boolean Algebra and Logic Gates'),
(8, 3, 'Combinational Logic Circuits'),
(8, 4, 'Sequential Logic Circuits'),
(8, 5, 'Programmable Logic Devices and Memory'),
-- DSA Practical
(2, 1, 'Implementation of Stack using Array'),
(2, 2, 'Implementation of Queue using Array'),
(2, 3, 'Singly Linked List - Insert, Delete, Traverse'),
(2, 4, 'Linear Search & Binary Search'),
(2, 5, 'Sorting Algorithms: Bubble, Selection, Insertion'),
-- OOP Practical
(5, 1, 'Classes, Objects & Member Functions'),
(5, 2, 'Constructors, Destructors & Copy Constructor'),
(5, 3, 'Operator Overloading & Friend Functions'),
(5, 4, 'Inheritance & Virtual Functions / Polymorphism'),
(5, 5, 'File Handling & Templates'),
-- Web Tech Practical
(7, 1, 'HTML5 Forms, Tables & Semantic Elements'),
(7, 2, 'CSS3 Styling, Flexbox & Responsive Design'),
(7, 3, 'JavaScript DOM Manipulation & Events'),
(7, 4, 'jQuery Effects, AJAX & Animations'),
(7, 5, 'PHP CRUD Operations & MySQL Integration'),
-- DE Practical
(9, 1, 'Verification of Basic Logic Gates (AND, OR, NOT, NAND, NOR, XOR)'),
(9, 2, 'Boolean Expression Simplification using K-Map'),
(9, 3, 'Multiplexer (4:1, 8:1) & Demultiplexer Circuits'),
(9, 4, 'Flip-Flops: SR, JK, D and T Implementation'),
(9, 5, 'Design of Counters & Shift Registers')
ON CONFLICT (subject_id, unit_number) DO NOTHING;
