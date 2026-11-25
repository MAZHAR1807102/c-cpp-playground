// Algorithm programs that go with the animated simulations (sims/), in all four languages, plus the map from an
// example to its simulation. Loaded after examples-c/cpp/java/python.js. Same output in every language.
window.MORE_EXAMPLES = window.MORE_EXAMPLES || {};
(() => {
const G = 'Graphs, strings, DP and games', S = 'Algorithms, step by step';
const IN = {
  counting: '8\n2 5 3 0 2 3 0 3',
  dijkstra: '5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3\n0',
  kruskal: '6 9\n0 1 4\n0 2 3\n1 2 1\n1 3 2\n2 3 4\n3 4 2\n4 5 6\n3 5 5\n2 4 7',
  kmp: 'ABABDABACDABABCABAB\nABABCABAB',
  prefix: '8\n3 1 4 1 5 9 2 6\n3\n0 3\n2 5\n4 7',
  queens: '6',
  knap: '4 7\n1 1\n3 4\n4 5\n5 7',
  tsp: '4\n0 10 15 20\n10 0 35 25\n15 35 0 30\n20 25 30 0',
  minimax: '3 5 6 9 1 2 0 -1'
};
const add = (lang, list) => { (MORE_EXAMPLES[lang] = MORE_EXAMPLES[lang] || []).push(...list); };

/* ======================= C ======================= */
add('c', [
[S, 'Counting sort', String.raw`#include <stdio.h>

int main(void) {
    int n, a[100], out[100], c[1001] = {0};
    scanf("%d", &n);
    int max = 0;
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);                  // whole numbers from 0 to 1000
        if (a[i] > max) max = a[i];
    }
    for (int i = 0; i < n; i++) c[a[i]]++;
    printf("Counts C[0..%d]: ", max);
    for (int v = 0; v <= max; v++) printf("%d ", c[v]);
    for (int v = 1; v <= max; v++) c[v] += c[v - 1];   // now c[v] = how many keys are <= v
    printf("\nRunning totals: ");
    for (int v = 0; v <= max; v++) printf("%d ", c[v]);
    printf("\n");
    for (int i = n - 1; i >= 0; i--) {       // right to left keeps equal keys in order (stable)
        c[a[i]]--;
        out[c[a[i]]] = a[i];
        printf("Place %d at index %d\n", a[i], c[a[i]]);
    }
    printf("Sorted: ");
    for (int i = 0; i < n; i++) printf("%d ", out[i]);
    printf("\n");
    return 0;
}
`, IN.counting],
[G, "Dijkstra's shortest paths", String.raw`#include <stdio.h>

#define INF 1000000000

int main(void) {
    int n, m, src, w[20][20], dist[20], prev[20], done[20];
    scanf("%d %d", &n, &m);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n; j++) w[i][j] = -1;      // -1: no edge
        dist[i] = INF;
        prev[i] = -1;
        done[i] = 0;
    }
    for (int i = 0; i < m; i++) {
        int u, v, c;
        scanf("%d %d %d", &u, &v, &c);
        w[u][v] = w[v][u] = c;                          // undirected, weights >= 0
    }
    scanf("%d", &src);
    dist[src] = 0;
    for (int round = 0; round < n; round++) {
        int u = -1;
        for (int v = 0; v < n; v++)                     // the closest vertex that is not done yet
            if (!done[v] && dist[v] < INF && (u < 0 || dist[v] < dist[u])) u = v;
        if (u < 0) break;
        done[u] = 1;
        printf("Take %d (distance %d)\n", u, dist[u]);
        for (int v = 0; v < n; v++) {
            if (w[u][v] >= 0 && !done[v] && dist[u] + w[u][v] < dist[v]) {   // relax the edge u-v
                dist[v] = dist[u] + w[u][v];
                prev[v] = u;
                printf("   update %d: distance %d via %d\n", v, dist[v], u);
            }
        }
    }
    for (int v = 0; v < n; v++) {
        if (dist[v] == INF) {
            printf("%d: no path\n", v);
            continue;
        }
        int path[20], k = 0;
        for (int x = v; x != -1; x = prev[x]) path[k++] = x;
        printf("%d: distance %d, path", v, dist[v]);
        for (int i = k - 1; i >= 0; i--) printf(" %d", path[i]);
        printf("\n");
    }
    return 0;
}
`, IN.dijkstra],
[G, "Kruskal's minimum spanning tree", String.raw`#include <stdio.h>
#include <stdlib.h>

typedef struct { int u, v, w; } Edge;
int parent[100];

int root(int x) {                        // the root of x's tree (union-find), shortening the path
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
    }
    return x;
}

int byWeight(const void *a, const void *b) {
    const Edge *x = a, *y = b;
    if (x->w != y->w) return x->w - y->w;
    if (x->u != y->u) return x->u - y->u;
    return x->v - y->v;
}

int main(void) {
    int n, m;
    Edge e[200];
    scanf("%d %d", &n, &m);
    for (int i = 0; i < m; i++) scanf("%d %d %d", &e[i].u, &e[i].v, &e[i].w);
    qsort(e, m, sizeof(Edge), byWeight);         // lightest edge first
    for (int i = 0; i < n; i++) parent[i] = i;   // every vertex is its own tree
    int total = 0, taken = 0;
    for (int i = 0; i < m && taken < n - 1; i++) {
        int ru = root(e[i].u), rv = root(e[i].v);
        if (ru == rv) {
            printf("Edge %d-%d weight %d: skip (would make a cycle)\n", e[i].u, e[i].v, e[i].w);
        } else {
            parent[ru] = rv;                     // join the two trees
            total += e[i].w;
            taken++;
            printf("Edge %d-%d weight %d: take\n", e[i].u, e[i].v, e[i].w);
        }
    }
    printf("Total weight of the minimum spanning tree: %d (%d edges)\n", total, taken);
    return 0;
}
`, IN.kruskal],
[G, 'KMP string matching', String.raw`#include <stdio.h>
#include <string.h>

int main(void) {
    char t[1001], p[101];
    int pi[101];
    scanf("%1000s %100s", t, p);         // text, then pattern
    int n = strlen(t), m = strlen(p);
    // pi[q] = length of the longest proper prefix of p[0..q] that is also a suffix of it
    pi[0] = 0;
    for (int q = 1, k = 0; q < m; q++) {
        while (k > 0 && p[k] != p[q]) k = pi[k - 1];
        if (p[k] == p[q]) k++;
        pi[q] = k;
    }
    printf("Prefix table: ");
    for (int q = 0; q < m; q++) printf("%d ", pi[q]);
    printf("\n");
    int found = 0;
    for (int i = 0, j = 0; i < n; i++) {   // j = how many pattern characters match so far
        while (j > 0 && t[i] != p[j]) {
            printf("text[%d] = %c, pattern[%d] = %c: mismatch, fall back to %d\n", i, t[i], j, p[j], pi[j - 1]);
            j = pi[j - 1];
        }
        if (t[i] == p[j]) j++;
        if (j == m) {
            printf("Match at index %d\n", i - m + 1);
            found++;
            j = pi[j - 1];
        }
    }
    printf("%d match%s\n", found, found == 1 ? "" : "es");
    return 0;
}
`, IN.kmp],
[G, 'Prefix sums and range queries', String.raw`#include <stdio.h>

int main(void) {
    int n, q;
    long long a[1000], P[1001];
    scanf("%d", &n);
    P[0] = 0;
    for (int i = 0; i < n; i++) {
        scanf("%lld", &a[i]);
        P[i + 1] = P[i] + a[i];            // P[i] = sum of the first i numbers
    }
    printf("P: ");
    for (int i = 0; i <= n; i++) printf("%lld ", P[i]);
    printf("\n");
    scanf("%d", &q);
    while (q-- > 0) {
        int l, r;
        scanf("%d %d", &l, &r);            // the sum of a[l..r] in O(1)
        printf("sum(%d..%d) = P[%d] - P[%d] = %lld\n", l, r, r + 1, l, P[r + 1] - P[l]);
    }
    return 0;
}
`, IN.prefix],
[G, '0/1 knapsack (DP table)', String.raw`#include <stdio.h>

int main(void) {
    int n, W, wt[51], val[51];
    static int dp[51][1001];               // static: a big table does not fit on the stack
    scanf("%d %d", &n, &W);                // items, capacity
    for (int i = 1; i <= n; i++) scanf("%d %d", &wt[i], &val[i]);
    // dp[i][w] = the best value using the first i items with capacity w
    for (int i = 0; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            if (i == 0) {
                dp[i][w] = 0;
                continue;
            }
            dp[i][w] = dp[i - 1][w];                                  // leave item i
            if (wt[i] <= w && dp[i - 1][w - wt[i]] + val[i] > dp[i][w])
                dp[i][w] = dp[i - 1][w - wt[i]] + val[i];             // take item i
        }
    }
    printf("capacity:");
    for (int w = 0; w <= W; w++) printf("%4d", w);
    printf("\n");
    for (int i = 0; i <= n; i++) {
        printf("item %d:  ", i);
        for (int w = 0; w <= W; w++) printf("%4d", dp[i][w]);
        printf("\n");
    }
    for (int i = n, w = W; i > 0; i--) {   // walk back through the table to find the items taken
        if (dp[i][w] != dp[i - 1][w]) {
            printf("Take item %d (weight %d, value %d)\n", i, wt[i], val[i]);
            w -= wt[i];
        }
    }
    printf("Best value: %d\n", dp[n][W]);
    return 0;
}
`, IN.knap],
[G, 'N-Queens (backtracking)', String.raw`#include <stdio.h>

int n, col[20], first[20], solutions = 0, placed = 0;

int safe(int row, int c) {               // no earlier queen in the same column or diagonal
    for (int r = 0; r < row; r++)
        if (col[r] == c || col[r] - c == r - row || col[r] - c == row - r) return 0;
    return 1;
}

void solve(int row) {
    if (row == n) {
        if (solutions == 0)
            for (int r = 0; r < n; r++) first[r] = col[r];
        solutions++;
        return;
    }
    for (int c = 0; c < n; c++) {
        if (safe(row, c)) {
            col[row] = c;
            placed++;
            solve(row + 1);              // then backtrack and try the next column
        }
    }
}

int main(void) {
    scanf("%d", &n);
    solve(0);
    if (solutions > 0) {
        printf("First solution:\n");
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) fputs(first[r] == c ? "Q " : ". ", stdout);
            printf("\n");
        }
    }
    printf("Solutions for %d queens: %d\n", n, solutions);
    printf("Queens placed while searching: %d\n", placed);
    return 0;
}
`, IN.queens],
[G, 'Travelling salesman (brute force)', String.raw`#include <stdio.h>

int n, d[10][10], tour[10], used[10], bestTour[10], best = -1, tours = 0;

void explore(int k, int cost) {          // tour[0..k-1] is fixed; try every city for position k
    if (k == n) {
        int total = cost + d[tour[n - 1]][0];   // and back to the start
        tours++;
        printf("Tour");
        for (int i = 0; i < n; i++) printf(" %d", tour[i]);
        printf(" 0: cost %d\n", total);
        if (best < 0 || total < best) {
            best = total;
            for (int i = 0; i < n; i++) bestTour[i] = tour[i];
        }
        return;
    }
    for (int c = 1; c < n; c++) {
        if (!used[c]) {
            used[c] = 1;
            tour[k] = c;
            explore(k + 1, cost + d[tour[k - 1]][c]);
            used[c] = 0;
        }
    }
}

int main(void) {
    scanf("%d", &n);
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) scanf("%d", &d[i][j]);
    tour[0] = 0;                         // start at city 0
    explore(1, 0);
    printf("Best tour:");
    for (int i = 0; i < n; i++) printf(" %d", bestTour[i]);
    printf(" 0, cost %d (%d tours checked)\n", best, tours);
    return 0;
}
`, IN.tsp],
[G, 'Minimax with alpha-beta', String.raw`#include <stdio.h>

int leaf[8], evaluated = 0;

int max(int a, int b) { return a > b ? a : b; }
int min(int a, int b) { return a < b ? a : b; }

// a game tree of depth 3: the root (depth 0) is MAX, then MIN, then MAX; the 8 leaves are at depth 3
int alphabeta(int depth, int node, int isMax, int alpha, int beta) {
    if (depth == 3) {
        evaluated++;
        printf("leaf %d = %d\n", node, leaf[node]);
        return leaf[node];
    }
    int best = isMax ? -1000000 : 1000000;
    for (int c = 0; c < 2; c++) {
        int v = alphabeta(depth + 1, node * 2 + c, !isMax, alpha, beta);
        if (isMax) {
            best = max(best, v);
            alpha = max(alpha, best);
        } else {
            best = min(best, v);
            beta = min(beta, best);
        }
        if (beta <= alpha && c == 0) {   // the other child cannot change the result
            printf("prune: %s node at depth %d skips its other child (alpha = %d, beta = %d)\n", isMax ? "MAX" : "MIN", depth, alpha, beta);
            break;
        }
    }
    return best;
}

int main(void) {
    for (int i = 0; i < 8; i++) scanf("%d", &leaf[i]);
    int value = alphabeta(0, 0, 1, -1000000, 1000000);
    printf("Minimax value: %d\n", value);
    printf("Leaves evaluated: %d of 8\n", evaluated);
    return 0;
}
`, IN.minimax]
]);

/* ======================= C++ ======================= */
add('cpp', [
[S, 'Counting sort', String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;               // whole numbers from 0 upwards
    int mx = *max_element(a.begin(), a.end());
    vector<int> c(mx + 1, 0), out(n);
    for (int x : a) c[x]++;
    cout << "Counts C[0.." << mx << "]: ";
    for (int x : c) cout << x << " ";
    for (int v = 1; v <= mx; v++) c[v] += c[v - 1];   // now c[v] = how many keys are <= v
    cout << "\nRunning totals: ";
    for (int x : c) cout << x << " ";
    cout << "\n";
    for (int i = n - 1; i >= 0; i--) {       // right to left keeps equal keys in order (stable)
        c[a[i]]--;
        out[c[a[i]]] = a[i];
        cout << "Place " << a[i] << " at index " << c[a[i]] << "\n";
    }
    cout << "Sorted: ";
    for (int x : out) cout << x << " ";
    cout << "\n";
    return 0;
}
`, IN.counting],
[G, "Dijkstra's shortest paths", String.raw`#include <iostream>
#include <vector>
#include <queue>
#include <functional>
#include <utility>
#include <algorithm>
#include <climits>
using namespace std;

int main() {
    int n, m, src;
    cin >> n >> m;
    vector<vector<pair<int, int>>> adj(n);          // adj[u] = (v, weight)
    for (int i = 0; i < m; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        adj[u].push_back({v, w});                   // undirected, weights >= 0
        adj[v].push_back({u, w});
    }
    for (auto &l : adj) sort(l.begin(), l.end());   // look at neighbours in increasing order
    cin >> src;
    vector<int> dist(n, INT_MAX), prv(n, -1);
    vector<bool> done(n, false);
    // a min-heap of (distance, vertex): the closest vertex comes out first
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    dist[src] = 0;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (done[u]) continue;                      // an old entry
        done[u] = true;
        cout << "Take " << u << " (distance " << d << ")\n";
        for (auto [v, w] : adj[u]) {
            if (!done[v] && d + w < dist[v]) {      // relax the edge u-v
                dist[v] = d + w;
                prv[v] = u;
                pq.push({dist[v], v});
                cout << "   update " << v << ": distance " << dist[v] << " via " << u << "\n";
            }
        }
    }
    for (int v = 0; v < n; v++) {
        if (dist[v] == INT_MAX) {
            cout << v << ": no path\n";
            continue;
        }
        vector<int> path;
        for (int x = v; x != -1; x = prv[x]) path.push_back(x);
        reverse(path.begin(), path.end());
        cout << v << ": distance " << dist[v] << ", path";
        for (int x : path) cout << " " << x;
        cout << "\n";
    }
    return 0;
}
`, IN.dijkstra],
[G, "Kruskal's minimum spanning tree", String.raw`#include <iostream>
#include <vector>
#include <tuple>
#include <algorithm>
using namespace std;

vector<int> parent;

int root(int x) {                        // the root of x's tree (union-find), shortening the path
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
    }
    return x;
}

int main() {
    int n, m;
    cin >> n >> m;
    vector<tuple<int, int, int>> edges;  // (weight, u, v): sorting tuples sorts by weight first
    for (int i = 0; i < m; i++) {
        int u, v, w;
        cin >> u >> v >> w;
        edges.push_back({w, u, v});
    }
    sort(edges.begin(), edges.end());
    parent.resize(n);
    for (int i = 0; i < n; i++) parent[i] = i;
    int total = 0, taken = 0;
    for (auto [w, u, v] : edges) {
        if (taken == n - 1) break;
        int ru = root(u), rv = root(v);
        if (ru == rv) {
            cout << "Edge " << u << "-" << v << " weight " << w << ": skip (would make a cycle)\n";
        } else {
            parent[ru] = rv;             // join the two trees
            total += w;
            taken++;
            cout << "Edge " << u << "-" << v << " weight " << w << ": take\n";
        }
    }
    cout << "Total weight of the minimum spanning tree: " << total << " (" << taken << " edges)\n";
    return 0;
}
`, IN.kruskal],
[G, 'KMP string matching', String.raw`#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string t, p;
    cin >> t >> p;                       // text, then pattern
    int n = t.size(), m = p.size();
    // pi[q] = length of the longest proper prefix of p[0..q] that is also a suffix of it
    vector<int> pi(m, 0);
    for (int q = 1, k = 0; q < m; q++) {
        while (k > 0 && p[k] != p[q]) k = pi[k - 1];
        if (p[k] == p[q]) k++;
        pi[q] = k;
    }
    cout << "Prefix table: ";
    for (int x : pi) cout << x << " ";
    cout << "\n";
    int found = 0;
    for (int i = 0, j = 0; i < n; i++) {   // j = how many pattern characters match so far
        while (j > 0 && t[i] != p[j]) {
            cout << "text[" << i << "] = " << t[i] << ", pattern[" << j << "] = " << p[j] << ": mismatch, fall back to " << pi[j - 1] << "\n";
            j = pi[j - 1];
        }
        if (t[i] == p[j]) j++;
        if (j == m) {
            cout << "Match at index " << i - m + 1 << "\n";
            found++;
            j = pi[j - 1];
        }
    }
    cout << found << (found == 1 ? " match" : " matches") << "\n";
    return 0;
}
`, IN.kmp],
[G, 'Prefix sums and range queries', String.raw`#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, q;
    cin >> n;
    vector<long long> a(n), P(n + 1, 0);
    for (int i = 0; i < n; i++) {
        cin >> a[i];
        P[i + 1] = P[i] + a[i];            // P[i] = sum of the first i numbers
    }
    cout << "P: ";
    for (long long x : P) cout << x << " ";
    cout << "\n";
    cin >> q;
    while (q-- > 0) {
        int l, r;
        cin >> l >> r;                     // the sum of a[l..r] in O(1)
        cout << "sum(" << l << ".." << r << ") = P[" << r + 1 << "] - P[" << l << "] = " << P[r + 1] - P[l] << "\n";
    }
    return 0;
}
`, IN.prefix],
[G, '0/1 knapsack (DP table)', String.raw`#include <iostream>
#include <iomanip>
#include <vector>
using namespace std;

