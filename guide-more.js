// Library guide data for Java and Python (same shape as guide.js; `show` is the line shown on each card).
window.HEADER_GUIDE = window.HEADER_GUIDE || {};
window.HEADER_GUIDE.java = [
  {
    h: 'Scanner', show: 'import java.util.Scanner;', about: 'Reading input typed by the user (here: the Input box).',
    items: [
      ['Scanner sc = new Scanner(System.in);', 'Create one Scanner at the start of main and use it for all input.'],
      ['int n = sc.nextInt();', 'Read a whole number. nextLong() and nextDouble() read long and double values.'],
      ['String w = sc.next();', 'Read one word (up to a space or newline).'],
      ['String line = sc.nextLine();', 'Read the rest of the line, spaces included. After nextInt(), call nextLine() once to skip the end of that line.'],
      ['while (sc.hasNextInt()) { ... }', 'Keep reading while there is another number. hasNext() and hasNextLine() work the same way.']
    ],
    ex: String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long sum = 0;
        int max = Integer.MIN_VALUE;
        for (int i = 0; i < n; i++) {
            int x = sc.nextInt();
            sum += x;
            max = Math.max(max, x);
        }
        System.out.println("sum = " + sum + ", max = " + max);
        System.out.printf("average = %.2f%n", (double) sum / n);
    }
}
`, input: '5\n3 8 1 9 4'
  },
  {
    h: 'System.out', show: 'System.out (no import needed)', about: 'Printing output.',
    items: [
      ['System.out.println(x);', 'Print a value and end the line.'],
      ['System.out.print(x);', 'Print without ending the line.'],
      ['System.out.println("Total: " + total);', 'Join text and values with +.'],
      ['System.out.printf("%d %.2f %s%n", i, d, s);', 'Formatted printing: %d whole number, %.2f two decimals, %s text, %c char, %5d width 5, %n new line.'],
      ['String s = String.format("%.3f", x);', 'The same formatting, into a String.']
    ],
    ex: String.raw`public class Main {
    public static void main(String[] args) {
        String[] items = {"pen", "notebook", "bag"};
        double[] price = {0.5, 2.25, 15};
        for (int i = 0; i < items.length; i++)
            System.out.printf("%-10s %8.2f%n", items[i], price[i]);
        System.out.print("no new line, ");
        System.out.println("then a new line");
        System.out.println("pi is about " + String.format("%.4f", Math.PI));
    }
}
`, input: ''
  },
  {
    h: 'String', show: 'String (no import needed)', about: 'Text. A String cannot be changed; methods return a new String.',
    items: [
      ['s.length()   s.charAt(i)', 'Number of characters; the character at position i (from 0).'],
      ['s.substring(a, b)', 'The characters from position a up to (not including) b.'],
      ['s.indexOf("x")   s.contains("x")', 'Position of the first "x" (or -1); whether it occurs.'],
      ['a.equals(b)   a.equalsIgnoreCase(b)', 'Compare text. Do not use == for Strings.'],
      ['a.compareTo(b)', 'Negative if a comes first in dictionary order, 0 if equal, positive otherwise.'],
      ['s.toUpperCase()   s.toLowerCase()   s.trim()', 'Change case; remove spaces at both ends.'],
      ['s.split(" ")   String.join("-", parts)', 'Cut into an array of parts; join parts with a separator.'],
      ['s.replace("a", "b")', 'Replace every "a" with "b".'],
      ['String.valueOf(n)   Integer.parseInt(s)', 'Number to text; text to number.'],
      ['for (char c : s.toCharArray())', 'Visit every character.']
    ],
    ex: String.raw`public class Main {
    public static void main(String[] args) {
        String s = "Hello, World";
        System.out.println(s.length() + " " + s.charAt(0) + " " + s.substring(7, 12));
        System.out.println(s.indexOf("World") + " " + s.contains("lo") + " " + s.toUpperCase());
        String[] parts = "red green blue".split(" ");
        System.out.println(parts.length + " parts, joined: " + String.join("-", parts));
        int vowels = 0;
        for (char c : s.toLowerCase().toCharArray())
            if ("aeiou".indexOf(c) >= 0) vowels++;
        System.out.println("vowels: " + vowels);
        System.out.println("abc".equals("abc") + " " + "apple".compareTo("banana"));
    }
}
`, input: ''
  },
  {
    h: 'StringBuilder', show: 'StringBuilder (no import needed)', about: 'Text that can be changed, and fast to build up piece by piece.',
    items: [
      ['StringBuilder sb = new StringBuilder();', 'An empty builder (or new StringBuilder("start")).'],
      ['sb.append(x);', 'Add text or a value at the end.'],
      ['sb.insert(i, x);   sb.deleteCharAt(i);', 'Insert at position i; remove the character at i.'],
      ['sb.reverse();', 'Reverse the text.'],
      ['sb.setCharAt(i, c);   sb.length()', 'Change one character; current length.'],
      ['String s = sb.toString();', 'Get the finished String.']
    ],
    ex: String.raw`public class Main {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 5; i++) sb.append(i).append(i < 5 ? "," : "");
        System.out.println(sb);
        sb.reverse();
        System.out.println(sb);
        String word = "level";
        boolean pal = new StringBuilder(word).reverse().toString().equals(word);
        System.out.println(word + " is a palindrome: " + pal);
    }
}
`, input: ''
  },
  {
    h: 'Math', show: 'Math, Integer, Character (no import needed)', about: 'Maths functions and helpers for numbers and characters.',
    items: [
      ['Math.max(a, b)   Math.min(a, b)   Math.abs(x)', 'Larger, smaller, absolute value.'],
      ['Math.pow(x, y)   Math.sqrt(x)', 'x to the power y; square root (both give double).'],
      ['Math.round(x)   Math.floor(x)   Math.ceil(x)', 'Round to nearest, down, up.'],
      ['Math.PI', 'π.'],
      ['Integer.MAX_VALUE   Integer.MIN_VALUE', 'Largest and smallest int.'],
      ['Integer.parseInt(s)   Double.parseDouble(s)', 'Text to number.'],
      ['Character.isDigit(c)   Character.isLetter(c)', 'Tests on a char.'],
      ['Character.toUpperCase(c)   (int) c   (char) 65', 'Change case; character code; code to character.']
    ],
    ex: String.raw`public class Main {
    public static void main(String[] args) {
        double a = 3, b = 4;
        System.out.println("hypotenuse = " + Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2)));
        System.out.println(Math.max(7, 12) + " " + Math.abs(-5) + " " + Math.round(2.6) + " " + Math.floor(-2.5));
        System.out.println(Integer.parseInt("41") + 1);
        System.out.println(Integer.MAX_VALUE);
        char c = 'q';
        System.out.println(Character.isLetter(c) + " " + Character.toUpperCase(c) + " " + (int) c + " " + (char) 65);
    }
}
`, input: ''
  },
  {
    h: 'Arrays', show: 'import java.util.Arrays;', about: 'Fixed-size arrays and the Arrays helper class.',
    items: [
      ['int[] a = new int[n];   int[] b = {3, 1, 2};', 'A new array of n zeros; an array with given values.'],
      ['a.length', 'Number of elements (no brackets).'],
      ['Arrays.sort(a);', 'Sort in increasing order.'],
      ['Arrays.toString(a)', 'Text like [1, 2, 3], for printing.'],
      ['Arrays.fill(a, -1);', 'Set every element to -1.'],
      ['int[][] grid = new int[rows][cols];', 'A 2-D array; grid[i][j].'],
      ['Arrays.binarySearch(a, x)', 'Position of x in a sorted array (negative if absent).']
    ],
    ex: String.raw`import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] a = {5, 3, 9, 1, 7};
        Arrays.sort(a);
        System.out.println(Arrays.toString(a) + " length " + a.length);
        System.out.println("index of 7: " + Arrays.binarySearch(a, 7));
        int[][] grid = new int[3][4];
        for (int i = 0; i < 3; i++)
            for (int j = 0; j < 4; j++) grid[i][j] = i * j;
        for (int[] row : grid) System.out.println(Arrays.toString(row));
    }
}
`, input: ''
  },
  {
    h: 'ArrayList', show: 'import java.util.ArrayList;', about: 'A list that grows as you add to it.',
    items: [
      ['ArrayList<Integer> list = new ArrayList<>();', 'An empty list of Integers (use Integer, Double, String… not int).'],
      ['list.add(x);   list.add(i, x);', 'Add at the end; insert at position i.'],
      ['list.get(i)   list.set(i, x)', 'Read / change element i.'],
      ['list.remove(i)   list.remove(Integer.valueOf(x))', 'Remove by position; remove the value x.'],
      ['list.size()   list.isEmpty()   list.contains(x)', 'Number of elements; empty?; contains x?'],
      ['for (int x : list)', 'Visit every element.'],
      ['Collections.sort(list);', 'Sort it (import java.util.Collections).']
    ],
    ex: String.raw`import java.util.ArrayList;
