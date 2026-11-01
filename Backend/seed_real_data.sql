-- Seed realistic database records for Campus Master

-- 1. Ensure Students Exist
INSERT INTO users (id, email, name, role, password, is_verified, created_at, updated_at)
VALUES 
(5, 'aman@geu.ac.in', 'Aman Kothari', 'STUDENT', '$2a$10$hzBECugh9rozGACmPREo5uj.5QaN2/4kBumu3lu70.N2qBEHe9phK', 1, NOW(), NOW()),
(6, 'neha@geu.ac.in', 'Neha Semwal', 'STUDENT', '$2a$10$hzBECugh9rozGACmPREo5uj.5QaN2/4kBumu3lu70.N2qBEHe9phK', 1, NOW(), NOW()),
(7, 'ananya@geu.ac.in', 'Ananya Bhatt', 'STUDENT', '$2a$10$hzBECugh9rozGACmPREo5uj.5QaN2/4kBumu3lu70.N2qBEHe9phK', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Ensure Courses for Prof Randheer Sharma (id=3) and Prof Sharma (id=1)
INSERT INTO courses (id, code, name, program, semester, description, is_archived, owner_id, created_at, updated_at)
VALUES
(3, 'CS302', 'Data Structures & Algorithms', 'MCA', 'Semester 3', 'Advanced linear and non-linear data structures, balanced search trees, graph algorithms, and asymptotic complexity analysis.', 0, 3, NOW(), NOW()),
(4, 'CS303', 'Operating Systems', 'MCA', 'Semester 3', 'Core principles of concurrency, multi-threaded process scheduling, virtual memory management, and file systems.', 0, 3, NOW(), NOW()),
(5, 'CS304', 'Web Technologies & Distributed Systems', 'MCA', 'Semester 3', 'Modern web architectures, asynchronous event loops, RESTful microservices, and client-server protocols.', 0, 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- Update Course 2 title to standard
UPDATE courses SET code='CS301', name='Database Management Systems', program='MCA', semester='Semester 3', description='Relational database design, SQL querying, normal forms, transaction ACID properties, and storage indexing.' WHERE id=2;

-- 3. Batches with easy-to-use join codes
UPDATE batches SET join_code='DBMS-7K2M', name='MCA 2026 Batch A', term='Semester 3', join_mode='AUTO_APPROVE', status='ACTIVE' WHERE id=2;

INSERT INTO batches (id, course_id, name, term, join_code, join_mode, status, created_at, updated_at)
VALUES
(3, 3, 'MCA 2026 Batch A', 'Semester 3', 'DSA-8N4P', 'AUTO_APPROVE', 'ACTIVE', NOW(), NOW()),
(4, 4, 'MCA 2026 Batch A', 'Semester 3', 'OS-3X9W', 'FACULTY_APPROVAL', 'ACTIVE', NOW(), NOW()),
(5, 5, 'MCA 2026 Batch A', 'Semester 3', 'WEB-5T1Q', 'AUTO_APPROVE', 'ACTIVE', NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name), join_code=VALUES(join_code);

-- 4. Enrollments (Active students + Pending join requests)
-- Mayank Kumar (id 4) enrolled in all active courses
INSERT INTO enrollments (student_id, batch_id, status, joined_at)
VALUES
(4, 2, 'ACTIVE', NOW()),
(4, 3, 'ACTIVE', NOW()),
(4, 4, 'ACTIVE', NOW()),
(4, 5, 'ACTIVE', NOW())
ON DUPLICATE KEY UPDATE status='ACTIVE';

-- Rahul Verma (id 2) enrolled in DBMS and DSA
INSERT INTO enrollments (student_id, batch_id, status, joined_at)
VALUES
(2, 2, 'ACTIVE', NOW()),
(2, 3, 'ACTIVE', NOW())
ON DUPLICATE KEY UPDATE status='ACTIVE';

-- Ananya Bhatt (id 7) enrolled in DBMS
INSERT INTO enrollments (student_id, batch_id, status, joined_at)
VALUES
(7, 2, 'ACTIVE', NOW())
ON DUPLICATE KEY UPDATE status='ACTIVE';

-- Aman Kothari (id 5) and Neha Semwal (id 6) are PENDING in OS and DBMS -> Gives real data for Join Requests!
INSERT INTO enrollments (student_id, batch_id, status, joined_at)
VALUES
(5, 4, 'PENDING', NOW() - INTERVAL 15 MINUTE),
(6, 2, 'PENDING', NOW() - INTERVAL 45 MINUTE)
ON DUPLICATE KEY UPDATE status='PENDING';

-- 5. Syllabus Units for courses
INSERT INTO units (id, course_id, title, sort_order, created_at)
VALUES
(10, 2, 'Unit 1: Introduction to DBMS & Relational Model', 1, NOW()),
(11, 2, 'Unit 2: SQL, Relational Algebra & Constraints', 2, NOW()),
(12, 2, 'Unit 3: Normalization (1NF, 2NF, 3NF, BCNF)', 3, NOW()),
(13, 2, 'Unit 4: Transaction Processing & ACID Concurrency', 4, NOW()),
(14, 3, 'Unit 1: Asymptotic Notation & Recursion Analysis', 1, NOW()),
(15, 3, 'Unit 2: Balanced Search Trees: AVL & Red-Black Trees', 2, NOW()),
(16, 3, 'Unit 3: Graph Traversal (BFS, DFS) & Minimum Spanning Trees', 3, NOW()),
(17, 4, 'Unit 1: Operating System Structures & System Calls', 1, NOW()),
(18, 4, 'Unit 2: CPU Scheduling Algorithms & Multi-threading', 2, NOW()),
(19, 4, 'Unit 3: Deadlock Avoidance, Detection & Prevention', 3, NOW()),
(20, 4, 'Unit 4: Virtual Memory Management & Page Replacement', 4, NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- 6. Resources (Lecture Notes, Reference Web URLs, Slides)
INSERT INTO resources (id, course_id, unit_id, created_by, title, description, resource_type, mime_type, external_url, file_name, file_size, current_version, is_published, download_count, view_count, created_at, updated_at)
VALUES
(10, 2, 12, 3, 'Relational Normalization & BCNF Worked Examples', 'Comprehensive reference covering Functional Dependencies, Minimal Covers, 3NF decomposition, and Boyce-Codd Normal Form with proofs.', 'URL', 'text/html', 'https://en.wikipedia.org/wiki/Boyce%E2%80%93Codd_normal_form', NULL, NULL, 1, 1, 14, 48, NOW() - INTERVAL 1 DAY, NOW()),
(11, 2, 13, 3, 'MIT OpenCourseWare: ACID Transactions & 2PL Concurrency', 'Lecture recording covering Two-Phase Locking, Strict 2PL, and Write-Ahead Logging (ARIES algorithm).', 'URL', 'text/html', 'https://ocw.mit.edu/courses/6-830-database-systems-fall-2010/', NULL, NULL, 1, 1, 9, 32, NOW() - INTERVAL 2 DAY, NOW()),
(12, 3, 15, 3, 'AVL Tree Rotations Visualizer & Reference Notes', 'Interactive visualization guide explaining LL, RR, LR, and RL rotation cases for height balance.', 'URL', 'text/html', 'https://www.cs.usfca.edu/~galles/visualization/AVLtree.html', NULL, NULL, 1, 1, 22, 65, NOW() - INTERVAL 3 DAY, NOW()),
(13, 4, 18, 3, 'CPU Scheduling Algorithms Simulation Tool', 'Interactive simulator tool demonstrating Round Robin quantum slicing, Shortest Job First, and Priority Scheduling.', 'URL', 'text/html', 'https://cpu-scheduling-simulator.surge.sh/', NULL, NULL, 1, 1, 18, 54, NOW() - INTERVAL 4 DAY, NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), external_url=VALUES(external_url);

-- 7. Real Assignments
INSERT INTO assignments (id, batch_id, created_by, title, instructions, max_marks, late_policy, due_date, created_at, updated_at)
VALUES
(10, 2, 3, 'ER Diagram & Relational Schema Assignment', 'Design a comprehensive ER diagram for an e-commerce platform and convert entities into 3NF normalized relations. Submit diagram and explanation.', 20, 'ACCEPT_MARK_LATE', NOW() + INTERVAL 2 DAY, NOW(), NOW()),
(11, 3, 3, 'AVL Trees & Balance Factor Lab', 'Implement an AVL tree in Java/C++ supporting left and right rotations with balance factor recomputation upon insertion.', 25, 'ACCEPT_MARK_LATE', NOW() + INTERVAL 4 DAY, NOW(), NOW()),
(12, 4, 3, 'Process Scheduling & Round Robin Simulation Lab', 'Simulate Round Robin, Shortest Job First, and Priority Preemptive CPU scheduling algorithms and report context switching latency.', 20, 'ACCEPT_MARK_LATE', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 3 DAY, NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), instructions=VALUES(instructions), due_date=VALUES(due_date);

-- 8. Submissions
-- Submission 1: Mayank submitted OS Lab (Graded & Published!)
INSERT INTO submissions (id, assignment_id, student_id, submitted_at, is_late, text_content, receipt_token, marks, feedback, marks_published, version, created_at, updated_at)
VALUES
(10, 12, 4, NOW() - INTERVAL 2 DAY, 0, 'Completed Round Robin scheduling simulation using quantum q=2ms. Turnaround and waiting times verified against analytical test cases.', 'OS-LAB-REC-9182', 18.5, 'Excellent implementation of preemptive scheduling. Context-switching overhead analysis is precise and well articulated.', 1, 1, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 1 DAY)
ON DUPLICATE KEY UPDATE receipt_token=VALUES(receipt_token), marks=VALUES(marks), marks_published=VALUES(marks_published);

-- Submission 2: Rahul submitted DBMS Assignment (Ungraded -> Appears in Faculty review queue!)
INSERT INTO submissions (id, assignment_id, student_id, submitted_at, is_late, text_content, receipt_token, marks, feedback, marks_published, version, created_at, updated_at)
VALUES
(11, 10, 2, NOW() - INTERVAL 3 HOUR, 0, 'ER Diagram attached along with functional dependency set F for the hospital management database system.', 'DBMS-REC-4819', NULL, NULL, 0, 1, NOW() - INTERVAL 3 HOUR, NOW())
ON DUPLICATE KEY UPDATE receipt_token=VALUES(receipt_token), marks=NULL;

-- Submission 3: Ananya submitted DBMS Assignment (Ungraded -> Appears in Faculty review queue!)
INSERT INTO submissions (id, assignment_id, student_id, submitted_at, is_late, text_content, receipt_token, marks, feedback, marks_published, version, created_at, updated_at)
VALUES
(12, 10, 7, NOW() - INTERVAL 5 HOUR, 0, 'Detailed normalized relations for Users, Orders, Inventory, and Transactions in BCNF.', 'DBMS-REC-7310', NULL, NULL, 0, 1, NOW() - INTERVAL 5 HOUR, NOW())
ON DUPLICATE KEY UPDATE receipt_token=VALUES(receipt_token), marks=NULL;

-- 9. Real Notifications
INSERT INTO notifications (id, recipient_id, event_type, title, message, target_url, is_read, created_at)
VALUES
(10, 4, 'GRADES_PUBLISHED', 'Grades Published: Process Scheduling & Round Robin Simulation Lab', 'Your score and feedback for OS Lab are now published. Evaluated score: 18.5/20', '/dashboard?tab=deadlines', 0, NOW() - INTERVAL 1 DAY),
(11, 4, 'ASSIGNMENT_CREATED', 'New Assignment: ER Diagram & Relational Schema Assignment', 'Assigned in Database Management Systems (MCA 2026 Batch A). Due in 2 days.', '/dashboard?tab=deadlines', 0, NOW() - INTERVAL 2 HOUR),
(12, 3, 'SUBMISSION_RECEIVED', 'New Submission: ER Diagram & Relational Schema Assignment', 'Rahul Verma submitted ER Diagram Assignment. Receipt: DBMS-REC-4819', '/dashboard?tab=overview', 0, NOW() - INTERVAL 3 HOUR),
(13, 3, 'SUBMISSION_RECEIVED', 'New Submission: ER Diagram & Relational Schema Assignment', 'Ananya Bhatt submitted ER Diagram Assignment. Receipt: DBMS-REC-7310', '/dashboard?tab=overview', 0, NOW() - INTERVAL 5 HOUR),
(14, 3, 'JOIN_REQUEST', 'Student Join Request: Aman Kothari', 'Aman Kothari requested to join Operating Systems (MCA 2026 Batch A).', '/dashboard?tab=requests', 0, NOW() - INTERVAL 15 MINUTE)
ON DUPLICATE KEY UPDATE message=VALUES(message);