int main() {
    int n, W;
    cin >> n >> W;                         // items, capacity
    vector<int> wt(n + 1), val(n + 1);
    for (int i = 1; i <= n; i++) cin >> wt[i] >> val[i];
    // dp[i][w] = the best value using the first i items with capacity w
    vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            dp[i][w] = dp[i - 1][w];                                  // leave item i
            if (wt[i] <= w) dp[i][w] = max(dp[i][w], dp[i - 1][w - wt[i]] + val[i]);   // or take it
        }
    }
    cout << "capacity:";
    for (int w = 0; w <= W; w++) cout << setw(4) << w;
    cout << "\n";
    for (int i = 0; i <= n; i++) {
        cout << "item " << i << ":  ";
        for (int w = 0; w <= W; w++) cout << setw(4) << dp[i][w];
        cout << "\n";
    }
    for (int i = n, w = W; i > 0; i--) {   // walk back through the table to find the items taken
        if (dp[i][w] != dp[i - 1][w]) {
            cout << "Take item " << i << " (weight " << wt[i] << ", value " << val[i] << ")\n";
            w -= wt[i];
        }
    }
    cout << "Best value: " << dp[n][W] << "\n";
    return 0;
}
`, IN.knap],
[G, 'N-Queens (backtracking)', String.raw`#include <iostream>
#include <vector>
using namespace std;

