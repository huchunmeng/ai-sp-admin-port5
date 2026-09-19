"""检测 H.rich() / H.ed() 参数里的 HTML 标签。

这两个 helper 内部都先 esc()，传进去的标签会被转义成字面文本渲染给用户。
只报「字符串字面量里含 <tag> 形式」的情况；`< 85` 这类散文小于号会被排除。
"""
import os, re, glob

ROOT = "docs/design/影像报告书写训练/03_原型交付/js"
TAG = re.compile(r"<[a-zA-Z/][a-zA-Z0-9]*(?:\s|>|/)")
CALL = re.compile(r"\bH\.(rich|ed)\s*\(")
STRLIT = re.compile(r"'([^'\\]*(?:\\.[^'\\]*)*)'")

def arg_slice(src, open_paren):
    """从 open_paren 位置起，按括号配平取出实参文本（跳过字符串内的括号）。"""
    depth = 0
    i = open_paren
    n = len(src)
    in_s = None
    while i < n:
        c = src[i]
        if in_s:
            if c == "\\":
                i += 2
                continue
            if c == in_s:
                in_s = None
        elif c in "'\"":
            in_s = c
        elif c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return src[open_paren + 1:i], src[:open_paren].count("\n") + 1
        i += 1
    return src[open_paren + 1:], 0

hits = []
for path in glob.glob(os.path.join(ROOT, "**", "*.js"), recursive=True):
    src = open(path, encoding="utf-8").read()
    for m in CALL.finditer(src):
        fn = m.group(1)
        arg, line = arg_slice(src, m.end() - 1)
        bad = []
        for sm in STRLIT.finditer(arg):
            lit = sm.group(1)
            for tm in TAG.finditer(lit):
                # 排除 `x` 反引号内有意展示的标签、以及散文里的 "< N"
                bad.append(lit[max(0, tm.start() - 25):tm.start() + 35].strip())
        if bad:
            hits.append((os.path.relpath(path, ROOT).replace("\\", "/"), fn, line, bad))

if not hits:
    print("无命中：所有 H.rich() / H.ed() 调用的字符串字面量里都没有 HTML 标签")
else:
    print("命中 %d 处（H.rich / H.ed 参数含 HTML 标签 → 会被转义成字面文本）：\n" % len(hits))
    for path, fn, line, bad in hits:
        print("  [%s] H.%s()  行 %d" % (path, fn, line))
        for b in bad:
            print("      · …%s…" % b)
        print()
