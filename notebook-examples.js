// Example notebooks for the Playground notebook. Each is a list of [cell type, source] pairs.
window.NB_EXAMPLES = [
{ title: 'Welcome: how the notebook works', cells: [
['md', String.raw`# Welcome to the notebook
A notebook is made of **cells**. Run a cell with **Shift + Enter**: its output appears right below it, and the variables it creates stay available to every cell after it.

- Text cells like this one use Markdown. Double-click to edit, Shift + Enter to show it again.
- The number in brackets, like **[3]**, tells the order in which cells ran.
- If a cell's last line is a value, the value is shown. End the line with a semicolon to hide it.`],
['code', String.raw`name = "Mazhar"
year = 2026
print("Hello,", name)
year + 1`],
['code', String.raw`# variables from the cell above are still here
f"{name} has {len(name)} letters; next year is {year + 1}"`],
['md', String.raw`## Libraries
Import a library and it is loaded the first time (it takes a few seconds once).
numpy, pandas, scipy, scikit-learn, matplotlib and seaborn are all available.`],
['code', String.raw`import numpy as np
a = np.arange(1, 11)
a, a.mean(), a ** 2`]
]},

{ title: 'NumPy: arrays and vectorised maths', cells: [
['md', String.raw`# NumPy basics
NumPy stores numbers in arrays and does maths on whole arrays at once, which is much faster than a Python loop.`],
['code', String.raw`import numpy as np

x = np.array([3, 1, 4, 1, 5, 9, 2, 6])
print("shape:", x.shape, " dtype:", x.dtype)
print("sum:", x.sum(), " mean:", x.mean(), " max at index:", x.argmax())
print("sorted:", np.sort(x))
print("even numbers:", x[x % 2 == 0])`],
['code', String.raw`# 2-D arrays (matrices)
A = np.array([[2, 1], [1, 3]])
b = np.array([3, 5])
print("A @ A =\n", A @ A)
print("solve A x = b:", np.linalg.solve(A, b))
print("eigenvalues:", np.linalg.eigvals(A))`],
['code', String.raw`# broadcasting: a column minus a row gives a whole table
col = np.arange(1, 6).reshape(-1, 1)
row = np.arange(1, 6)
col * row          # the 5 x 5 multiplication table`],
['code', String.raw`# random numbers and simple statistics
rng = np.random.default_rng(42)
marks = rng.normal(65, 12, size=1000).clip(0, 100)
print(f"mean {marks.mean():.1f}, std {marks.std():.1f}, median {np.median(marks):.1f}")
print("students with 80 or more:", (marks >= 80).sum())`]
]},

{ title: 'pandas: explore a dataset', cells: [
['md', String.raw`# Exploring data with pandas
We use the classic **iris** dataset: 150 flowers, 4 measurements each, 3 species.`],
['code', String.raw`import pandas as pd
from sklearn.datasets import load_iris

iris = load_iris(as_frame=True)
df = iris.frame
df["species"] = iris.target_names[iris.target]
df.head()`],
['code', String.raw`df.describe()`],
['code', String.raw`df["species"].value_counts()`],
['code', String.raw`# average measurements of each species
df.groupby("species").mean(numeric_only=True).round(2)`],
['code', String.raw`# filter rows and add a column
df["petal area"] = df["petal length (cm)"] * df["petal width (cm)"]
df[df["petal area"] > 12].sort_values("petal area", ascending=False).head(8)`],
['md', String.raw`### Your own data
Use **Files** in the toolbar to add a CSV file, then read it with **pd.read_csv("name.csv")**.`]
]},

{ title: 'Plotting with matplotlib and seaborn', cells: [
['code', String.raw`import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0, 2 * np.pi, 200)
plt.plot(x, np.sin(x), label="sin x")
plt.plot(x, np.cos(x), label="cos x", linestyle="--")
plt.title("Sine and cosine")
plt.xlabel("x"); plt.ylabel("y"); plt.legend(); plt.grid(alpha=.3)
plt.show()`],
['code', String.raw`rng = np.random.default_rng(0)
fig, ax = plt.subplots(1, 3, figsize=(12, 3.5))
ax[0].hist(rng.normal(size=2000), bins=40, color="tab:blue")
ax[0].set_title("Histogram")
ax[1].scatter(rng.random(100), rng.random(100), c=rng.random(100), cmap="viridis")
ax[1].set_title("Scatter")
ax[2].bar(["C", "C++", "Java", "Python"], [18, 25, 21, 36], color="tab:orange")
ax[2].set_title("Bar chart")
plt.tight_layout()
plt.show()`],
['code', String.raw`import seaborn as sns
from sklearn.datasets import load_iris

iris = load_iris(as_frame=True)
df = iris.frame
df["species"] = iris.target_names[iris.target]
sns.pairplot(df, hue="species", height=1.8)
plt.show()`]
]},

{ title: 'Linear regression', cells: [
['md', String.raw`# Linear regression
Fit a straight line **y = w·x + b** to noisy data, first with the formula, then with scikit-learn.`],
['code', String.raw`import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(1)
x = rng.uniform(0, 10, 60)
y = 3.2 * x + 4 + rng.normal(0, 3, 60)     # true w = 3.2, b = 4

# least squares by hand
w = ((x - x.mean()) * (y - y.mean())).sum() / ((x - x.mean()) ** 2).sum()
b = y.mean() - w * x.mean()
print(f"by hand:  w = {w:.3f}, b = {b:.3f}")`],
['code', String.raw`from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

model = LinearRegression().fit(x.reshape(-1, 1), y)
pred = model.predict(x.reshape(-1, 1))
print(f"sklearn:  w = {model.coef_[0]:.3f}, b = {model.intercept_:.3f}")
print(f"MSE = {mean_squared_error(y, pred):.2f},  R² = {r2_score(y, pred):.3f}")

plt.scatter(x, y, label="data")
xs = np.linspace(0, 10, 2)
plt.plot(xs, model.predict(xs.reshape(-1, 1)), color="tab:red", label="fitted line")
plt.legend(); plt.title("Linear regression"); plt.show()`],
['code', String.raw`# gradient descent: how a model "learns" the same answer step by step
w, b, lr = 0.0, 0.0, 0.01
losses = []
for step in range(2000):
    err = (w * x + b) - y
    losses.append((err ** 2).mean())
    w -= lr * 2 * (err * x).mean()
    b -= lr * 2 * err.mean()
print(f"gradient descent: w = {w:.3f}, b = {b:.3f}")
plt.plot(losses); plt.yscale("log"); plt.xlabel("step"); plt.ylabel("loss (MSE)"); plt.title("Training loss"); plt.show()`]
]},

{ title: 'Classification: iris with scikit-learn', cells: [
['code', String.raw`from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=0, stratify=y)
print("training rows:", len(X_train), " test rows:", len(X_test))`],
['code', String.raw`from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC

models = {
    "k-nearest neighbours": KNeighborsClassifier(5),
    "decision tree": DecisionTreeClassifier(max_depth=3, random_state=0),
    "logistic regression": LogisticRegression(max_iter=500),
    "support vector machine": SVC(),
}
for name, m in models.items():
    m.fit(X_train, y_train)
    print(f"{name:24s} accuracy = {m.score(X_test, y_test):.3f}")`],
['code', String.raw`from sklearn.metrics import ConfusionMatrixDisplay, classification_report
import matplotlib.pyplot as plt

best = models["logistic regression"]
print(classification_report(y_test, best.predict(X_test), target_names=load_iris().target_names))
ConfusionMatrixDisplay.from_estimator(best, X_test, y_test, display_labels=load_iris().target_names, cmap="Blues")
plt.show()`],
['code', String.raw`from sklearn.model_selection import cross_val_score
scores = cross_val_score(DecisionTreeClassifier(max_depth=3, random_state=0), X, y, cv=5)
print("5-fold cross-validation:", scores.round(3), " mean:", scores.mean().round(3))`]
]},

{ title: 'Clustering: k-means', cells: [
['code', String.raw`import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_blobs
from sklearn.cluster import KMeans

X, _ = make_blobs(n_samples=400, centers=4, cluster_std=1.0, random_state=7)
plt.scatter(X[:, 0], X[:, 1], s=12); plt.title("Unlabelled points"); plt.show()`],
['code', String.raw`# the elbow method: inertia for k = 1 … 8
ks = range(1, 9)
inertia = [KMeans(k, n_init=10, random_state=0).fit(X).inertia_ for k in ks]
plt.plot(ks, inertia, marker="o"); plt.xlabel("k"); plt.ylabel("inertia"); plt.title("Elbow method"); plt.show()`],
['code', String.raw`km = KMeans(4, n_init=10, random_state=0).fit(X)
plt.scatter(X[:, 0], X[:, 1], c=km.labels_, s=12, cmap="tab10")
plt.scatter(*km.cluster_centers_.T, marker="X", s=200, c="black")
plt.title("k-means with k = 4"); plt.show()`]
]},

{ title: 'Neural network from scratch (NumPy)', cells: [
['md', String.raw`# A neural network from scratch
A network with one hidden layer, trained with **backpropagation** and gradient descent, written only with NumPy.
It learns to separate two interleaving half-moons, which a straight line cannot do.`],
['code', String.raw`import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_moons

X, y = make_moons(n_samples=400, noise=0.2, random_state=0)
y = y.reshape(-1, 1)
plt.scatter(X[:, 0], X[:, 1], c=y.ravel(), cmap="coolwarm", s=12); plt.title("Two moons"); plt.show()`],
['code', String.raw`rng = np.random.default_rng(0)
H = 16                                        # hidden neurons
W1 = rng.normal(0, 1, (2, H)); b1 = np.zeros(H)
W2 = rng.normal(0, 1, (H, 1)); b2 = np.zeros(1)
sigmoid = lambda z: 1 / (1 + np.exp(-z))

lr, losses = 0.5, []
for epoch in range(3000):
    # forward pass
    h = np.tanh(X @ W1 + b1)
    p = sigmoid(h @ W2 + b2)
    loss = -np.mean(y * np.log(p + 1e-9) + (1 - y) * np.log(1 - p + 1e-9))
    losses.append(loss)
    # backward pass (chain rule)
    dz2 = (p - y) / len(X)
    dW2 = h.T @ dz2;  db2 = dz2.sum(0)
    dh = dz2 @ W2.T * (1 - h ** 2)
    dW1 = X.T @ dh;   db1 = dh.sum(0)
    # update
    W1 -= lr * dW1; b1 -= lr * db1; W2 -= lr * dW2; b2 -= lr * db2
    if epoch % 500 == 0:
        print(f"epoch {epoch:4d}  loss {loss:.4f}")

acc = ((p > 0.5) == y).mean()
print(f"training accuracy: {acc:.3f}")`],
['code', String.raw`fig, ax = plt.subplots(1, 2, figsize=(11, 4))
ax[0].plot(losses); ax[0].set_title("Loss while training"); ax[0].set_xlabel("epoch")
xx, yy = np.meshgrid(np.linspace(-2, 3, 200), np.linspace(-1.5, 2, 200))
grid = np.c_[xx.ravel(), yy.ravel()]
zz = sigmoid(np.tanh(grid @ W1 + b1) @ W2 + b2).reshape(xx.shape)
ax[1].contourf(xx, yy, zz, levels=20, cmap="coolwarm", alpha=.6)
ax[1].scatter(X[:, 0], X[:, 1], c=y.ravel(), cmap="coolwarm", s=10, edgecolors="k", linewidths=.3)
ax[1].set_title("What the network learned")
plt.show()`]
]},

{ title: 'Neural network: handwritten digits', cells: [
['md', String.raw`# Recognising handwritten digits
1,797 images of digits (8 × 8 pixels). A multi-layer perceptron (a small deep-learning model) learns to read them.`],
['code', String.raw`import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits

digits = load_digits()
fig, ax = plt.subplots(2, 8, figsize=(10, 3))
for a, img, label in zip(ax.ravel(), digits.images, digits.target):
    a.imshow(img, cmap="gray_r"); a.set_title(label); a.axis("off")
plt.show()`],
['code', String.raw`from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier

X_train, X_test, y_train, y_test = train_test_split(digits.data, digits.target, test_size=0.25, random_state=0)
scaler = StandardScaler().fit(X_train)
net = MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=300, random_state=0)
net.fit(scaler.transform(X_train), y_train)
print(f"test accuracy: {net.score(scaler.transform(X_test), y_test):.3f}")
plt.plot(net.loss_curve_); plt.xlabel("iteration"); plt.ylabel("loss"); plt.title("Training loss"); plt.show()`],
['code', String.raw`from sklearn.metrics import ConfusionMatrixDisplay
pred = net.predict(scaler.transform(X_test))
ConfusionMatrixDisplay.from_predictions(y_test, pred, cmap="Blues"); plt.show()

wrong = np.where(pred != y_test)[0][:8]
fig, ax = plt.subplots(1, len(wrong), figsize=(10, 2))
for a, i in zip(np.atleast_1d(ax), wrong):
    a.imshow(X_test[i].reshape(8, 8), cmap="gray_r"); a.set_title(f"{y_test[i]}→{pred[i]}", color="tab:red"); a.axis("off")
plt.suptitle("Mistakes (true → predicted)"); plt.show()`],
['code', String.raw`# PCA: squeeze 64 pixels into 2 numbers and look at the digits as points
from sklearn.decomposition import PCA
P = PCA(2).fit_transform(digits.data)
plt.figure(figsize=(6, 5))
plt.scatter(P[:, 0], P[:, 1], c=digits.target, cmap="tab10", s=8)
plt.colorbar(label="digit"); plt.title("Digits after PCA"); plt.show()`]
]}
];