import java.util.Collections;

public class Main {
    public static void main(String[] args) {
        ArrayList<Integer> list = new ArrayList<>();
        for (int x : new int[]{5, 3, 8, 1}) list.add(x);
        list.add(0, 10);
        System.out.println(list + " size " + list.size());
        list.remove(Integer.valueOf(8));
        Collections.sort(list);
        System.out.println(list + " first " + list.get(0) + " has 3: " + list.contains(3));
        ArrayList<String> names = new ArrayList<>(java.util.List.of("Karim", "Ayesha"));
        names.add("Rahim");
        for (String n : names) System.out.print(n + " ");
        System.out.println();
    }
}
`, input: ''
  },
  {
    h: 'HashMap', show: 'import java.util.HashMap;', about: 'Key → value pairs. TreeMap keeps the keys sorted.',
    items: [
      ['HashMap<String, Integer> m = new HashMap<>();', 'A map from String keys to Integer values.'],
      ['m.put(k, v);   m.get(k)', 'Set a value; read it (null if the key is missing).'],
      ['m.getOrDefault(k, 0)', 'Read, with 0 if the key is missing.'],
      ['m.containsKey(k)   m.remove(k)   m.size()', 'Is the key there?; remove it; number of keys.'],
      ['for (String k : m.keySet())', 'Visit every key (values() for every value).'],
      ['for (Map.Entry<String, Integer> e : m.entrySet())', 'Visit every pair: e.getKey(), e.getValue().'],
      ['TreeMap<String, Integer> t = new TreeMap<>();', 'Same methods, keys in sorted order (import java.util.TreeMap).']
    ],
    ex: String.raw`import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        Map<String, Integer> count = new TreeMap<>();
        while (sc.hasNext()) {
            String w = sc.next();
            count.put(w, count.getOrDefault(w, 0) + 1);
        }
        for (Map.Entry<String, Integer> e : count.entrySet())
            System.out.println(e.getKey() + ": " + e.getValue());
        System.out.println("has 'dog': " + count.containsKey("dog"));
    }
}
`, input: 'the cat and the dog and the bird'
  },
  {
    h: 'HashSet', show: 'import java.util.HashSet;', about: 'A set: no repeated values. TreeSet keeps them sorted.',
    items: [
      ['HashSet<Integer> s = new HashSet<>();', 'An empty set.'],
      ['s.add(x)', 'Add x; returns false if it was already there.'],
      ['s.contains(x)   s.remove(x)   s.size()', 'Membership test; remove; number of values.'],
      ['TreeSet<Integer> t = new TreeSet<>(s);', 'Sorted set: t.first(), t.last(), t.ceiling(x).']
    ],
    ex: String.raw`import java.util.*;

