/**
 * Comprehensive question catalog for Vyoman Interviewer.
 * Provides rich, realistic questions for:
 * 1. Technical Coding Challenges (with problem statement, examples, constraints & starter code)
 * 2. Normal Conversational Interviews (HR, Behavioral, and Mixed rounds)
 */

import type { Difficulty, InterviewStage, InterviewType } from "./types";

export interface CatalogQuestion {
  id: string;
  stage: InterviewStage;
  interviewType: InterviewType;
  difficulty: Difficulty;
  isCoding: boolean;
  questionText: string;
  starterCode?: Record<string, string>;
  testCases?: Array<{ id: string; name: string; input: string; expectedOutput: string }>;
}

export const TECHNICAL_CODING_QUESTIONS: CatalogQuestion[] = [
  {
    id: "code-two-sum",
    stage: "technical",
    interviewType: "technical",
    difficulty: "easy",
    isCoding: true,
    questionText: `### 💻 Coding Challenge: Two Sum (Target Pair Search)

Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.

**Example:**
- **Input:** \`nums = [2, 7, 11, 15], target = 9\`
- **Output:** \`[0, 1]\` (Because \`nums[0] + nums[1] == 2 + 7 == 9\`)

**Constraints:**
- \`2 <= nums.length <= 10^4\`
- Exactly one valid answer exists.

👉 *Write your solution in the code editor, run test cases, and explain your approach and time complexity.*`,
    starterCode: {
      python: `def two_sum(nums, target):
    # Store seen numbers and their indices: {num: index}
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Test execution:
print(two_sum([2, 7, 11, 15], 9))`,
      javascript: `function twoSum(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement), i];
        }
        seen.set(nums[i], i);
    }
    return [];
}

console.log(twoSum([2, 7, 11, 15], 9));`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
    const seen = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement)!, i];
        }
        seen.set(nums[i], i);
    }
    return [];
}

console.log(twoSum([2, 7, 11, 15], 9));`,
    },
    testCases: [
      { id: "case-1", name: "Standard Target", input: "[2, 7, 11, 15], 9", expectedOutput: "[0, 1]" },
      { id: "case-2", name: "Adjacent Duplicates", input: "[3, 2, 4], 6", expectedOutput: "[1, 2]" },
      { id: "case-3", name: "Identical Elements", input: "[3, 3], 6", expectedOutput: "[0, 1]" },
    ],
  },
  {
    id: "code-valid-palindrome",
    stage: "technical",
    interviewType: "technical",
    difficulty: "easy",
    isCoding: true,
    questionText: `### 💻 Coding Challenge: Valid Palindrome & Two Pointers

A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

