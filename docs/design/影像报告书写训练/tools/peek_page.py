import os, re, sys, tempfile, html as ihtml

OUT = os.path.join(tempfile.gettempdir(), "proto_dump2")
SKIP_TO = {"p9": "影像报告题库", "p10": "样本编辑器", "p11": "考核任务管理",
           "p12": "组卷与派发", "p13": "成绩汇总与学情"}
SKIP_FROM = {"p9": None, "p10": None, "p11": None, "p12": None, "p13": None}

def text(path):
    s = open(path, encoding="utf-8", errors="replace").read()
    s = re.sub(r"<script[\s\S]*?</script>", " ", s)
    s = re.sub(r"<style[\s\S]*?</style>", " ", s)
    s = re.sub(r"<[^>]+>", "\n", s)
    s = ihtml.unescape(s)
    return [l.strip() for l in s.split("\n") if l.strip()]

only = sys.argv[1] if len(sys.argv) > 1 else None

for pid, label in [("p9", "P9 影像报告题库"), ("p10", "P10 样本编辑器"),
                   ("p11", "P11 考核任务管理"), ("p12", "P12 组卷与派发四步"),
                   ("p13", "P13 成绩汇总与学情")]:
    if only and only != pid:
        continue
    lines = text(os.path.join(OUT, pid + ".html"))
    # 侧栏含「P9–P13 管理端 · 承接」与四个页签名；内容区从第 3 次出现页签名之后起
    idxs = [i for i, l in enumerate(lines) if l == "交付说明"]
    start = idxs[-1] + 1 if idxs else 0
    print("=" * 70)
    print("%s   (渲染后可见文本 %d 行，内容区从第 %d 行起)" % (label, len(lines), start))
    print("=" * 70)
    for l in lines[start:start + 55]:
        print("  " + l)
    print()