public class Main {
    public static void main(String[] args) {
        int[] a = {4, 1, 4, 7, 1, 9};
        Set<Integer> seen = new HashSet<>();
        for (int x : a)
            if (!seen.add(x)) System.out.println("repeat: " + x);
        TreeSet<Integer> sorted = new TreeSet<>(seen);
        System.out.println(sorted + " smallest " + sorted.first() + " largest " + sorted.last());
        System.out.println("first >= 5: " + sorted.ceiling(5));
    }
}
`, input: ''
  },
  {
    h: 'Collections', show: 'import java.util.Collections;', about: 'Helpers for lists.',
    items: [
      ['Collections.sort(list);', 'Sort in increasing order.'],
      ['Collections.sort(list, Collections.reverseOrder());', 'Sort in decreasing order.'],
      ['list.sort((a, b) -> a.length() - b.length());', 'Sort with your own rule (a lambda).'],
      ['Collections.reverse(list);   Collections.swap(list, i, j);', 'Reverse; swap two elements.'],
      ['Collections.max(list)   Collections.min(list)', 'Largest / smallest element.'],
      ['Collections.frequency(list, x)', 'How many times x appears.']
    ],
    ex: String.raw`import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<String> words = new ArrayList<>(List.of("pear", "fig", "banana", "kiwi", "fig"));
        Collections.sort(words);
        System.out.println(words);
        words.sort((a, b) -> a.length() - b.length());
        System.out.println(words);
        Collections.sort(words, Collections.reverseOrder());
        System.out.println(words);
        System.out.println(Collections.max(words) + " " + Collections.frequency(words, "fig"));
    }
}
`, input: ''
  },
  {
    h: 'ArrayDeque', show: 'import java.util.ArrayDeque; / PriorityQueue', about: 'Stacks, queues and priority queues.',
    items: [
      ['Deque<Integer> st = new ArrayDeque<>();', 'Use as a stack: st.push(x), st.pop(), st.peek().'],
      ['Queue<Integer> q = new ArrayDeque<>();', 'Use as a queue: q.offer(x), q.poll(), q.peek().'],
      ['PriorityQueue<Integer> pq = new PriorityQueue<>();', 'pq.poll() always removes the smallest.'],
      ['new PriorityQueue<>(Collections.reverseOrder())', 'Largest first instead.'],
      ['isEmpty()   size()', 'For all of them.']
    ],
    ex: String.raw`import java.util.*;

