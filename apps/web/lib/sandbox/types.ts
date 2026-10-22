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
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Test execution
print("Output:", solution([2, 7, 11, 15], 9))
`,
  },
  {
    id: "javascript",
    label: "JavaScript",
    monacoLanguage: "javascript",
    defaultCode: `/**
 * Given an array of integers nums and an integer target,
 * return indices of the two numbers such that they add up to target.
 */
function solution(nums, target) {
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

// Test execution
console.log("Output:", solution([2, 7, 11, 15], 9));
`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    monacoLanguage: "typescript",
    defaultCode: `function solution(nums: number[], target: number): number[] {
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

console.log("Output:", solution([2, 7, 11, 15], 9));
`,
  },
  {
    id: "java",
    label: "Java 21",
    monacoLanguage: "java",
    defaultCode: `import java.util.*;

public class Solution {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) {
                return new int[] { seen.get(complement), i };
            }
            seen.put(nums[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) {
        int[] result = twoSum(new int[]{2, 7, 11, 15}, 9);
        System.out.println("Output: " + Arrays.toString(result));
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
#include <unordered_map>

std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); ++i) {
        int complement = target - nums[i];
        if (seen.find(complement) != seen.end()) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    std::vector<int> nums = {2, 7, 11, 15};
    auto result = twoSum(nums, 9);
    std::cout << "Output: [" << result[0] << ", " << result[1] << "]" << std::endl;
    return 0;
}
`,
  },
  {
    id: "sql",
    label: "SQL",
    monacoLanguage: "sql",
    defaultCode: `-- Retrieve top-performing candidates with overall interview score >= 80
SELECT 
    p.full_name,
    p.email,
    c.name AS college_name,
    ir.overall_score,
    ir.created_at
FROM profiles p
JOIN colleges c ON p.college_id = c.id
JOIN interviews i ON i.user_id = p.id
JOIN interview_reports ir ON ir.interview_id = i.id
WHERE ir.overall_score >= 80
ORDER BY ir.overall_score DESC;
`,
  },
];
