"""
院方 DICOM（右膝 MR）→ Web 题库素材
====================================
产出（默认写进 apps/admin/public/data/imaging-samples/KNEE-001/）：
  <key>-NNN.bin.gz    逐层 **16-bit 有符号小端原始像素**（body bbox 裁剪后），gzip 压缩
  _series.json        序列索引：尺寸 / 窗宽窗位 / PixelSpacing / 层厚 / 方位 / 裁剪框 / 帧数
  _review.png         复核用层组合图（人工核对图像与描述是否对得上，不进题库）
  thumb-<key>.jpg     序列栏缩略图（中间层，按自带窗渲染）

为什么导 16-bit 原始像素而不是 JPEG：
  浏览器端解 JPEG-Lossless 要 WASM 解码器；导原始像素后**窗宽窗位与测量都在 canvas 里算**，
  又轻又准，测量还能直接用 PixelSpacing 出毫米值。

用法：
  uv run --python 3.12 --with pydicom --with numpy --with pillow --with pylibjpeg --with pylibjpeg-libjpeg \
      python scripts/ingest-knee-dicom.py --src <DICOM 目录> --out <输出目录> --sample KNEE-001
"""
import os, re, json, gzip, argparse
import numpy as np
import pydicom
from PIL import Image, ImageDraw

# 序列英文/中文标签（按 SeriesDescription 归类）
LABELS = [
    ("loc",        "定位像",     "Scout"),
    ("pd_fs_sag",  "矢状位 PD 脂肪抑制", "Sag PD FS"),
    ("pd_cor",     "冠状位 PD",  "Cor PD"),
    ("pd_ax",      "轴位 PD",    "Ax PD"),
    ("t2_sag",     "矢状位 T2",  "Sag T2"),
    ("t1_cor",     "冠状位 T1",  "Cor T1"),
    ("t2_cor",     "冠状位 T2",  "Cor T2"),
    ("t1_sag",     "矢状位 T1",  "Sag T1"),
    ("t2_ax",      "轴位 T2",    "Ax T2"),
    ("pd_sag",     "矢状位 PD",  "Sag PD"),
]


def label_of(desc):
    s = (desc or "").lower()
    ori = "ax" if ("ax" in s or "tra" in s) else "cor" if ("cor" in s) else "sag" if ("sag" in s) else "ax"
    w = "t1" if "t1" in s else "t2" if re.search(r"t2", s) else "pd"
    fs = "fs" if re.search(r"(^|[^a-z])fs([^a-z]|$)|fat", s) else ""
    key = "_".join([x for x in [w, ori, fs] if x])
    for k, cn, en in LABELS:
        if k == key:
            return key, cn, en
    name = f"{ {'ax': '轴位', 'cor': '冠状位', 'sag': '矢状位'}[ori] } {w.upper()}" + (" 脂肪抑制" if fs else "")
    return key, name, f"{ {'ax': 'Ax', 'cor': 'Cor', 'sag': 'Sag'}[ori] } {w.upper()}" + (" FS" if fs else "")


def is_scout(desc):
    s = (desc or "").lower()
    return "loc" in s or "scout" in s or "survey" in s


def pixels(ds):
    a = ds.pixel_array.astype(np.float32)
    slope = float(getattr(ds, "RescaleSlope", 1) or 1)
    inter = float(getattr(ds, "RescaleIntercept", 0) or 0)
    if slope != 1 or inter != 0:
        a = a * slope + inter
    return a


def window_of(ds):
    wc = ds.WindowCenter
    ww = ds.WindowWidth
    wc = float(wc[0] if isinstance(wc, (list, pydicom.multival.MultiValue)) else wc)
    ww = float(ww[0] if isinstance(ww, (list, pydicom.multival.MultiValue)) else ww)
    return ww, wc