**Example 1:**
- **Input:** \`s = "A man, a plan, a canal: Panama"\`
- **Output:** \`true\`

**Example 2:**
- **Input:** \`s = "race a car"\`
- **Output:** \`false\`

👉 *Implement an optimal two-pointer solution in O(N) time and O(1) auxiliary space.*`,
    starterCode: {
      python: `def is_palindrome(s: str) -> bool:
    filtered = [c.lower() for c in s if c.isalnum()]
    left, right = 0, len(filtered) - 1
    while left < right:
        if filtered[left] != filtered[right]:
            return False
        left += 1
        right -= 1
    return True

print(is_palindrome("A man, a plan, a canal: Panama"))`,
      javascript: `function isPalindrome(s) {
    const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    let left = 0, right = clean.length - 1;
    while (left < right) {
        if (clean[left] !== clean[right]) return false;
        left++;
        right--;
    }
    return true;
}

console.log(isPalindrome("A man, a plan, a canal: Panama"));`,
    },
    testCases: [
      { id: "case-1", name: "Complex Palindrome", input: '"A man, a plan, a canal: Panama"', expectedOutput: "true" },
      { id: "case-2", name: "Non Palindrome", input: '"race a car"', expectedOutput: "false" },
      { id: "case-3", name: "Empty String", input: '" "', expectedOutput: "true" },
    ],
  },
  {
    id: "code-max-subarray",
    stage: "technical",
    interviewType: "technical",
    difficulty: "medium",
    isCoding: true,
    questionText: `### 💻 Coding Challenge: Maximum Subarray (Kadane's Algorithm)

Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

**Example:**
- **Input:** \`nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]\`
- **Output:** \`6\` (The contiguous subarray \`[4, -1, 2, 1]\` has the largest sum = 6)

👉 *Can you solve this with Kadane's algorithm in O(N) time? Run tests in the sandbox.*`,
    starterCode: {
      python: `def max_sub_array(nums):
    max_so_far = nums[0]
    current_max = nums[0]
    for num in nums[1:]:
        current_max = max(num, current_max + num)
        max_so_far = max(max_so_far, current_max)
    return max_so_far

print(max_sub_array([-2, 1, -3, 4, -1, 2, 1, -5, 4]))`,
      javascript: `function maxSubArray(nums) {
    let maxSoFar = nums[0];
    let currentMax = nums[0];
    for (let i = 1; i < nums.length; i++) {
        currentMax = Math.max(nums[i], currentMax + nums[i]);
        maxSoFar = Math.max(maxSoFar, currentMax);
    }
    return maxSoFar;
}

console.log(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]));`,
    },
    testCases: [
      { id: "case-1", name: "Standard Array", input: "[-2, 1, -3, 4, -1, 2, 1, -5, 4]", expectedOutput: "6" },
      { id: "case-2", name: "Single Element", input: "[1]", expectedOutput: "1" },
      { id: "case-3", name: "All Negative", input: "[-5, -1, -8]", expectedOutput: "-1" },
    ],
  },
  {
    id: "code-sql-second-highest",
    stage: "technical",
    interviewType: "technical",
    difficulty: "medium",
    isCoding: true,
    questionText: `### 💻 SQL Coding Challenge: Second Highest Salary

Write a SQL query to report the second highest distinct salary from the \`Employee\` table. If there is no second highest salary, return \`null\`.

**Table Schema:**
\`\`\`sql
Employee (id INT PRIMARY KEY, salary INT)
\`\`\`

**Example:**
\`\`\`text
+----+--------+
| id | salary |
+----+--------+
| 1  | 100    |
| 2  | 200    |
| 3  | 300    |
+----+--------+
Output: 200
\`\`\`

👉 *Write your SQL query in the editor and explain how it handles ties and NULL values.*`,
    starterCode: {
      sql: `-- SQL Query for Second Highest Salary
SELECT MAX(salary) AS SecondHighestSalary
FROM Employee
WHERE salary < (SELECT MAX(salary) FROM Employee);`,
    },
    testCases: [
      { id: "case-1", name: "Three distinct salaries", input: "300, 200, 100", expectedOutput: "200" },
      { id: "case-2", name: "All duplicate salaries", input: "100, 100", expectedOutput: "null" },
    ],
  },
];

