// 名医名课研习 —— 三个导师分类的内页配置
//
// 数据来源：中大医院 HIS 真实病例（介入/泌尿/内分泌），导师资料来自中大资料库。
// 病例卡展示的完整 SP 内容（性别/年龄/难度/分级/症状）为 mock 字段，患者名按脱敏处理；
// 待 HIS 病例走完 SP 生成管线后，替换为真实生成内容并接入训练流程。
// 刘必成（肾病）/杨毅（重症）/陆玲（耳鼻喉）暂无 HIS 病例，cases 留空待补。

export const MENTOR_CATEGORIES = {
  academician: {
    key: 'academician',
    title: '院士精讲病例',
    desc: '顶尖专家深度解析疑难罕见病例，传授临床思维精髓',
    icon: 'fa-chalkboard-user',
    gradient: 'linear-gradient(135deg,#312e81,#4f46e5)',
    source: '院士精讲',
    mentors: [
      {
        name: '滕皋军',
        title: '主任医师 · 首席教授 · 中国科学院院士',
        photo: '/images/mentors/teng-gaojun.jpg',
        intro: '主任医师，首席教授，中国科学院院士，现任东南大学附属中大医院介入与血管外科主任，国家综合介入技术质控中心主任，中国介入医师协会会长，国际介入与多学科协会(ISMIO)创始主席。从医以来，滕皋军医师始终坚持一线临床工作，亲力亲为完成大量高难度手术，成功诊治众多疑难病症。他发明了十余项介入器械与技术，广泛应用于临床实践，并带领团队推动我国介入诊疗技术实现跨越式发展。作为国家卫健委《原发性肝癌诊疗规范》中肝癌介入微创治疗部分的编写组长，他基于证据和我国的临床实践，引领国际前沿，挽救了大量肝癌患者的生命。此外，他还为国内外培养了近五千名介入专科医师，被誉为我国介入技术的"黄埔军校"。其学术贡献卓著，曾三次荣获国家科技进步奖，并荣获欧美及亚太三大国际主流介入学会的最高荣誉奖。作为我国介入医学领域唯一的院士，滕皋军医师在国内外享有崇高声誉。',
        media: {
          platform: 'CCTV科教频道 · 《健康之路》',
          title: '滕皋军院士：对付肝癌 有计可施',
          desc: '专题访谈节目：中国科学院院士、中大医院介入诊疗中心主任滕皋军教授深度解析肝癌介入微创治疗',
          url: 'https://mp.weixin.qq.com/s/kComKkwjwbn1BEuvCJpdxA'
        },
        cases: [
          { patientName: '李**', gender: '男', age: 58, disease: '胆管癌', specialty: '介入与血管外科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['黄疸', '上腹痛'], level: '常见病' },
          { patientName: '王**', gender: '男', age: 52, disease: '肝癌', specialty: '介入与血管外科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['右上腹隐痛', '乏力'], level: '常见病' },
          { patientName: '张**', gender: '男', age: 61, disease: '肝癌（TACE+冷冻消融）', specialty: '介入与血管外科一', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['腹胀', '消瘦'], level: '常见病' },
          { patientName: '刘**', gender: '男', age: 55, disease: '肝癌（TACE）', specialty: '介入与血管外科一', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['纳差', '肝区不适'], level: '常见病' },
          { patientName: '陈**', gender: '男', age: 64, disease: '颈动脉狭窄', specialty: '江北介入与血管外科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['头晕', '一过性黑朦'], level: '常见病、多发病' }
        ]
      }
    ]
  },
  mentor: {
    key: 'mentor',
    title: '金牌导师病例',
    desc: '一线临床名师手把手带教，覆盖常见病与多发病实战',
    icon: 'fa-medal',
    gradient: 'linear-gradient(135deg,#b45309,#f59e0b)',
    source: '金牌导师',
    mentors: [
      {
        name: '刘必成',
        title: '首席二级教授 · 主任医师 · 博士(后)导师',
        photo: '/images/mentors/liu-bicheng.jpg',
        intro: '东南大学首席二级教授、主任医师、博士(后)导师，东南大学肾脏病研究所所长。首届国家杰出医师，兼任中国生物医学工程学会人工器官分会主任委员、中华医学会肾脏病分会副主任委员等学术职务，国内著名肾病专家，连续多年入选国际顶尖科学家，国家卫健委突出贡献中青年专家，享受国务院政府特殊津贴，荣获人民日报“国之名医-卓越建树”称号。',
        cases: []
      },
      {
        name: '杨毅',
        title: '医学博士 · 教授 · 主任医师 · 博士生导师',
        photo: '/images/mentors/yang-yi.jpg',
        intro: '医学博士，教授、主任医师、博士生导师，现任东南大学附属中大医院重症医学科主任。担任中华医学会重症医学分会委员兼秘书长、江苏省医学会重症医学分会前任主任委员、江苏省医学会创伤医学分会侯任主任委员、中国微循环学会休克专业委员会副主任委员。获江苏省“333工程”第一层次人才，江苏省“六大高峰”人才、江苏省医学重点人才、江苏省卫生行业先进个人等称号。在Sepsis和ARDS的发病机制、器官功能衰竭与功能重建研究有深厚的造诣。先后主持承担科技部重点专项、国家自然科学基金、江苏省自然科学基金等省厅级以上科研项目10余项；先后获得中华医学奖、江苏省医学科技奖、江苏省科技进步奖等省部级以上科研奖励10余项；发表论文百余篇。',
        cases: []
      },
      {
        name: '许斌',
        title: '医学博士 · 主任医师 · 博士研究生导师',
        photo: '/images/mentors/xu-bin.jpg',
        intro: '医学博士、主任医师、博士研究生导师，东南大学附属中大医院副院长。国家卫健委医学高层次人才-优秀青年医师，江苏省医学重点人才、六大高峰人才、333高层次人才，美国德州大学MDAnderson肿瘤中心博士后，中华医学会泌尿外科分会基础学组委员，中国医师协会泌尿外科分会转化学组委员，江苏省医学会男科学分会副主任委员。以通讯作者在Science Advances等国际权威杂志发表学术论文，获江苏省科技进步二等奖、江苏省医学青年科技奖，主持基金委面上项目、集成项目子课题。',
        cases: [
          { patientName: '钱**', gender: '男', age: 66, disease: '前列腺癌', specialty: '泌尿外科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['排尿困难', '血尿'], level: '疑难病' },
          { patientName: '冯**', gender: '男', age: 71, disease: '前列腺癌', specialty: '泌尿外科', difficulty: 'R3', caseLevel: '疑难病例', symptoms: ['尿频', '夜尿增多'], level: '疑难病' },
          { patientName: '蒋**', gender: '男', age: 59, disease: '前列腺癌', specialty: '泌尿外科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['PSA升高', '下尿路症状'], level: '疑难病' },
          { patientName: '沈**', gender: '男', age: 63, disease: '前列腺癌', specialty: '泌尿外科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['骨痛', '排尿费力'], level: '疑难病' },
          { patientName: '韩**', gender: '男', age: 68, disease: '前列腺癌', specialty: '泌尿外科', difficulty: 'R3', caseLevel: '疑难病例', symptoms: ['血尿', '腰背痛'], level: '疑难病' }
        ]
      },
      {
        name: '李玲',
        title: '主任医师 · 教授 · 博士生导师',
        photo: '/images/mentors/li-ling.jpg',
        intro: '德国医学博士、美国UCLA博士后、主任医师、教授、博士生导师。东南大学胰腺研究所所长、糖脂代谢研究中心主任，东南大学附属中大医院院长助理、内分泌科主任。中华医学会糖尿病学分会青委、中国医师协会内分泌代谢科医师分会委员、江苏省医学会糖尿病学分会副主委。江苏省中青年领军人才、江苏省"青年科技奖"获得者。主持国家自然基金重点国际合作等项目6项，国家工信部5G+健康医疗课题负责人，国家重点研发干细胞子课题负责人，以通讯作者在Nature子刊及Gut 等发表SCI论文70余篇。第1完成人依次获得国家教育部科技进步二等奖、中华医学科技奖二等奖、江苏医学科技奖一等奖、江苏省新技术引进一等奖，申报/授权国家发明专利12项。',
        cases: [
          { patientName: '赵**', gender: '女', age: 47, disease: '糖尿病', specialty: '内分泌科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['多饮', '多尿', '消瘦'], level: '多发病' },
          { patientName: '孙**', gender: '男', age: 39, disease: '黑棘皮病', specialty: '内分泌科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['皮肤色素沉着', '皮损'], level: '多发病' },
          { patientName: '周**', gender: '男', age: 62, disease: '2型糖尿病性足病', specialty: '内分泌科', difficulty: 'R3', caseLevel: '高阶病例', symptoms: ['足部破溃', '感觉减退'], level: '危重病' },
          { patientName: '吴**', gender: '女', age: 28, disease: '中枢性尿崩症', specialty: '内分泌科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['烦渴', '多尿'], level: '疑难病' },
          { patientName: '郑**', gender: '男', age: 57, disease: '2型糖尿病性足病', specialty: '内分泌科', difficulty: 'R3', caseLevel: '疑难病例', symptoms: ['足趾坏疽', '间歇性跛行'], level: '危重病' }
        ]
      },
      {
        name: '陆玲',
        title: '医学博士 · 主任医师 · 硕士生导师',
        photo: '/images/mentors/lu-ling.jpg',
        intro: '耳鼻咽喉头颈外科主任医师，医学博士，博士后，硕士生导师，耳鼻咽喉头颈外科科主任。任职与获奖：江苏省医学青年人才、江苏省333人才，主持国家自然科学基金2项、中国博士后科学基金面上项目1项、省市级课题3项，近五年以第一作者/通讯作者发表SCI论文13篇，累计IF 119，其中IF 10分以上6篇，以主要完成人获得江苏省医学科技奖一等奖、江苏省医学新技术引进奖一等奖等5项，发明专利8项，专利转化2项。目前担任：中国听力医学发展基金会第六届专家指导委员会老年听力保健专家委员会常务委员、江苏省发育生物学学会听觉科学专业委员会副主任委员、江苏省医学会听力学分会委员、江苏省医师协会耳鼻喉科分会青年委员会青年委员、南京市医学会耳鼻咽喉头颈外科分会青年委员会第一届副主任委员、南京市医学会耳鼻咽喉头颈外科分会委员。擅长：擅长耳鼻咽喉常见病的诊治，特别是中耳炎、中耳胆脂瘤、周围性面瘫、耳聋、耳鸣、眩晕等耳病的诊治，擅长耳内镜和显微镜下中耳乳突手术、中耳听力重建手术、眩晕外科治疗等。开创耳聋基因治疗手术路径并帮助多名先天性耳聋患者恢复听力。专家门诊时间：周一上午、下午，周五上午高级专家门诊。',
        cases: []
      }
    ]
  },
  national: {
    key: 'national',
    title: '国家级质控中心病例',
    desc: '国家级质控标准规范化病例库，对标行业最高水准',
    icon: 'fa-building-columns',
    gradient: 'linear-gradient(135deg,#991b1b,#dc2626)',
    source: '国家级质控中心',
    mentors: [],
    cases: [
      { patientName: '杨**', gender: '男', age: 62, disease: '急性ST段抬高型心肌梗死', specialty: '心血管内科', difficulty: 'R1', caseLevel: '疑难病例', symptoms: ['持续性胸痛', '大汗'], level: '危重病' },
      { patientName: '朱**', gender: '女', age: 70, disease: '急性缺血性脑卒中（大血管闭塞）', specialty: '神经内科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['肢体偏瘫', '言语不清'], level: '危重病' },
      { patientName: '徐**', gender: '男', age: 58, disease: '非ST段抬高型心肌梗死', specialty: '心血管内科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['胸痛', '静息性心前区不适'], level: '危重病' },
      { patientName: '何**', gender: '男', age: 70, disease: '急性心力衰竭', specialty: '心血管内科', difficulty: 'R3', caseLevel: '疑难病例', symptoms: ['端坐呼吸', '双下肢水肿'], level: '危重病' },
      { patientName: '高**', gender: '女', age: 66, disease: '慢性心力衰竭急性加重', specialty: '心血管内科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['活动后气促', '夜间阵发性呼吸困难'], level: '危重病' },
      { patientName: '林**', gender: '女', age: 54, disease: '高血压急症', specialty: '心血管内科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['头痛', '视物模糊', '血压显著升高'], level: '多发病' },
      { patientName: '罗**', gender: '男', age: 62, disease: '脑出血', specialty: '神经内科', difficulty: 'R3', caseLevel: '疑难病例', symptoms: ['突发头痛', '恶心呕吐', '意识障碍'], level: '危重病' },
      { patientName: '梁**', gender: '女', age: 45, disease: '短暂性脑缺血发作', specialty: '神经内科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['一过性肢体无力', '一过性黑矇'], level: '常见病' },
      { patientName: '宋**', gender: '男', age: 68, disease: '癫痫持续状态', specialty: '神经内科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['反复抽搐', '意识不清'], level: '危重病' },
      { patientName: '唐**', gender: '男', age: 72, disease: '重症肺炎', specialty: '呼吸内科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['发热', '咳嗽', '呼吸困难'], level: '危重病' },
      { patientName: '许**', gender: '男', age: 65, disease: '慢性阻塞性肺疾病急性加重', specialty: '呼吸内科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['咳嗽咳痰', '气促加重'], level: '多发病' },
      { patientName: '邓**', gender: '女', age: 35, disease: '支气管哮喘急性发作', specialty: '呼吸内科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['喘息', '胸闷'], level: '常见病' },
      { patientName: '崔**', gender: '女', age: 58, disease: '急性肺栓塞', specialty: '呼吸内科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['突发胸痛', '咯血', '呼吸困难'], level: '危重病' },
      { patientName: '韩**', gender: '女', age: 48, disease: '糖尿病酮症酸中毒', specialty: '内分泌科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['口干多饮', '恶心呕吐'], level: '多发病' },
      { patientName: '曹**', gender: '男', age: 56, disease: '2型糖尿病', specialty: '内分泌科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['多饮多尿', '体重下降'], level: '多发病' },
      { patientName: '彭**', gender: '女', age: 40, disease: '甲状腺功能亢进症', specialty: '内分泌科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['心悸', '多汗', '消瘦'], level: '多发病' },
      { patientName: '郭**', gender: '男', age: 52, disease: '甲状腺危象', specialty: '内分泌科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['高热', '心悸', '烦躁'], level: '危重病' },
      { patientName: '夏**', gender: '男', age: 45, disease: '急性肾损伤', specialty: '肾内科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['少尿', '水肿'], level: '疑难病' },
      { patientName: '袁**', gender: '女', age: 60, disease: '慢性肾脏病5期', specialty: '肾内科', difficulty: 'R3', caseLevel: '疑难病例', symptoms: ['乏力', '食欲减退', '血肌酐升高'], level: '疑难病' },
      { patientName: '田**', gender: '男', age: 33, disease: '肾病综合征', specialty: '肾内科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['大量蛋白尿', '低白蛋白血症', '水肿'], level: '疑难病' },
      { patientName: '胡**', gender: '男', age: 55, disease: '急性上消化道出血', specialty: '消化内科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['呕血', '黑便'], level: '危重病' },
      { patientName: '严**', gender: '男', age: 50, disease: '急性胰腺炎', specialty: '消化内科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['上腹痛', '恶心呕吐'], level: '危重病' },
      { patientName: '姜**', gender: '女', age: 62, disease: '肝硬化伴食管胃底静脉曲张破裂出血', specialty: '消化内科', difficulty: 'R3', caseLevel: '疑难病例', symptoms: ['呕血', '腹胀', '黄疸'], level: '危重病' },
      { patientName: '蔡**', gender: '男', age: 48, disease: '急性阑尾炎', specialty: '普通外科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['转移性右下腹痛', '发热'], level: '常见病' },
      { patientName: '董**', gender: '男', age: 60, disease: '脓毒症', specialty: '感染科', difficulty: 'R3', caseLevel: '疑难病例', symptoms: ['高热', '血压下降', '意识淡漠'], level: '危重病' },
      { patientName: '程**', gender: '女', age: 38, disease: '肺结核', specialty: '感染科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['咳嗽', '咯血', '盗汗'], level: '疑难病' },
      { patientName: '潘**', gender: '男', age: 65, disease: '主动脉夹层', specialty: '心血管外科', difficulty: 'R3', caseLevel: '疑难病例', symptoms: ['撕裂样胸背痛', '血压不对称'], level: '危重病' },
      { patientName: '于**', gender: '男', age: 57, disease: '腹主动脉瘤', specialty: '血管外科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['腹部搏动性包块', '腹痛'], level: '疑难病' },
      { patientName: '魏**', gender: '男', age: 61, disease: '肺癌', specialty: '肿瘤科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['咳嗽', '痰中带血', '胸痛'], level: '疑难病' },
      { patientName: '薛**', gender: '男', age: 58, disease: '肝癌', specialty: '肿瘤科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['右上腹痛', '消瘦'], level: '疑难病' },
      { patientName: '丁**', gender: '女', age: 49, disease: '乳腺癌', specialty: '肿瘤科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['乳腺肿块', '乳头溢液'], level: '常见病' },
      { patientName: '叶**', gender: '男', age: 63, disease: '结直肠癌', specialty: '肿瘤科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['便血', '排便习惯改变'], level: '疑难病' },
      { patientName: '苏**', gender: '男', age: 4, disease: '川崎病', specialty: '儿科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['持续发热', '皮疹', '结膜充血'], level: '疑难病' },
      { patientName: '温**', gender: '女', age: 8, disease: '儿童哮喘急性发作', specialty: '儿科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['喘息', '咳嗽'], level: '常见病' },
      { patientName: '杜**', gender: '女', age: 32, disease: '产后大出血', specialty: '妇产科', difficulty: 'R3', caseLevel: '疑难病例', symptoms: ['阴道大量出血', '血压下降'], level: '危重病' },
      { patientName: '陶**', gender: '女', age: 29, disease: '子痫前期', specialty: '妇产科', difficulty: 'R2', caseLevel: '高阶病例', symptoms: ['血压升高', '蛋白尿', '头痛'], level: '疑难病' },
      { patientName: '谷**', gender: '女', age: 78, disease: '老年髋部骨折（股骨颈骨折）', specialty: '骨科', difficulty: 'R1', caseLevel: '基础病例', symptoms: ['跌倒后髋部疼痛', '不能站立'], level: '常见病' },
      { patientName: '尹**', gender: '男', age: 42, disease: '脊柱骨折伴脊髓损伤', specialty: '骨科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['双下肢瘫', '感觉丧失'], level: '疑难病' },
      { patientName: '金**', gender: '男', age: 36, disease: '重型颅脑损伤', specialty: '神经外科', difficulty: 'R2', caseLevel: '疑难病例', symptoms: ['昏迷', '瞳孔异常'], level: '危重病' },
      { patientName: '石**', gender: '男', age: 22, disease: '急性早幼粒细胞白血病', specialty: '血液内科', difficulty: 'R3', caseLevel: '疑难病例', symptoms: ['发热', '皮肤瘀点', '乏力'], level: '疑难病' }
    ]
  }
}

// 建议分类 → 标签配色（备用）
export const MENTOR_LEVELS = { '常见病': 'green', '多发病': 'blue', '疑难病': 'purple', '危重病': 'red' }