def to8(a, ww, wc, p_lo=0.5, p_hi=99.5):
    lo, hi = wc - ww / 2, wc + ww / 2
    img = np.clip((a - lo) / max(1e-6, hi - lo), 0, 1)
    return (img * 255).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--sample", default="KNEE-001")
    ap.add_argument("--margin", type=int, default=12, help="裁剪外扩像素")
    a = ap.parse_args()

    os.makedirs(a.out, exist_ok=True)
    series_meta = []
    review_tiles = []

    dirs = sorted(d for d in os.listdir(a.src) if os.path.isdir(os.path.join(a.src, d)))
    for si, sd in enumerate(dirs):
        files = sorted(f for f in os.listdir(os.path.join(a.src, sd)) if f.lower().endswith(".dcm"))
        if not files:
            continue
        datasets = []
        for fn in files:
            ds = pydicom.dcmread(os.path.join(a.src, sd, fn))
            # 按层位置排序（ImagePositionPatient 的 z / InstanceNumber）
            try:
                z = float(ds.ImagePositionPatient[2])
            except Exception:
                z = float(getattr(ds, "InstanceNumber", 0) or 0)
            datasets.append((z, ds))
        datasets.sort(key=lambda t: t[0])

        desc = str(getattr(datasets[0][1], "SeriesDescription", "") or "")
        scout = is_scout(desc)
        key, cn, en = ("scout", "定位像", "Scout") if scout else label_of(desc)
        key = f"{key}" if key not in [s["key"] for s in series_meta] else f"{key}{si}"

        # 序列级统一裁剪框（整段对齐，逐层同框）
        thr = None
        boxes = []
        for _, ds in datasets:
            arr = pixels(ds)
            if thr is None:
                thr = max(1.0, float(np.percentile(arr, 99)) * 0.06)
            ys, xs = np.where(arr > thr)
            if len(ys):
                boxes.append((xs.min(), ys.min(), xs.max(), ys.max()))
        x0 = max(0, min(b[0] for b in boxes) - a.margin)
        y0 = max(0, min(b[1] for b in boxes) - a.margin)
        x1 = min(datasets[0][1].Columns - 1, max(b[2] for b in boxes) + a.margin)
        y1 = min(datasets[0][1].Rows - 1, max(b[3] for b in boxes) + a.margin)
        cw, ch = int(x1 - x0 + 1), int(y1 - y0 + 1)
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)

        ww, wc = window_of(datasets[0][1])
        ps = [float(v) for v in getattr(datasets[0][1], "PixelSpacing", [1, 1])]
        raw_name = f"{key}-%03d.bin.gz"
        for i, (_, ds) in enumerate(datasets):
            arr = pixels(ds)[y0:y0 + ch, x0:x0 + cw]
            i16 = np.clip(np.round(arr), -32768, 32767).astype("<i2")
            with gzip.open(os.path.join(a.out, raw_name % (i + 1)), "wb", compresslevel=6) as f:
                f.write(i16.tobytes())

        # 缩略图（中间层，按自带窗）
        mid = datasets[len(datasets) // 2][1]
        th = Image.fromarray(to8(pixels(mid)[y0:y0 + ch, x0:x0 + cw], *window_of(mid)))
        th.thumbnail((160, 160))
        th.save(os.path.join(a.out, f"thumb-{key}.jpg"), quality=82)

        series_meta.append(dict(
            key=key, name=cn, en=en,
            frames=len(datasets), width=cw, height=ch,
            ww=round(ww, 1), wl=round(wc, 1),
            pixelSpacing=[round(ps[0], 5), round(ps[1], 5)],
            sliceThickness=float(getattr(datasets[0][1], "SliceThickness", 0) or 0),
            orientation=[float(v) for v in getattr(datasets[0][1], "ImageOrientationPatient", [1, 0, 0, 0, 1, 0])],
            crop=[int(x0), int(y0)], raw=raw_name,
            description=desc,
        ))
        print(f"{key:<12}{cn:<18}{len(datasets):>3} 帧  {cw}x{ch}  WW/WL {ww:.0f}/{wc:.0f}  {ps[0]}mm  ({desc})")

        # 复核用：中间层 + 自带窗 vs 自动拉伸
        for label, im in (("自带窗", to8(pixels(mid)[y0:y0 + ch, x0:x0 + cw], *window_of(mid))),
                          ("自动", to8(pixels(mid)[y0:y0 + ch, x0:x0 + cw], *window_of(mid)))):
            pass
        tile = Image.new("L", (ch and 300, 300), 0)
        im1 = Image.fromarray(to8(pixels(mid)[y0:y0 + ch, x0:x0 + cw], *window_of(mid))).resize((300, 300))
        arr = pixels(mid)[y0:y0 + ch, x0:x0 + cw]
        p1, p99 = np.percentile(arr, 1), np.percentile(arr, 99)
        im2 = Image.fromarray((np.clip((arr - p1) / max(1e-6, p99 - p1), 0, 1) * 255).astype(np.uint8)).resize((300, 300))
        tile = Image.new("L", (608, 300), 0)
        tile.paste(im1, (0, 0)); tile.paste(im2, (308, 0))
        review_tiles.append((tile, f"{key} {cn} WW/WL {ww:.0f}/{wc:.0f}"))

    with open(os.path.join(a.out, "_series.json"), "w", encoding="utf-8") as f:
        json.dump(dict(sample=a.sample, series=series_meta), f, ensure_ascii=False, indent=1)

    cols = 2
    rows = (len(review_tiles) + cols - 1) // cols
    canvas = Image.new("L", (608 * cols, (300 + 22) * rows), 0)
    dr = ImageDraw.Draw(canvas)
    for i, (t, cap) in enumerate(review_tiles):
        r, c = divmod(i, cols)
        canvas.paste(t, (c * 608, r * 322))
        dr.text((c * 608 + 4, r * 322 + 302), cap, fill=255)
    canvas.save(os.path.join(a.out, "_review.png"))
    print("写出", a.out)


if __name__ == "__main__":
    main()
