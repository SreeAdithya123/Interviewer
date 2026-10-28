export type SupportedLanguage = "python" | "javascript" | "typescript" | "java" | "cpp" | "sql";

export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  passed?: boolean;
  executionTimeMs?: number;
  stdout?: string;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTimeMs: number;
  testCases?: TestCase[];
}

export interface LanguageConfig {
  id: SupportedLanguage;
  label: string;
  monacoLanguage: string;
  defaultCode: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    id: "python",
    label: "Python 3",
    monacoLanguage: "python",
    defaultCode: `def solution(nums, target):
    """
    Given an array of integers nums and an integer target,
    return indices of the two numbers such that they add up to target.
    """
    # Write your solution here
    pass

# Test your code
if __name__ == "__main__":
    print("Result:", solution([2, 7, 11, 15], 9))
`,
  },
  {
    id: "javascript",
    label: "JavaScript",
    monacoLanguage: "javascript",
    defaultCode: `/**
 * Given an array of integers nums and an integer target,
 * return indices of the two numbers such that they add up to target.
 *
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function solution(nums, target) {
    // Write your solution here
    return [];
}

// Test your code
console.log("Result:", solution([2, 7, 11, 15], 9));
`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    monacoLanguage: "typescript",
    defaultCode: `/**
 * Given an array of integers nums and an integer target,
 * return indices of the two numbers such that they add up to target.
 */
function solution(nums: number[], target: number): number[] {
    // Write your solution here
    return [];
}

// Test your code
console.log("Result:", solution([2, 7, 11, 15], 9));
`,
  },
  {
    id: "java",
    label: "Java 21",
    monacoLanguage: "java",
    defaultCode: `import java.util.*;

public class Solution {
    public static int[] twoSum(int[] nums, int target) {
        // Write your solution here
        return new int[0];
    }

    public static void main(String[] args) {
        int[] result = twoSum(new int[]{2, 7, 11, 15}, 9);
        System.out.println("Result: " + Arrays.toString(result));
    }
}
`,
  },
  {
    id: "cpp",
    label: "C++ 20",
    monacoLanguage: "cpp",
    defaultCode: `#include <iostream>
#include <vector>

std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    // Write your solution here
    return {};
}

int main() {
    std::vector<int> nums = {2, 7, 11, 15};
    auto result = twoSum(nums, 9);
    std::cout << "Result count: " << result.size() << std::endl;
    return 0;
}
`,
  },
  {
    id: "sql",
    label: "SQL",
    monacoLanguage: "sql",
    defaultCode: `-- Write your SQL query below
-- Example: Retrieve candidate performance records
SELECT 
    p.full_name,
    p.email,
    c.name AS college_name,
    ir.overall_score
FROM profiles p
JOIN colleges c ON p.college_id = c.id
JOIN interviews i ON i.user_id = p.id
JOIN interview_reports ir ON ir.interview_id = i.id
WHERE ir.overall_score >= 70
ORDER BY ir.overall_score DESC;
`,
  },
];
