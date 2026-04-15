# ⚔️ AlgoFight – 100 Problems with Edge & Hidden Cases

## 🟢 Arrays & Hashing (1–10)

### 1. Two Sum (Optimized)
- Edge: empty array, no solution, duplicates  
- Hidden: large input (10^5), negative numbers  

### 2. Subarray Sum Equals K  
- Edge: k = 0, negative numbers  
- Hidden: multiple overlapping subarrays  

### 3. Product of Array Except Self  
- Edge: contains zero(s)  
- Hidden: multiple zeros, large values  

### 4. Longest Consecutive Sequence  
- Edge: empty input  
- Hidden: unordered large dataset  

### 5. Maximum Subarray  
- Edge: all negative  
- Hidden: single element  

### 6. Contains Duplicate II  
- Edge: k = 0  
- Hidden: large window size  

### 7. Top K Frequent Elements  
- Edge: k = 1  
- Hidden: ties in frequency  

### 8. Maximum Product Subarray  
- Edge: zeros, negatives  
- Hidden: alternating signs  

### 9. Subarray with Zero Sum  
- Edge: no zero sum  
- Hidden: prefix sum collisions  

### 10. Find Duplicate Number  
- Edge: minimal size  
- Hidden: cycle detection case  

## 🟢 Sliding Window (11–20)

### 11. Longest Substring Without Repeating  
- Edge: empty string  
- Hidden: all same characters  

### 12. Minimum Window Substring  
- Edge: no valid window  
- Hidden: repeated chars in target  

### 13. Sliding Window Maximum  
- Edge: window size = 1  
- Hidden: large input  

### 14. Longest Repeating Character Replacement  
- Edge: k = 0  
- Hidden: full string replace  

### 15. Permutation in String  
- Edge: s1 longer than s2  
- Hidden: repeated patterns  

### 16. Nice Subarrays  
- Edge: no odd numbers  
- Hidden: all odd numbers  

### 17. Max Consecutive Ones III  
- Edge: k = 0  
- Hidden: all zeros  

### 18. Smallest Subarray Sum  
- Edge: no valid subarray  
- Hidden: large sums  

### 19. Longest Subarray Sum K  
- Edge: negative numbers  
- Hidden: multiple valid answers  

### 20. Container With Most Water  
- Edge: small array  
- Hidden: decreasing heights  

## 🟢 Strings (21–30)

### 21. Valid Anagram  
- Edge: different lengths  
- Hidden: unicode chars  

### 22. Group Anagrams  
- Edge: empty list  
- Hidden: large dataset  

### 23. Longest Palindromic Substring  
- Edge: single char  
- Hidden: multiple palindromes  

### 24. Count Palindromes  
- Edge: empty string  
- Hidden: overlapping  

### 25. String Compression  
- Edge: no repeats  
- Hidden: long repeats  

### 26. Decode String  
- Edge: nested encoding  
- Hidden: deep nesting  

### 27. Zigzag Conversion  
- Edge: numRows = 1  
- Hidden: large input  

### 28. Multiply Strings  
- Edge: "0"  
- Hidden: big numbers  

### 29. Simplify Path  
- Edge: multiple slashes  
- Hidden: ".." chains  

### 30. Implement strStr  
- Edge: empty needle  
- Hidden: repeated patterns  

## 🟢 Stack & Queue (31–40)

### 31. Valid Parentheses  
- Edge: empty  
- Hidden: nested  

### 32. Min Stack  
- Edge: pop empty  
- Hidden: duplicate mins  

### 33. RPN Evaluation  
- Edge: single number  
- Hidden: division  

### 34. Daily Temperatures  
- Edge: decreasing  
- Hidden: large input  

### 35. Next Greater Element  
- Edge: no greater  
- Hidden: circular  

### 36. Largest Histogram  
- Edge: all same  
- Hidden: increasing  

### 37. Sliding Window Max (Deque)  
- Edge: k=1  
- Hidden: large  

### 38. Queue via Stack  
- Edge: empty pop  
- Hidden: sequence ops  

### 39. Remove K Digits  
- Edge: k = length  
- Hidden: leading zeros  

### 40. Asteroid Collision  
- Edge: no collision  
- Hidden: chain reactions  

## 🟢 Linked List (41–50)

### 41. Reverse List  
- Edge: empty  
- Hidden: single node  

### 42. Detect Cycle  
- Edge: no cycle  
- Hidden: cycle start  

### 43. Merge Lists  
- Edge: one empty  
- Hidden: duplicates  

### 44. Remove Nth Node  
- Edge: n = length  
- Hidden: single node  

### 45. Reorder List  
- Edge: short list  
- Hidden: even/odd  