int n, solutions = 0, placed = 0;
vector<int> col, first;

bool safe(int row, int c) {              // no earlier queen in the same column or diagonal
    for (int r = 0; r < row; r++)
        if (col[r] == c || col[r] - c == r - row || col[r] - c == row - r) return false;
    return true;
}

void solve(int row) {
    if (row == n) {
        if (solutions == 0) first = col;
        solutions++;
        return;
    }
    for (int c = 0; c < n; c++) {
        if (safe(row, c)) {
            col[row] = c;
            placed++;
            solve(row + 1);              // then backtrack and try the next column
        }
    }
}

int main() {
    cin >> n;
    col.assign(n, 0);
    solve(0);
    if (solutions > 0) {
        cout << "First solution:\n";
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) cout << (first[r] == c ? "Q " : ". ");
            cout << "\n";
        }
    }
    cout << "Solutions for " << n << " queens: " << solutions << "\n";
    cout << "Queens placed while searching: " << placed << "\n";
    return 0;
}
`, IN.queens],
[G, 'Travelling salesman (brute force)', String.raw`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<vector<int>> d(n, vector<int>(n));
    for (auto &row : d)
        for (int &x : row) cin >> x;
    // start at city 0 and try every order of the others; next_permutation gives them in order
    vector<int> rest;
    for (int c = 1; c < n; c++) rest.push_back(c);
    int best = -1, tours = 0;
    vector<int> bestTour;
    do {
        int cost = 0, at = 0;
        for (int c : rest) {
            cost += d[at][c];
            at = c;
        }
        cost += d[at][0];                // back to the start
        tours++;
        cout << "Tour 0";
        for (int c : rest) cout << " " << c;
        cout << " 0: cost " << cost << "\n";
        if (best < 0 || cost < best) {
            best = cost;
            bestTour = rest;
        }
    } while (next_permutation(rest.begin(), rest.end()));
    cout << "Best tour: 0";
    for (int c : bestTour) cout << " " << c;
    cout << " 0, cost " << best << " (" << tours << " tours checked)\n";
    return 0;
}
`, IN.tsp],
[G, 'Minimax with alpha-beta', String.raw`#include <iostream>
#include <algorithm>
using namespace std;

