USE gsfc_resources;

-- Adding Digital Electronics Theory and Lab (if not exists)
INSERT IGNORE INTO subjects (id, name, code, type, parent_id, total_units, syllabus_file) VALUES
(8, 'Digital Electronics',           'BTCS205',  'theory',   NULL, 5, 'Syllabus/DE Course Sem 2.pdf'),
(9, 'Digital Electronics - Practical','BTCS205P','practical', 8,   5, NULL);

-- Adding units for Digital Electronics Theory
INSERT IGNORE INTO units (subject_id, unit_number, unit_name) VALUES
(8, 1, 'Number Systems and Codes'),
(8, 2, 'Boolean Algebra and Logic Gates'),
(8, 3, 'Combinational Logic Circuits'),
(8, 4, 'Sequential Logic Circuits'),
(8, 5, 'Programmable Logic Devices and Memory');

-- ================================================
-- SEED PRACTICAL UNITS FOR ALL PRACTICAL SUBJECTS
-- ================================================

-- DSA Practical (subject_id = 2)
INSERT IGNORE INTO units (subject_id, unit_number, unit_name) VALUES
(2, 1, 'Implementation of Stack using Array'),
(2, 2, 'Implementation of Queue using Array'),
(2, 3, 'Singly Linked List - Insert, Delete, Traverse'),
(2, 4, 'Linear Search & Binary Search'),
(2, 5, 'Sorting Algorithms: Bubble, Selection, Insertion');

-- OOP with C++ Practical (subject_id = 5)
INSERT IGNORE INTO units (subject_id, unit_number, unit_name) VALUES
(5, 1, 'Classes, Objects & Member Functions'),
(5, 2, 'Constructors, Destructors & Copy Constructor'),
(5, 3, 'Operator Overloading & Friend Functions'),
(5, 4, 'Inheritance & Virtual Functions / Polymorphism'),
(5, 5, 'File Handling & Templates');

-- Web Technologies Practical (subject_id = 7)
INSERT IGNORE INTO units (subject_id, unit_number, unit_name) VALUES
(7, 1, 'HTML5 Forms, Tables & Semantic Elements'),
(7, 2, 'CSS3 Styling, Flexbox & Responsive Design'),
(7, 3, 'JavaScript DOM Manipulation & Events'),
(7, 4, 'jQuery Effects, AJAX & Animations'),
(7, 5, 'PHP CRUD Operations & MySQL Integration');

-- Digital Electronics Practical (subject_id = 9)
INSERT IGNORE INTO units (subject_id, unit_number, unit_name) VALUES
(9, 1, 'Verification of Basic Logic Gates (AND, OR, NOT, NAND, NOR, XOR)'),
(9, 2, 'Boolean Expression Simplification using K-Map'),
(9, 3, 'Multiplexer (4:1, 8:1) & Demultiplexer Circuits'),
(9, 4, 'Flip-Flops: SR, JK, D and T Implementation'),
(9, 5, 'Design of Counters & Shift Registers');
