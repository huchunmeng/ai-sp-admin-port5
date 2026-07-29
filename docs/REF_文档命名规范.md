# 文档命名规范

## 格式

```
前缀_文档名[_日期].ext
```

## 前缀

| 前缀 | 用途 |
|------|------|
| `PRD_` | 产品需求文档 |
| `DESIGN_` | 技术/系统设计文档 |
| `DELIVERY_` | 交付给开发/测试的文档 |
| `TEST_` | 测试用例/测试报告 |
| `LOG_` | 工作日志/审查记录 |
| `REF_` | 参考资料/索引/规范 |

## 规则

- 文档名用中文，前缀用英文大写
- 日期格式 `YYYYMMDD`，放末尾
- 同前缀文件按前缀聚合，按日期排序
- Excel 评分表（`scoring-tables/`）保持现有中文命名

## 目录

```
docs/
├── PRD_*.md
├── DESIGN_*.md
├── DELIVERY_*.md
├── TEST_*.md
├── LOG_*.md
├── REF_*.md
├── scoring-tables/    ← 各专业评分表 Excel
├── design/            ← 存量设计文档（不动）
└── archive/           ← 归档
```
