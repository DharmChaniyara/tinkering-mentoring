-- =========================================
-- Seed Practical Units (Lab Experiments)
-- Run this AFTER schema.sql has been applied
-- =========================================
USE gsfc_resources;

-- DSA Practical (subject_id = 2, parent = 1)
INSERT IGNORE INTO units (subject_id, unit_number, unit_name) VALUES
(2, 1, 'Implementation of Stack using Array'),
(2, 2, 'Implementation of Queue using Array'),
(2, 3, 'Singly Linked List Operations'),
(2, 4, 'Linear & Binary Search'),
(2, 5, 'Sorting Algorithms (Bubble, Selection, Insertion)');

-- OOP with C++ Practical (subject_id = 5, parent = 4)
INSERT IGNORE INTO units (subject_id, unit_number, unit_name) VALUES
(5, 1, 'Classes, Objects & Member Functions'),
(5, 2, 'Constructors, Destructors & Copy Constructor'),
(5, 3, 'Operator Overloading & Friend Functions'),
(5, 4, 'Inheritance & Virtual Functions'),
(5, 5, 'File Handling & Templates');

-- Web Technologies Practical (subject_id = 7, parent = 6)
INSERT IGNORE INTO units (subject_id, unit_number, unit_name) VALUES
(7, 1, 'HTML5 Forms, Tables & Semantic Elements'),
(7, 2, 'CSS3 Styling, Flexbox & Responsive Design'),
(7, 3, 'JavaScript DOM Manipulation & Events'),
(7, 4, 'jQuery Effects, AJAX & Animations'),
(7, 5, 'PHP CRUD Operations & MySQL Integration');

-- Digital Electronics Practical (subject_id = 9, parent = 8)
INSERT IGNORE INTO units (subject_id, unit_number, unit_name) VALUES
(9, 1, 'Verification of Logic Gates (AND, OR, NOT, NAND, NOR, XOR)'),
(9, 2, 'Boolean Expression Simplification using K-Map'),
(9, 3, 'Multiplexer & Demultiplexer Circuits'),
(9, 4, 'Flip-Flops (SR, JK, D, T) Implementation'),
(9, 5, 'Design of Counters & Shift Registers');