### 46. Intersection  
- Edge: none  
- Hidden: long lists  

### 47. Add Two Numbers  
- Edge: carry  
- Hidden: long carry  

### 48. Flatten List  
- Edge: single level  
- Hidden: deep nesting  

### 49. Copy Random Pointer  
- Edge: null random  
- Hidden: cycles  

### 50. Reverse K Group  
- Edge: k=1  
- Hidden: leftover nodes  

## 🟢 Trees (51–60)

### 51. Max Depth  
- Edge: empty  
- Hidden: skewed  

### 52. Diameter  
- Edge: single node  
- Hidden: long path  

### 53. Invert Tree  
- Edge: empty  
- Hidden: large  

### 54. LCA  
- Edge: root case  
- Hidden: deep nodes  

### 55. Level Order  
- Edge: empty  
- Hidden: skewed  

### 56. Validate BST  
- Edge: duplicates  
- Hidden: invalid subtree  

### 57. Kth Smallest  
- Edge: k=1  
- Hidden: large  

### 58. Path Sum II  
- Edge: none  
- Hidden: multiple paths  

### 59. Serialize Tree  
- Edge: empty  
- Hidden: large  

### 60. Right Side View  
- Edge: empty  
- Hidden: skewed  

## 🟢 Graphs (61–70)

### 61. Number of Islands  
- Edge: empty grid  
- Hidden: large grid  

### 62. Clone Graph  
- Edge: single node  
- Hidden: cycles  

### 63. Course Schedule  
- Edge: no prereq  
- Hidden: cycle  

### 64. Course Schedule II  
- Edge: impossible  
- Hidden: multiple answers  

### 65. Rotting Oranges  
- Edge: no rotten  
- Hidden: unreachable  

### 66. Word Ladder  
- Edge: no path  
- Hidden: large dict  

### 67. Network Delay  
- Edge: disconnected  
- Hidden: weighted graph  

### 68. MST  
- Edge: single node  
- Hidden: dense graph  

### 69. Detect Cycle  
- Edge: none  
- Hidden: multiple cycles  

### 70. Connected Components  
- Edge: isolated nodes  
- Hidden: large graph  

## 🟢 DP (71–80)

### 71. Climbing Stairs  
- Edge: n=1  
- Hidden: large n  

### 72. House Robber  
- Edge: single house  
- Hidden: alternating  

### 73. House Robber II  
- Edge: circular  
- Hidden: small  

### 74. Coin Change  
- Edge: no solution  
- Hidden: large target  

### 75. LIS  
- Edge: sorted  
- Hidden: random  

### 76. LCS  
- Edge: empty  
- Hidden: long strings  

### 77. Edit Distance  
- Edge: same strings  
- Hidden: large  

### 78. Partition Equal  
- Edge: odd sum  
- Hidden: large  

### 79. Stock Profit  
- Edge: decreasing  
- Hidden: multiple peaks  

### 80. Decode Ways  
- Edge: leading zero  
- Hidden: long string  

## 🟢 Backtracking (81–90)

### 81. Subsets  
- Edge: empty  
- Hidden: duplicates  

### 82. Permutations  
- Edge: single  
- Hidden: duplicates  

### 83. Combination Sum  
- Edge: no solution  
- Hidden: large  

### 84. Combination Sum II  
- Edge: duplicates  
- Hidden: sorted  

### 85. N-Queens  
- Edge: n<4  
- Hidden: n=8  

### 86. Sudoku Solver  
- Edge: invalid  
- Hidden: complex  

### 87. Generate Parentheses  
- Edge: n=0  
- Hidden: n large  

### 88. Word Search  
- Edge: single cell  
- Hidden: backtracking  

### 89. Palindrome Partition  
- Edge: single char  
- Hidden: many splits  

### 90. Restore IP  
- Edge: invalid  
- Hidden: leading zeros  

## 🟢 Greedy & Heap (91–100)

### 91. Kth Largest  
- Edge: k=1  
- Hidden: large  

### 92. Merge K Lists  
- Edge: empty  
- Hidden: many lists  

### 93. Task Scheduler  
- Edge: no idle  
- Hidden: heavy freq  

### 94. Reorganize String  
- Edge: impossible  
- Hidden: high freq  

### 95. Meeting Rooms II  
- Edge: no overlap  
- Hidden: many overlaps  

### 96. Burst Balloons  
- Edge: single  
- Hidden: large  

### 97. Gas Station  
- Edge: impossible  
- Hidden: circular  

### 98. Jump Game  
- Edge: single  
- Hidden: zeros  

### 99. Jump Game II  
- Edge: minimal  
- Hidden: large  

### 100. Furthest Building  
- Edge: no resources  
- Hidden: optimal usage  
