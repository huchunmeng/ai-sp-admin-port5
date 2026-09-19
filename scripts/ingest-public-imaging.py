#!/usr/bin/env python3
"""从公开数据集导出「真实多层面影像序列」，喂给影像报告书写训练题库。

为什么需要它
------------
原型期的影像素材有两类问题：① 手写样例（RC-*）用的是程序画的"斑马纹 + 演示占位"，
不是真实影像；② 院方素材（SEU-*）每例只有一张多格拼图，**没法翻层面**——而真实阅片
就是一层一层看过去的。本脚本从公开数据集导出**真正的连续层面序列**，并同时给出
**肺窗 / 纵隔窗两套序列**，让"序列切换 + 滚轮翻层"这件事真实可用。

数据来源与许可
--------------
NSCLC-Radiomics（The Cancer Imaging Archive, TCIA）
  · 原始数据：https://wiki.cancerimagingarchive.net/display/Public/NSCLC-Radiomics
  · NIfTI 转制镜像：https://hf-mirror.com/datasets/farrell236/NSCLC-Radiomics-NIFTI
  · 许可：**CC BY 3.0**（署名即可商用；署名写进 generated 数据的头部与本文件）
  · 422 例胸部 CT + GTV/双肺/脊髓分割，体素间距约 0.98×0.98×3.0 mm
  · TCIA 数据已做去标识化；CT 像素本身不含烧录的姓名/号（导出后仍需目视核一遍四角）

用法
----
    # 1) 取原始 NIfTI（curl 比 python urllib 快很多）
    BASE=https://hf-mirror.com/datasets/farrell236/NSCLC-Radiomics-NIFTI/resolve/main/NSCLC-Radiomics-NIFTI
    for f in image.nii.gz seg-GTV-1.nii.gz seg-Lung-Left.nii.gz seg-Lung-Right.nii.gz; do
      curl -sSL -o "$RAW/LUNG1-098-$f" "$BASE/LUNG1-098/$f"
    done

    # 2) 导出 JPEG 序列
    uv run --python 3.12 --with numpy --with pillow --with nibabel \
        python scripts/ingest-public-imaging.py --raw <原始目录> --out <题库图片目录> --cases 98,112,238,266

产物
----
    <out>/PUB-00N/ax-lung-001.jpg …     肺窗轴位（WW 1500 / WL −600）
    <out>/PUB-00N/ax-med-001.jpg  …     纵隔窗轴位（WW 400 / WL 40）
    <out>/PUB-00N/_facts.json           该例的客观事实（供起草标准报告引用）
"""
import argparse, json, os, sys
import numpy as np
import nibabel as nib
from PIL import Image

# ── 窗宽窗位（HU） ──────────────────────────────────────────────
WINDOWS = {
    "lung": (-600, 1500),   # 肺窗：看肺实质、结节、胸膜
    "med": (40, 400),       # 纵隔窗：看纵隔、淋巴结、胸壁、强化
}
JPEG_QUALITY = 78


def window_to_uint8(hu, level, width):
    lo, hi = level - width / 2, level + width / 2
    v = np.clip((hu - lo) / (hi - lo), 0, 1)
    return (v * 255).astype(np.uint8)


def to_display(vol, affine):
    """把体素数组转成「放射科习惯」的轴位显示：**患者右侧在图像左侧、前方在图像上方**。

    仿射是体素→世界(RAS+：+x=患者右，+y=前，+z=头)。显示要求：
      · 列 0 = 患者右侧 = 世界 x 最大 → 若 aff[0,0] > 0（下标越大越靠患者右）则必须翻 x
      · 行 0 = 最前方   = 世界 y 最大 → 若 aff[1,1] > 0（下标越大越靠前）则必须翻 y
    本数据集的仿射 x/y 都是负的（下标越大越靠患者左 / 越靠后），所以两轴都不翻，
    只做一次转置把轴序变成 [行=y, 列=x]。
    """
    out = vol
    if affine[1, 1] > 0:
        out = out[:, ::-1, :]
    if affine[0, 0] > 0:
        out = out[::-1, :, :]
    return np.transpose(out, (1, 0, 2))


