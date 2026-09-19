// 公开数据集样例（真实多层面影像序列）—— 自动生成 + 人工读片起草标准报告，勿手改结构
//
// 来源：NSCLC-Radiomics（The Cancer Imaging Archive, TCIA）
//   原始数据 https://wiki.cancerimagingarchive.net/display/Public/NSCLC-Radiomics
//   NIfTI 镜像 https://hf-mirror.com/datasets/farrell236/NSCLC-Radiomics-NIFTI
//   许可 **CC BY 3.0**（署名即可商用；署名见每条样本的 sourceDataset / sourceLicense）
//   导出脚本 scripts/ingest-public-imaging.py（同时给肺窗 + 纵隔窗两套序列，可滚轮翻层面）
//
// 与 SEU-* 样例的关键差别：**每例是真·连续层面序列（75–93 层 / 每层 3 mm）**，
// 而不是一张多格拼图——"序列切换 + 翻层面"这条真实阅片动作在这里是可练的。
//
// ⚠️ 四条已知事项（正式使用前需处理）：
//   1. **标准报告由 AI 逐例读片起草，未经医师复核** —— 作为样例可用，作为考核依据不可
//   2. **病灶尺寸取自数据集的 GTV 勾画**（放疗靶区，可能含少量周围组织），
//      与"影像上肉眼测量的最大径"可能有 1–3 mm 出入
//   3. **临床信息与一般信息（姓名/年龄/性别/科别/检查号/检查时间）全是占位值**：
//      TCIA 随附的临床表不在本镜像里，只有影像是真的。年龄按数据集年龄段随机取的占位
//   4. **平扫/增强是逐例目视判定的**（脚本里的自动判断会把骨误算成血管，不可用），
//      已写进 capabilities.hasEnhancedPhase 与 standard report 的检查技术
//
// 影像本体：apps/admin/public/data/imaging-samples/PUB-00N/{ax-lung,ax-med}-NNN.jpg
//   肺窗 WW 1500 / WL −600；纵隔窗 WW 400 / WL 40；原始像素间距 0.977×0.977×3.0 mm

