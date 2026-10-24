import { CompanyBlueprint } from "./types";

export const COMPANY_BLUEPRINTS: CompanyBlueprint[] = [
  {
    id: "bp_tcs_nqt",
    companyName: "Tata Consultancy Services (TCS)",
    shortCode: "TCS NQT",
    slug: "tcs-nqt",
    category: "mass_recruiter",
    brandColor: "#003366",
    logoText: "TCS",
    typicalPackageCtc: "₹3.36 - ₹9.0 LPA",
    hiringTiers: [
      { name: "Ninja", ctc: "₹3.36 LPA", minScore: 60 },
      { name: "Digital", ctc: "₹7.00 LPA", minScore: 78 },
      { name: "Prime", ctc: "₹9.00 LPA", minScore: 88 },
    ],
    overview:
      "India's largest national qualifier assessment. Features foundation cognitive & programming logic followed by advanced coding and rigorous technical viva focusing on DBMS, OOP, and Core CS.",
    selectionRatioEst: "Top 8-15% of national test-takers",
    keyCompetencies: [
      "Programming Logic & Pseudo Code",
      "Data Structures & Time Complexity",
      "Relational Databases (SQL & Normalization)",
      "Object-Oriented Programming (Java/C++/Python)",
      "Core CS Fundamentals (OS & Networks)",
    ],
    systemPromptModifier:
      "You are a Senior Technical Interviewer at TCS evaluating candidates for Ninja, Digital, and Prime bands. Focus deeply on foundational conceptual clarity, database queries, OOP design, and clean code explanation. Ask progressive follow-ups probing edge cases and time complexity.",
    codingLanguagesSupported: ["c", "cpp", "java", "python"],
    interviewTips: [
      "Clearly articulate time and space complexities (Big-O) before writing code.",
      "Be prepared for deep-dive questions on SQL JOINs, indexes, and ACID properties.",
      "Explain your final year engineering project with clear architectural diagrams and your exact individual contribution.",
    ],
    rounds: [
      {
        roundNumber: 1,
        name: "Cognitive & Programming Logic",
        type: "aptitude",
        durationMinutes: 60,
        cutoffScore: 65,
        questionCount: 30,
        description:
          "Numerical ability, reasoning logic, verbal ability, and programming logic multiple choice questions.",
        syllabus: [
          "Arithmetic & Modern Math",
          "Data Interpretation & Logical Reasoning",
          "Grammar & Verbal Comprehension",
          "Pseudocode tracing & Bitwise operations",
        ],
        sampleQuestions: [
          {
            id: "tcs_q1",
            title: "Array Rotation & In-Place Inversion",
            topic: "Array Manipulation",
            type: "coding",
            difficulty: "intermediate",
            prompt:
              "Rotate an array of size N by K steps to the right without using extra O(N) space.",
            expectedConcepts: ["Two-pointer reversal", "Modulo arithmetic", "O(1) auxiliary space"],
          },
        ],
      },
      {
        roundNumber: 2,
        name: "Advanced Hands-on Coding",
        type: "coding",
        durationMinutes: 45,
        cutoffScore: 75,
        questionCount: 2,
        description:
          "Two live coding problems: one medium string/array challenge and one dynamic programming or graph problem determining Digital/Prime shortlisting.",
        syllabus: [
          "Dynamic Programming & Memoization",
          "String Parsing & Frequency Maps",
          "Matrix Transformations",
          "Graph & Tree Traversals",
        ],
        sampleQuestions: [
          {
            id: "tcs_q2",
            title: "Maximum Subarray Product with Negatives",
            topic: "Dynamic Programming",
            type: "coding",
            difficulty: "advanced",
            prompt:
              "Given an integer array nums, find a contiguous non-empty subarray within the array that has the largest product.",
            expectedConcepts: ["Tracking min and max running products", "Kadane variant", "O(N) time complexity"],
          },
        ],
      },
      {
        roundNumber: 3,
        name: "Technical, Managerial & HR Interview",
        type: "technical",
        durationMinutes: 30,
        cutoffScore: 70,
        questionCount: 8,
        description:
          "Comprehensive panel interview evaluating Core CS (OS, DBMS, Networks), project implementation, and managerial situational judgment.",
        syllabus: [
          "Operating Systems: Deadlocks, Paging, Virtual Memory",
          "DBMS: Indexing, Normal Forms (1NF-3NF), Transactions",
          "OOP: Polymorphism, Encapsulation, Abstract classes vs Interfaces",
          "Managerial: Team conflict resolution, willingness to relocate",
        ],
        sampleQuestions: [
          {
            id: "tcs_q3",
            title: "B-Tree vs Hash Indexing in RDBMS",
            topic: "Database Management",
            type: "technical",
            difficulty: "intermediate",
            prompt:
              "Explain when a B-Tree index is preferable over a Hash index in PostgreSQL/MySQL for range-based queries.",
            expectedConcepts: ["Range query efficiency", "Sorted order traversal", "O(log N) vs O(1) equality lookup"],
          },
        ],
      },
    ],
  },
  {
    id: "bp_infosys",
    companyName: "Infosys",
    shortCode: "Infosys",
    slug: "infosys",
    category: "mass_recruiter",
    brandColor: "#007CC3",
    logoText: "INFY",
    typicalPackageCtc: "₹3.6 - ₹9.5 LPA",
    hiringTiers: [
      { name: "System Engineer", ctc: "₹3.60 LPA", minScore: 60 },
      { name: "Digital Specialist Engineer (DSE)", ctc: "₹6.25 LPA", minScore: 75 },
      { name: "Specialist Programmer (SP)", ctc: "₹9.50 LPA", minScore: 85 },
    ],
    overview:
      "Infosys assessment evaluates high-speed mathematical reasoning, algorithmic problem solving via HackWithInfy / InfyTQ patterns, and object-oriented software design.",
    selectionRatioEst: "Top 5% for Specialist Programmer; Top 15% for DSE",
    keyCompetencies: [
      "Greedy Algorithms & Dynamic Programming",
      "Graph Algorithms (Dijkstra, BFS/DFS, Disjoint Set)",
      "Java / Python Object-Oriented Design",
      "Systematic Edge Case Debugging",
    ],
    systemPromptModifier:
      "You are an Infosys Senior Technical Specialist evaluating candidates for DSE and Specialist Programmer roles. Emphasize algorithmic precision, space-time trade-offs, and robust unit test edge cases. Do not accept brute-force solutions without asking for optimal asymptotic complexity.",
    codingLanguagesSupported: ["java", "python", "cpp"],
    interviewTips: [
      "Infosys coding rounds heavily penalize unhandled boundary conditions (empty inputs, negative numbers, overflow).",
      "Demonstrate thorough knowledge of Java Collections or C++ STL internals.",
    ],
    rounds: [
      {
        roundNumber: 1,
        name: "Coding Qualifier (HackWithInfy Pattern)",
        type: "coding",
        durationMinutes: 90,
        cutoffScore: 70,
        questionCount: 3,
        description: "3 algorithmic coding questions: 1 easy/medium, 1 medium/hard, 1 hard problem.",
        syllabus: [
          "Graph Shortest Path & Connected Components",
          "Dynamic Programming on Trees & Strings",
          "Combinatorics & Number Theory",
        ],
        sampleQuestions: [
          {
            id: "infy_q1",
            title: "Minimum Spanning Tree with Dynamic Edge Updates",
            topic: "Graph Theory",
            type: "coding",
            difficulty: "advanced",
            prompt:
              "Given a weighted undirected graph, calculate the weight of the Minimum Spanning Tree after dynamic edge weight reductions.",
            expectedConcepts: ["Kruskal or Prim algorithm", "Union-Find with path compression", "O(E log V)"],
          },
        ],
      },
      {
        roundNumber: 2,
        name: "Technical & Architectural Discussion",
        type: "technical",
        durationMinutes: 35,
        cutoffScore: 75,
        questionCount: 7,
        description: "Technical interview focusing on clean code principles, RESTful APIs, and multithreading.",
        syllabus: ["Multithreading & Concurrency", "REST Architecture & HTTP semantics", "SQL query optimization"],
        sampleQuestions: [
          {
            id: "infy_q2",
            title: "Thread Safety and Synchronization in Java",
            topic: "Concurrency",
            type: "technical",
            difficulty: "intermediate",
            prompt:
              "Differentiate between synchronized blocks, volatile variables, and ReentrantLock in Java multi-threaded execution.",
            expectedConcepts: ["Memory visibility", "Atomicity", "Deadlock avoidance"],
          },
        ],
      },
    ],
  },
  {
    id: "bp_accenture",
    companyName: "Accenture",
    shortCode: "Accenture",
    slug: "accenture",
    category: "consulting",
    brandColor: "#A100FF",
    logoText: "ACN",
    typicalPackageCtc: "₹4.5 - ₹6.5 LPA",
    hiringTiers: [
      { name: "Associate Software Engineer (ASE)", ctc: "₹4.50 LPA", minScore: 65 },
      { name: "Advanced ASE (AASE)", ctc: "₹6.50 LPA", minScore: 80 },
    ],
    overview:
      "Accenture hiring emphasizes cognitive agility, technical fundamentals, and high English fluency assessed through automated AI communication rounds followed by technical viva.",
    selectionRatioEst: "Top 20% of engineering applicants",
    keyCompetencies: [
      "Critical Thinking & Problem Solving",
      "Cloud & Modern Web Concepts",
      "Communication Clarity & Active Listening",
      "Hands-on Coding & Flowchart Logic",
    ],
    systemPromptModifier:
      "You are an Accenture Tech Lead evaluating candidates for ASE and Advanced ASE roles. Evaluate both problem-solving capability and clear, professional client-facing communication. Challenge the candidate to explain complex technical concepts in plain business language.",
    codingLanguagesSupported: ["c", "cpp", "java", "python"],
    interviewTips: [
      "Speak clearly and avoid hesitation: Accenture communication rounds strictly score vocabulary and fluency.",
      "Understand cloud basics (AWS/Azure service primitives, SaaS/PaaS models).",
    ],
    rounds: [
      {
        roundNumber: 1,
        name: "Cognitive, Technical & Coding Assessment",
        type: "coding",
        durationMinutes: 90,
        cutoffScore: 68,
        questionCount: 32,
        description: "Aptitude + Cloud/Network fundamentals + 2 hands-on coding challenges.",
        syllabus: ["Cloud Fundamentals", "Networking & Security", "Array & String Manipulation"],
        sampleQuestions: [
          {
            id: "acn_q1",
            title: "Password Strength Validator & Character Shift",
            topic: "String Processing",
            type: "coding",
            difficulty: "foundational",
            prompt:
              "Write a function to validate password complexity and encode valid strings by shifting alphabets by their positional index.",
            expectedConcepts: ["String iteration", "ASCII manipulation", "Modular arithmetic"],
          },
        ],
      },
      {
        roundNumber: 2,
        name: "AI Communication & Fluency Assessment",
        type: "behavioral",
        durationMinutes: 20,
        cutoffScore: 70,
        questionCount: 6,
        description: "Speaking fluency, active listening, passage reading, and spontaneous response synthesis.",
        syllabus: ["Pronunciation & Intonation", "Sentence Master & Retelling", "Spontaneous speaking"],
        sampleQuestions: [
          {
            id: "acn_q2",
            title: "Explaining Microservices to a Non-Technical Stakeholder",
            topic: "Communication",
            type: "behavioral",
            difficulty: "intermediate",
            prompt:
              "Imagine your project manager has zero software background. Explain what microservices are using an everyday real-world analogy in under 2 minutes.",
            expectedConcepts: ["Analogy clarity", "Structured presentation", "Absence of excessive jargon"],
          },
        ],
      },
    ],
  },
  {
    id: "bp_cognizant",
    companyName: "Cognizant",
    shortCode: "Cognizant",
    slug: "cognizant",
    category: "mass_recruiter",
    brandColor: "#103282",
    logoText: "CTSH",
    typicalPackageCtc: "₹4.0 - ₹9.0 LPA",
    hiringTiers: [
      { name: "GenC", ctc: "₹4.00 LPA", minScore: 60 },
      { name: "GenC Elevate", ctc: "₹5.50 LPA", minScore: 75 },
      { name: "GenC Next", ctc: "₹9.00 LPA", minScore: 85 },
    ],
    overview:
      "Cognizant's GenC tier framework tests algorithmic problem-solving, database tuning, and modern web application development stack.",
    selectionRatioEst: "Top 10-18% of eligible candidates",
    keyCompetencies: [
      "SQL Joins & Grouping operations",
      "Full-stack Architecture Concepts",
      "Data Structure Implementation",
      "Analytical Problem Framing",
    ],
    systemPromptModifier:
      "You are a Cognizant Principal Consultant assessing candidates for the GenC Next digital engineering track. Focus on clean coding, database optimization, modern web concepts, and candidate confidence.",
    codingLanguagesSupported: ["java", "python", "cpp"],
    interviewTips: [
      "Be prepared to write complex SQL queries involving GROUP BY, HAVING, and correlated subqueries.",
      "Review the Software Development Life Cycle (SDLC) and Agile principles.",
    ],
    rounds: [
      {
        roundNumber: 1,
        name: "GenC Skill Assessment",
        type: "technical",
        durationMinutes: 60,
        cutoffScore: 70,
        questionCount: 20,
        description: "Analytical aptitude, code debugging, and technical domain questions.",
        syllabus: ["Core Java / Python", "SQL & Relational DBs", "Analytical reasoning"],
        sampleQuestions: [
          {
            id: "ctsh_q1",
            title: "Correlated Subquery for Second Highest Salary per Department",
            topic: "SQL & Relational DB",
            type: "technical",
            difficulty: "intermediate",
            prompt:
              "Write a SQL query using window functions (DENSE_RANK) to retrieve the second highest paid employee in every department.",
            expectedConcepts: ["DENSE_RANK() OVER (PARTITION BY)", "Window functions vs subqueries"],
          },
        ],
      },
    ],
  },
  {
    id: "bp_amazon",
    companyName: "Amazon",
    shortCode: "Amazon",
    slug: "amazon",
    category: "product_firm",
    brandColor: "#FF9900",
    logoText: "AMZN",
    typicalPackageCtc: "₹30.0 - ₹45.0 LPA",
    hiringTiers: [
      { name: "SDE-1 (Software Development Engineer)", ctc: "₹32.00 - ₹44.00 LPA", minScore: 85 },
    ],
    overview:
      "The pinnacle campus benchmark for product companies. Evaluates deep algorithmic optimization (graphs, DP, heaps) paired with Amazon Leadership Principles (Customer Obsession, Ownership, Bias for Action, Dive Deep).",
    selectionRatioEst: "Top 1-2% of national engineering candidates",
    keyCompetencies: [
      "Complex Data Structures (Trees, Heaps, Graphs)",
      "Dynamic Programming & Greedy Proofs",
      "Low-Level Object-Oriented Design (SOLID)",
      "Amazon 16 Leadership Principles (STAR format answers)",
    ],
    systemPromptModifier:
      "You are an Amazon Bar Raiser & Senior SDE-2 conducting an SDE-1 campus interview. In coding, push the candidate on time and space complexity, test cases, and edge cases. In behavioral questions, enforce the STAR format (Situation, Task, Action, Result) with measurable metrics. Probe specifically for 'Customer Obsession' and 'Ownership'.",
    codingLanguagesSupported: ["java", "cpp", "python", "go"],
    interviewTips: [
      "Every behavioral answer MUST follow the STAR method (Situation, Task, Action, Result) with quantified impact.",
      "Start coding only after clarifying all assumptions and writing out test cases (empty, single element, large inputs).",
      "Avoid 'We did this' in answers—interviewers only care about 'I did this' to measure your personal contribution.",
    ],
    rounds: [
      {
        roundNumber: 1,
        name: "Online Assessment (OA2: Coding & Work Simulation)",
        type: "coding",
        durationMinutes: 90,
        cutoffScore: 80,
        questionCount: 2,
        description: "2 algorithmic problems (LeetCode Medium/Hard) + Amazon Work Style assessment.",
        syllabus: [
          "Graph Traversal & Shortest Path",
          "Binary Search Trees & Priority Queues",
          "Dynamic Programming on Intervals",
        ],
        sampleQuestions: [
          {
            id: "amzn_q1",
            title: "Course Schedule / Topological Sort with Cycles",
            topic: "Graphs & DAG",
            type: "coding",
            difficulty: "advanced",
            prompt:
              "Given total courses and prerequisite pairs, determine if it is possible to finish all courses. If possible, return the valid order.",
            expectedConcepts: ["Kahn's BFS in-degree algorithm or DFS cycle detection", "O(V + E) complexity"],
          },
        ],
      },
      {
        roundNumber: 2,
        name: "Live Technical & Bar Raiser Round",
        type: "technical",
        durationMinutes: 60,
        cutoffScore: 85,
        questionCount: 4,
        description: "Deep algorithmic problem solving on a virtual whiteboard + 2 Leadership Principle deep dives.",
        syllabus: ["System Design Fundamentals", "Object-Oriented Design (SOLID)", "Leadership Principles"],
        sampleQuestions: [
          {
            id: "amzn_q2",
            title: "Design an In-Memory LRU Cache with O(1) Operations",
            topic: "Low-Level Design",
            type: "coding",
            difficulty: "advanced",
            prompt:
              "Implement an LRU (Least Recently Used) cache with get(key) and put(key, value) in strictly O(1) time complexity.",
            expectedConcepts: ["Doubly linked list combined with hash map", "Pointer manipulation", "Thread safety"],
          },
        ],
      },
    ],
  },
  {
    id: "bp_wipro",
    companyName: "Wipro",
    shortCode: "Wipro NLTH",
    slug: "wipro",
    category: "mass_recruiter",
    brandColor: "#000000",
    logoText: "WIT",
    typicalPackageCtc: "₹3.5 - ₹6.5 LPA",
    hiringTiers: [
      { name: "Elite", ctc: "₹3.50 LPA", minScore: 60 },
      { name: "Turbo", ctc: "₹6.50 LPA", minScore: 78 },
    ],
    overview:
      "Wipro National Level Talent Hunt (NLTH) covers aptitude, written communication test (essay evaluation), and foundational coding followed by technical interview.",
    selectionRatioEst: "Top 12% across campus pool",
    keyCompetencies: [
      "Logical & Quantitative Reasoning",
      "Written English Syntax & Coherence",
      "Fundamental Coding (Arrays, Math, Loops)",
      "Technical Viva (C/C++, Java, DBMS)",
    ],
    systemPromptModifier:
      "You are a Wipro Technical Interviewer evaluating candidates for Elite and Turbo tracks. Assess basic problem solving, clarity of technical explanation, and willingness to learn new technology stacks.",
    codingLanguagesSupported: ["c", "cpp", "java", "python"],
    interviewTips: [
      "Ensure clean grammar and coherent structure in written/spoken responses.",
      "Understand basic memory management (pointers in C/C++, garbage collection in Java).",
    ],
    rounds: [
      {
        roundNumber: 1,
        name: "NLTH Aptitude & Foundation Coding",
        type: "aptitude",
        durationMinutes: 75,
        cutoffScore: 65,
        questionCount: 25,
        description: "Aptitude sections + 2 coding questions on arrays and mathematical sequences.",
        syllabus: ["Quants & Logical Reasoning", "Basic Algorithms & Pattern Generation"],
        sampleQuestions: [
          {
            id: "wit_q1",
            title: "Sum of Non-Repeating Elements in Array",
            topic: "Arrays & Hash Table",
            type: "coding",
            difficulty: "foundational",
            prompt: "Calculate the sum of all elements in an array that appear exactly once.",
            expectedConcepts: ["Hash map frequency count", "Single-pass summation"],
          },
        ],
      },
    ],
  },
];

export function getBlueprintById(id: string): CompanyBlueprint | undefined {
  return COMPANY_BLUEPRINTS.find((bp) => bp.id === id || bp.slug === id);
}

export function getBlueprintsByCategory(category: string): CompanyBlueprint[] {
  return COMPANY_BLUEPRINTS.filter((bp) => bp.category === category);
}
