#!/usr/bin/env python3
"""同步上游（kanoqwq/UFI-TOOLS）后端代码，并重放本仓库的定制补丁。

用法:
    python3 tools/sync_backend.py --upstream-ref upstream/http-server-version [--notes /tmp/sync_notes.md]

流程:
  1. git checkout <ref> -- <BACKEND_PATHS>        # 用上游版本覆盖后端文件
  2. git apply --3way tools/backend-custom.patch  # 重放端口 2334 / 包名 .redesign 定制
  3. 校验不变量（端口、applicationId、app_name、类全名不被误改）
  4. 写变更摘要（供 Release notes 用）

任何一步失败即退出非零，调用方（CI）应中止，不提交、不发布。
设计原则: 同步范围只含后端；前端（app/frontEnd、assets 生成物）、文档、CI 一律不碰。
"""

import argparse
import datetime
import os
import subprocess
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATCH = "tools/backend-custom.patch"
MARKER = "tools/upstream_synced.txt"

# 从上游同步的后端路径（白名单）。生成物（assets 下 web 文件）被 .gitignore 排除，
# git checkout 不会碰它们。
BACKEND_PATHS = [
    "app/build.gradle.kts",
    "app/proguard-rules.pro",
    "app/src/androidTest",
    "app/src/main/AndroidManifest.xml",
    "app/src/main/assets",
    "app/src/main/java",
    "app/src/main/res",
    "app/src/test",
    "build.gradle.kts",
    "gradle",
    "gradle.properties",
    "gradlew",
    "gradlew.bat",
    "settings.gradle.kts",
]

# 变量替换类定制之外，重放补丁后必须成立的不变量
INVARIANTS = [
    ("applicationId 独立包名", "app/build.gradle.kts",
     'applicationId = "com.minikano.f50_sms.redesign"'),
    ("应用名 UFI-TOOLS RE", "app/src/main/res/values/strings.xml",
     "UFI-TOOLS RE"),
    ("类全名未被误改（OTA 组件引用）", "app/src/main/java/com/minikano/f50_sms/modules/ota/otaModule.kt",
     "com.minikano.f50_sms.redesign/com.minikano.f50_sms.MainActivity"),
]


def git(*args, check=True):
    r = subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, text=True)
    if check and r.returncode != 0:
        sys.stderr.write(r.stdout + r.stderr)
        sys.exit(f"[sync] git {' '.join(args)} 失败")
    return r


def fail(msg):
    print(f"[sync] ❌ {msg}")
    sys.exit(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--upstream-ref", required=True)
    ap.add_argument("--notes", default="")
    args = ap.parse_args()

    ref = args.upstream_ref
    sha = git("rev-parse", ref).stdout.strip()
    subject = git("log", "-1", "--format=%s", ref).stdout.strip()
    short = sha[:12]
    print(f"[sync] 上游目标: {ref} = {short} {subject}")

    # --- 0. 上游相对上次同步的变化分类（信息用；未分类的给警告） ---
    prev = ""
    if os.path.exists(os.path.join(REPO_ROOT, MARKER)):
        prev = open(os.path.join(REPO_ROOT, MARKER), encoding="utf-8-sig").readline().strip()
    upstream_files = []
    if prev:
        upstream_files = git("diff", "--name-only", prev, ref).stdout.split()
        synced = [f for f in upstream_files if any(f.startswith(p.rstrip("/") + "/") or f == p for p in BACKEND_PATHS)]
        ignored = [f for f in upstream_files if f not in synced]
        print(f"[sync] 上游自 {prev[:12]} 以来改动 {len(upstream_files)} 个文件: "
              f"后端 {len(synced)} / 非后端(不同步) {len(ignored)}")
        for f in ignored:
            print(f"[sync]   (不同步) {f}")

    # --- 1. 用上游版本覆盖后端文件 ---
    git("checkout", ref, "--", *BACKEND_PATHS)

    # --- 2. 重放定制补丁（3-way，上游改了别处也能合） ---
    r = git("apply", "--3way", PATCH, check=False)
    if r.returncode != 0:
        sys.stderr.write(r.stdout + r.stderr)
        fail("定制补丁重放失败（上游可能改了端口/包名附近的行），需人工处理，本次不同步")

    # --- 3. 不变量校验 ---
    bad = []
    for name, path, needle in INVARIANTS:
        content = open(os.path.join(REPO_ROOT, path), encoding="utf-8", errors="replace").read()
        if needle not in content:
            bad.append(f"{name}: {path} 中找不到 {needle!r}")
    TEXT_EXT = {".kt", ".java", ".sh", ".go", ".xml", ".kts", ".js", ".json", ".py", ".txt", ".properties"}
    for root in ("app/src/main/java", "app/src/main/assets/shell"):
        for dirpath, _, files in os.walk(os.path.join(REPO_ROOT, root)):
            for fn in files:
                if os.path.splitext(fn)[1] not in TEXT_EXT:
                    continue  # 二进制（adb/socat/ufi_req 等）字节里可能碰巧含 2333，跳过
                p = os.path.join(dirpath, fn)
                try:
                    if "2333" in open(p, encoding="utf-8", errors="replace").read():
                        bad.append(f"端口残留 2333: {os.path.relpath(p, REPO_ROOT)}")
                except OSError:
                    pass
    if bad:
        for b in bad:
            print(f"[sync]   ✗ {b}")
        fail("不变量校验未通过，需人工处理，本次不同步")

    # --- 4. 上游删除的后端文件警告（不自动删，安全第一） ---
    have = set(git("ls-files", *BACKEND_PATHS).stdout.split())
    there = set(git("ls-tree", "-r", "--name-only", ref, "--", *BACKEND_PATHS).stdout.split())
    removed = sorted(have - there)
    for f in removed:
        print(f"[sync]   ⚠️ 上游已删除但本仓库仍保留: {f}（请人工确认）")

    # --- 5. 汇总变更、更新同步标记 ---
    status = git("status", "--porcelain", "--", *BACKEND_PATHS).stdout.strip()
    changed = [ln[3:] for ln in status.splitlines()] if status else []
    if changed:
        with open(os.path.join(REPO_ROOT, MARKER), "w") as f:
            f.write(f"{sha}\n{datetime.date.today().isoformat()} {subject}\n")
        print(f"[sync] ✅ 同步产生 {len(changed)} 个文件变更:")
        for f in changed:
            print(f"[sync]   {f}")
    else:
        print("[sync] ✅ 上游后端无变化，工作区无变更")

    # --- 6. Release notes ---
    if args.notes:
        with open(args.notes, "w") as f:
            f.write(f"## 自动同步上游后端\n\n- 上游提交: `{short}` {subject}\n")
            if prev:
                f.write(f"- 上游自上次同步（`{prev[:12]}`）改动 {len(upstream_files)} 个文件"
                        f"（其中后端白名单 {len(upstream_files) - len([x for x in upstream_files if x not in synced]) if upstream_files else 0} 个）\n")
            f.write(f"- 本次同步后端文件变更 {len(changed)} 个:\n")
            for x in changed:
                f.write(f"  - `{x}`\n")
            if removed:
                f.write(f"- ⚠️ 上游已删除但本仓库保留: {', '.join(removed)}\n")
            f.write("\n端口 2334 / 包名 com.minikano.f50_sms.redesign 定制已重放并通过校验。\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
