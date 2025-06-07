from PIL import Image, ImageOps
import numpy as np
import os


def run_test(image_path, out_dir="screenshots"):
    """Generate a simple contrast heatmap from a screenshot."""
    img = Image.open(image_path).convert("L")
    arr = np.array(img, dtype=float)
    norm = (arr - arr.min()) / max(arr.max() - arr.min(), 1)
    heat = Image.fromarray(np.uint8(norm * 255))
    heatmap = ImageOps.colorize(heat, "blue", "red")
    out_path = os.path.join(out_dir, os.path.basename(image_path).replace(".png", "_heatmap.png"))
    heatmap.save(out_path)
    return out_path