int leaf[8], evaluated = 0;

// a game tree of depth 3: the root (depth 0) is MAX, then MIN, then MAX; the 8 leaves are at depth 3
int alphabeta(int depth, int node, bool isMax, int alpha, int beta) {
    if (depth == 3) {
        evaluated++;
        cout << "leaf " << node << " = " << leaf[node] << "\n";
        return leaf[node];
    }
    int best = isMax ? -1000000 : 1000000;
    for (int c = 0; c < 2; c++) {
        int v = alphabeta(depth + 1, node * 2 + c, !isMax, alpha, beta);
        if (isMax) {
            best = max(best, v);
            alpha = max(alpha, best);
        } else {
            best = min(best, v);
            beta = min(beta, best);
        }
        if (beta <= alpha && c == 0) {   // the other child cannot change the result
            cout << "prune: " << (isMax ? "MAX" : "MIN") << " node at depth " << depth << " skips its other child (alpha = " << alpha << ", beta = " << beta << ")\n";
            break;
        }
    }
    return best;
}

int main() {
    for (int &x : leaf) cin >> x;
    int value = alphabeta(0, 0, true, -1000000, 1000000);
    cout << "Minimax value: " << value << "\n";
    cout << "Leaves evaluated: " << evaluated << " of 8\n";
    return 0;
}
`, IN.minimax]
]);

/* ======================= Java ======================= */
add('java', [
[S, 'Counting sort', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] a = new int[n], out = new int[n];
        int max = 0;
        for (int i = 0; i < n; i++) {
            a[i] = sc.nextInt();                 // whole numbers from 0 upwards
            max = Math.max(max, a[i]);
        }
        int[] c = new int[max + 1];
        for (int x : a) c[x]++;
        System.out.print("Counts C[0.." + max + "]: ");
        for (int x : c) System.out.print(x + " ");
        for (int v = 1; v <= max; v++) c[v] += c[v - 1];   // now c[v] = how many keys are <= v
        System.out.print("\nRunning totals: ");
        for (int x : c) System.out.print(x + " ");
        System.out.println();
        for (int i = n - 1; i >= 0; i--) {       // right to left keeps equal keys in order (stable)
            c[a[i]]--;
            out[c[a[i]]] = a[i];
            System.out.println("Place " + a[i] + " at index " + c[a[i]]);
        }
        System.out.print("Sorted: ");
        for (int x : out) System.out.print(x + " ");
        System.out.println();
    }
}
`, IN.counting],
[G, "Dijkstra's shortest paths", String.raw`import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt(), m = sc.nextInt();
        final int INF = Integer.MAX_VALUE;
        int[][] w = new int[n][n];
        for (int[] row : w) Arrays.fill(row, -1);         // -1: no edge
        for (int i = 0; i < m; i++) {
            int u = sc.nextInt(), v = sc.nextInt(), c = sc.nextInt();
            w[u][v] = w[v][u] = c;                        // undirected, weights >= 0
        }
        int src = sc.nextInt();
        int[] dist = new int[n], prev = new int[n];
        boolean[] done = new boolean[n];
        Arrays.fill(dist, INF);
        Arrays.fill(prev, -1);
        dist[src] = 0;
        for (int round = 0; round < n; round++) {
            int u = -1;
            for (int v = 0; v < n; v++)                   // the closest vertex that is not done yet
                if (!done[v] && dist[v] < INF && (u < 0 || dist[v] < dist[u])) u = v;
            if (u < 0) break;
            done[u] = true;
            System.out.println("Take " + u + " (distance " + dist[u] + ")");
            for (int v = 0; v < n; v++) {
                if (w[u][v] >= 0 && !done[v] && dist[u] + w[u][v] < dist[v]) {   // relax the edge u-v
                    dist[v] = dist[u] + w[u][v];
                    prev[v] = u;
                    System.out.println("   update " + v + ": distance " + dist[v] + " via " + u);
                }
            }
        }
        for (int v = 0; v < n; v++) {
            if (dist[v] == INF) {
                System.out.println(v + ": no path");
                continue;
            }
            ArrayDeque<Integer> path = new ArrayDeque<>();
            for (int x = v; x != -1; x = prev[x]) path.addFirst(x);
            StringBuilder sb = new StringBuilder(v + ": distance " + dist[v] + ", path");
            for (int x : path) sb.append(" ").append(x);
            System.out.println(sb);
        }
    }
}
`, IN.dijkstra],
[G, "Kruskal's minimum spanning tree", String.raw`import java.util.*;

public class Main {
    static int[] parent;

    static int root(int x) {             // the root of x's tree (union-find), shortening the path
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt(), m = sc.nextInt();
        int[][] e = new int[m][];
        for (int i = 0; i < m; i++) e[i] = new int[] {sc.nextInt(), sc.nextInt(), sc.nextInt()};   // u v w
        // lightest edge first (then by u, v so the order is always the same)
        Arrays.sort(e, (x, y) -> x[2] != y[2] ? x[2] - y[2] : x[0] != y[0] ? x[0] - y[0] : x[1] - y[1]);
        parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        int total = 0, taken = 0;
        for (int[] ed : e) {
            if (taken == n - 1) break;
            int ru = root(ed[0]), rv = root(ed[1]);
            if (ru == rv) {
                System.out.println("Edge " + ed[0] + "-" + ed[1] + " weight " + ed[2] + ": skip (would make a cycle)");
            } else {
                parent[ru] = rv;         // join the two trees
                total += ed[2];
                taken++;
                System.out.println("Edge " + ed[0] + "-" + ed[1] + " weight " + ed[2] + ": take");
            }
        }
        System.out.println("Total weight of the minimum spanning tree: " + total + " (" + taken + " edges)");
    }
}
`, IN.kruskal],
[G, 'KMP string matching', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String t = sc.next(), p = sc.next();     // text, then pattern
        int n = t.length(), m = p.length();
        // pi[q] = length of the longest proper prefix of p[0..q] that is also a suffix of it
        int[] pi = new int[m];
        for (int q = 1, k = 0; q < m; q++) {
            while (k > 0 && p.charAt(k) != p.charAt(q)) k = pi[k - 1];
            if (p.charAt(k) == p.charAt(q)) k++;
            pi[q] = k;
        }
        System.out.print("Prefix table: ");
        for (int x : pi) System.out.print(x + " ");
        System.out.println();
        int found = 0;
        for (int i = 0, j = 0; i < n; i++) {     // j = how many pattern characters match so far
            while (j > 0 && t.charAt(i) != p.charAt(j)) {
                System.out.println("text[" + i + "] = " + t.charAt(i) + ", pattern[" + j + "] = " + p.charAt(j) + ": mismatch, fall back to " + pi[j - 1]);
                j = pi[j - 1];
            }
            if (t.charAt(i) == p.charAt(j)) j++;
            if (j == m) {
                System.out.println("Match at index " + (i - m + 1));
                found++;
                j = pi[j - 1];
            }
        }
        System.out.println(found + (found == 1 ? " match" : " matches"));
    }
}
`, IN.kmp],
[G, 'Prefix sums and range queries', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        long[] P = new long[n + 1];
        for (int i = 0; i < n; i++) P[i + 1] = P[i] + sc.nextLong();   // P[i] = sum of the first i numbers
        System.out.print("P: ");
        for (long x : P) System.out.print(x + " ");
        System.out.println();
        int q = sc.nextInt();
        while (q-- > 0) {
            int l = sc.nextInt(), r = sc.nextInt();   // the sum of a[l..r] in O(1)
            System.out.println("sum(" + l + ".." + r + ") = P[" + (r + 1) + "] - P[" + l + "] = " + (P[r + 1] - P[l]));
        }
    }
}
`, IN.prefix],
[G, '0/1 knapsack (DP table)', String.raw`import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt(), W = sc.nextInt();  // items, capacity
        int[] wt = new int[n + 1], val = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            wt[i] = sc.nextInt();
            val[i] = sc.nextInt();
        }
        // dp[i][w] = the best value using the first i items with capacity w
        int[][] dp = new int[n + 1][W + 1];
        for (int i = 1; i <= n; i++) {
            for (int w = 0; w <= W; w++) {
                dp[i][w] = dp[i - 1][w];                                  // leave item i
                if (wt[i] <= w) dp[i][w] = Math.max(dp[i][w], dp[i - 1][w - wt[i]] + val[i]);   // or take it
            }
        }
        System.out.print("capacity:");
        for (int w = 0; w <= W; w++) System.out.printf("%4d", w);
        System.out.println();
        for (int i = 0; i <= n; i++) {
            System.out.print("item " + i + ":  ");
            for (int w = 0; w <= W; w++) System.out.printf("%4d", dp[i][w]);
            System.out.println();
        }
        for (int i = n, w = W; i > 0; i--) {     // walk back through the table to find the items taken
            if (dp[i][w] != dp[i - 1][w]) {
                System.out.println("Take item " + i + " (weight " + wt[i] + ", value " + val[i] + ")");
                w -= wt[i];
            }
        }
        System.out.println("Best value: " + dp[n][W]);
    }
}
`, IN.knap],
[G, 'N-Queens (backtracking)', String.raw`import java.util.Scanner;

public class Main {
    static int n, solutions = 0, placed = 0;
    static int[] col, first;

    static boolean safe(int row, int c) {    // no earlier queen in the same column or diagonal
        for (int r = 0; r < row; r++)
            if (col[r] == c || col[r] - c == r - row || col[r] - c == row - r) return false;
        return true;
    }

    static void solve(int row) {
        if (row == n) {
            if (solutions == 0) first = col.clone();
            solutions++;
            return;
        }
        for (int c = 0; c < n; c++) {
            if (safe(row, c)) {
                col[row] = c;
                placed++;
                solve(row + 1);              // then backtrack and try the next column
            }
        }
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        n = sc.nextInt();
        col = new int[n];
        solve(0);
        if (solutions > 0) {
            System.out.println("First solution:");
            for (int r = 0; r < n; r++) {
                StringBuilder sb = new StringBuilder();
                for (int c = 0; c < n; c++) sb.append(first[r] == c ? "Q " : ". ");
                System.out.println(sb);
            }
        }
        System.out.println("Solutions for " + n + " queens: " + solutions);
        System.out.println("Queens placed while searching: " + placed);
    }
}
`, IN.queens],
[G, 'Travelling salesman (brute force)', String.raw`import java.util.Scanner;

public class Main {
    static int n, best = -1, tours = 0;
    static int[][] d;
    static int[] tour, bestTour;
    static boolean[] used;

    static void explore(int k, int cost) {   // tour[0..k-1] is fixed; try every city for position k
        if (k == n) {
            int total = cost + d[tour[n - 1]][0];   // and back to the start
            tours++;
            StringBuilder sb = new StringBuilder("Tour");
            for (int c : tour) sb.append(" ").append(c);
            System.out.println(sb + " 0: cost " + total);
            if (best < 0 || total < best) {
                best = total;
                bestTour = tour.clone();
            }
            return;
        }
        for (int c = 1; c < n; c++) {
            if (!used[c]) {
                used[c] = true;
                tour[k] = c;
                explore(k + 1, cost + d[tour[k - 1]][c]);
                used[c] = false;
            }
        }
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        n = sc.nextInt();
        d = new int[n][n];
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) d[i][j] = sc.nextInt();
        tour = new int[n];
        used = new boolean[n];
        tour[0] = 0;                         // start at city 0
        explore(1, 0);
        StringBuilder sb = new StringBuilder("Best tour:");
        for (int c : bestTour) sb.append(" ").append(c);
        System.out.println(sb + " 0, cost " + best + " (" + tours + " tours checked)");
    }
}
`, IN.tsp],
[G, 'Minimax with alpha-beta', String.raw`import java.util.Scanner;

public class Main {
    static int[] leaf = new int[8];
    static int evaluated = 0;

    // a game tree of depth 3: the root (depth 0) is MAX, then MIN, then MAX; the 8 leaves are at depth 3
    static int alphabeta(int depth, int node, boolean isMax, int alpha, int beta) {
        if (depth == 3) {
            evaluated++;
            System.out.println("leaf " + node + " = " + leaf[node]);
            return leaf[node];
        }
        int best = isMax ? -1000000 : 1000000;
        for (int c = 0; c < 2; c++) {
            int v = alphabeta(depth + 1, node * 2 + c, !isMax, alpha, beta);
            if (isMax) {
                best = Math.max(best, v);
                alpha = Math.max(alpha, best);
            } else {
                best = Math.min(best, v);
                beta = Math.min(beta, best);
            }
            if (beta <= alpha && c == 0) {   // the other child cannot change the result
                System.out.println("prune: " + (isMax ? "MAX" : "MIN") + " node at depth " + depth + " skips its other child (alpha = " + alpha + ", beta = " + beta + ")");
                break;
            }
        }
        return best;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        for (int i = 0; i < 8; i++) leaf[i] = sc.nextInt();
        int value = alphabeta(0, 0, true, -1000000, 1000000);
        System.out.println("Minimax value: " + value);
        System.out.println("Leaves evaluated: " + evaluated + " of 8");
    }
}
`, IN.minimax]
]);

