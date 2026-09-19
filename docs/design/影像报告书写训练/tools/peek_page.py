"""抽某页渲染后的「内容区」可见文本，用于核对页面区是否残留评审性文字。

依赖 verify_render.py 生成的 dump（%TEMP%/proto_dump2/pN.html），先跑它再跑本脚本。

    python3.12 tools/peek_page.py          # 全部 13 页
    python3.12 tools/peek_page.py p13      # 只看 P13
    python3.12 tools/peek_page.py p13 200  # 只看 P13、打印 200 行

内容区靠 <main class="content"> 到 </main> 切分 —— 不用文本锚点，
因为侧栏改版后「交付说明」这类词会变，页内正文也可能撞词。
"""
import html as ihtml
import os
import re
import sys
import tempfile

OUT = os.path.join(tempfile.gettempdir(), "proto_dump2")

LABEL = {
    "p1": "P1 训练首页", "p2": "P2 训练病例列表", "p3": "P3 训练工作台",
    "p4": "P4 对照自评", "p5": "P5 我的考核任务", "p6": "P6 考核工作台",
    "p7": "P7 评分结果", "p8": "P8 评审说明（非产品界面）",
    "p9": "P9 影像报告题库", "p10": "P10 病例编辑器",
    "p11": "P11 考核任务管理", "p12": "P12 组卷与发布四步",
    "p13": "P13 成绩汇总与学情",
}


def content_html(raw):
    m = re.search(r'<main class="content"[^>]*>', raw)
    if not m:
        return raw
    body = raw[m.end():]
    end = body.find("</main>")
    return body[:end] if end >= 0 else body


def visible_lines(html):
    html = re.sub(r"<script[\s\S]*?</script>", " ", html)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html)
    html = re.sub(r"<[^>]+>", "\n", html)
    return [l.strip() for l in ihtml.unescape(html).split("\n") if l.strip()]


only = sys.argv[1] if len(sys.argv) > 1 else None
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 60

for pid, label in LABEL.items():
    if only and only != pid:
        continue
    path = os.path.join(OUT, pid + ".html")
    if not os.path.exists(path):
        print("!! 缺 dump：%s —— 请先跑 tools/verify_render.py" % path)
        continue
    lines = visible_lines(content_html(open(path, encoding="utf-8", errors="replace").read()))
    print("=" * 70)
    print("%s   （内容区可见文本 %d 行，打印前 %d 行）" % (label, len(lines), limit))
    print("=" * 70)
    for l in lines[:limit]:
        print("  " + l)
    print()
