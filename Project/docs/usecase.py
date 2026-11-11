import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, Rectangle, Circle, FancyArrowPatch
plt.rcParams["font.family"] = "Liberation Serif"

fig, ax = plt.subplots(figsize=(10.5, 8))
ax.set_xlim(0, 10.5); ax.set_ylim(-0.4, 7.6); ax.axis("off")
ax.add_patch(Rectangle((3.3, -0.2), 6.9, 7.6, fill=False, lw=1.6))
ax.text(6.75, 7.1, "LabSlot System", ha="center", fontsize=14, weight="bold")

X, W, H = 5.9, 3.0, 0.72
rows = {"view": 6.4, "book": 5.4, "rules": 4.4, "cancel": 3.4, "cancelany": 2.4, "bump": 1.4, "notif": 0.4}
labels = {"view": "View availability", "book": "Book lab slot", "rules": "Validate rules\n(hours, limits, overlap)",
          "cancel": "Cancel own booking", "cancelany": "Cancel any booking",
          "bump": "Override (bump) lower-\npriority booking", "notif": "Receive bump notification"}
for k, y in rows.items():
    ax.add_patch(Ellipse((X, y), W, H, fc="#eef3fb", ec="black", lw=1.2))
    ax.text(X, y, labels[k], ha="center", va="center", fontsize=11)

def actor(x, y, name):
    ax.add_patch(Circle((x, y + 0.55), 0.17, fc="white", ec="black", lw=1.3))
    ax.plot([x, x], [y + 0.38, y - 0.15], "k", lw=1.3)
    ax.plot([x - 0.3, x + 0.3], [y + 0.25, y + 0.25], "k", lw=1.3)
    ax.plot([x, x - 0.25], [y - 0.15, y - 0.65], "k", lw=1.3)
    ax.plot([x, x + 0.25], [y - 0.15, y - 0.65], "k", lw=1.3)
    ax.text(x, y - 0.95, name, ha="center", fontsize=12, weight="bold")
    return (x + 0.3, y + 0.1)

A = {"Student": actor(1.3, 5.0, "Student"), "Faculty": actor(1.3, 3.0, "Faculty"), "Admin": actor(1.3, 1.0, "Lab Admin")}
links = {"Student": ["view", "book", "cancel", "notif"],
         "Faculty": ["view", "book", "cancel", "bump"],
         "Admin": ["view", "book", "cancelany", "bump"]}
for who, ts in links.items():
    for t in ts:
        ax.plot([A[who][0], X - W / 2], [A[who][1], rows[t]], color="black", lw=1.0)

def rel(src, dst, label, rad, dx):
    a = (X + W / 2 - 0.12, rows[src] if src != dst else rows[src])
    b = (X + W / 2 - 0.12, rows[dst])
    ax.add_patch(FancyArrowPatch(a, b, connectionstyle=f"arc3,rad={rad}", arrowstyle="->", mutation_scale=14,
                                 ls="--", lw=1.1, color="black"))
    ax.text(X + W / 2 + dx, (a[1] + b[1]) / 2, label, fontsize=10, style="italic", va="center", ha="left")

rel("book", "rules", "«include»", -0.5, 0.12)        # Book includes Validate
rel("bump", "book", "«extend»", 0.55, 0.62)           # Override extends Book
rel("bump", "notif", "«include»", -0.5, 0.12)         # Override includes Notification
rel("cancelany", "cancel", "«extend»", 0.5, 0.1)      # Cancel any extends Cancel own
plt.tight_layout()
plt.savefig("usecase.png", dpi=170)