public class Main {
    public static void main(String[] args) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : "abc".toCharArray()) stack.push(c);
        StringBuilder sb = new StringBuilder();
        while (!stack.isEmpty()) sb.append(stack.pop());
        System.out.println("reversed with a stack: " + sb);

        Queue<String> line = new ArrayDeque<>(List.of("Ana", "Ben", "Chen"));
        while (!line.isEmpty()) System.out.println("serving " + line.poll());

        PriorityQueue<Integer> pq = new PriorityQueue<>(List.of(5, 1, 8, 3));
        System.out.print("smallest first:");
        while (!pq.isEmpty()) System.out.print(" " + pq.poll());
        System.out.println();
    }
}
`, input: ''
  },
  {
    h: 'BufferedReader', show: 'import java.io.*;', about: 'Faster input, one line at a time.',
    items: [
      ['BufferedReader br = new BufferedReader(new InputStreamReader(System.in));', 'Create the reader.'],
      ['String line = br.readLine();', 'Read one line (null at the end of the input).'],
      ['int n = Integer.parseInt(br.readLine().trim());', 'Read a line holding a number.'],
      ['String[] p = br.readLine().split(" ");', 'Several values on one line.'],
      ['public static void main(String[] args) throws IOException', 'readLine can throw IOException, so main must say throws IOException.']
    ],
    ex: String.raw`import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());
        String[] p = br.readLine().split(" ");
        long sum = 0;
        for (int i = 0; i < n; i++) sum += Long.parseLong(p[i]);
        System.out.println("sum of " + n + " numbers = " + sum);
        String line;
        while ((line = br.readLine()) != null) System.out.println("extra line: " + line);
    }
}
`, input: '4\n10 20 30 40\nhello\nworld'
  }
];

window.HEADER_GUIDE.python = [
  {
    h: 'print', show: 'print()  (built-in)', about: 'Printing output.',
    items: [
      ['print(a, b, c)', 'Print values separated by spaces, then a new line.'],
      ['print(a, b, sep=", ")', 'Choose the separator.'],
      ['print("no newline", end="")', 'Choose what comes at the end (default "\\n").'],
      ['print(f"Total: {x}")', 'An f-string puts values inside text.'],
      ['f"{x:.2f}"   f"{n:5d}"   f"{s:<10}"', 'Two decimals; width 5; left-aligned in 10 characters.']
    ],
    ex: String.raw`name, total = "Ayesha", 1234.5678