export const NORMAL_QUESTIONS: Record<InterviewType, CatalogQuestion[]> = {
  hr: [
    {
      id: "hr-intro",
      stage: "intro",
      interviewType: "hr",
      difficulty: "easy",
      isCoding: false,
      questionText: "Tell me about yourself, your educational background, and what motivated you to apply for this opportunity.",
    },
    {
      id: "hr-strengths",
      stage: "resume_deep_dive",
      interviewType: "hr",
      difficulty: "easy",
      isCoding: false,
      questionText: "What are two of your greatest professional strengths, and what is one area you have actively identified for improvement?",
    },
    {
      id: "hr-pressure",
      stage: "technical",
      interviewType: "hr",
      difficulty: "medium",
      isCoding: false,
      questionText: "Describe a situation where you had to manage multiple tight deadlines or unexpected project roadblocks. How did you prioritize your time?",
    },
    {
      id: "hr-teamwork",
      stage: "behavioral",
      interviewType: "hr",
      difficulty: "medium",
      isCoding: false,
      questionText: "Tell me about a time you experienced a disagreement or communication challenge with a teammate. How did you handle the conversation?",
    },
    {
      id: "hr-closing",
      stage: "closing",
      interviewType: "hr",
      difficulty: "easy",
      isCoding: false,
      questionText: "Where do you see yourself developing professionally in the next 2 to 3 years, and what makes this company or role the right environment for you?",
    },
  ],

  behavioral: [
    {
      id: "beh-intro",
      stage: "intro",
      interviewType: "behavioral",
      difficulty: "easy",
      isCoding: false,
      questionText: "Walk me through your background and what core values guide how you collaborate and solve problems.",
    },
    {
      id: "beh-star-obstacle",
      stage: "resume_deep_dive",
      interviewType: "behavioral",
      difficulty: "medium",
      isCoding: false,
      questionText: "Using the STAR method (Situation, Task, Action, Result), tell me about a project that did not go according to plan. What steps did you take to adjust?",
    },
    {
      id: "beh-leadership",
      stage: "technical",
      interviewType: "behavioral",
      difficulty: "medium",
      isCoding: false,
      questionText: "Share an example where you took ownership of a task or problem outside your direct responsibility to ensure project success.",
    },
    {
      id: "beh-criticism",
      stage: "behavioral",
      interviewType: "behavioral",
      difficulty: "medium",
      isCoding: false,
      questionText: "Tell me about a time you received difficult or unexpected constructive feedback. How did you respond, and what changes did you implement?",
    },
    {
      id: "beh-closing",
      stage: "closing",
      interviewType: "behavioral",
      difficulty: "easy",
      isCoding: false,
      questionText: "What is one key leadership or collaboration takeaway from your past projects that you are excited to bring to a fast-paced team?",
    },
  ],

  mixed: [
    {
      id: "mixed-intro",
      stage: "intro",
      interviewType: "mixed",
      difficulty: "easy",
      isCoding: false,
      questionText: "Introduce yourself, highlighting your engineering focus, key technologies you work with, and what drives your technical passion.",
    },
    {
      id: "mixed-resume-project",
      stage: "resume_deep_dive",
      interviewType: "mixed",
      difficulty: "medium",
      isCoding: false,
      questionText: "Walk me through your best technical project: what was the problem statement, why did you choose your architecture stack, and what trade-offs did you make?",
    },
    {
      id: "mixed-problem-solving",
      stage: "technical",
      interviewType: "mixed",
      difficulty: "medium",
      isCoding: false,
      questionText: "Imagine a production service is suddenly experiencing high CPU utilization and degraded response times. How would you methodically isolate and diagnose the issue?",
    },
    {
      id: "mixed-teamwork",
      stage: "behavioral",
      interviewType: "mixed",
      difficulty: "medium",
      isCoding: false,
      questionText: "Tell me about a time you had to deliver a feature under ambiguous requirements or incomplete product specifications. How did you align with teammates?",
    },
    {
      id: "mixed-closing",
      stage: "closing",
      interviewType: "mixed",
      difficulty: "easy",
      isCoding: false,
      questionText: "What emerging engineering topic or tool are you currently exploring on your own, and why does it excite you?",
    },
  ],

  technical: [
    {
      id: "tech-intro",
      stage: "intro",
      interviewType: "technical",
      difficulty: "easy",
      isCoding: false,
      questionText: "Welcome to your Technical Interview! Please introduce yourself, focusing on your programming background, data structure fundamentals, and engineering projects.",
    },
    // Turn 2 is dynamic coding challenge (Two Sum)
    TECHNICAL_CODING_QUESTIONS[0],
    {
      id: "tech-optimization",
      stage: "technical",
      interviewType: "technical",
      difficulty: "medium",
      isCoding: false,
      questionText: "Walk me through the asymptotic time and space complexity of your solution. How would you handle high-throughput edge cases like massive arrays or memory limits?",
    },
    // Turn 4 is dynamic coding challenge (Valid Palindrome)
    TECHNICAL_CODING_QUESTIONS[1],
    {
      id: "tech-closing",
      stage: "closing",
      interviewType: "technical",
      difficulty: "hard",
      isCoding: false,
      questionText: "To wrap up: How would you design a distributed caching layer (e.g. Redis) in front of a primary database to prevent cache stampedes and ensure data consistency?",
    },
  ],
};

/**
 * Get question for a given interview turn index.
 * Guarantees zero repetition and matches the exact interview type.
 */
export function getCatalogTurn(
  interviewType: InterviewType,
  turnIndex: number,
  alreadyAskedTexts: string[] = [],
): CatalogQuestion {
  const track = NORMAL_QUESTIONS[interviewType] || NORMAL_QUESTIONS.mixed;
  const clampedIndex = Math.min(turnIndex, track.length - 1);
  const candidate = track[clampedIndex];

  // If question was already asked (e.g. retried), find the next unasked question in the track
  if (alreadyAskedTexts.includes(candidate.questionText)) {
    const unasked = track.find((q) => !alreadyAskedTexts.includes(q.questionText));
    if (unasked) return unasked;
  }

  return candidate;
}
