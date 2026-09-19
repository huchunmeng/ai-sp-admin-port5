"""渲染后扫「裸 markdown 标记」——H.rich()/H.ed() 之外的字符串里写 ** 或 ` 会原样显示给用户。

为什么不能静态扫：`H.esc(t.desc)` 这种调用形态看不出实参里有没有 markdown；
必须把页面渲染出来、剥掉标签、只看可见文本。与 detect_rich_html.py（静态扫 HTML 标签）互补。
"""
import os, re, subprocess, sys, tempfile, shutil

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE = "http://127.0.0.1:8877/index.html#"
PAGES = ["p%d" % i for i in range(1, 14)]
OUT = os.path.join(tempfile.gettempdir(), "proto_bare_md")
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)

TAG = re.compile(r"<[^>]+>")
SKIP = re.compile(r"<(script|style|code|pre)\b.*?</\1>", re.S | re.I)
# 只有「不成串的 **」才算 markdown 残留；掩码 `****1234` 是一串 4 个星号，不算
# <code> / <pre> 里的符号是刻意展示的字面量（含本页在讲这个 bug 时的举例），一并跳过
BARE = re.compile(r"(?<!\*)\*\*(?!\*)|`")


def visible(html):
    body = SKIP.sub(" ", html)
    start = body.find("<body")
    if start >= 0:
        body = body[start:]
    return TAG.sub(" ", body)


def dump(pid):
    out = os.path.join(OUT, pid + ".html")
    with open(out, "w", encoding="utf-8", errors="replace") as fh:
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                        "--virtual-time-budget=5000",
                        "--user-data-dir=" + os.path.join(OUT, "udc_" + pid),
                        "--dump-dom", BASE + pid],
                       stdout=fh, stderr=subprocess.DEVNULL, timeout=90)
    return open(out, encoding="utf-8", errors="replace").read()


total = 0
for pid in PAGES:
    txt = visible(dump(pid))
    hits = []
    for m in BARE.finditer(txt):
        seg = txt[max(0, m.start() - 40):m.start() + 40].replace("\n", " ")
        hits.append(re.sub(r"\s+", " ", seg).strip())
    if hits:
        total += len(hits)
        print("%-5s 命中 %d 处" % (pid, len(hits)))
        for h in hits:
            print("        … %s …" % h)

print()
if total:
    print("!! 共 %d 处裸 markdown 标记——写进没走 H.rich() 的字符串了" % total)
    sys.exit(1)
print("核验 13 页：无裸 markdown 标记")
