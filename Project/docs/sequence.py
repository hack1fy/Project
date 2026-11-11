import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
plt.rcParams["font.family"] = "Liberation Serif"

fig, ax = plt.subplots(figsize=(11, 8.2))
ax.set_xlim(0, 11); ax.set_ylim(0, 8.2); ax.axis("off")
P = {"Faculty\n(Dr. Khan)": 1.1, "Web UI /\nHttpServer": 3.9, "Booking\nService": 6.7, "Repository": 9.6}
names = list(P)
for n, x in P.items():
    ax.add_patch(Rectangle((x - 0.9, 7.35), 1.8, 0.7, fc="#eef3fb", ec="black", lw=1.2))
    ax.text(x, 7.7, n, ha="center", va="center", fontsize=11, weight="bold")
    ax.plot([x, x], [0.3, 7.35], color="gray", ls="--", lw=1)

def msg(a, b, y, text, ret=False):
    xa, xb = P[names[a]], P[names[b]]
    ax.annotate("", xy=(xb, y), xytext=(xa, y),
                arrowprops=dict(arrowstyle="->", lw=1.3, ls="--" if ret else "-"))
    ax.text((xa + xb) / 2, y + 0.1, text, ha="center", fontsize=10)

def selfmsg(a, y, text):
    x = P[names[a]]
    ax.plot([x, x + 0.7, x + 0.7, x + 0.02], [y, y, y - 0.35, y - 0.35], "k", lw=1.3)
    ax.annotate("", xy=(x + 0.02, y - 0.35), xytext=(x + 0.3, y - 0.35), arrowprops=dict(arrowstyle="->", lw=1.3))
    ax.text(x + 0.8, y - 0.18, text, fontsize=10, va="center")

msg(0, 1, 6.9, "1. POST /api/bookings {u3, LAB-A, day, 10-13}")
msg(1, 2, 6.4, "2. createBooking(request)")
selfmsg(2, 5.95, "3. validate user, lab, date,\n    hours, role limits")
msg(2, 3, 5.2, "4. find CONFIRMED bookings\n    overlapping 10-13")
msg(3, 2, 4.7, "5. [booking #1 by Student]", ret=True)
selfmsg(2, 4.35, "6. priority check:\n    FACULTY(2) > STUDENT(1)")
msg(2, 3, 3.45, "7. mark #1 BUMPED; addNotification(Student)")
msg(2, 3, 2.95, "8. addBooking(confirmed) and save()")
msg(3, 2, 2.45, "9. new booking #2", ret=True)
msg(2, 1, 1.95, "10. {booking, bumped: [1]}", ret=True)
msg(1, 0, 1.45, "11. 201 Created", ret=True)

ax.add_patch(Rectangle((0.2, 0.25), 10.6, 0.55, fc="#fff6d6", ec="black", lw=1))
ax.text(5.5, 0.52, "Alternative at step 6: if any overlapping booking has equal or higher priority, "
        "the service throws CONFLICT and the server returns 409 (nothing is changed).",
        ha="center", va="center", fontsize=10)
plt.tight_layout()
plt.savefig("sequence.png", dpi=170)