print("Hello", name)
print(1, 2, 3, sep=", ")
print("same line ", end="")
print("continues")
print(f"{name} paid {total:.2f}")
for item, price in [("pen", 0.5), ("notebook", 2.25), ("bag", 15)]:
    print(f"{item:<10}{price:>8.2f}")
`, input: ''
  },
  {
    h: 'input', show: 'input()  (built-in)', about: 'Reading input (here: the Input box). Each input() reads one line, as text.',
    items: [
      ['s = input()', 'Read one line as text (str).'],
      ['n = int(input())', 'Read a line holding one whole number.'],
      ['x = float(input())', 'A decimal number.'],
      ['a, b = map(int, input().split())', 'Two numbers on one line.'],
      ['nums = list(map(int, input().split()))', 'All the numbers on one line, as a list.'],
      ['import sys; data = sys.stdin.read().split()', 'Read all remaining input at once.']
    ],
    ex: String.raw`name = input()
n = int(input())
nums = list(map(int, input().split()))
print(f"Hello {name}, you gave {n} numbers")
print("sum:", sum(nums), "average:", sum(nums) / n)
`, input: 'Karim\n4\n10 20 30 40'
  },
  {
    h: 'builtins', show: 'Built-in functions', about: 'Always available, no import needed.',
    items: [
      ['len(x)', 'Number of items in a string, list, dict…'],
      ['range(n)   range(a, b)   range(a, b, step)', '0…n-1; a…b-1; with a step.'],
      ['sum(x)   min(x)   max(x)', 'Total, smallest, largest.'],
      ['sorted(x)   sorted(x, reverse=True)   sorted(x, key=len)', 'A sorted copy; decreasing; sorted by a key.'],
      ['abs(x)   round(x, 2)   divmod(a, b)   pow(a, b, m)', 'Absolute value; round; (quotient, remainder); power mod m.'],
      ['int(s)   float(s)   str(x)   bool(x)', 'Convert between types.'],
      ['enumerate(x)   zip(a, b)', 'Pairs (index, item); items side by side.'],
      ['ord("A")   chr(65)', 'Character code and back.']
    ],
    ex: String.raw`nums = [5, 3, 9, 1, 7]
print(len(nums), sum(nums), min(nums), max(nums))
print(sorted(nums), sorted(nums, reverse=True))
for i, x in enumerate(nums):
    print(i, x, end="; ")
print()
names, marks = ["Ana", "Ben"], [90, 85]
for n, m in zip(names, marks):
    print(n, m)
print(list(range(2, 11, 2)), divmod(17, 5), round(3.14159, 2), ord("A"), chr(97))
`, input: ''
  },
  {
    h: 'str', show: 'str (strings)', about: 'Text. Strings cannot be changed; methods return a new string.',
    items: [
      ['s[i]   s[-1]   s[a:b]   s[::-1]', 'A character; the last one; a slice; the reverse.'],
      ['s.upper()   s.lower()   s.strip()', 'Change case; remove spaces at both ends.'],
      ['s.split()   s.split(",")   " ".join(parts)', 'Cut into a list of words; join a list with a separator.'],
      ['s.replace("a", "b")   s.count("a")   s.find("a")', 'Replace; count; position (or -1).'],
      ['s.startswith("x")   s.endswith("x")   "x" in s', 'Tests.'],
      ['s.isdigit()   s.isalpha()', 'Only digits?; only letters?']
    ],
    ex: String.raw`s = "Hello, World"