def body_bbox(vol, thr=-600, margin=6):
    """全身（含胸壁）的外接框，用来裁掉四周大片空气，省体积也更好看。"""
    m = vol > thr
    xs = np.where(m.any(axis=(1, 2)))[0]
    ys = np.where(m.any(axis=(0, 2)))[0]
    x0 = max(0, xs.min() - margin); x1 = min(vol.shape[0], xs.max() + margin + 1)
    y0 = max(0, ys.min() - margin); y1 = min(vol.shape[1], ys.max() + margin + 1)
    return x0, x1, y0, y1


def contrast_flag(vol, gtv, affine):
    """判断是否增强扫描：在病灶层的中线附近取「前 60% 纵隔区」（避开后方脊柱），
    统计 150–450 HU 的像素占比。平扫时这里只有脂肪/肌肉（<100 HU），
    增强后主动脉/肺动脉腔（200–400 HU）会贡献明显的比例；上限 450 用来排除皮质骨。"""
    gz = np.where(gtv.any(axis=(0, 1)))[0]
    k = int((gz.min() + gz.max()) // 2)
    cx, cy = vol.shape[0] // 2, vol.shape[1] // 2
    y_is_anterior = affine[1, 1] >= 0
    if y_is_anterior:
        y0, y1 = max(0, cy - 110), max(1, cy + 40)      # 偏前
    else:
        y0, y1 = min(vol.shape[1] - 1, cy - 40), min(vol.shape[1], cy + 110)
    box = vol[max(0, cx - 60):cx + 60, y0:y1, k]
    body = box > -300
    if body.sum() < 300:
        return False, 0.0
    vascular = ((box > 150) & (box < 450)).sum()
    ratio = float(vascular / body.sum())
    return bool(ratio > 0.03), round(ratio, 4)


def export_case(raw_dir, out_root, cid, sample_id, keep_every=1, max_slices=120):
    img = nib.load(os.path.join(raw_dir, f"{cid}-image.nii.gz"))
    vol = np.asarray(img.dataobj, dtype=np.float32)
    aff = img.affine
    zx, zy, zz = [float(v) for v in img.header.get_zooms()[:3]]
    gtv = nib.load(os.path.join(raw_dir, f"{cid}-seg-GTV-1.nii.gz")).get_fdata() > 0
    lungL = nib.load(os.path.join(raw_dir, f"{cid}-seg-Lung-Left.nii.gz")).get_fdata() > 0
    lungR = nib.load(os.path.join(raw_dir, f"{cid}-seg-Lung-Right.nii.gz")).get_fdata() > 0
    lung = lungL | lungR

    lz = np.where(lung.any(axis=(0, 1)))[0]
    gz = np.where(gtv.any(axis=(0, 1)))[0]
    ks = list(range(max(0, int(lz.min()) - 2), min(vol.shape[2], int(lz.max()) + 3)))
    # 本数据集仿射 z 为正：体素下标越大越靠头侧。导出时**倒过来**，
    # 让第 001 帧 = 最靠头侧的层面（肺尖），与 PACS 上"第 1 层在最上面"的习惯一致。
    if aff[2, 2] >= 0:
        ks.reverse()
    ks = ks[::keep_every]
    if len(ks) > max_slices:                      # 太薄就均匀抽稀，保持覆盖全肺
        idx = np.linspace(0, len(ks) - 1, max_slices).round().astype(int)
        ks = [ks[i] for i in sorted(set(idx))]

    x0, x1, y0, y1 = body_bbox(vol)
    disp = to_display(vol, aff)

    case_dir = os.path.join(out_root, sample_id)
    os.makedirs(case_dir, exist_ok=True)
    for name, (level, width) in WINDOWS.items():
        prefix = "ax-lung" if name == "lung" else "ax-med"
        for n, k in enumerate(ks, 1):
            sl = window_to_uint8(disp[:, :, k], level, width)[y0:y1, x0:x1]
            Image.fromarray(sl, mode="L").save(
                os.path.join(case_dir, f"{prefix}-{n:03d}.jpg"),
                format="JPEG", quality=JPEG_QUALITY, optimize=True, subsampling=0)

    # 客观事实：写进报告能被引用、也能被复核的那几条
    n = int(gtv.sum()); vol_mm3 = n * zx * zy * zz
    dia = 2 * (3 * vol_mm3 / (4 * np.pi)) ** (1 / 3)
    enhanced, enh_ratio = contrast_flag(vol, gtv, aff)
    xs = np.where(gtv.any(axis=(1, 2)))[0]
    ys = np.where(gtv.any(axis=(0, 2)))[0]
    x_mid = (xs.min() + xs.max()) / 2
    span = max(1, int(lz.max() - lz.min()))
    up = aff[2, 2] >= 0
    head = float(((lz.max() - (gz.min() + gz.max()) / 2) / span) if up else (((gz.min() + gz.max()) / 2 - lz.min()) / span))
    facts = {
        "sampleId": sample_id,
        "source": "NSCLC-Radiomics (TCIA) / farrell236/NSCLC-Radiomics-NIFTI",
        "license": "CC BY 3.0",
        "sourceCaseId": cid,
        "spacingMm": [round(zx, 4), round(zy, 4), round(zz, 4)],
        "cropBox": [int(x0), int(x1), int(y0), int(y1)],
        "exportedSlices": len(ks),
        "sliceRange": [int(ks[0]), int(ks[-1])],
        "keptEvery": keep_every,
        "series": {
            "lung": {"file": "ax-lung-*.jpg", "window": {"WW": WINDOWS["lung"][1], "WL": WINDOWS["lung"][0]}},
            "med": {"file": "ax-med-*.jpg", "window": {"WW": WINDOWS["med"][1], "WL": WINDOWS["med"][0]}},
        },
        "enhancedHintAuto": enhanced,
        "enhancedHiDensityRatio": enh_ratio,
        "note": "enhancedHintAuto 只是粗判（纵隔内含骨会误判为增强），"
                "检查技术写「平扫」还是「增强」必须目视确认后写进样本数据",
        "lesion": {
            "sideVoxel": "left" if x_mid > gtv.shape[0] / 2 else "right",
            "equivDiamMm": round(dia, 1),
            "slices": int(gz.max() - gz.min() + 1),
            "cranioCaudalMm": round(float((gz.max() - gz.min() + 1) * zz), 1),
            "xOffsetMm": round(float((x_mid - gtv.shape[0] / 2) * zx), 1),
            "headFraction": round(head, 3),      # 0 = 肺尖，1 = 肺底
        },
    }
    with open(os.path.join(case_dir, "_facts.json"), "w", encoding="utf-8") as f:
        json.dump(facts, f, ensure_ascii=False, indent=1)
    return facts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True, help="原始 NIfTI 目录")
    ap.add_argument("--out", required=True, help="题库图片目录（apps/admin/public/data/imaging-samples）")
    ap.add_argument("--cases", required=True, help="LUNG1 编号，逗号分隔，如 98,112,238,266")
    ap.add_argument("--keep-every", type=int, default=1)
    ap.add_argument("--max-slices", type=int, default=120)
    ap.add_argument("--start-at", type=int, default=1, help="PUB 编号起始")
    a = ap.parse_args()

    nums = [int(s) for s in a.cases.split(",") if s.strip()]
    total = 0
    for i, num in enumerate(nums, a.start_at):
        cid = f"LUNG1-{num:03d}"
        sid = f"PUB-{i:03d}"
        facts = export_case(a.raw, a.out, cid, sid, a.keep_every, a.max_slices)
        d = os.path.join(a.out, sid)
        size = sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d))
        total += size
        print(f"{sid} <- {cid}  slices={facts['exportedSlices']}  "
              f"lesion={facts['lesion']['equivDiamMm']}mm {facts['lesion']['sideVoxel']}  "
              f"enhancedHint={facts['enhancedHintAuto']}({facts['enhancedHiDensityRatio']})  "
              f"{size/1024/1024:.2f}MB")
    print(f"total {total/1024/1024:.2f}MB")


if __name__ == "__main__":
    sys.exit(main())
