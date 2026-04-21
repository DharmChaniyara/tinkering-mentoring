-- =========================================
-- StudyShare
-- Database Schema v2.0
-- =========================================
CREATE DATABASE IF NOT EXISTS gsfc_resources CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gsfc_resources;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    google_id   VARCHAR(255) UNIQUE DEFAULT NULL,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) DEFAULT NULL,
    profile_pic VARCHAR(500) DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subjects (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(60),
    type        ENUM('theory','practical') DEFAULT 'theory',
    parent_id   INT DEFAULT NULL,
    total_units INT DEFAULT 0,
    syllabus_file VARCHAR(500) DEFAULT NULL,
    FOREIGN KEY (parent_id) REFERENCES subjects(id) ON DELETE SET NULL
);

CREATE TABLE units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    unit_number INT NOT NULL,
    unit_name VARCHAR(500) NOT NULL,
    UNIQUE KEY uq_subject_unit (subject_id, unit_number),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE notes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    subject_id  INT NOT NULL,
    title       VARCHAR(300) NOT NULL,
    unit_number INT DEFAULT 1,
    file_path   VARCHAR(600) NOT NULL,
    file_type   VARCHAR(50),
    category    VARCHAR(100) DEFAULT 'Notes',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    token      VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used       TINYINT(1) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================================
-- SEED SUBJECTS  (Theory + Practical pairs)
-- =========================================

-- 1. Data Structures & Algorithms
INSERT INTO subjects (id, name, code, type, parent_id, total_units, syllabus_file) VALUES
(1, 'Data Structures & Algorithms', 'BTCS203', 'theory',   NULL, 2, 'Syllabus/Syllabus DSA-Data Structure and Algorithm Sem 2.pdf'),
(2, 'DSA - Practical',              'BTCS203P','practical', 1,    5, NULL);

-- 2. Mathematics II
INSERT INTO subjects (id, name, code, type, parent_id, total_units, syllabus_file) VALUES
(3, 'Mathematics II', 'BTCE204', 'theory', NULL, 3, 'Syllabus/2. Syllabus_BTCS204.pdf');

-- 3. OOP with C++
INSERT INTO subjects (id, name, code, type, parent_id, total_units, syllabus_file) VALUES
(4, 'OOP with C++',          'BTCS201', 'theory',   NULL, 5, 'Syllabus/Syllabus C++.pdf'),
(5, 'OOP with C++ - Practical','BTCS201P','practical', 4,  5, NULL);

-- 4. Web Technologies
INSERT INTO subjects (id, name, code, type, parent_id, total_units, syllabus_file) VALUES
(6, 'Web Technologies',           'BTCE203', 'theory',   NULL, 5, 'Syllabus/Web Technology UPDATED AY 2024-25 05042025.pdf'),
(7, 'Web Technologies - Practical','BTCE203P','practical', 6,  5, NULL);

-- 5. Digital Electronics
INSERT INTO subjects (id, name, code, type, parent_id, total_units, syllabus_file) VALUES
(8, 'Digital Electronics',          'BTCS205', 'theory',   NULL, 5, 'Syllabus/DE Course Sem 2.pdf'),
(9, 'Digital Electronics - Practical','BTCS205P','practical', 8,  5, NULL);

-- =========================================
-- SEED UNITS WITH SYLLABUS NAMES
-- =========================================

-- DSA
INSERT INTO units (subject_id, unit_number, unit_name) VALUES
(1, 1, 'Introduction to Data Structures & Algorithms'),
(1, 2, 'Linear Data Structures: Stacks, Queues, Linked Lists');

-- Math II
INSERT INTO units (subject_id, unit_number, unit_name) VALUES
(3, 1, 'Probability'),
(3, 2, 'Distributions'),
(3, 3, 'Statistical Methods');

-- OOP with C++
INSERT INTO units (subject_id, unit_number, unit_name) VALUES
(4, 1, 'Principles of OOP & Intro to C++'),
(4, 2, 'Classes, Objects & Functions'),
(4, 3, 'Arrays, Pointers, Constructors & Op Overload'),
(4, 4, 'Inheritance, Polymorphism & Exception Handling'),
(4, 5, 'Streams, File Handling & Templates');

-- Web Technologies
INSERT INTO units (subject_id, unit_number, unit_name) VALUES
(6, 1, 'HTML Elements, Forms, Media, Canvas, CSS3'),
(6, 2, 'JavaScript Basics & Events'),
(6, 3, 'jQuery DOM & Animations'),
(6, 4, 'Bootstrap, XML & XSLT'),
(6, 5, 'PHP Backend & Object Oriented PHP');

-- Digital Electronics
INSERT INTO units (subject_id, unit_number, unit_name) VALUES
(8, 1, 'Number Systems and Codes'),
(8, 2, 'Boolean Algebra and Logic Gates'),
(8, 3, 'Combinational Logic Circuits'),
(8, 4, 'Sequential Logic Circuits'),
(8, 5, 'Programmable Logic Devices and Memory');

-- =========================================
-- SEED PRACTICAL UNITS (Lab Experiments)
-- =========================================

-- DSA Practical (subject_id = 2)
INSERT INTO units (subject_id, unit_number, unit_name) VALUES
(2, 1, 'Implementation of Stack using Array'),
(2, 2, 'Implementation of Queue using Array'),
(2, 3, 'Singly Linked List - Insert, Delete, Traverse'),
(2, 4, 'Linear Search & Binary Search'),
(2, 5, 'Sorting Algorithms: Bubble, Selection, Insertion');

-- OOP with C++ Practical (subject_id = 5)
INSERT INTO units (subject_id, unit_number, unit_name) VALUES
(5, 1, 'Classes, Objects & Member Functions'),
(5, 2, 'Constructors, Destructors & Copy Constructor'),
(5, 3, 'Operator Overloading & Friend Functions'),
(5, 4, 'Inheritance & Virtual Functions / Polymorphism'),
(5, 5, 'File Handling & Templates');

-- Web Technologies Practical (subject_id = 7)
INSERT INTO units (subject_id, unit_number, unit_name) VALUES
(7, 1, 'HTML5 Forms, Tables & Semantic Elements'),
(7, 2, 'CSS3 Styling, Flexbox & Responsive Design'),
(7, 3, 'JavaScript DOM Manipulation & Events'),
(7, 4, 'jQuery Effects, AJAX & Animations'),
(7, 5, 'PHP CRUD Operations & MySQL Integration');

-- Digital Electronics Practical (subject_id = 9)
INSERT INTO units (subject_id, unit_number, unit_name) VALUES
(9, 1, 'Verification of Basic Logic Gates (AND, OR, NOT, NAND, NOR, XOR)'),
(9, 2, 'Boolean Expression Simplification using K-Map'),
(9, 3, 'Multiplexer (4:1, 8:1) & Demultiplexer Circuits'),
(9, 4, 'Flip-Flops: SR, JK, D and T Implementation'),
(9, 5, 'Design of Counters & Shift Registers');