print(s[0], s[-1], s[7:12], s[::-1])
print(s.upper(), s.lower(), s.replace("World", "Python"))
words = "red green blue".split()
print(words, "-".join(words))
print(s.count("l"), s.find("World"), "lo" in s, "2026".isdigit())
word = "Level"
print(word, "is a palindrome:", word.lower() == word.lower()[::-1])
`, input: ''
  },
  {
    h: 'list', show: 'list', about: 'An ordered, changeable sequence.',
    items: [
      ['a = [3, 1, 2]   a = [0] * n', 'A list; n zeros.'],
      ['a.append(x)   a.insert(i, x)   a.extend(b)', 'Add at the end; insert at i; add all of b.'],
      ['a.pop()   a.pop(i)   a.remove(x)', 'Remove the last item; item i; the first x.'],
      ['a.sort()   a.sort(reverse=True)   a.reverse()', 'Sort in place; decreasing; reverse in place.'],
      ['a.index(x)   a.count(x)   x in a', 'Position; how many; membership.'],
      ['a[1:3]   a[::-1]', 'Slices make copies.'],
      ['[x * x for x in a if x > 0]', 'List comprehension: build a list in one line.'],
      ['grid = [[0] * cols for _ in range(rows)]', 'A 2-D list (do not use [[0] * cols] * rows).']
    ],
    ex: String.raw`a = [5, 3, 8]
a.append(1)
a.insert(0, 10)
print(a)
a.remove(8)
last = a.pop()
a.sort()
print(a, "popped", last, "index of 5:", a.index(5))
squares = [x * x for x in range(6) if x % 2 == 0]
print(squares)
grid = [[i * j for j in range(4)] for i in range(3)]
for row in grid:
    print(row)
`, input: ''
  },
  {
    h: 'dict', show: 'dict (dictionaries)', about: 'Key → value pairs.',
    items: [
      ['d = {"a": 1, "b": 2}   d = {}', 'A dictionary; an empty one.'],
      ['d[k] = v   d[k]', 'Set a value; read it (KeyError if missing).'],
      ['d.get(k, 0)', 'Read, with 0 if the key is missing.'],
      ['k in d   del d[k]   len(d)', 'Is the key there?; remove it; number of keys.'],
      ['for k, v in d.items():', 'Visit every pair (d.keys(), d.values() also exist).'],
      ['sorted(d)   max(d, key=d.get)', 'Keys in order; the key with the largest value.']
    ],
    ex: String.raw`text = input()
count = {}
for w in text.split():
    count[w] = count.get(w, 0) + 1
for word in sorted(count):
    print(f"{word}: {count[word]}")
print("most frequent:", max(count, key=count.get))
print("has 'dog':", "dog" in count)
`, input: 'the cat and the dog and the bird'
  },
  {
    h: 'set', show: 'set and tuple', about: 'Sets hold unique values; tuples are fixed sequences.',
    items: [
      ['s = {1, 2, 3}   s = set()   set(a)', 'A set; an empty set; the unique values of a list.'],
      ['s.add(x)   s.discard(x)   x in s', 'Add; remove if present; membership (fast).'],
      ['a | b   a & b   a - b', 'Union, intersection, difference.'],
      ['t = (1, 2)   x, y = t', 'A tuple; unpack it into variables.'],
      ['a, b = b, a', 'Swap two variables.']
    ],
    ex: String.raw`a = [4, 1, 4, 7, 1, 9]
s = set(a)
print(sorted(s), len(s), 7 in s)
odd, small = {1, 3, 5, 7, 9}, {1, 2, 3, 4}
print(odd | small, odd & small, odd - small)
point = (3, 4)
x, y = point
x, y = y, x
print(point, x, y)
`, input: ''
  },
  {
    h: 'math', show: 'import math', about: 'Mathematical functions.',
    items: [
      ['math.sqrt(x)   math.isqrt(n)', 'Square root; integer square root.'],
      ['math.pi   math.e   math.inf', 'Constants.'],
      ['math.floor(x)   math.ceil(x)', 'Round down / up to a whole number.'],
      ['math.gcd(a, b)   math.lcm(a, b)   math.factorial(n)', 'Greatest common divisor, least common multiple, n!.'],
      ['math.comb(n, k)   math.perm(n, k)', 'Combinations and permutations.'],
      ['math.log(x)   math.log2(x)   math.log10(x)', 'Logarithms.'],
      ['math.sin(x)   math.cos(x)   math.radians(d)', 'Trigonometry in radians.'],
      ['math.hypot(x, y)', '√(x² + y²).']
    ],
    ex: String.raw`import math

