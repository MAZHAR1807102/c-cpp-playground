// More Python examples for the Example menu: [group, name, code, input]. Same programs and output as examples-c.js.
window.MORE_EXAMPLES = window.MORE_EXAMPLES || {};
MORE_EXAMPLES.python = [
['Classic programs', 'Fibonacci series', String.raw`# recursive definition: F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


n = int(input())
a, b = 0, 1
print(f"First {n} Fibonacci numbers:")
for i in range(n):
    print(a, end=" ")
    a, b = b, a + b
print()
print(f"Term {n} by recursion: {fib(n)}")
`, '10'],
['Classic programs', 'Palindrome number', String.raw`n = int(input())
original, reversed_n = n, 0
while n > 0:
    reversed_n = reversed_n * 10 + n % 10   # append the last digit
    n //= 10                                # drop the last digit
print("Reversed:", reversed_n)
if original == reversed_n:
    print(original, "is a palindrome")
else:
    print(original, "is not a palindrome")
# shortcut: str(original) == str(original)[::-1]
`, '12321'],
['Classic programs', 'Palindrome string', String.raw`s = input().strip()
ok = True
i, j = 0, len(s) - 1
while i < j:                    # compare from both ends, ignoring case
    if s[i].lower() != s[j].lower():
        ok = False
        break
    i += 1
    j -= 1
print(s, "is a palindrome" if ok else "is not a palindrome")
# shortcut: s.lower() == s.lower()[::-1]
`, 'Madam'],
['Classic programs', 'Prime number check', String.raw`n = int(input())
prime = n >= 2
d = 2
while d * d <= n:               # a divisor larger than sqrt(n) has a partner smaller than it
    if n % d == 0:
        print(n, "is divisible by", d)
        prime = False
        break
    d += 1
print(n, "is a prime number" if prime else "is not a prime number")
`, '97'],
['Classic programs', 'Primes up to N (sieve)', String.raw`# Sieve of Eratosthenes: cross out the multiples of every prime
n = int(input())
crossed = [False] * (n + 1)
count = 0
print(f"Primes up to {n}:")
for i in range(2, n + 1):
    if crossed[i]:
        continue
    print(i, end=" ")
    count += 1
    for j in range(i * i, n + 1, i):
        crossed[j] = True
print()
print("Count:", count)
`, '50'],
['Classic programs', 'Reverse a number', String.raw`n = int(input())
reversed_n = 0
while n > 0:
    digit = n % 10
    reversed_n = reversed_n * 10 + digit
    n //= 10
    print(f"digit {digit} -> reversed = {reversed_n}, left = {n}")
print("Reversed number:", reversed_n)
`, '12345'],
['Classic programs', 'Count digits', String.raw`n = int(input())
m = abs(n)
count = 0
while True:                     # like a do-while, so that 0 counts as one digit
    count += 1
    m //= 10
    if m == 0:
        break
print(f"{n} has {count} digit{'' if count == 1 else 's'}")
# shortcut: len(str(abs(n)))
`, '908070'],
['Classic programs', 'Sum of digits', String.raw`n = int(input())
m, total = n, 0
while m > 0:
    total += m % 10
    m //= 10
print(f"Sum of digits of {n} = {total}")
# shortcut: sum(int(d) for d in str(n))
`, '4721'],
['Classic programs', 'Armstrong number', String.raw`# an Armstrong number equals the sum of its digits, each raised to the number of digits: 153 = 1^3 + 5^3 + 3^3
def is_armstrong(n):
    k = len(str(n))
    return sum(int(d) ** k for d in str(n)) == n


n = int(input())
print(n, "is an Armstrong number" if is_armstrong(n) else "is not an Armstrong number")
print("Armstrong numbers up to 1000:", end=" ")
for i in range(1, 1001):
    if is_armstrong(i):
        print(i, end=" ")
print()
`, '153'],
['Classic programs', 'Factorial', String.raw`def factorial(n):               # recursion: n! = n * (n-1)!
    if n <= 1:
        return 1
    return n * factorial(n - 1)


n = int(input())                # Python integers never overflow
f = 1
for i in range(2, n + 1):
    f *= i
print(f"{n}! = {f} (loop)")
print(f"{n}! = {factorial(n)} (recursion)")
`, '10'],
['Classic programs', 'GCD and LCM', String.raw`a, b = map(int, input().split())
x, y = a, b
while y != 0:                   # Euclid: gcd(x, y) = gcd(y, x % y)
    print(f"gcd({x}, {y})")
    x, y = y, x % y
print("GCD =", x)
print("LCM =", a // x * b)       # math.gcd and math.lcm do the same
`, '12 18'],
['Classic programs', 'Perfect number', String.raw`n = int(input())
total = 0
print(f"Divisors of {n}:", end=" ")
for d in range(1, n):
    if n % d == 0:
        print(d, end=" ")
        total += d
print()
print("Sum =", total)
print(n, "is a perfect number" if total == n else "is not a perfect number")
`, '28'],
['Classic programs', 'Leap year', String.raw`y = int(input())
# divisible by 4, except centuries, which must be divisible by 400
leap = (y % 4 == 0 and y % 100 != 0) or y % 400 == 0
print(y, "is a leap year" if leap else "is not a leap year")
`, '2024'],
['Classic programs', 'Swap two numbers', String.raw`a, b = map(int, input().split())
print(f"Before: a = {a}, b = {b}")
t = a                           # with a third variable
a = b
b = t
print(f"After swapping with a third variable: a = {a}, b = {b}")
a, b = b, a                     # the Python way: tuple assignment
print(f"After swapping back without one: a = {a}, b = {b}")
`, '5 9'],

['Number conversions', 'Decimal to binary, octal, hex', String.raw`# repeated division: the remainders, read from last to first, are the digits
def to_base(n, base):
    digits = "0123456789ABCDEF"
    if n == 0:
        return "0"
    s = ""
    while n > 0:
        s = digits[n % base] + s
        n //= base
    return s


n = int(input())
print("Dividing by 2:")
m = n
while m > 0:
    print(f"{m} / 2 = {m // 2} remainder {m % 2}")
    m //= 2
print("Binary:", to_base(n, 2))
print("Octal:", to_base(n, 8))
print("Hexadecimal:", to_base(n, 16))
print(f"Check: octal {n:o}, hex {n:X}")        # bin(n), oct(n), hex(n) also exist
`, '156'],
['Number conversions', 'Binary to decimal', String.raw`s = input().strip()
value = 0
for c in s:
    if c not in "01":
        print(f"'{c}' is not a binary digit")
        raise SystemExit(1)
    value = value * 2 + int(c)  # shift left by one place and add the new digit
    print(f"after '{c}': {value}")
print(f"{s} in decimal = {value}")   # int(s, 2) does the same
`, '101101'],
['Number conversions', 'Any base to any base', String.raw`DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

s, frm, to = input().split()    # number, its base, the base to convert to (2 to 36)
frm, to = int(frm), int(to)
value = 0
for c in s:
    d = DIGITS.find(c.upper())
    if d < 0 or d >= frm:
        print(f"'{c}' is not a digit in base {frm}")
        raise SystemExit(1)
    value = value * frm + d
out = ""
m = value
while m > 0:
    out = DIGITS[m % to] + out
    m //= to
print(f"{s} (base {frm}) = {value} (base 10) = {out or '0'} (base {to})")
`, 'FF 16 2'],

['Patterns', 'Right triangle', String.raw`n = int(input())
for i in range(1, n + 1):
    print("* " * i)
`, '5'],
['Patterns', 'Inverted triangle', String.raw`n = int(input())
for i in range(n, 0, -1):
    print("* " * i)
`, '5'],
['Patterns', 'Pyramid', String.raw`n = int(input())
for i in range(1, n + 1):
    print(" " * (n - i) + "*" * (2 * i - 1))   # n - i spaces, 2i - 1 stars
`, '5'],
['Patterns', 'Diamond', String.raw`n = int(input())
rows = list(range(1, n + 1)) + list(range(n - 1, 0, -1))   # top half, then bottom half
for i in rows:
    print(" " * (n - i) + "*" * (2 * i - 1))
`, '5'],
['Patterns', "Floyd's triangle", String.raw`n = int(input())
k = 1
for i in range(1, n + 1):
    for j in range(i):
        print(k, end=" ")
        k += 1
    print()
`, '5'],
['Patterns', "Pascal's triangle", String.raw`n = int(input())
for i in range(n):
    print(" " * (n - i - 1), end="")
    c = 1                                   # C(i, 0)
    for j in range(i + 1):
        print(c, end=" ")
        c = c * (i - j) // (j + 1)          # C(i, j+1) from C(i, j)
    print()
`, '5'],
['Patterns', 'Hollow square', String.raw`n = int(input())
for i in range(n):
    line = ""
    for j in range(n):
        edge = i == 0 or i == n - 1 or j == 0 or j == n - 1
        line += "* " if edge else "  "
    print(line)
`, '5'],

['Arrays', 'Max, min, sum, average', String.raw`n = int(input())
a = list(map(int, input().split()))
print("Max:", max(a))
print("Min:", min(a))
print("Sum:", sum(a))
print(f"Average: {sum(a) / n:.2f}")
`, '6\n4 8 15 16 23 42'],
['Arrays', 'Reverse an array', String.raw`n = int(input())
a = list(map(int, input().split()))
print("Original:", *a, end=" \n")
i, j = 0, n - 1
while i < j:                    # swap the two ends, move inwards
    a[i], a[j] = a[j], a[i]
    i += 1
    j -= 1
print("Reversed:", *a, end=" \n")   # shortcut: a[::-1] or a.reverse()
`, '5\n1 2 3 4 5'],
['Arrays', 'Second largest', String.raw`n = int(input())
a = list(map(int, input().split()))
first = second = None
for x in a:
    if first is None or x > first:
        second = first
        first = x
    elif x != first and (second is None or x > second):
        second = x
print("Largest:", first)
if second is None:
    print("There is no second largest (all values are equal)")
else:
    print("Second largest:", second)
`, '7\n12 35 1 10 34 1 35'],
['Arrays', 'Linear search', String.raw`n = int(input())
a = list(map(int, input().split()))
key = int(input())
first, count = -1, 0
for i in range(n):
    if a[i] == key:
        if first < 0:
            first = i
        count += 1
if first < 0:
    print(key, "not found")
else:
    print(key, "found at index", first)       # a.index(key) and a.count(key) do the same
    print(f"{key} appears {count} time{'' if count == 1 else 's'}")
`, '6\n7 3 9 2 9 5\n9'],
['Arrays', 'Insert and delete', String.raw`n = int(input())
a = list(map(int, input().split()))
pos, value = map(int, input().split())    # insert value at index pos
delete = int(input())                     # then delete index delete
print("Array:", *a, end=" \n")
a.insert(pos, value)                      # the list shifts the elements for us
print(f"After inserting {value} at index {pos}:", *a, end=" \n")
a.pop(delete)
print(f"After deleting index {delete}:", *a, end=" \n")
`, '5\n10 20 30 40 50\n2 25\n4'],
['Arrays', 'Rotate by k', String.raw`n = int(input())
a = list(map(int, input().split()))
k = int(input()) % n
print(f"Rotated left by {k}:", *(a[k:] + a[:k]), end=" \n")     # slices make rotation easy
print(f"Rotated right by {k}:", *(a[n - k:] + a[:n - k]), end=" \n")
`, '7\n1 2 3 4 5 6 7\n3'],
['Arrays', 'Remove duplicates (sorted)', String.raw`n = int(input())
a = list(map(int, input().split()))
kept = []
for x in a:
    if not kept or x != kept[-1]:
        kept.append(x)
print("After removing duplicates:", *kept, end=" \n")
print("New length:", len(kept))
`, '9\n1 1 2 2 2 3 4 4 5'],
['Arrays', 'Frequency of each element', String.raw`n = int(input())
a = list(map(int, input().split()))
count = {}                      # dictionaries keep the order in which keys were added
for x in a:
    count[x] = count.get(x, 0) + 1
for x, c in count.items():
    print(f"{x} occurs {c} time{'' if c == 1 else 's'}")
# collections.Counter(a) counts too
`, '10\n3 1 3 2 1 3 4 2 3 1'],
['Arrays', 'Matrix add, multiply, transpose', String.raw`def show(title, M):
    print(title)
    for row in M:
        print("".join(f"{x:4d}" for x in row))


n = int(input())
A = [list(map(int, input().split())) for _ in range(n)]
B = [list(map(int, input().split())) for _ in range(n)]
show("A + B:", [[A[i][j] + B[i][j] for j in range(n)] for i in range(n)])
show("A x B:", [[sum(A[i][k] * B[k][j] for k in range(n)) for j in range(n)] for i in range(n)])
show("Transpose of A:", [[A[i][j] for i in range(n)] for j in range(n)])
`, '2\n1 2\n3 4\n5 6\n7 8'],

['Algorithms, step by step', 'Bubble sort', String.raw`n = int(input())
a = list(map(int, input().split()))
print("Start:", *a, end=" \n")
for p in range(1, n):
    swaps = 0
    for j in range(n - p):      # the largest value bubbles to the end
        if a[j] > a[j + 1]:
            a[j], a[j + 1] = a[j + 1], a[j]
            swaps += 1
    print(f"Pass {p}:", *a, f"(swaps: {swaps})")
    if swaps == 0:
        print("No swaps, so the array is sorted.")
        break
print("Sorted:", *a, end=" \n")
`, '6\n5 1 4 2 8 0'],
['Algorithms, step by step', 'Selection sort', String.raw`n = int(input())
a = list(map(int, input().split()))
for i in range(n - 1):
    m = i                       # index of the smallest value in a[i:]
    for j in range(i + 1, n):
        if a[j] < a[m]:
            m = j
    a[i], a[m] = a[m], a[i]
    print(f"Step {i + 1}: smallest of the rest is {a[i]}, put at index {i} ->", *a, end=" \n")
`, '6\n64 25 12 22 11 90'],
['Algorithms, step by step', 'Insertion sort', String.raw`n = int(input())
a = list(map(int, input().split()))
for i in range(1, n):
    key, j = a[i], i - 1
    while j >= 0 and a[j] > key:    # shift bigger values one place right
        a[j + 1] = a[j]
        j -= 1
    a[j + 1] = key
    print(f"Insert {key} ->", *a, end=" \n")
`, '6\n12 11 13 5 6 7'],
['Algorithms, step by step', 'Merge sort', String.raw`def merge(a, l, m, r):
    left, right = a[l:m + 1], a[m + 1:r + 1]
    i = j = 0
    k = l
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            a[k] = left[i]
            i += 1
        else:
            a[k] = right[j]
            j += 1
        k += 1
    rest = left[i:] + right[j:]
    a[k:k + len(rest)] = rest
    print(f"Merge [{l}..{m}] + [{m + 1}..{r}] ->", *a[l:r + 1], end=" \n")


def merge_sort(a, l, r):
    if l >= r:
        return
    m = (l + r) // 2
    merge_sort(a, l, m)         # sort the left half
    merge_sort(a, m + 1, r)     # sort the right half
    merge(a, l, m, r)           # merge the two sorted halves


n = int(input())
a = list(map(int, input().split()))
merge_sort(a, 0, n - 1)
print("Sorted:", *a, end=" \n")
`, '7\n38 27 43 3 9 82 10'],
['Algorithms, step by step', 'Quick sort', String.raw`# Lomuto partition: values smaller than the pivot (the last element) go to its left
def partition(a, lo, hi):
    pivot, i = a[hi], lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]
    return i


def quick_sort(a, lo, hi):
    if lo >= hi:
        return
    p = partition(a, lo, hi)
    print(f"Pivot {a[p]} placed at index {p} ->", *a, end=" \n")
    quick_sort(a, lo, p - 1)
    quick_sort(a, p + 1, hi)


n = int(input())
a = list(map(int, input().split()))
quick_sort(a, 0, n - 1)
print("Sorted:", *a, end=" \n")
`, '7\n10 80 30 90 40 50 70'],
['Algorithms, step by step', 'Binary search', String.raw`n = int(input())
a = list(map(int, input().split()))     # must be sorted
key = int(input())
lo, hi, step, found = 0, n - 1, 0, -1
while lo <= hi:
    mid = lo + (hi - lo) // 2
    step += 1
    print(f"Step {step}: low = {lo}, high = {hi}, mid = {mid}, a[mid] = {a[mid]} ->", end=" ")
    if a[mid] == key:
        print("found!")
        found = mid
        break
    if a[mid] < key:
        print("too small, search the right half")
        lo = mid + 1
    else:
        print("too big, search the left half")
        hi = mid - 1
if found >= 0:
    print(key, "is at index", found)
else:
    print(key, "is not in the array")
`, '10\n2 5 8 12 16 23 38 56 72 91\n23'],
['Algorithms, step by step', 'Tower of Hanoi', String.raw`moves = 0


# move n disks from 'frm' to 'to', using 'via' as the spare peg
def hanoi(n, frm, to, via):
    global moves
    if n == 0:
        return
    hanoi(n - 1, frm, via, to)
    print(f"Move disk {n} from {frm} to {to}")
    moves += 1
    hanoi(n - 1, via, to, frm)


n = int(input())
hanoi(n, "A", "C", "B")
print(f"Total moves: {moves} (2^{n} - 1)")
`, '3'],
['Algorithms, step by step', "Kadane's maximum subarray", String.raw`n = int(input())
a = list(map(int, input().split()))
cur = best = a[0]
start = best_start = best_end = 0
print(f"a[0] = {a[0]}: current = {cur}, best = {best}")
for i in range(1, n):
    if cur + a[i] < a[i]:       # starting again here is better than extending
        cur, start = a[i], i
    else:
        cur += a[i]
    if cur > best:
        best, best_start, best_end = cur, start, i
    print(f"a[{i}] = {a[i]}: current = {cur}, best = {best}")
print(f"Maximum subarray sum = {best}, from index {best_start} to {best_end}:", *a[best_start:best_end + 1], end=" \n")
`, '9\n-2 1 -3 4 -1 2 1 -5 4'],
['Algorithms, step by step', 'BFS and DFS on a graph', String.raw`from collections import deque

n, m = map(int, input().split())        # vertices, edges
adj = [[] for _ in range(n)]
for _ in range(m):
    x, y = map(int, input().split())
    adj[x].append(y)                    # undirected
    adj[y].append(x)
for lst in adj:
    lst.sort()                          # visit neighbours in increasing order
start = int(input())

visited = [False] * n
queue = deque([start])
visited[start] = True
print(f"BFS from {start}:")
while queue:
    u = queue.popleft()
    for v in adj[u]:
        if not visited[v]:
            visited[v] = True
            queue.append(v)
    print(f"visit {u}, queue:", *queue, end=" \n")

visited = [False] * n


def dfs(u):
    visited[u] = True
    print(u, end=" ")
    for v in adj[u]:
        if not visited[v]:
            dfs(v)


print(f"DFS from {start}:", end=" ")
dfs(start)
print()
`, '6 7\n0 1\n0 2\n1 3\n2 4\n3 5\n4 5\n1 4\n0']
];
