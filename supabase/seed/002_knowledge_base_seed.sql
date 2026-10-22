-- Seed data for the curated knowledge base (docs/BUILD_SPEC.md Part 4.6 & Part 4.8)
-- 10 reviewed documents spanning senior experiences, company patterns,
-- topic resources, and college placement info.

insert into public.kb_documents (id, title, category, company_name, source_url, raw_text, status, reviewed_at)
values
  (
    '11111111-1111-1111-1111-111111110001',
    'Amazon SDE-1 Campus Interview Guide & Leadership Principles',
    'company_pattern',
    'Amazon',
    'https://vyoman.tech/resources/kb/amazon-sde1-guide',
    'Amazon campus hiring for Software Development Engineer 1 (SDE-1) consists of 4 main evaluation stages: an Online Assessment (OA) followed by 3 rounds of technical and behavioral interviews.

The Online Assessment (OA) features two coding problems (focusing on data structures, arrays, strings, trees, and graphs) and a work style simulation questionnaire testing workplace judgment.

The three virtual interview rounds evaluate Data Structures & Algorithms, Object-Oriented Design basics, and Amazon Leadership Principles. Every interview round allocates 15-20 minutes specifically to probe 2-3 Amazon Leadership Principles (LPs). Key leadership principles tested for SDE-1 include:
1. Customer Obsession: Always starting with the customer need and working backwards.
2. Ownership: Thinking long term and never saying "that is not my job".
3. Bias for Action: Making calculated decisions quickly under uncertainty.
4. Deep Dive: Getting into the technical implementation details and edge cases.
5. Earn Trust: Listening attentively, speaking candidly, and admitting mistakes transparently.

One round is designated as the Bar Raiser round, led by an independent interviewer from another team to ensure high quality standards.',
    'reviewed',
    now()
  ),
  (
    '11111111-1111-1111-1111-111111110002',
    'Google Campus Software Engineer Interview Structure & Technical Expectations',
    'company_pattern',
    'Google',
    'https://vyoman.tech/resources/kb/google-swe-campus',
    'Google campus recruitment for Software Engineer (SWE) positions emphasizes core problem-solving ability, algorithmic thinking, clean code writing, and Googleyness.

The recruitment process consists of:
1. Online Coding Challenge on Google platform: 2 challenging algorithmic problems.
2. 3 rounds of technical interviews (45 minutes each): Focused on Data Structures and Algorithms. Common topics include Binary Trees, Binary Search Trees, Graph Traversals (BFS, DFS, Dijkstra), Dynamic Programming, and Two-Pointer / Sliding Window techniques. Candidates are expected to explain time and space complexity using Big-O notation for every solution.
3. 1 Googleyness & Leadership round: Behavioral evaluation assessing intellectual humility, collaborative mindset, navigating ambiguity, doing the right thing, and valuing diverse perspectives.

Candidates are evaluated on four key rubrics: General Cognitive Ability (GCA), Role-Related Knowledge (RRK), Leadership, and Googleyness. Clean, bug-free implementation and dry-running with edge cases are mandatory.',
    'reviewed',
    now()
  ),
  (
    '11111111-1111-1111-1111-111111110003',
    'Microsoft Campus SDE Interview Workflow & Low-Level Design',
    'company_pattern',
    'Microsoft',
    'https://vyoman.tech/resources/kb/microsoft-sde-process',
    'Microsoft on-campus hiring for SDE roles focuses on strong fundamental coding, modular design, and collaborative engineering practices.

The recruitment pattern includes:
1. Online Assessment: Coding problems on strings, dynamic programming, and trees, along with debugging questions.
2. Technical Round 1: Core Data Structures and Algorithms with a focus on linked lists, recursion, trees, and hash maps.
3. Technical Round 2: Problem solving and Low-Level Design (LLD). Candidates are asked to design modular, extensible classes following Object-Oriented Programming (OOP) and SOLID principles (e.g. Design a Parking Lot, Snake & Ladder, or Elevator System).
4. Technical & Managerial Round (Director/Partner Round): Discussion on past academic projects, system architecture choices, handling technical setbacks, and cultural alignment.

Microsoft interviewers value readable, production-grade code with appropriate error handling and unit test cases.',
    'reviewed',
    now()
  ),
  (
    '11111111-1111-1111-1111-111111110004',
    'Mastering the STAR Method for Behavioral Interviews',
    'topic_resource',
    null,
    'https://vyoman.tech/resources/kb/star-method-guide',
    'The STAR method is the industry standard framework for structuring responses to behavioral and situational interview questions.

STAR stands for:
- Situation (S): Set the context. Describe the specific situation, team, project, or challenge you faced. Keep it concise (15-20% of your answer).
- Task (T): Explain your specific responsibility or goal in that situation. Clarify what needed to be achieved and what constraints existed.
- Action (A): Detail the specific actions YOU took to tackle the challenge. Highlight your technical decisions, problem-solving mindset, and interpersonal collaboration. Use "I" rather than "we" to emphasize your personal contribution (60% of your answer).
- Result (R): Conclude with the tangible, quantifiable outcome. State the metrics: performance improvement, percentage latency reduction, error rate drop, deadline met, or positive team feedback.

Common questions where STAR is essential: "Tell me about a time you resolved a conflict", "Describe a technical mistake you made and how you fixed it", and "Describe a project where you worked under severe time constraints".',
    'reviewed',
    now()
  ),
  (
    '11111111-1111-1111-1111-111111110005',
    'System Design Fundamentals for Campus Placement Interviews',
    'topic_resource',
    null,
    'https://vyoman.tech/resources/kb/system-design-campus',
    'While senior engineers face complex High-Level Design (HLD) challenges, campus recruits are frequently tested on fundamental distributed systems principles and low-level architectural tradeoffs.

Essential topics for campus system design interviews:
1. Caching: Cache-Aside vs Write-Through strategies. In-memory caching using Redis or Memcached to reduce database load and achieve sub-millisecond read latency. Eviction policies including Least Recently Used (LRU) and Least Frequently Used (LFU).
2. Load Balancing: Distributing incoming traffic across multiple web servers. Algorithms include Round Robin, Weighted Round Robin, Least Connections, and IP Hash. Layer 4 vs Layer 7 load balancing.
3. Database Scaling: Relational (SQL) vs NoSQL databases. Indexing mechanisms (B-Trees), vertical scaling vs horizontal scaling, read replicas, and database sharding.
4. Rate Limiting: Preventing abuse and traffic spikes using algorithms such as Token Bucket, Leaky Bucket, and Fixed Window Counters.
5. Microservices vs Monoliths: Understanding API gateways, asynchronous message queues (RabbitMQ, Kafka), and RESTful communication.',
    'reviewed',
    now()
  ),
  (
    '11111111-1111-1111-1111-111111110006',
    'Data Structures & Algorithms Tier-1 Campus Placement Roadmap',
    'topic_resource',
    null,
    'https://vyoman.tech/resources/kb/dsa-placement-roadmap',
    'A structured preparation roadmap for technical coding rounds at top product companies (tier-1 and tier-2 placement drives):

Phase 1 - Fundamentals (Weeks 1-4):
- Arrays and Strings: Two pointers, prefix sums, sliding window, fast and slow pointers.
- Sorting & Searching: Binary search variations (search in rotated sorted array, search on answer space).
- Hashing: Hash map and hash set patterns for constant-time lookups.

Phase 2 - Linear and Hierarchical Data Structures (Weeks 5-8):
- Linked Lists: Inversion, cycle detection, reordering.
- Stacks & Queues: Monotonic stack patterns (Next Greater Element), queue implementation with circular arrays.
- Trees: Binary trees, Binary Search Trees (BST), tree traversals (inorder, preorder, postorder, level-order), Lowest Common Ancestor (LCA).

Phase 3 - Advanced Topics (Weeks 9-14):
- Graphs: Graph representations, BFS, DFS, Topological Sorting (Kahn algorithm), Disjoint Set Union (DSU), Shortest path algorithms (Dijkstra).
- Dynamic Programming: 1D DP (Fibonacci, house robber), 2D DP (grid problems, subset sum, 0/1 knapsack), Longest Common Subsequence (LCS), Longest Increasing Subsequence (LIS).
- Heaps & Tries: Priority queues for Top-K elements, Prefix Trees for auto-completion.',
    'reviewed',
    now()
  ),
  (
    '11111111-1111-1111-1111-111111110007',
    'TCS Digital and Prime Hiring Pattern & Assessment Syllabus',
    'company_pattern',
    'TCS',
    'https://vyoman.tech/resources/kb/tcs-digital-prime',
    'Tata Consultancy Services (TCS) conducts national qualifying drives offering three hiring bands: Ninja, Digital, and Prime.

TCS Digital and Prime evaluation breakdown:
1. Online Test (Cognitive + Technical):
   - Advanced Quantitative Aptitude and Advanced Logical Reasoning.
   - Advanced Coding: 2 problems (medium to hard difficulty) covering dynamic programming, graph search, greedy algorithms, and string manipulation. High score in advanced coding qualifies candidates for Digital and Prime interview tracks.
2. Technical Interview:
   - Deep dive into candidate final year project and internships.
   - Core computer science fundamentals: DBMS (Normalization, ACID properties, Indexing, SQL queries), Operating Systems (Processes vs Threads, Deadlock, Memory Management), and Computer Networks (OSI layers, TCP vs UDP).
   - Live coding of standard DSA problems on arrays or strings.
3. HR / Management Interview:
   - Behavioral questions, willingness to relocate, communication clarity, and learning agility.',
    'reviewed',
    now()
  ),
  (
    '11111111-1111-1111-1111-111111110008',
    'University Placement Cell Guidelines, Attendance & Offer Policies',
    'placement_info',
    null,
    'https://vyoman.tech/resources/kb/placement-cell-guidelines',
    'Standard operating procedures and regulations governing campus recruitment drives at Indian engineering colleges:

1. Eligibility and Registration: Students must register with the Training & Placement Cell (TPO) before the placement season deadline with verified academic transcripts, minimum CGPA requirements (often 6.5 or 7.0+ for product companies), and no active backlogs.
2. Attendance Policy: Mandatory attendance is strictly enforced for pre-placement talks (PPT), written tests, and shortlisted interview slots. Unexcused absence from an interview leads to de-registration from the placement season.
3. One-Student-One-Offer Rule: Most institutions follow a single offer rule. Once a student receives a verified campus offer, they are deregistered from further campus drives, unless the company falls into a higher dream/super-dream CTC tier (typically 2x the existing offer).
4. Pre-Placement Offers (PPO): Students receiving PPOs from summer internships must communicate acceptance or rejection to the TPO within the stipulated window.
5. Professional Conduct: Strict formal dress code (western or formal attire) and zero tolerance for impersonation, proxy coding, or falsified resume claims.',
    'reviewed',
    now()
  ),
  (
    '11111111-1111-1111-1111-111111110009',
    'ATS-Safe Resume Building and Placement Shortlisting Standards',
    'topic_resource',
    null,
    'https://vyoman.tech/resources/kb/resume-shortlisting-standards',
    'How campus recruitment teams and Applicant Tracking Systems (ATS) screen technical student resumes:

1. Clean Structure and Single-Column Layout: Always use a single-column layout with standard margins (0.5 to 0.75 in). Multi-column templates and complex tables often fail ATS parsers and misalign section headers.
2. Section Order for Undergraduates:
   - Contact Header (Name, phone, email, GitHub, LinkedIn, Portfolio).
   - Education (Degree, institution, CGPA, graduation year).
   - Technical Skills (Categorized into Languages, Frameworks, Developer Tools, and Core CS Fundamentals).
   - Technical Projects (2-3 substantial projects with title, tech stack, and action bullets).
   - Experience / Internships (Company name, role, dates, key contributions).
   - Honors & Achievements (Competitive programming ranks, hackathon wins).
3. Bullet Writing (Action + Context + Impact): Every bullet should start with a strong action verb (Architected, Implemented, Optimized, Engineered) followed by the technical context and a verifiable quantifiable outcome (e.g. "reduced API response time by 35%").
4. Never Fabricate Metrics: Do not invent statistics or numbers. If an academic project lacked production metrics, focus on concrete technical parameters (e.g. "supporting 5 concurrent WebSocket connections with under 50ms latency").',
    'reviewed',
    now()
  ),
  (
    '11111111-1111-1111-1111-111111110010',
    'Mock Interview Strategies: Thinking Aloud and Handling Stalls',
    'senior_experience',
    null,
    'https://vyoman.tech/resources/kb/mock-interview-strategies',
    'Strategies shared by top engineering graduates for acing live coding and technical interview rounds:

1. Think Aloud Continuously: Interviewers care as much about your problem-solving process as the final code. Communicate your assumptions, clarify problem constraints (input bounds, negative numbers, duplicates), and talk through your approach before typing code.
2. Clarify Edge Cases First: Before writing a single line of implementation, ask clarifying questions: Is the input array sorted? Can the list contain negative numbers? What is the expected behavior for empty inputs?
3. Handling Mental Blocks or Getting Stuck:
   - If stuck, state your current reasoning clearly: "I am trying to see if a two-pointer approach works here, but handling duplicates is creating an issue."
   - Start with a brute-force solution to establish a baseline: "A brute-force approach would take O(N^2) time by comparing all pairs. Let me think how to optimize this using a hash map to achieve O(N)."
   - Listen carefully to interviewer hints. They want you to succeed and will nudge you when you are on the right track.
4. Dry-Run Before Submitting: Always trace your code with a small sample input and edge cases (empty list, single element, boundary values) by hand before telling the interviewer you are done.',
    'reviewed',
    now()
  )
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  company_name = excluded.company_name,
  source_url = excluded.source_url,
  raw_text = excluded.raw_text,
  status = excluded.status,
  reviewed_at = excluded.reviewed_at,
  updated_at = now();