print(math.sqrt(16), math.isqrt(17), round(math.pi, 4))
print(math.floor(-2.5), math.ceil(-2.5))
print(math.gcd(84, 36), math.lcm(4, 6), math.factorial(10))
print(math.comb(5, 2), math.perm(5, 2))
print(math.hypot(3, 4), round(math.sin(math.radians(30)), 2), math.log2(1024))
`, input: ''
  },
  {
    h: 'random', show: 'import random', about: 'Random numbers and choices.',
    items: [
      ['random.randint(a, b)', 'A whole number from a to b (both included).'],
      ['random.random()', 'A decimal from 0 up to 1.'],
      ['random.choice(a)   random.sample(a, k)', 'One random item; k different items.'],
      ['random.shuffle(a)', 'Shuffle a list in place.'],
      ['random.seed(1)', 'Fix the sequence, so the "random" results repeat.']
    ],
    ex: String.raw`import random

random.seed(7)   # remove this line to get different numbers every run
print("dice:", [random.randint(1, 6) for _ in range(5)])
cards = ["A", "K", "Q", "J", "10"]
random.shuffle(cards)
print("shuffled:", cards)
print("one card:", random.choice(cards), " two cards:", random.sample(cards, 2))
`, input: ''
  },
  {
    h: 'collections', show: 'from collections import Counter, deque, defaultdict', about: 'Extra container types.',
    items: [
      ['Counter(items)', 'Counts each item: c["a"], c.most_common(2).'],
      ['deque()', 'A fast queue: append, appendleft, pop, popleft.'],
      ['defaultdict(list)', 'A dict that creates a default value (here an empty list) for a missing key.'],
      ['namedtuple("Point", "x y")', 'A small record type: p.x, p.y.']
    ],
    ex: String.raw`from collections import Counter, deque, defaultdict

c = Counter("mississippi")
print(c.most_common(2), c["s"])

q = deque([1, 2, 3])
q.appendleft(0)
q.append(4)
print(q.popleft(), q.pop(), list(q))

groups = defaultdict(list)
for word in ["apple", "avocado", "banana", "blueberry", "cherry"]:
    groups[word[0]].append(word)
print(dict(groups))
`, input: ''
  },
  {
    h: 'heapq', show: 'import heapq, bisect', about: 'Priority queues (heaps) and searching in sorted lists.',
    items: [
      ['heapq.heappush(h, x)   heapq.heappop(h)', 'Add to a heap; remove the smallest.'],
      ['heapq.heapify(a)', 'Turn a list into a heap in place.'],
      ['heapq.nlargest(k, a)   heapq.nsmallest(k, a)', 'The k largest / smallest items.'],
      ['bisect.bisect_left(a, x)', 'In a sorted list, the position where x would go.'],
      ['bisect.insort(a, x)', 'Insert x and keep the list sorted.']
    ],
    ex: String.raw`import heapq, bisect

h = []
for x in [5, 1, 8, 3]:
    heapq.heappush(h, x)
print("smallest first:", [heapq.heappop(h) for _ in range(4)])
print(heapq.nlargest(2, [5, 1, 8, 3]))

a = [1, 3, 5, 7]
print("5 is at", bisect.bisect_left(a, 5))
bisect.insort(a, 4)
print(a)
`, input: ''
  },
  {
    h: 'functools', show: 'from functools import lru_cache / import itertools', about: 'Memoisation and combinatorics.',
    items: [
      ['@lru_cache(maxsize=None)', 'Put above a function to remember its results (fast recursion).'],
      ['itertools.permutations(a)', 'Every ordering of a.'],
      ['itertools.combinations(a, k)', 'Every choice of k items.'],
      ['itertools.product(a, b)', 'Every pair (x, y).'],
      ['itertools.accumulate(a)', 'Running totals (prefix sums).']
    ],
    ex: String.raw`from functools import lru_cache
import itertools

@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print("fib(80) =", fib(80))
print(list(itertools.permutations("abc")))
print(list(itertools.combinations([1, 2, 3, 4], 2)))
print(list(itertools.accumulate([1, 2, 3, 4])))
`, input: ''
  }
];
