import os, re, subprocess, sys, tempfile, shutil

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE = "http://127.0.0.1:8877/index.html#"
OUT = os.path.join(tempfile.gettempdir(), "proto_dump2")
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)

PAGES = {
    "p1":  ["训练模式", "考核模式"],
    "p2":  ["检查部位", "模态"],
    "p3":  ["阅片", "提示"],
    "p4":  ["自评"],
    "p5":  ["考核任务"],
    "p6":  ["整卷", "交卷"],
    "p7":  ["维度得分"],
    "p8":  ["交付范围"],
    "p9":  ["题库", "能力位"],
    "p10": ["脱敏", "金标准"],
    "p11": ["任务"],
    "p12": ["选样与权重", "发布设置", "确认发布"],
    "p13": ["成绩", "学情"],
}

def dump(pid):
    out = os.path.join(OUT, pid + ".html")
    udc = os.path.join(OUT, "udc_" + pid)
    with open(out, "w", encoding="utf-8", errors="replace") as fh:
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                        "--virtual-time-budget=5000", "--user-data-dir=" + udc,
                        "--dump-dom", BASE + pid],
                       stdout=fh, stderr=subprocess.DEVNULL, timeout=90)
    return open(out, encoding="utf-8", errors="replace").read()

print("%-5s %9s %6s %10s  %s" % ("page", "bytes", "ready", "end-admin", "关键词命中"))
fails = []
for pid in PAGES:
    html = dump(pid)
    ready = 'data-proto-ready="1"' in html
    # 必须锚在 <body> 的 class 上：P8 正文里就写着 body.end-admin 字样，
    # 全文包含判断会让 P8 即使没挂上管理端外壳也判 True（关键词断言的形状缺陷）。
    isadm = bool(re.search(r"<body[^>]*\bend-admin\b", html))
    render_fail = "本页渲染失败" in html
    hits = [k for k in PAGES[pid] if k in html]
    miss = [k for k in PAGES[pid] if k not in html]
    status = "OK"
    if not ready or render_fail or miss:
        status = "FAIL"
        fails.append((pid, ready, render_fail, miss))
    print("%-5s %9d %6s %10s  %-28s %s" % (pid, len(html), ready, isadm, ",".join(hits) or "-", status))

print()
if fails:
    print("!! 失败:", fails)
    sys.exit(1)
print("13/13 页渲染通过，零渲染失败")