export const PUB_SAMPLES = [
  {
    "id": "PUB-001",
    "title": "CT · 右肺上叶外周实性结节",
    "modality": "CT",
    "bodyPart": "胸部",
    "level": "U2",
    "icon": "fa-lungs",
    "clinicalBrief": "体检发现右肺结节 1 周，行胸部 CT 平扫。",
    "series": [
      {
        "key": "ax-lung",
        "name": "肺窗轴位",
        "en": "Lung",
        "frames": 83,
        "images": [
          "/data/imaging-samples/PUB-001/ax-lung-001.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-002.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-003.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-004.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-005.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-006.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-007.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-008.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-009.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-010.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-011.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-012.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-013.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-014.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-015.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-016.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-017.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-018.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-019.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-020.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-021.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-022.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-023.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-024.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-025.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-026.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-027.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-028.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-029.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-030.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-031.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-032.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-033.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-034.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-035.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-036.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-037.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-038.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-039.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-040.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-041.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-042.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-043.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-044.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-045.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-046.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-047.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-048.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-049.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-050.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-051.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-052.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-053.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-054.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-055.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-056.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-057.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-058.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-059.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-060.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-061.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-062.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-063.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-064.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-065.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-066.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-067.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-068.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-069.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-070.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-071.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-072.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-073.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-074.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-075.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-076.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-077.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-078.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-079.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-080.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-081.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-082.jpg",
          "/data/imaging-samples/PUB-001/ax-lung-083.jpg"
        ],
        "window": {
          "WW": 1500,
          "WL": -600
        }
      },
      {
        "key": "ax-med",
        "name": "纵隔窗轴位",
        "en": "Mediastinum",
        "frames": 83,
        "images": [
          "/data/imaging-samples/PUB-001/ax-med-001.jpg",
          "/data/imaging-samples/PUB-001/ax-med-002.jpg",
          "/data/imaging-samples/PUB-001/ax-med-003.jpg",
          "/data/imaging-samples/PUB-001/ax-med-004.jpg",
          "/data/imaging-samples/PUB-001/ax-med-005.jpg",
          "/data/imaging-samples/PUB-001/ax-med-006.jpg",
          "/data/imaging-samples/PUB-001/ax-med-007.jpg",
          "/data/imaging-samples/PUB-001/ax-med-008.jpg",
          "/data/imaging-samples/PUB-001/ax-med-009.jpg",
          "/data/imaging-samples/PUB-001/ax-med-010.jpg",
          "/data/imaging-samples/PUB-001/ax-med-011.jpg",
          "/data/imaging-samples/PUB-001/ax-med-012.jpg",
          "/data/imaging-samples/PUB-001/ax-med-013.jpg",
          "/data/imaging-samples/PUB-001/ax-med-014.jpg",
          "/data/imaging-samples/PUB-001/ax-med-015.jpg",
          "/data/imaging-samples/PUB-001/ax-med-016.jpg",
          "/data/imaging-samples/PUB-001/ax-med-017.jpg",
          "/data/imaging-samples/PUB-001/ax-med-018.jpg",
          "/data/imaging-samples/PUB-001/ax-med-019.jpg",
          "/data/imaging-samples/PUB-001/ax-med-020.jpg",
          "/data/imaging-samples/PUB-001/ax-med-021.jpg",
          "/data/imaging-samples/PUB-001/ax-med-022.jpg",
          "/data/imaging-samples/PUB-001/ax-med-023.jpg",
          "/data/imaging-samples/PUB-001/ax-med-024.jpg",
          "/data/imaging-samples/PUB-001/ax-med-025.jpg",
          "/data/imaging-samples/PUB-001/ax-med-026.jpg",
          "/data/imaging-samples/PUB-001/ax-med-027.jpg",
          "/data/imaging-samples/PUB-001/ax-med-028.jpg",
          "/data/imaging-samples/PUB-001/ax-med-029.jpg",
          "/data/imaging-samples/PUB-001/ax-med-030.jpg",
          "/data/imaging-samples/PUB-001/ax-med-031.jpg",
          "/data/imaging-samples/PUB-001/ax-med-032.jpg",
          "/data/imaging-samples/PUB-001/ax-med-033.jpg",
          "/data/imaging-samples/PUB-001/ax-med-034.jpg",
          "/data/imaging-samples/PUB-001/ax-med-035.jpg",
          "/data/imaging-samples/PUB-001/ax-med-036.jpg",
          "/data/imaging-samples/PUB-001/ax-med-037.jpg",
          "/data/imaging-samples/PUB-001/ax-med-038.jpg",
          "/data/imaging-samples/PUB-001/ax-med-039.jpg",
          "/data/imaging-samples/PUB-001/ax-med-040.jpg",
          "/data/imaging-samples/PUB-001/ax-med-041.jpg",
          "/data/imaging-samples/PUB-001/ax-med-042.jpg",
          "/data/imaging-samples/PUB-001/ax-med-043.jpg",
          "/data/imaging-samples/PUB-001/ax-med-044.jpg",
          "/data/imaging-samples/PUB-001/ax-med-045.jpg",
          "/data/imaging-samples/PUB-001/ax-med-046.jpg",
          "/data/imaging-samples/PUB-001/ax-med-047.jpg",
          "/data/imaging-samples/PUB-001/ax-med-048.jpg",
          "/data/imaging-samples/PUB-001/ax-med-049.jpg",
          "/data/imaging-samples/PUB-001/ax-med-050.jpg",
          "/data/imaging-samples/PUB-001/ax-med-051.jpg",
          "/data/imaging-samples/PUB-001/ax-med-052.jpg",
          "/data/imaging-samples/PUB-001/ax-med-053.jpg",
          "/data/imaging-samples/PUB-001/ax-med-054.jpg",
          "/data/imaging-samples/PUB-001/ax-med-055.jpg",
          "/data/imaging-samples/PUB-001/ax-med-056.jpg",
          "/data/imaging-samples/PUB-001/ax-med-057.jpg",
          "/data/imaging-samples/PUB-001/ax-med-058.jpg",
          "/data/imaging-samples/PUB-001/ax-med-059.jpg",
          "/data/imaging-samples/PUB-001/ax-med-060.jpg",
          "/data/imaging-samples/PUB-001/ax-med-061.jpg",
          "/data/imaging-samples/PUB-001/ax-med-062.jpg",
          "/data/imaging-samples/PUB-001/ax-med-063.jpg",
          "/data/imaging-samples/PUB-001/ax-med-064.jpg",
          "/data/imaging-samples/PUB-001/ax-med-065.jpg",
          "/data/imaging-samples/PUB-001/ax-med-066.jpg",
          "/data/imaging-samples/PUB-001/ax-med-067.jpg",
          "/data/imaging-samples/PUB-001/ax-med-068.jpg",
          "/data/imaging-samples/PUB-001/ax-med-069.jpg",
          "/data/imaging-samples/PUB-001/ax-med-070.jpg",
          "/data/imaging-samples/PUB-001/ax-med-071.jpg",
          "/data/imaging-samples/PUB-001/ax-med-072.jpg",
          "/data/imaging-samples/PUB-001/ax-med-073.jpg",
          "/data/imaging-samples/PUB-001/ax-med-074.jpg",
          "/data/imaging-samples/PUB-001/ax-med-075.jpg",
          "/data/imaging-samples/PUB-001/ax-med-076.jpg",
          "/data/imaging-samples/PUB-001/ax-med-077.jpg",
          "/data/imaging-samples/PUB-001/ax-med-078.jpg",
          "/data/imaging-samples/PUB-001/ax-med-079.jpg",
          "/data/imaging-samples/PUB-001/ax-med-080.jpg",
          "/data/imaging-samples/PUB-001/ax-med-081.jpg",
          "/data/imaging-samples/PUB-001/ax-med-082.jpg",
          "/data/imaging-samples/PUB-001/ax-med-083.jpg"
        ],
        "window": {
          "WW": 400,
          "WL": 40
        }
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "60–69 岁",
      "sex": "女",
      "dept": "呼吸内科",
      "examNo": "****9001",
      "imageNo": "****9101",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-08-12 09:20"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": true,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "胸部 CT 平扫，肺窗及纵隔窗观察。",
      "findings": "右肺上叶外周部（邻近胸膜）见一类圆形实性结节，最大横断面约 15 mm × 13 mm，上下径约 12 mm（4 个层面，层厚 3 mm）；边缘较光整，未见明确毛刺及胸膜牵拉；密度均匀，呈软组织密度，未见钙化及空洞；双肺门及纵隔未见明确肿大淋巴结；双侧胸腔未见积液；余肺野及胸廓结构未见明确异常。",
      "impression": "右肺上叶外周实性结节（约 1.5 cm）。定位：右肺上叶外周部、邻近胸膜。定性：良性结节与早期肺恶性病变均有可能。依据：结节边界较光整、密度均匀、无毛刺及胸膜牵拉。建议：调阅既往影像对比，3 个月后复查胸部 CT 薄层重建；若增大或出现恶性征象，行 PET-CT 或穿刺活检。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "公开数据集样例：NSCLC-Radiomics（TCIA，CC BY 3.0）LUNG1-098 · 病灶尺寸取自数据集 GTV 勾画 · 标准报告由 AI 逐例读片起草，未经医师复核 · 临床信息与一般信息为占位值",
    "sourceDataset": "NSCLC-Radiomics (TCIA)",
    "sourceLicense": "CC BY 3.0",
    "sourceCaseId": "LUNG1-098",
    "sourceFacts": {
      "spacingMm": [
        0.9766,
        0.9766,
        3
      ],
      "exportedSlices": 83,
      "lesionSide": "right",
      "lesionEquivDiamMm": 14.6,
      "lesionHeadFraction": 0.173,
      "contrastConfirmedBy": "visual"
    },
    "createdBy": "公开数据集导入",
    "updatedBy": "公开数据集导入",
    "createdAt": "2026-09-20 02:10",
    "updatedAt": "2026-09-20 02:10",
    "publishedAt": "2026-09-20 02:10"
  },
  {
    "id": "PUB-002",
    "title": "CT · 左肺上叶前部肿块",
    "modality": "CT",
    "bodyPart": "胸部",
    "level": "R1",
    "icon": "fa-lungs",
    "clinicalBrief": "咳嗽、痰中带血 2 个月，行胸部 CT 增强扫描。",
    "series": [
      {
        "key": "ax-lung",
        "name": "肺窗轴位",
        "en": "Lung",
        "frames": 93,
        "images": [
          "/data/imaging-samples/PUB-002/ax-lung-001.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-002.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-003.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-004.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-005.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-006.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-007.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-008.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-009.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-010.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-011.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-012.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-013.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-014.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-015.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-016.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-017.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-018.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-019.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-020.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-021.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-022.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-023.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-024.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-025.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-026.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-027.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-028.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-029.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-030.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-031.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-032.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-033.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-034.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-035.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-036.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-037.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-038.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-039.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-040.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-041.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-042.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-043.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-044.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-045.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-046.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-047.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-048.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-049.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-050.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-051.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-052.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-053.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-054.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-055.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-056.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-057.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-058.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-059.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-060.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-061.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-062.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-063.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-064.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-065.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-066.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-067.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-068.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-069.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-070.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-071.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-072.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-073.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-074.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-075.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-076.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-077.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-078.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-079.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-080.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-081.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-082.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-083.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-084.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-085.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-086.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-087.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-088.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-089.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-090.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-091.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-092.jpg",
          "/data/imaging-samples/PUB-002/ax-lung-093.jpg"
        ],
        "window": {
          "WW": 1500,
          "WL": -600
        }
      },
      {
        "key": "ax-med",
        "name": "纵隔窗轴位",
        "en": "Mediastinum",
        "frames": 93,
        "images": [
          "/data/imaging-samples/PUB-002/ax-med-001.jpg",
          "/data/imaging-samples/PUB-002/ax-med-002.jpg",
          "/data/imaging-samples/PUB-002/ax-med-003.jpg",
          "/data/imaging-samples/PUB-002/ax-med-004.jpg",
          "/data/imaging-samples/PUB-002/ax-med-005.jpg",
          "/data/imaging-samples/PUB-002/ax-med-006.jpg",
          "/data/imaging-samples/PUB-002/ax-med-007.jpg",
          "/data/imaging-samples/PUB-002/ax-med-008.jpg",
          "/data/imaging-samples/PUB-002/ax-med-009.jpg",
          "/data/imaging-samples/PUB-002/ax-med-010.jpg",
          "/data/imaging-samples/PUB-002/ax-med-011.jpg",
          "/data/imaging-samples/PUB-002/ax-med-012.jpg",
          "/data/imaging-samples/PUB-002/ax-med-013.jpg",
          "/data/imaging-samples/PUB-002/ax-med-014.jpg",
          "/data/imaging-samples/PUB-002/ax-med-015.jpg",
          "/data/imaging-samples/PUB-002/ax-med-016.jpg",
          "/data/imaging-samples/PUB-002/ax-med-017.jpg",
          "/data/imaging-samples/PUB-002/ax-med-018.jpg",
          "/data/imaging-samples/PUB-002/ax-med-019.jpg",
          "/data/imaging-samples/PUB-002/ax-med-020.jpg",
          "/data/imaging-samples/PUB-002/ax-med-021.jpg",
          "/data/imaging-samples/PUB-002/ax-med-022.jpg",
          "/data/imaging-samples/PUB-002/ax-med-023.jpg",
          "/data/imaging-samples/PUB-002/ax-med-024.jpg",
          "/data/imaging-samples/PUB-002/ax-med-025.jpg",
          "/data/imaging-samples/PUB-002/ax-med-026.jpg",
          "/data/imaging-samples/PUB-002/ax-med-027.jpg",
          "/data/imaging-samples/PUB-002/ax-med-028.jpg",
          "/data/imaging-samples/PUB-002/ax-med-029.jpg",
          "/data/imaging-samples/PUB-002/ax-med-030.jpg",
          "/data/imaging-samples/PUB-002/ax-med-031.jpg",
          "/data/imaging-samples/PUB-002/ax-med-032.jpg",
          "/data/imaging-samples/PUB-002/ax-med-033.jpg",
          "/data/imaging-samples/PUB-002/ax-med-034.jpg",
          "/data/imaging-samples/PUB-002/ax-med-035.jpg",
          "/data/imaging-samples/PUB-002/ax-med-036.jpg",
          "/data/imaging-samples/PUB-002/ax-med-037.jpg",
          "/data/imaging-samples/PUB-002/ax-med-038.jpg",
          "/data/imaging-samples/PUB-002/ax-med-039.jpg",
          "/data/imaging-samples/PUB-002/ax-med-040.jpg",
          "/data/imaging-samples/PUB-002/ax-med-041.jpg",
          "/data/imaging-samples/PUB-002/ax-med-042.jpg",
          "/data/imaging-samples/PUB-002/ax-med-043.jpg",
          "/data/imaging-samples/PUB-002/ax-med-044.jpg",
          "/data/imaging-samples/PUB-002/ax-med-045.jpg",
          "/data/imaging-samples/PUB-002/ax-med-046.jpg",
          "/data/imaging-samples/PUB-002/ax-med-047.jpg",
          "/data/imaging-samples/PUB-002/ax-med-048.jpg",
          "/data/imaging-samples/PUB-002/ax-med-049.jpg",
          "/data/imaging-samples/PUB-002/ax-med-050.jpg",
          "/data/imaging-samples/PUB-002/ax-med-051.jpg",
          "/data/imaging-samples/PUB-002/ax-med-052.jpg",
          "/data/imaging-samples/PUB-002/ax-med-053.jpg",
          "/data/imaging-samples/PUB-002/ax-med-054.jpg",
          "/data/imaging-samples/PUB-002/ax-med-055.jpg",
          "/data/imaging-samples/PUB-002/ax-med-056.jpg",
          "/data/imaging-samples/PUB-002/ax-med-057.jpg",
          "/data/imaging-samples/PUB-002/ax-med-058.jpg",
          "/data/imaging-samples/PUB-002/ax-med-059.jpg",
          "/data/imaging-samples/PUB-002/ax-med-060.jpg",
          "/data/imaging-samples/PUB-002/ax-med-061.jpg",
          "/data/imaging-samples/PUB-002/ax-med-062.jpg",
          "/data/imaging-samples/PUB-002/ax-med-063.jpg",
          "/data/imaging-samples/PUB-002/ax-med-064.jpg",
          "/data/imaging-samples/PUB-002/ax-med-065.jpg",
          "/data/imaging-samples/PUB-002/ax-med-066.jpg",
          "/data/imaging-samples/PUB-002/ax-med-067.jpg",
          "/data/imaging-samples/PUB-002/ax-med-068.jpg",
          "/data/imaging-samples/PUB-002/ax-med-069.jpg",
          "/data/imaging-samples/PUB-002/ax-med-070.jpg",
          "/data/imaging-samples/PUB-002/ax-med-071.jpg",
          "/data/imaging-samples/PUB-002/ax-med-072.jpg",
          "/data/imaging-samples/PUB-002/ax-med-073.jpg",
          "/data/imaging-samples/PUB-002/ax-med-074.jpg",
          "/data/imaging-samples/PUB-002/ax-med-075.jpg",
          "/data/imaging-samples/PUB-002/ax-med-076.jpg",
          "/data/imaging-samples/PUB-002/ax-med-077.jpg",
          "/data/imaging-samples/PUB-002/ax-med-078.jpg",
          "/data/imaging-samples/PUB-002/ax-med-079.jpg",
          "/data/imaging-samples/PUB-002/ax-med-080.jpg",
          "/data/imaging-samples/PUB-002/ax-med-081.jpg",
          "/data/imaging-samples/PUB-002/ax-med-082.jpg",
          "/data/imaging-samples/PUB-002/ax-med-083.jpg",
          "/data/imaging-samples/PUB-002/ax-med-084.jpg",
          "/data/imaging-samples/PUB-002/ax-med-085.jpg",
          "/data/imaging-samples/PUB-002/ax-med-086.jpg",
          "/data/imaging-samples/PUB-002/ax-med-087.jpg",
          "/data/imaging-samples/PUB-002/ax-med-088.jpg",
          "/data/imaging-samples/PUB-002/ax-med-089.jpg",
          "/data/imaging-samples/PUB-002/ax-med-090.jpg",
          "/data/imaging-samples/PUB-002/ax-med-091.jpg",
          "/data/imaging-samples/PUB-002/ax-med-092.jpg",
          "/data/imaging-samples/PUB-002/ax-med-093.jpg"
        ],
        "window": {
          "WW": 400,
          "WL": 40
        }
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "50–59 岁",
      "sex": "男",
      "dept": "呼吸内科",
      "examNo": "****9002",
      "imageNo": "****9102",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-08-14 10:05"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": true,
      "isTumor": true,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "胸部 CT 增强扫描，肺窗及纵隔窗观察。",
      "findings": "左肺上叶前部见不规则软组织肿块，最大横断面约 28 mm × 22 mm，上下径约 36 mm（12 个层面，层厚 3 mm）；病灶边缘见条索状影向前胸膜及前纵隔延伸，局部与纵隔分界欠清；增强后病灶呈不均匀强化，其内可见相对低强化区；双肺门及纵隔未见明确肿大淋巴结；双侧胸腔未见积液；余肺野未见明确异常。",
      "impression": "左肺上叶前部肿块（约 2.8 cm）。定位：左肺上叶前段，邻近前胸膜与前纵隔。定性：肺恶性肿瘤可能大。依据：不规则软组织肿块、边缘条索影与胸膜及纵隔相连、增强后不均匀强化。建议：行支气管镜或 CT 引导下经皮穿刺活检明确病理，并完善胸部增强 CT 分期评估。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "公开数据集样例：NSCLC-Radiomics（TCIA，CC BY 3.0）LUNG1-112 · 病灶尺寸取自数据集 GTV 勾画 · 标准报告由 AI 逐例读片起草，未经医师复核 · 临床信息与一般信息为占位值",
    "sourceDataset": "NSCLC-Radiomics (TCIA)",
    "sourceLicense": "CC BY 3.0",
    "sourceCaseId": "LUNG1-112",
    "sourceFacts": {
      "spacingMm": [
        0.9766,
        0.9766,
        3
      ],
      "exportedSlices": 93,
      "lesionSide": "left",
      "lesionEquivDiamMm": 24.9,
      "lesionHeadFraction": 0.29,
      "contrastConfirmedBy": "visual"
    },
    "createdBy": "公开数据集导入",
    "updatedBy": "公开数据集导入",
    "createdAt": "2026-09-20 02:10",
    "updatedAt": "2026-09-20 02:10",
    "publishedAt": "2026-09-20 02:10"
  },
  {
    "id": "PUB-003",
    "title": "CT · 右肺上叶巨大肿块（纵隔旁）",
    "modality": "CT",
    "bodyPart": "胸部",
    "level": "R2",
    "icon": "fa-lungs",
    "clinicalBrief": "胸痛、消瘦 3 个月，行胸部 CT 平扫。",
    "series": [
      {
        "key": "ax-lung",
        "name": "肺窗轴位",
        "en": "Lung",
        "frames": 75,
        "images": [
          "/data/imaging-samples/PUB-003/ax-lung-001.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-002.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-003.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-004.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-005.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-006.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-007.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-008.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-009.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-010.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-011.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-012.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-013.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-014.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-015.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-016.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-017.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-018.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-019.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-020.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-021.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-022.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-023.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-024.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-025.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-026.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-027.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-028.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-029.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-030.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-031.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-032.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-033.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-034.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-035.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-036.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-037.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-038.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-039.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-040.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-041.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-042.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-043.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-044.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-045.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-046.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-047.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-048.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-049.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-050.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-051.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-052.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-053.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-054.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-055.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-056.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-057.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-058.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-059.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-060.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-061.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-062.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-063.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-064.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-065.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-066.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-067.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-068.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-069.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-070.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-071.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-072.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-073.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-074.jpg",
          "/data/imaging-samples/PUB-003/ax-lung-075.jpg"
        ],
        "window": {
          "WW": 1500,
          "WL": -600
        }
      },
      {
        "key": "ax-med",
        "name": "纵隔窗轴位",
        "en": "Mediastinum",
        "frames": 75,
        "images": [
          "/data/imaging-samples/PUB-003/ax-med-001.jpg",
          "/data/imaging-samples/PUB-003/ax-med-002.jpg",
          "/data/imaging-samples/PUB-003/ax-med-003.jpg",
          "/data/imaging-samples/PUB-003/ax-med-004.jpg",
          "/data/imaging-samples/PUB-003/ax-med-005.jpg",
          "/data/imaging-samples/PUB-003/ax-med-006.jpg",
          "/data/imaging-samples/PUB-003/ax-med-007.jpg",
          "/data/imaging-samples/PUB-003/ax-med-008.jpg",
          "/data/imaging-samples/PUB-003/ax-med-009.jpg",
          "/data/imaging-samples/PUB-003/ax-med-010.jpg",
          "/data/imaging-samples/PUB-003/ax-med-011.jpg",
          "/data/imaging-samples/PUB-003/ax-med-012.jpg",
          "/data/imaging-samples/PUB-003/ax-med-013.jpg",
          "/data/imaging-samples/PUB-003/ax-med-014.jpg",
          "/data/imaging-samples/PUB-003/ax-med-015.jpg",
          "/data/imaging-samples/PUB-003/ax-med-016.jpg",
          "/data/imaging-samples/PUB-003/ax-med-017.jpg",
          "/data/imaging-samples/PUB-003/ax-med-018.jpg",
          "/data/imaging-samples/PUB-003/ax-med-019.jpg",
          "/data/imaging-samples/PUB-003/ax-med-020.jpg",
          "/data/imaging-samples/PUB-003/ax-med-021.jpg",
          "/data/imaging-samples/PUB-003/ax-med-022.jpg",
          "/data/imaging-samples/PUB-003/ax-med-023.jpg",
          "/data/imaging-samples/PUB-003/ax-med-024.jpg",
          "/data/imaging-samples/PUB-003/ax-med-025.jpg",
          "/data/imaging-samples/PUB-003/ax-med-026.jpg",
          "/data/imaging-samples/PUB-003/ax-med-027.jpg",
          "/data/imaging-samples/PUB-003/ax-med-028.jpg",
          "/data/imaging-samples/PUB-003/ax-med-029.jpg",
          "/data/imaging-samples/PUB-003/ax-med-030.jpg",
          "/data/imaging-samples/PUB-003/ax-med-031.jpg",
          "/data/imaging-samples/PUB-003/ax-med-032.jpg",
          "/data/imaging-samples/PUB-003/ax-med-033.jpg",
          "/data/imaging-samples/PUB-003/ax-med-034.jpg",
          "/data/imaging-samples/PUB-003/ax-med-035.jpg",
          "/data/imaging-samples/PUB-003/ax-med-036.jpg",
          "/data/imaging-samples/PUB-003/ax-med-037.jpg",
          "/data/imaging-samples/PUB-003/ax-med-038.jpg",
          "/data/imaging-samples/PUB-003/ax-med-039.jpg",
          "/data/imaging-samples/PUB-003/ax-med-040.jpg",
          "/data/imaging-samples/PUB-003/ax-med-041.jpg",
          "/data/imaging-samples/PUB-003/ax-med-042.jpg",
          "/data/imaging-samples/PUB-003/ax-med-043.jpg",
          "/data/imaging-samples/PUB-003/ax-med-044.jpg",
          "/data/imaging-samples/PUB-003/ax-med-045.jpg",
          "/data/imaging-samples/PUB-003/ax-med-046.jpg",
          "/data/imaging-samples/PUB-003/ax-med-047.jpg",
          "/data/imaging-samples/PUB-003/ax-med-048.jpg",
          "/data/imaging-samples/PUB-003/ax-med-049.jpg",
          "/data/imaging-samples/PUB-003/ax-med-050.jpg",
          "/data/imaging-samples/PUB-003/ax-med-051.jpg",
          "/data/imaging-samples/PUB-003/ax-med-052.jpg",
          "/data/imaging-samples/PUB-003/ax-med-053.jpg",
          "/data/imaging-samples/PUB-003/ax-med-054.jpg",
          "/data/imaging-samples/PUB-003/ax-med-055.jpg",
          "/data/imaging-samples/PUB-003/ax-med-056.jpg",
          "/data/imaging-samples/PUB-003/ax-med-057.jpg",
          "/data/imaging-samples/PUB-003/ax-med-058.jpg",
          "/data/imaging-samples/PUB-003/ax-med-059.jpg",
          "/data/imaging-samples/PUB-003/ax-med-060.jpg",
          "/data/imaging-samples/PUB-003/ax-med-061.jpg",
          "/data/imaging-samples/PUB-003/ax-med-062.jpg",
          "/data/imaging-samples/PUB-003/ax-med-063.jpg",
          "/data/imaging-samples/PUB-003/ax-med-064.jpg",
          "/data/imaging-samples/PUB-003/ax-med-065.jpg",
          "/data/imaging-samples/PUB-003/ax-med-066.jpg",
          "/data/imaging-samples/PUB-003/ax-med-067.jpg",
          "/data/imaging-samples/PUB-003/ax-med-068.jpg",
          "/data/imaging-samples/PUB-003/ax-med-069.jpg",
          "/data/imaging-samples/PUB-003/ax-med-070.jpg",
          "/data/imaging-samples/PUB-003/ax-med-071.jpg",
          "/data/imaging-samples/PUB-003/ax-med-072.jpg",
          "/data/imaging-samples/PUB-003/ax-med-073.jpg",
          "/data/imaging-samples/PUB-003/ax-med-074.jpg",
          "/data/imaging-samples/PUB-003/ax-med-075.jpg"
        ],
        "window": {
          "WW": 400,
          "WL": 40
        }
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "60–69 岁",
      "sex": "男",
      "dept": "胸外科",
      "examNo": "****9003",
      "imageNo": "****9103",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-08-18 14:40"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": true,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "胸部 CT 平扫，肺窗及纵隔窗观察。",
      "findings": "右肺上叶后部见巨大软组织肿块，最大横断面约 77 mm × 52 mm，上下径约 54 mm（18 个层面，层厚 3 mm）；病灶内侧与纵隔紧贴、分界欠清，后缘与后胸壁相邻，局部胸膜增厚；肿块密度不均匀，边缘可见分叶；右肺上叶支气管显示欠清，远侧肺野见斑片状密度增高影，考虑阻塞性改变；左肺野未见明确异常；双侧胸腔未见明确积液。",
      "impression": "右肺上叶后部巨大肿块（约 7.7 cm）。定位：右肺上叶后段，内侧与纵隔分界欠清。定性：中央型肺恶性肿瘤可能大。依据：肿块巨大、边缘分叶、与纵隔及后胸壁关系密切、远侧肺野阻塞性改变。建议：行胸部增强 CT 评估纵隔侵犯与血管关系并分期，尽快支气管镜或穿刺活检明确病理。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "公开数据集样例：NSCLC-Radiomics（TCIA，CC BY 3.0）LUNG1-238 · 病灶尺寸取自数据集 GTV 勾画 · 标准报告由 AI 逐例读片起草，未经医师复核 · 临床信息与一般信息为占位值",
    "sourceDataset": "NSCLC-Radiomics (TCIA)",
    "sourceLicense": "CC BY 3.0",
    "sourceCaseId": "LUNG1-238",
    "sourceFacts": {
      "spacingMm": [
        0.9766,
        0.9766,
        3
      ],
      "exportedSlices": 75,
      "lesionSide": "right",
      "lesionEquivDiamMm": 48.5,
      "lesionHeadFraction": 0.179,
      "contrastConfirmedBy": "visual"
    },
    "createdBy": "公开数据集导入",
    "updatedBy": "公开数据集导入",
    "createdAt": "2026-09-20 02:10",
    "updatedAt": "2026-09-20 02:10",
    "publishedAt": "2026-09-20 02:10"
  },
  {
    "id": "PUB-004",
    "title": "CT · 右肺下叶内侧肿块",
    "modality": "CT",
    "bodyPart": "胸部",
    "level": "R1",
    "icon": "fa-lungs",
    "clinicalBrief": "体检发现右肺下叶占位，行胸部 CT 平扫。",
    "series": [
      {
        "key": "ax-lung",
        "name": "肺窗轴位",
        "en": "Lung",
        "frames": 86,
        "images": [
          "/data/imaging-samples/PUB-004/ax-lung-001.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-002.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-003.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-004.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-005.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-006.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-007.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-008.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-009.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-010.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-011.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-012.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-013.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-014.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-015.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-016.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-017.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-018.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-019.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-020.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-021.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-022.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-023.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-024.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-025.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-026.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-027.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-028.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-029.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-030.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-031.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-032.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-033.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-034.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-035.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-036.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-037.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-038.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-039.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-040.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-041.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-042.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-043.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-044.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-045.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-046.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-047.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-048.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-049.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-050.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-051.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-052.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-053.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-054.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-055.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-056.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-057.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-058.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-059.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-060.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-061.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-062.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-063.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-064.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-065.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-066.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-067.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-068.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-069.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-070.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-071.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-072.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-073.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-074.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-075.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-076.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-077.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-078.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-079.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-080.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-081.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-082.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-083.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-084.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-085.jpg",
          "/data/imaging-samples/PUB-004/ax-lung-086.jpg"
        ],
        "window": {
          "WW": 1500,
          "WL": -600
        }
      },
      {
        "key": "ax-med",
        "name": "纵隔窗轴位",
        "en": "Mediastinum",
        "frames": 86,
        "images": [
          "/data/imaging-samples/PUB-004/ax-med-001.jpg",
          "/data/imaging-samples/PUB-004/ax-med-002.jpg",
          "/data/imaging-samples/PUB-004/ax-med-003.jpg",
          "/data/imaging-samples/PUB-004/ax-med-004.jpg",
          "/data/imaging-samples/PUB-004/ax-med-005.jpg",
          "/data/imaging-samples/PUB-004/ax-med-006.jpg",
          "/data/imaging-samples/PUB-004/ax-med-007.jpg",
          "/data/imaging-samples/PUB-004/ax-med-008.jpg",
          "/data/imaging-samples/PUB-004/ax-med-009.jpg",
          "/data/imaging-samples/PUB-004/ax-med-010.jpg",
          "/data/imaging-samples/PUB-004/ax-med-011.jpg",
          "/data/imaging-samples/PUB-004/ax-med-012.jpg",
          "/data/imaging-samples/PUB-004/ax-med-013.jpg",
          "/data/imaging-samples/PUB-004/ax-med-014.jpg",
          "/data/imaging-samples/PUB-004/ax-med-015.jpg",
          "/data/imaging-samples/PUB-004/ax-med-016.jpg",
          "/data/imaging-samples/PUB-004/ax-med-017.jpg",
          "/data/imaging-samples/PUB-004/ax-med-018.jpg",
          "/data/imaging-samples/PUB-004/ax-med-019.jpg",
          "/data/imaging-samples/PUB-004/ax-med-020.jpg",
          "/data/imaging-samples/PUB-004/ax-med-021.jpg",
          "/data/imaging-samples/PUB-004/ax-med-022.jpg",
          "/data/imaging-samples/PUB-004/ax-med-023.jpg",
          "/data/imaging-samples/PUB-004/ax-med-024.jpg",
          "/data/imaging-samples/PUB-004/ax-med-025.jpg",
          "/data/imaging-samples/PUB-004/ax-med-026.jpg",
          "/data/imaging-samples/PUB-004/ax-med-027.jpg",
          "/data/imaging-samples/PUB-004/ax-med-028.jpg",
          "/data/imaging-samples/PUB-004/ax-med-029.jpg",
          "/data/imaging-samples/PUB-004/ax-med-030.jpg",
          "/data/imaging-samples/PUB-004/ax-med-031.jpg",
          "/data/imaging-samples/PUB-004/ax-med-032.jpg",
          "/data/imaging-samples/PUB-004/ax-med-033.jpg",
          "/data/imaging-samples/PUB-004/ax-med-034.jpg",
          "/data/imaging-samples/PUB-004/ax-med-035.jpg",
          "/data/imaging-samples/PUB-004/ax-med-036.jpg",
          "/data/imaging-samples/PUB-004/ax-med-037.jpg",
          "/data/imaging-samples/PUB-004/ax-med-038.jpg",
          "/data/imaging-samples/PUB-004/ax-med-039.jpg",
          "/data/imaging-samples/PUB-004/ax-med-040.jpg",
          "/data/imaging-samples/PUB-004/ax-med-041.jpg",
          "/data/imaging-samples/PUB-004/ax-med-042.jpg",
          "/data/imaging-samples/PUB-004/ax-med-043.jpg",
          "/data/imaging-samples/PUB-004/ax-med-044.jpg",
          "/data/imaging-samples/PUB-004/ax-med-045.jpg",
          "/data/imaging-samples/PUB-004/ax-med-046.jpg",
          "/data/imaging-samples/PUB-004/ax-med-047.jpg",
          "/data/imaging-samples/PUB-004/ax-med-048.jpg",
          "/data/imaging-samples/PUB-004/ax-med-049.jpg",
          "/data/imaging-samples/PUB-004/ax-med-050.jpg",
          "/data/imaging-samples/PUB-004/ax-med-051.jpg",
          "/data/imaging-samples/PUB-004/ax-med-052.jpg",
          "/data/imaging-samples/PUB-004/ax-med-053.jpg",
          "/data/imaging-samples/PUB-004/ax-med-054.jpg",
          "/data/imaging-samples/PUB-004/ax-med-055.jpg",
          "/data/imaging-samples/PUB-004/ax-med-056.jpg",
          "/data/imaging-samples/PUB-004/ax-med-057.jpg",
          "/data/imaging-samples/PUB-004/ax-med-058.jpg",
          "/data/imaging-samples/PUB-004/ax-med-059.jpg",
          "/data/imaging-samples/PUB-004/ax-med-060.jpg",
          "/data/imaging-samples/PUB-004/ax-med-061.jpg",
          "/data/imaging-samples/PUB-004/ax-med-062.jpg",
          "/data/imaging-samples/PUB-004/ax-med-063.jpg",
          "/data/imaging-samples/PUB-004/ax-med-064.jpg",
          "/data/imaging-samples/PUB-004/ax-med-065.jpg",
          "/data/imaging-samples/PUB-004/ax-med-066.jpg",
          "/data/imaging-samples/PUB-004/ax-med-067.jpg",
          "/data/imaging-samples/PUB-004/ax-med-068.jpg",
          "/data/imaging-samples/PUB-004/ax-med-069.jpg",
          "/data/imaging-samples/PUB-004/ax-med-070.jpg",
          "/data/imaging-samples/PUB-004/ax-med-071.jpg",
          "/data/imaging-samples/PUB-004/ax-med-072.jpg",
          "/data/imaging-samples/PUB-004/ax-med-073.jpg",
          "/data/imaging-samples/PUB-004/ax-med-074.jpg",
          "/data/imaging-samples/PUB-004/ax-med-075.jpg",
          "/data/imaging-samples/PUB-004/ax-med-076.jpg",
          "/data/imaging-samples/PUB-004/ax-med-077.jpg",
          "/data/imaging-samples/PUB-004/ax-med-078.jpg",
          "/data/imaging-samples/PUB-004/ax-med-079.jpg",
          "/data/imaging-samples/PUB-004/ax-med-080.jpg",
          "/data/imaging-samples/PUB-004/ax-med-081.jpg",
          "/data/imaging-samples/PUB-004/ax-med-082.jpg",
          "/data/imaging-samples/PUB-004/ax-med-083.jpg",
          "/data/imaging-samples/PUB-004/ax-med-084.jpg",
          "/data/imaging-samples/PUB-004/ax-med-085.jpg",
          "/data/imaging-samples/PUB-004/ax-med-086.jpg"
        ],
        "window": {
          "WW": 400,
          "WL": 40
        }
      }
    ],
    "deidentify": {
      "name": "患*",
      "ageRange": "60–69 岁",
      "sex": "男",
      "dept": "呼吸内科",
      "examNo": "****9004",
      "imageNo": "****9104",
      "inpatientNo": "****",
      "cardNo": "****",
      "examTime": "2026-08-20 11:15"
    },
    "capabilities": {
      "hasMeasurement": false,
      "hasPriorExam": false,
      "hasEnhancedPhase": false,
      "isTumor": true,
      "hasStagingInfo": false
    },
    "goldStandard": {
      "technique": "胸部 CT 平扫，肺窗及纵隔窗观察。",
      "findings": "右肺下叶内侧见不规则软组织肿块，最大横断面约 40 mm × 30 mm，上下径约 27 mm（9 个层面，层厚 3 mm）；病灶内侧紧邻纵隔，下方与膈肌及肝脏相邻；边缘可见浅分叶，并见条索影与纵隔胸膜相连；密度较均匀，未见明确钙化及空洞；右肺下叶支气管显示欠清；双肺门及纵隔未见明确肿大淋巴结；双侧胸腔未见积液。",
      "impression": "右肺下叶内侧肿块（约 4.0 cm）。定位：右肺下叶内侧基底段，邻近纵隔与膈肌。定性：肺恶性肿瘤可能大。依据：不规则软组织肿块、边缘浅分叶伴条索、与纵隔胸膜关系密切。建议：行胸部增强 CT 进一步评估纵隔关系与分期，并行穿刺活检明确病理。"
    },
    "version": 1,
    "status": "published",
    "isSample": true,
    "sampleNote": "公开数据集样例：NSCLC-Radiomics（TCIA，CC BY 3.0）LUNG1-266 · 病灶尺寸取自数据集 GTV 勾画 · 标准报告由 AI 逐例读片起草，未经医师复核 · 临床信息与一般信息为占位值",
    "sourceDataset": "NSCLC-Radiomics (TCIA)",
    "sourceLicense": "CC BY 3.0",
    "sourceCaseId": "LUNG1-266",
    "sourceFacts": {
      "spacingMm": [
        0.9766,
        0.9766,
        3
      ],
      "exportedSlices": 86,
      "lesionSide": "right",
      "lesionEquivDiamMm": 27.5,
      "lesionHeadFraction": 0.651,
      "contrastConfirmedBy": "visual"
    },
    "createdBy": "公开数据集导入",
    "updatedBy": "公开数据集导入",
    "createdAt": "2026-09-20 02:10",
    "updatedAt": "2026-09-20 02:10",
    "publishedAt": "2026-09-20 02:10"
  }
]

export const PUB_RUBRIC = {
  "PUB-001": {
    "version": 1,
    "updatedAt": "2026-09-20 02:10",
    "updatedBy": "公开数据集导入",
    "items": {
      "FIND-01": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "按‘检查技术→影像所见→诊断意见’三级结构组织报告",
            "accept": []
          },
          {
            "id": "p2",
            "text": "影像所见部分采用总—分结构：先总述病灶存在，再分述部位、大小、形态、密度、邻近结构及重要阴性征象",
            "accept": []
          },
          {
            "id": "p3",
            "text": "无冗余描述（如未提及支气管充气征、血管集束等本例不存在且未要求评估的征象）",
            "accept": []
          }
        ]
      },
      "FIND-02": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "先描述病灶本身（部位→大小→形态→密度→边界→特殊征象），再描述相关解剖结构（肺门、纵隔、胸腔、余肺野）",
            "accept": []
          },
          {
            "id": "p2",
            "text": "病灶描述顺序符合‘由主到次、由内到外、由实到虚’临床阅片逻辑：先结节，后淋巴结，再胸腔积液，最后余肺野",
            "accept": []
          }
        ]
      },
      "FIND-03": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确写出病灶位于右肺上叶外周部",
            "accept": [
              "右肺上叶外带",
              "右肺上叶周边区域",
              "右肺上叶胸膜下区"
            ]
          },
          {
            "id": "p2",
            "text": "明确指出病灶邻近胸膜",
            "accept": [
              "紧贴胸膜",
              "贴近胸膜",
              "位于胸膜下",
              "与胸膜关系密切"
            ]
          }
        ]
      },
      "FIND-04": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "给出最大横断面二维尺寸（15 mm × 13 mm）",
            "accept": [
              "15×13 mm",
              "横径15 mm、矢状径13 mm",
              "层面最大径15 mm和13 mm"
            ]
          },
          {
            "id": "p2",
            "text": "给出上下径（12 mm）或注明‘约4个层面，层厚3 mm’以支持上下径推算合理性",
            "accept": [
              "上下径约12 mm",
              "纵径约12 mm",
              "垂直径约12 mm",
              "跨越4层（3 mm/层），推算高度约12 mm"
            ]
          }
        ]
      },
      "FIND-05": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "描述为‘类圆形’",
            "accept": [
              "类圆形",
              "近圆形",
              "大致圆形",
              "卵圆形"
            ]
          },
          {
            "id": "p2",
            "text": "描述边缘‘较光整’，且明确否定‘毛刺’和‘胸膜牵拉’",
            "accept": [
              "边缘光滑",
              "边界清楚光整",
              "无毛刺征、无胸膜凹陷征",
              "未见毛刺及胸膜牵拉"
            ]
          }
        ]
      },
      "FIND-06": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "描述为‘软组织密度’",
            "accept": [
              "软组织密度",
              "类似肌肉密度",
              "与胸壁肌肉密度相近",
              "呈均匀软组织密度"
            ]
          },
          {
            "id": "p2",
            "text": "明确否定钙化与空洞",
            "accept": [
              "未见钙化及空洞",
              "无钙化、无空洞",
              "未见钙化影、未见含气空腔",
              "无钙化，无空洞形成"
            ]
          }
        ]
      },
      "FIND-07": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确描述‘双肺门及纵隔未见明确肿大淋巴结’",
            "accept": [
              "肺门及纵隔淋巴结无肿大",
              "未见肿大肺门或纵隔淋巴结",
              "肺门、纵隔淋巴结大小正常",
              "无肺门或纵隔淋巴结增大"
            ]
          },
          {
            "id": "p2",
            "text": "明确描述‘双侧胸腔未见积液’",
            "accept": [
              "双侧胸腔无积液",
              "未见胸腔积液",
              "胸腔无游离液体",
              "双侧胸膜腔未见异常液体密度"
            ]
          }
        ]
      },
      "IMP-01": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "回应临床问题‘体检发现右肺结节’，在诊断意见中直接点明‘右肺上叶外周实性结节’",
            "accept": [
              "右肺上叶实性结节",
              "右肺上叶外周部实性结节",
              "右肺上叶周围型实性结节",
              "右肺上叶胸膜下实性结节"
            ]
          }
        ]
      },
      "IMP-02": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "定位表述包含‘右肺上叶’+‘外周部’+‘邻近胸膜’三层信息",
            "accept": [
              "右肺上叶外周胸膜下",
              "右肺上叶外带邻近胸膜",
              "右肺上叶周边区域、贴近胸膜",
              "右肺上叶胸膜下区"
            ]
          }
        ]
      },
      "IMP-03": {
        "rules": "本例为不典型结节，无典型良性（如爆米花样钙化）或恶性（如分叶毛刺）绝对特征，故不适用‘典型病变明确诊断’；该条仅判定是否错误地给出确定性诊断（如直接写‘肺癌’或‘结核球’）",
        "points": [
          {
            "id": "p1",
            "text": "未将结节直接诊断为恶性肿瘤（如未写‘肺癌’‘腺癌’‘恶性结节’）",
            "accept": []
          },
          {
            "id": "p2",
            "text": "未将结节直接诊断为特定良性病（如未写‘结核球’‘错构瘤’‘炎性假瘤’）",
            "accept": []
          }
        ]
      },
      "IMP-04": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确写出‘良性结节与早期肺恶性病变均有可能’",
            "accept": [
              "良性与恶性均不能排除",
              "良恶性鉴别困难",
              "需警惕早期恶性可能，但亦可为良性",
              "不能除外早期肺癌，亦可为良性结节"
            ]
          },
          {
            "id": "p2",
            "text": "给出定性依据：‘结节边界较光整、密度均匀、无毛刺及胸膜牵拉’",
            "accept": [
              "边界光整、密度均匀、无毛刺及胸膜牵拉",
              "边缘清楚、密度均质、无恶性征象",
              "无分叶、毛刺、胸膜凹陷、血管集束等恶性征象",
              "缺乏典型恶性CT征象"
            ]
          }
        ]
      },
      "IMP-05": {
        "rules": "本例为孤立实性结节，无淋巴结转移或远处转移证据，未达T2及以上分期条件；若报告错误给出‘T1a’‘IA期’等分期即为扣分项",
        "points": [
          {
            "id": "p1",
            "text": "未进行TNM分期或临床分期（如未出现‘T1a’‘IA期’‘cT1aN0M0’等表述）",
            "accept": []
          }
        ]
      },
      "IMP-06": {
        "rules": "依据《中国肺癌筛查与早诊早治指南（2021）》及Lung-RADS 2.0，≥8 mm实性结节属高危，建议3个月复查；本条判定是否符合该规范导向",
        "points": [
          {
            "id": "p1",
            "text": "建议‘3个月后复查胸部CT薄层重建’",
            "accept": [
              "3个月复查薄层CT",
              "3个月后行胸部薄层CT随访",
              "建议3个月CT随访（薄层）",
              "3个月后复查CT（薄层重建）"
            ]
          }
        ]
      },
      "IMP-07": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "建议‘调阅既往影像对比’",
            "accept": [
              "建议回顾既往胸部影像",
              "建议对照旧片",
              "建议结合既往CT比较",
              "建议查阅历史影像资料"
            ]
          },
          {
            "id": "p2",
            "text": "建议‘若增大或出现恶性征象，行PET-CT或穿刺活检’",
            "accept": [
              "如增大或出现恶性征象，建议PET-CT或穿刺",
              "若进展，可行PET-CT或活检",
              "随访中若变化，考虑PET-CT或病理确诊",
              "增大或新发恶性征象时，推荐进一步检查（PET-CT或活检）"
            ]
          }
        ]
      },
      "IMP-08": {
        "rules": "本例无提供既往影像，故不得虚构比较结果；仅允许写‘调阅既往影像对比’，禁止出现‘较前增大’‘稳定’‘缩小’等无依据判断",
        "points": [
          {
            "id": "p1",
            "text": "未对病灶变化趋势做出任何判断（如未出现‘较前增大’‘大小稳定’‘已缩小’等表述）",
            "accept": []
          },
          {
            "id": "p2",
            "text": "仅建议‘调阅既往影像对比’，未越界给出结论",
            "accept": [
              "建议对照既往检查",
              "建议结合旧片分析",
              "建议回顾历史影像",
              "建议与既往影像学检查对比"
            ]
          }
        ]
      }
    },
    "extracted": true
  },
  "PUB-002": {
    "version": 1,
    "updatedAt": "2026-09-20 02:10",
    "updatedBy": "公开数据集导入",
    "items": {
      "FIND-01": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "报告包含检查技术、影像所见、诊断意见三大部分，结构完整",
            "accept": []
          },
          {
            "id": "p2",
            "text": "影像所见按病灶本身（大小、形态、边界、强化）、邻近结构关系、区域淋巴结、胸腔、余肺野顺序描述",
            "accept": []
          },
          {
            "id": "p3",
            "text": "无重复描述、无逻辑跳跃（如先写强化再写形态）、无遗漏关键观察维度",
            "accept": []
          }
        ]
      },
      "FIND-02": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "先描述病灶主体（左肺上叶前部肿块），再描述其与邻近结构关系（向前胸膜及前纵隔延伸），最后描述区域淋巴结、胸腔、余肺野",
            "accept": []
          },
          {
            "id": "p2",
            "text": "未将阴性征象（如‘双侧胸腔未见积液’）置于病灶阳性描述之前",
            "accept": []
          }
        ]
      },
      "FIND-03": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确写出病灶位于‘左肺上叶前部’",
            "accept": [
              "左肺上叶前段",
              "左肺上叶前部（前段）",
              "左肺上叶前区"
            ]
          },
          {
            "id": "p2",
            "text": "明确指出病灶累及/毗邻‘前胸膜’及‘前纵隔’",
            "accept": [
              "与前胸膜及前纵隔相邻",
              "紧贴前胸膜并延伸至前纵隔",
              "邻近前胸膜和前纵隔"
            ]
          }
        ]
      },
      "FIND-04": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确给出病灶最大横断面尺寸为‘28 mm × 22 mm’",
            "accept": [
              "2.8 cm × 2.2 cm",
              "约28×22 mm",
              "28毫米×22毫米"
            ]
          },
          {
            "id": "p2",
            "text": "明确给出上下径为‘36 mm’（或‘约3.6 cm’），并注明测量依据为‘12个层面，层厚3 mm’",
            "accept": [
              "上下径36 mm（12层×3 mm）",
              "纵径36 mm（基于3 mm层厚共12层）",
              "上下径约3.6 cm，由12层推算"
            ]
          }
        ]
      },
      "FIND-05": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "描述病灶形态为‘不规则’",
            "accept": [
              "形态不规则",
              "轮廓不规则",
              "呈不规则形"
            ]
          },
          {
            "id": "p2",
            "text": "描述病灶边缘存在‘条索状影’，且该条索影‘向前胸膜及前纵隔延伸’",
            "accept": [
              "边缘见条索影连向前胸膜及前纵隔",
              "可见条索影自病灶延伸至前胸膜和前纵隔",
              "病灶边缘条索影与前胸膜、前纵隔相连"
            ]
          },
          {
            "id": "p3",
            "text": "描述病灶与纵隔‘分界欠清’",
            "accept": [
              "与纵隔界限不清",
              "同前纵隔分界模糊",
              "纵隔侧边界显示不清"
            ]
          }
        ]
      },
      "FIND-06": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确写出‘增强后病灶呈不均匀强化’",
            "accept": [
              "强化不均匀",
              "呈不均质强化",
              "强化分布不均"
            ]
          },
          {
            "id": "p2",
            "text": "明确指出‘其内可见相对低强化区’",
            "accept": [
              "内部见低强化区",
              "病灶内存在低强化灶",
              "可见低强化区域"
            ]
          }
        ]
      },
      "FIND-07": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "描述‘双肺门及纵隔未见明确肿大淋巴结’",
            "accept": [
              "纵隔及肺门淋巴结无肿大",
              "未见肿大肺门或纵隔淋巴结",
              "肺门、纵隔淋巴结未见增大"
            ]
          },
          {
            "id": "p2",
            "text": "描述‘双侧胸腔未见积液’",
            "accept": [
              "双侧胸腔无积液",
              "未见胸腔积液",
              "胸腔内未见液体密度影"
            ]
          },
          {
            "id": "p3",
            "text": "描述‘余肺野未见明确异常’",
            "accept": [
              "其余肺实质未见异常",
              "余肺未见明显病变",
              "双肺其余部分未见异常密度影"
            ]
          }
        ]
      },
      "IMP-01": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "报告回应了临床主要问题：咳嗽、痰中带血2个月，指向肺内占位性病变的排查",
            "accept": []
          },
          {
            "id": "p2",
            "text": "诊断意见直接聚焦于‘左肺上叶前部肿块’，未偏离主诉或检查目的",
            "accept": []
          }
        ]
      },
      "IMP-02": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "定位诊断明确为‘左肺上叶前段’",
            "accept": [
              "左肺上叶前部",
              "左肺上叶前区",
              "左肺上叶前段（即前部）"
            ]
          }
        ]
      },
      "IMP-03": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "本病例非典型良性表现（如无钙化、无脂肪、无囊变、无卫星灶），未给出‘良性肿瘤’‘结核球’‘炎性假瘤’等确定性良性诊断",
            "accept": []
          }
        ]
      },
      "IMP-04": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "对不典型病变给出‘肺恶性肿瘤可能大’的倾向性诊断",
            "accept": [
              "考虑恶性肿瘤可能性大",
              "高度怀疑肺恶性肿瘤",
              "肺癌可能性大"
            ]
          },
          {
            "id": "p2",
            "text": "在诊断意见中列出三项定性依据：不规则软组织肿块、边缘条索影与胸膜及纵隔相连、增强后不均匀强化",
            "accept": [
              "依据：形态不规则、胸膜牵拉、不均匀强化",
              "依据包括：不规则形态、纵隔/胸膜侵犯征象、强化不均"
            ]
          }
        ]
      },
      "IMP-05": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "虽未直接写‘T2a’或‘N0’等分期术语，但通过‘未见肿大淋巴结’‘无胸腔积液’‘无远处转移征象’等描述，支持临床可完成 TNM 分期评估",
            "accept": []
          },
          {
            "id": "p2",
            "text": "建议中明确要求‘完善胸部增强CT分期评估’",
            "accept": [
              "建议进一步行胸部增强CT以评估分期",
              "建议胸部增强CT用于肿瘤分期",
              "推荐胸部增强CT进行分期"
            ]
          }
        ]
      },
      "IMP-06": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "未将‘支气管充气征’‘空泡征’‘毛刺’等未出现的征象列为依据；所列依据（不规则、条索影、不均匀强化）均为实际影像所见",
            "accept": []
          }
        ]
      },
      "IMP-07": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确建议‘行支气管镜或CT引导下经皮穿刺活检明确病理’",
            "accept": [
              "建议支气管镜或CT引导下穿刺活检",
              "推荐气管镜或经皮穿刺获取病理",
              "可行支气管镜检查或CT引导穿刺"
            ]
          },
          {
            "id": "p2",
            "text": "明确建议‘完善胸部增强CT分期评估’",
            "accept": [
              "建议胸部增强CT分期",
              "需行胸部增强CT以明确分期",
              "推荐胸部增强CT用于分期评估"
            ]
          }
        ]
      },
      "IMP-08": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "本例为初诊检查，报告中未错误提及‘与既往片比较’或虚构对比结论",
            "accept": []
          },
          {
            "id": "p2",
            "text": "未出现‘较前增大’‘新发’‘稳定’等无依据的比较性表述",
            "accept": []
          }
        ]
      }
    },
    "extracted": true
  },
  "PUB-003": {
    "version": 1,
    "updatedAt": "2026-09-20 02:10",
    "updatedBy": "公开数据集导入",
    "items": {
      "FIND-01": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "按‘检查技术→影像所见→诊断意见’三级结构组织，无混杂或缺失任一模块",
            "accept": []
          },
          {
            "id": "p2",
            "text": "影像所见部分分句清晰、主谓宾完整，无大段粘连无标点长句",
            "accept": []
          },
          {
            "id": "p3",
            "text": "同一解剖区域（如右肺上叶）相关征象集中描述，未将病灶大小、密度、边界、邻近结构等信息碎片化散列在不同句子中",
            "accept": []
          }
        ]
      },
      "FIND-02": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "先描述病灶主体（右肺上叶肿块），再依次描述其内部特征（密度、形态）、邻近结构关系（纵隔、胸壁、支气管）、远端效应（阻塞性改变）、对侧/其他部位阴性表现（左肺、胸腔）",
            "accept": []
          },
          {
            "id": "p2",
            "text": "未颠倒顺序（如先写左肺正常再写右肺病灶，或先写建议再写所见）",
            "accept": []
          }
        ]
      },
      "FIND-03": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确写出病灶位于‘右肺上叶后部’或‘右肺上叶后段’",
            "accept": [
              "右肺上叶后部",
              "右肺上叶后段",
              "右肺上叶背段",
              "右肺上叶后基底段（注：本例为后段，但‘后基底段’属常见误写，不接受；此处accept仅含正确表述）"
            ]
          },
          {
            "id": "p2",
            "text": "准确描述与纵隔关系为‘内侧与纵隔紧贴、分界欠清’",
            "accept": [
              "内侧与纵隔紧贴、分界欠清",
              "内侧紧邻纵隔、界面模糊",
              "与纵隔相邻且界限不清",
              "纵隔旁生长、分界不清"
            ]
          },
          {
            "id": "p3",
            "text": "准确描述与后胸壁关系为‘后缘与后胸壁相邻，局部胸膜增厚’",
            "accept": [
              "后缘与后胸壁相邻，局部胸膜增厚",
              "后方邻接后胸壁伴胸膜增厚",
              "后缘贴邻后胸壁，相应胸膜增厚",
              "与后胸壁相贴，邻近胸膜增厚"
            ]
          }
        ]
      },
      "FIND-04": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "给出最大横断面尺寸‘77 mm × 52 mm’（单位mm，×连接，数值顺序为前后×左右或长×宽，本例前后径77mm＞左右径52mm）",
            "accept": [
              "77 mm × 52 mm",
              "约7.7 cm × 5.2 cm",
              "7.7×5.2 cm",
              "77×52 mm"
            ]
          },
          {
            "id": "p2",
            "text": "给出上下径‘54 mm’（或‘约5.4 cm’），并注明测量依据为‘18个层面，层厚3 mm’",
            "accept": [
              "上下径约54 mm（18层×3 mm）",
              "上下径54 mm（共18层，层厚3 mm）",
              "纵径54 mm（层厚3 mm，共18层）",
              "上下径约5.4 cm（18层，层厚3 mm）"
            ]
          }
        ]
      },
      "FIND-05": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确描述‘边缘可见分叶’",
            "accept": [
              "边缘分叶",
              "呈分叶状",
              "可见分叶征",
              "边缘呈分叶改变"
            ]
          },
          {
            "id": "p2",
            "text": "明确描述‘与纵隔分界欠清’（已含在FIND-03中，此处聚焦形态学边界）",
            "accept": [
              "分界欠清",
              "边界不清",
              "界面模糊",
              "边界显示不清"
            ]
          },
          {
            "id": "p3",
            "text": "明确提及‘右肺上叶支气管显示欠清’（作为支气管截断征的直接描述）",
            "accept": [
              "右肺上叶支气管显示欠清",
              "右肺上叶支气管闭塞/截断",
              "右肺上叶支气管充盈缺损/不显影",
              "右肺上叶支气管腔消失"
            ]
          }
        ]
      },
      "FIND-06": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "描述‘肿块密度不均匀’",
            "accept": [
              "密度不均匀",
              "密度欠均",
              "内部密度不均",
              "呈不均匀软组织密度"
            ]
          }
        ]
      },
      "FIND-07": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确描述‘左肺野未见明确异常’",
            "accept": [
              "左肺野未见明确异常",
              "左肺未见明显病变",
              "左肺实质未见异常密度影",
              "左肺清晰，无实变、结节或渗出"
            ]
          },
          {
            "id": "p2",
            "text": "明确描述‘双侧胸腔未见明确积液’",
            "accept": [
              "双侧胸腔未见明确积液",
              "双侧胸腔无积液征象",
              "双侧肋膈角锐利，无胸腔积液",
              "双侧胸腔未见游离或包裹性积液"
            ]
          }
        ]
      },
      "IMP-01": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "回应临床问题‘胸痛、消瘦3个月’，在诊断意见中指向‘中央型肺恶性肿瘤可能大’，而非仅描述影像表现",
            "accept": []
          },
          {
            "id": "p2",
            "text": "未遗漏‘巨大肿块’这一核心影像发现，且与临床症状（胸痛提示纵隔/胸壁侵犯，消瘦提示恶性可能）形成逻辑关联",
            "accept": []
          }
        ]
      },
      "IMP-02": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "定位诊断写明‘右肺上叶后段’",
            "accept": [
              "右肺上叶后段",
              "右肺上叶后部",
              "右肺上叶背段"
            ]
          },
          {
            "id": "p2",
            "text": "补充空间关系‘内侧与纵隔分界欠清’",
            "accept": [
              "内侧与纵隔分界欠清",
              "纵隔旁生长",
              "紧邻纵隔且界限不清"
            ]
          }
        ]
      },
      "IMP-03": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "对本例‘巨大、分叶、纵隔旁、阻塞性改变’典型表现，未回避恶性判断，给出‘中央型肺恶性肿瘤’明确诊断",
            "accept": [
              "中央型肺恶性肿瘤",
              "中央型肺癌",
              "肺恶性肿瘤（中央型）",
              "支气管源性恶性肿瘤"
            ]
          }
        ]
      },
      "IMP-04": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "使用‘可能大’表述，符合不典型/需验证病变的规范措辞（未写‘确诊’或‘考虑良性’）",
            "accept": [
              "可能大",
              "可能性大",
              "高度怀疑",
              "倾向恶性"
            ]
          },
          {
            "id": "p2",
            "text": "列出支持依据：‘肿块巨大、边缘分叶、与纵隔及后胸壁关系密切、远侧肺野阻塞性改变’四项",
            "accept": [
              "肿块巨大、边缘分叶、纵隔关系密切、阻塞性改变",
              "体积大、分叶征、纵隔浸润征、阻塞性肺炎",
              "大肿块、分叶、纵隔贴边、远端阻塞",
              "巨大、分叶、纵隔旁、支气管截断所致阻塞"
            ]
          }
        ]
      },
      "IMP-05": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "未给出具体TNM分期（因平扫无法评估T/N/M细节），但指出需增强CT评估‘纵隔侵犯与血管关系并分期’，符合分期规范路径",
            "accept": []
          }
        ]
      },
      "IMP-06": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "诊断术语使用‘中央型肺恶性肿瘤’，符合《中国肺癌诊疗指南》对起源于段及以上支气管的肺癌分类命名",
            "accept": []
          }
        ]
      },
      "IMP-07": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "建议包含两项明确动作：‘行胸部增强CT’和‘尽快支气管镜或穿刺活检’",
            "accept": [
              "胸部增强CT",
              "增强CT检查",
              "增强扫描",
              "CT增强"
            ]
          },
          {
            "id": "p2",
            "text": "明确活检方式为‘支气管镜或穿刺活检’（二者择一即可，非必须同时）",
            "accept": [
              "支气管镜或穿刺活检",
              "支气管镜检查或经皮肺穿刺",
              "气管镜或CT引导下穿刺",
              "内镜或穿刺病理检查"
            ]
          }
        ]
      },
      "IMP-08": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "报告中未出现‘与既往片比较’等字样，因本例为首次检查，未做比较即视为符合规范",
            "accept": []
          }
        ]
      }
    },
    "extracted": true
  },
  "PUB-004": {
    "version": 1,
    "updatedAt": "2026-09-20 02:10",
    "updatedBy": "公开数据集导入",
    "items": {
      "FIND-01": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "报告包含检查技术、影像所见、诊断意见三大部分，结构完整",
            "accept": []
          },
          {
            "id": "p2",
            "text": "影像所见按解剖逻辑分层：先病灶主体（位置、大小、形态、密度），再邻近关系（纵隔、膈肌、肝脏），再支气管受累，最后淋巴结与胸腔积液等阴性征象",
            "accept": []
          },
          {
            "id": "p3",
            "text": "同一病灶的描述要素不遗漏：部位、大小、形态、边界、密度、邻近结构、特殊征象、阴性征象",
            "accept": []
          }
        ]
      },
      "FIND-02": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "先描述病灶本身（右肺下叶内侧肿块），再描述其与邻近结构关系（紧邻纵隔、下方与膈肌及肝脏相邻），最后描述周围肺实质、支气管、纵隔、胸腔等其他区域",
            "accept": []
          },
          {
            "id": "p2",
            "text": "未将纵隔淋巴结、胸腔积液等非病灶主体内容前置或混入病灶核心描述中",
            "accept": []
          }
        ]
      },
      "FIND-03": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确写出病灶位于右肺下叶内侧（非外侧、前基底、后基底等）",
            "accept": [
              "右肺下叶内基底段",
              "右肺下叶内侧基底段",
              "右肺下叶内侧部"
            ]
          },
          {
            "id": "p2",
            "text": "准确描述病灶累及范围：内侧紧邻纵隔，下方与膈肌及肝脏相邻",
            "accept": [
              "内侧贴纵隔、下界达膈肌并邻接肝脏",
              "内侧毗邻纵隔，下缘与膈肌及肝实质相贴",
              "纵隔侧及膈面均受累"
            ]
          }
        ]
      },
      "FIND-04": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "给出最大横断面尺寸：40 mm × 30 mm（单位明确为 mm，顺序为长×宽）",
            "accept": [
              "4.0 cm × 3.0 cm",
              "约40×30 mm",
              "横径40 mm、前后径30 mm"
            ]
          },
          {
            "id": "p2",
            "text": "给出上下径：27 mm（或约2.7 cm），并注明测量依据（9个层面，层厚3 mm）",
            "accept": [
              "上下径约27 mm（9层×3 mm）",
              "纵径27 mm（层厚3 mm，共9层）",
              "垂直径27 mm（基于3 mm层厚连续9层）"
            ]
          }
        ]
      },
      "FIND-05": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "描述形态为‘不规则软组织肿块’（非圆形、椭圆形、类圆形）",
            "accept": [
              "形态不规则",
              "呈不规则形",
              "轮廓不规整"
            ]
          },
          {
            "id": "p2",
            "text": "描述边界特征：边缘可见浅分叶，并见条索影与纵隔胸膜相连",
            "accept": [
              "浅分叶征+纵隔胸膜牵拉条索影",
              "边缘轻度分叶伴纵隔胸膜粘连索条",
              "分叶较浅，可见连接纵隔胸膜的线状影"
            ]
          }
        ]
      },
      "FIND-06": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "描述密度为‘较均匀’（非明显不均、囊实性、磨玻璃样）",
            "accept": [
              "密度尚均匀",
              "内部密度均匀",
              "未见明显坏死低密度区"
            ]
          },
          {
            "id": "p2",
            "text": "明确否定钙化与空洞：‘未见明确钙化及空洞’",
            "accept": [
              "无钙化、无空洞",
              "未见钙化影及空洞形成",
              "未见钙化或空洞征象"
            ]
          }
        ]
      },
      "FIND-07": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "明确描述右肺下叶支气管显示欠清（提示支气管截断或受压）",
            "accept": [
              "右肺下叶支气管充盈不良/显示不清",
              "右肺下叶支气管被遮蔽/中断",
              "相应支气管显影模糊或消失"
            ]
          },
          {
            "id": "p2",
            "text": "明确描述双肺门及纵隔未见明确肿大淋巴结",
            "accept": [
              "纵隔及肺门淋巴结无肿大",
              "未见肿大肺门或纵隔淋巴结",
              "肺门、纵隔淋巴结短径均＜10 mm"
            ]
          },
          {
            "id": "p3",
            "text": "明确描述双侧胸腔未见积液",
            "accept": [
              "双侧胸腔无积液",
              "无胸腔积液征象",
              "肋膈角锐利，无液体密度影"
            ]
          }
        ]
      },
      "IMP-01": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "直接回应临床问题‘体检发现右肺下叶占位’，在诊断意见首句即给出‘右肺下叶内侧肿块’结论",
            "accept": []
          }
        ]
      },
      "IMP-02": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "定位诊断写明‘右肺下叶内侧基底段’（非仅‘右肺下叶’或‘右肺下叶内侧部’）",
            "accept": [
              "右肺下叶内基底段",
              "右肺下叶内侧基底段",
              "右肺下叶内侧基底亚段"
            ]
          }
        ]
      },
      "IMP-03": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "本例为不典型表现，未强行给出确定性恶性诊断（如‘肺癌’），故此项不适用；若学员写‘肺癌’则视为错误",
            "accept": []
          }
        ]
      },
      "IMP-04": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "对不典型病变给出‘肺恶性肿瘤可能大’的倾向性诊断",
            "accept": [
              "考虑恶性肿瘤可能性大",
              "高度怀疑恶性肿瘤",
              "恶性病变可能性大"
            ]
          },
          {
            "id": "p2",
            "text": "提供三项依据：不规则软组织肿块、边缘浅分叶伴条索、与纵隔胸膜关系密切",
            "accept": [
              "不规则形态、浅分叶+胸膜牵拉、纵隔毗邻",
              "形态不规则、有分叶及胸膜凹陷征、紧贴纵隔",
              "肿块不规则、伴浅分叶和纵隔胸膜索条、邻纵隔"
            ]
          }
        ]
      },
      "IMP-05": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "未进行 TNM 分期（因平扫无法评估 T 分期细节、N 分期需增强或 PET，M 需全身评估），故未分期即符合规范",
            "accept": []
          }
        ]
      },
      "IMP-06": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "诊断表述符合《中华医学会肺癌临床诊疗指南》对初诊肺结节/肿块的推荐：不典型者应写‘恶性可能大’并列依据，而非确诊术语",
            "accept": []
          }
        ]
      },
      "IMP-07": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "建议行胸部增强 CT 进一步评估纵隔关系与分期",
            "accept": [
              "建议增强CT评估纵隔侵犯及分期",
              "推荐胸部增强扫描明确纵隔关系及分期",
              "行增强CT以评估T分期及纵隔淋巴结"
            ]
          },
          {
            "id": "p2",
            "text": "建议行穿刺活检明确病理",
            "accept": [
              "建议CT引导下穿刺活检",
              "行病理学检查明确诊断",
              "推荐组织学确诊"
            ]
          }
        ]
      },
      "IMP-08": {
        "rules": "",
        "points": [
          {
            "id": "p1",
            "text": "本例为首次检查，无既往影像可比，故未作比较即符合规范",
            "accept": []
          }
        ]
      }
    },
    "extracted": true
  }
}
