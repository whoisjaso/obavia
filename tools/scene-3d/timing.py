"""Pure timing for the four moments (no bpy): 24 frames at 60 fps, 400 ms.
Frame 23 is always the still."""
import math


def ease_out(u, p=3):
    u = min(max(u, 0.0), 1.0)
    return 1.0 - (1.0 - u) ** p


def ease_in(u, p=2):
    u = min(max(u, 0.0), 1.0)
    return u ** p


def puff_params(frame):
    """7: the cloud under the hammer. Rest until contact (frame 6), compress to
    frame 9, then the puff swells, loosens and throws its wisps out, and
    freezes (ease out: frames 18 to 23 barely move)."""
    if frame < 6:
        return dict(sy=1.0, sxy=1.0, dens=1.0, loose=0.0, wisp=0.0, wdrift=0.0)
    c = ease_out((frame - 5) / 4.0, 2) if frame <= 9 else 1.0 - 0.7 * ease_out((frame - 9) / 10.0, 3)
    u = ease_out((frame - 7) / 16.0, 3) if frame >= 7 else 0.0
    return dict(sy=1.0 - 0.10 * c, sxy=1.0 + 0.06 * u, dens=1.0 + 0.12 * c, loose=0.5 * u, wisp=0.8 * u, wdrift=0.22 * u)


# the hammer's cloud: the cloud rig's button domain at a coarser voxel
HAMMER_CLOUD = dict(lo=(-2.4, -1.1, -0.66), hi=(2.4, 1.1, 1.25), vox=0.02, seed=2611, base=-0.44)