/* ======================= Python ======================= */
add('python', [
[S, 'Counting sort', String.raw`n = int(input())
a = list(map(int, input().split()))      # whole numbers from 0 upwards
mx = max(a)
c = [0] * (mx + 1)
for x in a:
    c[x] += 1
print(f"Counts C[0..{mx}]:", *c, end=" \n")
for v in range(1, mx + 1):
    c[v] += c[v - 1]                     # now c[v] = how many keys are <= v
print("Running totals:", *c, end=" \n")
out = [0] * n
for i in range(n - 1, -1, -1):           # right to left keeps equal keys in order (stable)
    c[a[i]] -= 1
    out[c[a[i]]] = a[i]
    print(f"Place {a[i]} at index {c[a[i]]}")
print("Sorted:", *out, end=" \n")
`, IN.counting],
[G, "Dijkstra's shortest paths", String.raw`import heapq

n, m = map(int, input().split())
adj = [[] for _ in range(n)]             # adj[u] = (v, weight)
for _ in range(m):
    u, v, w = map(int, input().split())
    adj[u].append((v, w))                # undirected, weights >= 0
    adj[v].append((u, w))
for lst in adj:
    lst.sort()                           # look at neighbours in increasing order
src = int(input())

INF = float("inf")
dist, prev, done = [INF] * n, [-1] * n, [False] * n
dist[src] = 0
heap = [(0, src)]                        # a min-heap of (distance, vertex)
while heap:
    d, u = heapq.heappop(heap)
    if done[u]:
        continue                         # an old entry
    done[u] = True
    print(f"Take {u} (distance {d})")
    for v, w in adj[u]:
        if not done[v] and d + w < dist[v]:   # relax the edge u-v
            dist[v] = d + w
            prev[v] = u
            heapq.heappush(heap, (dist[v], v))
            print(f"   update {v}: distance {dist[v]} via {u}")
for v in range(n):
    if dist[v] == INF:
        print(f"{v}: no path")
        continue
    path, x = [], v
    while x != -1:
        path.append(x)
        x = prev[x]
    print(f"{v}: distance {dist[v]}, path", *reversed(path))
`, IN.dijkstra],
[G, "Kruskal's minimum spanning tree", String.raw`n, m = map(int, input().split())
edges = []
for _ in range(m):
    u, v, w = map(int, input().split())
    edges.append((w, u, v))
edges.sort()                             # lightest edge first

parent = list(range(n))                  # every vertex is its own tree


def root(x):                             # the root of x's tree (union-find), shortening the path
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


total = taken = 0
for w, u, v in edges:
    if taken == n - 1:
        break
    ru, rv = root(u), root(v)
    if ru == rv:
        print(f"Edge {u}-{v} weight {w}: skip (would make a cycle)")
    else:
        parent[ru] = rv                  # join the two trees
        total += w
        taken += 1
        print(f"Edge {u}-{v} weight {w}: take")
print(f"Total weight of the minimum spanning tree: {total} ({taken} edges)")
`, IN.kruskal],
[G, 'KMP string matching', String.raw`t = input().strip()                      # text
p = input().strip()                      # pattern
n, m = len(t), len(p)
# pi[q] = length of the longest proper prefix of p[0..q] that is also a suffix of it
pi = [0] * m
k = 0
for q in range(1, m):
    while k > 0 and p[k] != p[q]:
        k = pi[k - 1]
    if p[k] == p[q]:
        k += 1
    pi[q] = k
print("Prefix table:", *pi, end=" \n")
found = j = 0                            # j = how many pattern characters match so far
for i in range(n):
    while j > 0 and t[i] != p[j]:
        print(f"text[{i}] = {t[i]}, pattern[{j}] = {p[j]}: mismatch, fall back to {pi[j - 1]}")
        j = pi[j - 1]
    if t[i] == p[j]:
        j += 1
    if j == m:
        print("Match at index", i - m + 1)
        found += 1
        j = pi[j - 1]
print(found, "match" if found == 1 else "matches")
`, IN.kmp],
[G, 'Prefix sums and range queries', String.raw`from itertools import accumulate

n = int(input())
a = list(map(int, input().split()))
P = [0] + list(accumulate(a))            # P[i] = sum of the first i numbers
print("P:", *P, end=" \n")
q = int(input())
for _ in range(q):
    l, r = map(int, input().split())     # the sum of a[l..r] in O(1)
    print(f"sum({l}..{r}) = P[{r + 1}] - P[{l}] = {P[r + 1] - P[l]}")
`, IN.prefix],
[G, '0/1 knapsack (DP table)', String.raw`n, W = map(int, input().split())         # items, capacity
wt, val = [0], [0]
for _ in range(n):
    w, v = map(int, input().split())
    wt.append(w)
    val.append(v)
# dp[i][w] = the best value using the first i items with capacity w
dp = [[0] * (W + 1) for _ in range(n + 1)]
for i in range(1, n + 1):
    for w in range(W + 1):
        dp[i][w] = dp[i - 1][w]                                   # leave item i
        if wt[i] <= w:
            dp[i][w] = max(dp[i][w], dp[i - 1][w - wt[i]] + val[i])   # or take it
print("capacity:" + "".join(f"{w:4d}" for w in range(W + 1)))
for i in range(n + 1):
    print(f"item {i}:  " + "".join(f"{x:4d}" for x in dp[i]))
w = W
for i in range(n, 0, -1):                # walk back through the table to find the items taken
    if dp[i][w] != dp[i - 1][w]:
        print(f"Take item {i} (weight {wt[i]}, value {val[i]})")
        w -= wt[i]
print("Best value:", dp[n][W])
`, IN.knap],
[G, 'N-Queens (backtracking)', String.raw`n = int(input())
col = [0] * n
first = None
solutions = placed = 0


def safe(row, c):                        # no earlier queen in the same column or diagonal
    return all(col[r] != c and abs(col[r] - c) != row - r for r in range(row))


def solve(row):
    global solutions, placed, first
    if row == n:
        if solutions == 0:
            first = col[:]
        solutions += 1
        return
    for c in range(n):
        if safe(row, c):
            col[row] = c
            placed += 1
            solve(row + 1)               # then backtrack and try the next column


solve(0)
if solutions > 0:
    print("First solution:")
    for r in range(n):
        print("".join("Q " if first[r] == c else ". " for c in range(n)))
print(f"Solutions for {n} queens: {solutions}")
print(f"Queens placed while searching: {placed}")
`, IN.queens],
[G, 'Travelling salesman (brute force)', String.raw`from itertools import permutations

n = int(input())
d = [list(map(int, input().split())) for _ in range(n)]
best, best_tour, tours = None, None, 0
# start at city 0 and try every order of the others (permutations come in order)
for rest in permutations(range(1, n)):
    tour = (0,) + rest
    cost = sum(d[tour[i]][tour[i + 1]] for i in range(n - 1)) + d[tour[-1]][0]   # and back to the start
    tours += 1
    print("Tour", *tour, f"0: cost {cost}")
    if best is None or cost < best:
        best, best_tour = cost, tour
print("Best tour:", *best_tour, f"0, cost {best} ({tours} tours checked)")
`, IN.tsp],
[G, 'Minimax with alpha-beta', String.raw`leaf = list(map(int, input().split()))
evaluated = 0


# a game tree of depth 3: the root (depth 0) is MAX, then MIN, then MAX; the 8 leaves are at depth 3
def alphabeta(depth, node, is_max, alpha, beta):
    global evaluated
    if depth == 3:
        evaluated += 1
        print(f"leaf {node} = {leaf[node]}")
        return leaf[node]
    best = -1000000 if is_max else 1000000
    for c in range(2):
        v = alphabeta(depth + 1, node * 2 + c, not is_max, alpha, beta)
        if is_max:
            best = max(best, v)
            alpha = max(alpha, best)
        else:
            best = min(best, v)
            beta = min(beta, best)
        if beta <= alpha and c == 0:     # the other child cannot change the result
            print(f"prune: {'MAX' if is_max else 'MIN'} node at depth {depth} skips its other child (alpha = {alpha}, beta = {beta})")
            break
    return best


value = alphabeta(0, 0, True, -1000000, 1000000)
print("Minimax value:", value)
print("Leaves evaluated:", evaluated, "of 8")
`, IN.minimax]
]);

// which animated simulation (folder in sims/) goes with which example
window.EXAMPLE_SIMS = {
  'Bubble sort': 'bubble-sort', 'Insertion sort': 'insertion-sort', 'Merge sort': 'merge-sort', 'Quick sort': 'quick-sort',
  'Counting sort': 'counting-sort', 'BFS and DFS on a graph': 'search', "Dijkstra's shortest paths": 'shortest-path',
  "Kruskal's minimum spanning tree": 'mst', 'KMP string matching': 'string-matching', 'Prefix sums and range queries': 'prefix-sum',
  'Fibonacci series': 'dynamic-programming', '0/1 knapsack (DP table)': 'dynamic-programming', 'N-Queens (backtracking)': 'n-queens',
  'Travelling salesman (brute force)': 'tsp', 'Minimax with alpha-beta': 'game-theory'
};
})();
