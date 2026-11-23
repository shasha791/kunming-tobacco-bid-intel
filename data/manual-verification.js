window.MANUAL_VERIFICATION = {
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-11-23T14:10:00+08:00",
  "source": {
    "sourceId": "cgjy",
    "sourceName": "中烟电子采购平台",
    "homeUrl": "https://cgjy.tobacco.com.cn/",
    "searchUrlTemplate": "https://cgjy.tobacco.com.cn/search.jspx?q={keyword}",
    "method": "Computer Use 模拟人工在 Chrome 浏览器中使用平台公开搜索框与公开检索结果页",
    "testWindowBeijing": "2026-11-23 13:55-14:10",
    "accessBoundary": "仅使用公开搜索与公开公告页面；未登录、未绕过验证码、未下载招标文件或投标。"
  },
  "cleaningRules": [
    "仅保留平台结果页可见字段：关键词、命中记录数、页数、样本标题、公告类型、发布日期。",
    "命中记录数按关键词查询结果原样记录，不做业务去重；因此总数含同一公告在不同关键词下的重复命中。",
    "样本标题只做去除 HTML 与首尾空白处理，保留公告原文，不改写为业务判断。",
    "零结果如实标为 0，不用模拟公告补齐。",
    "招标公告、变更公告、中标候选人公示、结果公告混合统计，后续评分前必须按阶段过滤。",
    "登录、购标、CA 与下载招标文件不属于公开采集数据，单独标注为人工流程。"
  ],
  "summary": {
    "keywordCount": 10,
    "keywordHitCount": 7,
    "keywordZeroCount": 3,
    "sumOfKeywordRecords": 1177,
    "uniqueNoticeCount": null,
    "note": "1177 为 10 个关键词命中数累加，不是去重后的公告数或项目数；未抓取全部 1177 条正文。"
  },
  "classification": {
    "recommendedCoreKeywords": [
      "切丝机",
      "切梗丝机",
      "梗丝机",
      "切叶",
      "切梗",
      "切丝"
    ],
    "broadKeywordNeedFilter": [
      "制丝"
    ],
    "zeroHitNeedReplace": [
      "全厂备品配件",
      "动力要配件",
      "烟机要配件"
    ],
    "suggestedReplacementKeywords": [
      "备品备件",
      "烟机设备",
      "配件采购",
      "制丝线"
    ],
    "stageFilter": [
      "招标公告",
      "资格预审公告",
      "变更公告"
    ],
    "stageExclude": [
      "中标候选人公示",
      "结果公告"
    ]
  },
  "keywordResults": [
    {
      "keyword": "切丝",
      "recordCount": 94,
      "pageCount": 11,
      "status": "有命中",
      "quality": "宽泛有效",
      "sampleTitles": [
        "张家口卷烟厂有限责任公司张烟2027-2028年设备搬倒服务采购项目-公开招标公告",
        "云南九九物业管理有限公司2027-2029年度工业委管（原料中心）试验辅助服务项目-公开招标公告",
        "重庆中烟工业有限责任公司2027-2029年制丝专用切丝机类备品备件采购项目-中标候选人公示",
        "安徽中烟工业有限责任公司2027-2028年零配件公开招标采购-公开招标公告"
      ]
    },
    {
      "keyword": "切梗",
      "recordCount": 26,
      "pageCount": 3,
      "status": "有命中",
      "quality": "有效",
      "sampleTitles": [
        "四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切梗丝机配套改造项目）-公开招标公告",
        "陕西中烟工业有限责任公司澄城卷烟厂切丝切梗机专用零配件采购项目-结果公告",
        "陕西中烟工业有限责任公司澄城卷烟厂切丝切梗机专用零配件采购项目-中标候选人公示",
        "陕西中烟工业有限责任公司澄城卷烟厂切丝切梗机专用零配件采购项目-变更公告"
      ]
    },
    {
      "keyword": "切梗丝机",
      "recordCount": 5,
      "pageCount": 1,
      "status": "有命中",
      "quality": "精准命中",
      "sampleTitles": [
        "四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切梗丝机配套改造项目）-公开招标公告",
        "河南中烟工业有限责任公司许昌卷烟厂2026年许昌卷烟厂KT2切梗丝机项修及异地供丝烟箱提升系统维修项目中标结果公告",
        "河南中烟工业有限责任公司许昌卷烟厂2026年许昌卷烟厂KT2切梗丝机项修及异地供丝烟箱提升系统维修项目-公开招标公告"
      ]
    },
    {
      "keyword": "全厂备品配件",
      "recordCount": 0,
      "pageCount": 1,
      "status": "无命中",
      "quality": "需替换关键词",
      "sampleTitles": []
    },
    {
      "keyword": "梗丝机",
      "recordCount": 18,
      "pageCount": 2,
      "status": "有命中",
      "quality": "有效",
      "sampleTitles": [
        "四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切梗丝机配套改造项目）-公开招标公告",
        "吉林烟草工业有限责任公司烘梗丝机智能单机（长春）项目-公开招标公告",
        "红塔烟草（集团）有限责任公司昭通卷烟厂制丝车间2026年-2028年电气及工控系统维修保养【重新招标】-公开招标公告"
      ]
    },
    {
      "keyword": "切叶",
      "recordCount": 2,
      "pageCount": 1,
      "status": "有命中",
      "quality": "精准命中",
      "sampleTitles": [
        "四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切叶丝机配套改造项目）-公开招标公告",
        "安徽中烟工业有限责任公司滁州卷烟厂制丝关键主机智能预警改造服务项目-竞争谈判公告"
      ]
    },
    {
      "keyword": "制丝",
      "recordCount": 963,
      "pageCount": 107,
      "status": "有命中",
      "quality": "过宽，需组合过滤",
      "sampleTitles": [
        "淮阴卷烟厂制丝线升级改造职业卫生效果评价项目结果公告",
        "淮阴卷烟厂制丝线升级改造环境影响报告编制及评估验收项目结果公告",
        "海南红塔卷烟有限责任公司烟机设备专用易损件购置（2027-2028年）项目-中标候选人公示",
        "红塔烟草（集团）有限责任公司玉溪卷烟厂2026-2028年度复烤制丝机械设备维护项目【重新招标】-结果公告"
      ]
    },
    {
      "keyword": "动力要配件",
      "recordCount": 0,
      "pageCount": 1,
      "status": "无命中",
      "quality": "需替换关键词",
      "sampleTitles": []
    },
    {
      "keyword": "烟机要配件",
      "recordCount": 0,
      "pageCount": 1,
      "status": "无命中",
      "quality": "需替换关键词",
      "sampleTitles": []
    },
    {
      "keyword": "切丝机",
      "recordCount": 69,
      "pageCount": 8,
      "status": "有命中",
      "quality": "有效",
      "sampleTitles": [
        "张家口卷烟厂有限责任公司张烟2027-2028年设备搬倒服务采购项目-公开招标公告",
        "重庆中烟工业有限责任公司2027-2029年制丝专用切丝机类备品备件采购项目-中标候选人公示",
        "重庆中烟工业有限责任公司2027-2029年制丝专用切丝机类备品备件采购项目-公开招标公告",
        "贵州中烟工业有限责任公司贵阳卷烟厂2026年购置1套切丝机铜排链清洗机-结果公告"
      ]
    }
  ],
  "conclusion": [
    "中烟电子采购平台通过人工浏览器路径可正常检索和阅读公开公告。",
    "建议保留核心关键词：切丝机、切梗丝机、梗丝机、切叶、切梗、切丝。",
    "“制丝”命中 963 条，覆盖过宽，必须与切丝机/维修/备件等词组合或按阶段过滤后使用。",
    "3 个“要配件”类关键词为 0 命中，建议替换为平台公告常用表述：备品备件、烟机设备、配件采购、制丝线。",
    "后续采集应过滤中标候选人公示和结果公告，只保留招标公告、资格预审公告与变更公告进入商机池。"
  ],
  "sourceVerifications": [
    {
      "source": {
        "sourceId": "cgjy",
        "sourceName": "中烟电子采购平台",
        "homeUrl": "https://cgjy.tobacco.com.cn/",
        "searchUrlTemplate": "https://cgjy.tobacco.com.cn/search.jspx?q={keyword}",
        "method": "Computer Use 模拟人工在 Chrome 浏览器中使用平台公开搜索框与公开检索结果页",
        "testWindowBeijing": "2026-11-23 13:55-14:10",
        "accessBoundary": "仅使用公开搜索与公开公告页面；未登录、未绕过验证码、未下载招标文件或投标。"
      },
      "cleaningRules": [
        "仅保留平台结果页可见字段：关键词、命中记录数、页数、样本标题、公告类型、发布日期。",
        "命中记录数按关键词查询结果原样记录，不做业务去重；因此总数含同一公告在不同关键词下的重复命中。",
        "样本标题只做去除 HTML 与首尾空白处理，保留公告原文，不改写为业务判断。",
        "零结果如实标为 0，不用模拟公告补齐。",
        "招标公告、变更公告、中标候选人公示、结果公告混合统计，后续评分前必须按阶段过滤。",
        "登录、购标、CA 与下载招标文件不属于公开采集数据，单独标注为人工流程。"
      ],
      "summary": {
        "keywordCount": 10,
        "keywordHitCount": 7,
        "keywordZeroCount": 3,
        "sumOfKeywordRecords": 1177,
        "uniqueNoticeCount": null,
        "note": "1177 为 10 个关键词命中数累加，不是去重后的公告数或项目数；未抓取全部 1177 条正文。"
      },
      "classification": {
        "recommendedCoreKeywords": [
          "切丝机",
          "切梗丝机",
          "梗丝机",
          "切叶",
          "切梗",
          "切丝"
        ],
        "broadKeywordNeedFilter": [
          "制丝"
        ],
        "zeroHitNeedReplace": [
          "全厂备品配件",
          "动力要配件",
          "烟机要配件"
        ],
        "suggestedReplacementKeywords": [
          "备品备件",
          "烟机设备",
          "配件采购",
          "制丝线"
        ],
        "stageFilter": [
          "招标公告",
          "资格预审公告",
          "变更公告"
        ],
        "stageExclude": [
          "中标候选人公示",
          "结果公告"
        ]
      },
      "keywordResults": [
        {
          "keyword": "切丝",
          "recordCount": 94,
          "pageCount": 11,
          "status": "有命中",
          "quality": "宽泛有效",
          "sampleTitles": [
            "张家口卷烟厂有限责任公司张烟2027-2028年设备搬倒服务采购项目-公开招标公告",
            "云南九九物业管理有限公司2027-2029年度工业委管（原料中心）试验辅助服务项目-公开招标公告",
            "重庆中烟工业有限责任公司2027-2029年制丝专用切丝机类备品备件采购项目-中标候选人公示",
            "安徽中烟工业有限责任公司2027-2028年零配件公开招标采购-公开招标公告"
          ]
        },
        {
          "keyword": "切梗",
          "recordCount": 26,
          "pageCount": 3,
          "status": "有命中",
          "quality": "有效",
          "sampleTitles": [
            "四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切梗丝机配套改造项目）-公开招标公告",
            "陕西中烟工业有限责任公司澄城卷烟厂切丝切梗机专用零配件采购项目-结果公告",
            "陕西中烟工业有限责任公司澄城卷烟厂切丝切梗机专用零配件采购项目-中标候选人公示",
            "陕西中烟工业有限责任公司澄城卷烟厂切丝切梗机专用零配件采购项目-变更公告"
          ]
        },
        {
          "keyword": "切梗丝机",
          "recordCount": 5,
          "pageCount": 1,
          "status": "有命中",
          "quality": "精准命中",
          "sampleTitles": [
            "四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切梗丝机配套改造项目）-公开招标公告",
            "河南中烟工业有限责任公司许昌卷烟厂2026年许昌卷烟厂KT2切梗丝机项修及异地供丝烟箱提升系统维修项目中标结果公告",
            "河南中烟工业有限责任公司许昌卷烟厂2026年许昌卷烟厂KT2切梗丝机项修及异地供丝烟箱提升系统维修项目-公开招标公告"
          ]
        },
        {
          "keyword": "全厂备品配件",
          "recordCount": 0,
          "pageCount": 1,
          "status": "无命中",
          "quality": "需替换关键词",
          "sampleTitles": []
        },
        {
          "keyword": "梗丝机",
          "recordCount": 18,
          "pageCount": 2,
          "status": "有命中",
          "quality": "有效",
          "sampleTitles": [
            "四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切梗丝机配套改造项目）-公开招标公告",
            "吉林烟草工业有限责任公司烘梗丝机智能单机（长春）项目-公开招标公告",
            "红塔烟草（集团）有限责任公司昭通卷烟厂制丝车间2026年-2028年电气及工控系统维修保养【重新招标】-公开招标公告"
          ]
        },
        {
          "keyword": "切叶",
          "recordCount": 2,
          "pageCount": 1,
          "status": "有命中",
          "quality": "精准命中",
          "sampleTitles": [
            "四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切叶丝机配套改造项目）-公开招标公告",
            "安徽中烟工业有限责任公司滁州卷烟厂制丝关键主机智能预警改造服务项目-竞争谈判公告"
          ]
        },
        {
          "keyword": "制丝",
          "recordCount": 963,
          "pageCount": 107,
          "status": "有命中",
          "quality": "过宽，需组合过滤",
          "sampleTitles": [
            "淮阴卷烟厂制丝线升级改造职业卫生效果评价项目结果公告",
            "淮阴卷烟厂制丝线升级改造环境影响报告编制及评估验收项目结果公告",
            "海南红塔卷烟有限责任公司烟机设备专用易损件购置（2027-2028年）项目-中标候选人公示",
            "红塔烟草（集团）有限责任公司玉溪卷烟厂2026-2028年度复烤制丝机械设备维护项目【重新招标】-结果公告"
          ]
        },
        {
          "keyword": "动力要配件",
          "recordCount": 0,
          "pageCount": 1,
          "status": "无命中",
          "quality": "需替换关键词",
          "sampleTitles": []
        },
        {
          "keyword": "烟机要配件",
          "recordCount": 0,
          "pageCount": 1,
          "status": "无命中",
          "quality": "需替换关键词",
          "sampleTitles": []
        },
        {
          "keyword": "切丝机",
          "recordCount": 69,
          "pageCount": 8,
          "status": "有命中",
          "quality": "有效",
          "sampleTitles": [
            "张家口卷烟厂有限责任公司张烟2027-2028年设备搬倒服务采购项目-公开招标公告",
            "重庆中烟工业有限责任公司2027-2029年制丝专用切丝机类备品备件采购项目-中标候选人公示",
            "重庆中烟工业有限责任公司2027-2029年制丝专用切丝机类备品备件采购项目-公开招标公告",
            "贵州中烟工业有限责任公司贵阳卷烟厂2026年购置1套切丝机铜排链清洗机-结果公告"
          ]
        }
      ],
      "conclusion": [
        "中烟电子采购平台通过人工浏览器路径可正常检索和阅读公开公告。",
        "建议保留核心关键词：切丝机、切梗丝机、梗丝机、切叶、切梗、切丝。",
        "“制丝”命中 963 条，覆盖过宽，必须与切丝机/维修/备件等词组合或按阶段过滤后使用。",
        "3 个“要配件”类关键词为 0 命中，建议替换为平台公告常用表述：备品备件、烟机设备、配件采购、制丝线。",
        "后续采集应过滤中标候选人公示和结果公告，只保留招标公告、资格预审公告与变更公告进入商机池。"
      ]
    },
    {
      "source": {
        "sourceId": "chengezhao",
        "sourceName": "诚E招电子采购交易平台",
        "homeUrl": "https://www.chengezhao.com/cms/",
        "searchPageUrl": "https://www.chengezhao.com/cms/search?q={keyword}",
        "searchIndexUrl": "https://www.chengezhao.com/cms/search.json",
        "method": "Computer Use 打开公开首页与搜索页；从公开页面源码确认 /cms/search 表单，并读取其公开 search.json 索引按标题关键词过滤；未登录、未绕验证码、未碰 CA。",
        "testWindowBeijing": "2026-11-23 15:35-15:45",
        "accessBoundary": "仅使用公开公告搜索索引；未登录、未绕验证码、未下载采购文件。",
        "indexRecordCount": 14043
      },
      "cleaningRules": [
        "仅使用公开 search.json 索引中的 title、permalink、categories、tags 字段。",
        "按标题包含关键词过滤；命中数为关键词命中累加，存在同一公告被多个关键词重复计入。",
        "去重按 permalink 计算；样本标题保留原文，不改写为业务判断。",
        "search.json 无分页字段，pageCount 记为 null，不推算分页。",
        "零结果如实标注；公告日期需打开详情页确认，本轮不 invent 日期。"
      ],
      "summary": {
        "keywordCount": 10,
        "keywordHitCount": 4,
        "keywordZeroCount": 6,
        "sumOfKeywordRecords": 9,
        "uniqueNoticeCount": 4,
        "note": "9 条为关键词命中累加；按链接去重后 4 条公告。仅统计公开索引标题命中。"
      },
      "classification": {
        "recommendedCoreKeywords": [
          "切丝",
          "切梗",
          "制丝",
          "切丝机"
        ],
        "broadKeywordNeedFilter": [
          "制丝"
        ],
        "zeroHitNeedReplace": [
          "切梗丝机",
          "全厂备品配件",
          "梗丝机",
          "切叶",
          "动力要配件",
          "烟机要配件"
        ],
        "suggestedReplacementKeywords": [
          "切梗机",
          "制丝车间",
          "烟机设备",
          "广州卷烟厂",
          "配套设备"
        ],
        "stageFilter": [
          "项目公告",
          "变更公告"
        ],
        "stageExclude": [
          "中标公示",
          "结果公告"
        ]
      },
      "keywordResults": [
        {
          "keyword": "切丝",
          "recordCount": 1,
          "pageCount": null,
          "status": "有命中",
          "quality": "精准命中",
          "sampleTitles": [
            "广州卷烟厂制丝车间64线YS210A KT2及YS210C SQ317切丝机更新改造项目直接采购公示"
          ]
        },
        {
          "keyword": "切梗",
          "recordCount": 3,
          "pageCount": null,
          "status": "有命中",
          "quality": "有效",
          "sampleTitles": [
            "广州卷烟厂制丝车间GS117D切梗机配套设备更新改造项目（2026）招标公告",
            "广州卷烟厂制丝车间GS117D切梗机配套设备更新改造项目（2026）中标候选人公示",
            "广州卷烟厂制丝车间GS117D切梗机配套设备更新改造项目（2026） 中标结果公告"
          ]
        },
        {
          "keyword": "切梗丝机",
          "recordCount": 0,
          "pageCount": null,
          "status": "无命中",
          "quality": "需替换关键词",
          "sampleTitles": []
        },
        {
          "keyword": "全厂备品配件",
          "recordCount": 0,
          "pageCount": null,
          "status": "无命中",
          "quality": "需替换关键词",
          "sampleTitles": []
        },
        {
          "keyword": "梗丝机",
          "recordCount": 0,
          "pageCount": null,
          "status": "无命中",
          "quality": "需替换关键词",
          "sampleTitles": []
        },
        {
          "keyword": "切叶",
          "recordCount": 0,
          "pageCount": null,
          "status": "无命中",
          "quality": "需替换关键词",
          "sampleTitles": []
        },
        {
          "keyword": "制丝",
          "recordCount": 4,
          "pageCount": null,
          "status": "有命中",
          "quality": "过宽但含核心项目",
          "sampleTitles": [
            "广州卷烟厂制丝车间GS117D切梗机配套设备更新改造项目（2026）招标公告",
            "广州卷烟厂制丝车间64线YS210A KT2及YS210C SQ317切丝机更新改造项目直接采购公示"
          ]
        },
        {
          "keyword": "动力要配件",
          "recordCount": 0,
          "pageCount": null,
          "status": "无命中",
          "quality": "需替换关键词",
          "sampleTitles": []
        },
        {
          "keyword": "烟机要配件",
          "recordCount": 0,
          "pageCount": null,
          "status": "无命中",
          "quality": "需替换关键词",
          "sampleTitles": []
        },
        {
          "keyword": "切丝机",
          "recordCount": 1,
          "pageCount": null,
          "status": "有命中",
          "quality": "精准命中",
          "sampleTitles": [
            "广州卷烟厂制丝车间64线YS210A KT2及YS210C SQ317切丝机更新改造项目直接采购公示"
          ]
        }
      ],
      "conclusion": [
        "诚E招公开索引共 14043 条公告；10 个关键词累计命中 9 条，按链接去重后仅 4 条。",
        "命中集中在广州卷烟厂制丝车间切丝机/切梗机更新改造项目，适合作为补充来源，不适合替代中烟平台。",
        "6 个关键词为 0 命中，建议改用平台常用表述：切梗机、制丝车间、烟机设备、广州卷烟厂、配套设备。",
        "详情页正文可读，但采购文件获取/下载需注册登录并按公告支付，不能自动下载。",
        "应过滤“中标公示/结果公告”，只保留“项目公告/变更公告”进入商机池。"
      ]
    },
    {
      "source": {
        "sourceId": "365trade",
        "sourceName": "中招联合招标采购平台",
        "homeUrl": "https://www.365trade.com.cn/",
        "searchUrlTemplate": "https://www.365trade.com.cn/search.jspx?q={keyword}",
        "method": "Computer Use 打开公开首页确认搜索入口，并从页面源码确认 /search.jspx?q= 表单；逐词在浏览器打开公开搜索结果页，读取“共N条记录 M页”和前3条可见公告标题。",
        "testWindowBeijing": "2026-11-23 16:03-16:40",
        "accessBoundary": "仅使用公开搜索结果页；未登录、未绕验证码、未碰 CA、未购标、未下载招标文件。"
      },
      "cleaningRules": [
        "只保留公开搜索结果页可见字段：关键词、命中记录数、页数、样本标题、公告类型、发布日期。",
        "命中数为各关键词结果页原样记录并累加，存在同一公告被多个关键词重复命中。",
        "本轮未逐条打开全部详情页，因此 uniqueNoticeCount 记为 null，不做假装去重。",
        "样本标题只做去除首尾空白处理，保留平台原文，不改写为业务判断。",
        "搜索结果混合“招标公告/中标结果公告/中标候选人公示/成交结果公告”，进入商机池前必须按阶段过滤。"
      ],
      "summary": {
        "keywordCount": 10,
        "keywordHitCount": 7,
        "keywordZeroCount": 3,
        "sumOfKeywordRecords": 1294,
        "uniqueNoticeCount": null,
        "note": "1294 为 10 个关键词命中数累加，不是去重公告数；本轮未抓取全部详情页。"
      },
      "classification": {
        "recommendedCoreKeywords": ["切梗丝机", "梗丝机", "切叶", "切梗", "切丝机", "切丝"],
        "broadKeywordNeedFilter": ["制丝"],
        "zeroHitNeedReplace": ["全厂备品配件", "动力要配件", "烟机要配件"],
        "suggestedReplacementKeywords": ["备品备件", "烟机设备", "配件采购", "制丝线"],
        "stageFilter": ["招标公告", "公开招标公告", "询比公告", "谈判公告", "询价公告"],
        "stageExclude": ["中标结果公告", "中标候选人公示", "结果公告", "成交结果公告", "终止公告"]
      },
      "keywordResults": [
        {"keyword": "切丝", "recordCount": 153, "pageCount": 17, "status": "有命中", "quality": "宽泛有效", "sampleTitles": ["郑州益盛工程科技有限公司化学成分检测集成设备采购项目（二次）—公开招标公告", "上海烟草集团北京卷烟厂有限公司2027-2028年度通用设备维修及零活维修项目-招标公告", "北京三元食品股份有限公司北京工业园乳组分应用项目马苏产线购置-招标公告"]},
        {"keyword": "切梗", "recordCount": 30, "pageCount": 4, "status": "有命中", "quality": "有效", "sampleTitles": ["淮阴卷烟厂2026-2028年购置印刷品项目（两年）-询价公告", "淮阴卷烟厂2026-2027年职业病危害因素检测、评价服务项目（两年）-询比公告", "陕西中烟工业有限责任公司旬阳卷烟厂报废设备销毁处置项目（三次）招标公告"]},
        {"keyword": "切梗丝机", "recordCount": 23, "pageCount": 3, "status": "有命中", "quality": "精准命中", "sampleTitles": ["陕西中烟工业有限责任公司旬阳卷烟厂报废设备销毁处置项目（三次）招标公告", "陕西中烟工业有限责任公司旬阳卷烟厂报废设备销毁处置项目（二次）招标公告", "哈尔滨卷烟厂制丝车间切梗丝机配套辅联设备购置-结果公告"]},
        {"keyword": "全厂备品配件", "recordCount": 0, "pageCount": 1, "status": "无命中", "quality": "需替换关键词", "sampleTitles": []},
        {"keyword": "梗丝机", "recordCount": 40, "pageCount": 5, "status": "有命中", "quality": "有效", "sampleTitles": ["陕西中烟工业有限责任公司旬阳卷烟厂报废设备销毁处置项目（三次）招标公告", "陕西中烟工业有限责任公司旬阳卷烟厂报废设备销毁处置项目（二次）招标公告", "哈尔滨卷烟厂制丝车间切梗丝机配套辅联设备购置-结果公告"]},
        {"keyword": "切叶", "recordCount": 16, "pageCount": 2, "status": "有命中", "quality": "有效但需过滤", "sampleTitles": ["淮阴卷烟厂2026-2028年购置印刷品项目（两年）-询价公告", "2024年漯河卷烟厂（老厂）切叶（梗）丝机项修项目中标结果公示", "2024年漯河卷烟厂（老厂）切叶（梗）丝机项修项目中标候选人公示"]},
        {"keyword": "制丝", "recordCount": 900, "pageCount": 100, "status": "有命中", "quality": "过宽，需组合过滤", "sampleTitles": ["淮阴卷烟厂制丝线升级改造环境影响报告编制及评估验收项目成交结果公告", "淮阴卷烟厂制丝线升级改造职业卫生效果评价项目成交结果公告", "淮阴卷烟厂制丝线升级改造安全设施竣工验收评价项目-成交结果公告"]},
        {"keyword": "动力要配件", "recordCount": 0, "pageCount": 1, "status": "无命中", "quality": "需替换关键词", "sampleTitles": []},
        {"keyword": "烟机要配件", "recordCount": 0, "pageCount": 1, "status": "无命中", "quality": "需替换关键词", "sampleTitles": []},
        {"keyword": "切丝机", "recordCount": 132, "pageCount": 15, "status": "有命中", "quality": "有效", "sampleTitles": ["上海烟草集团北京卷烟厂有限公司2027-2028年度通用设备维修及零活维修项目-招标公告", "北京三元食品股份有限公司北京工业园乳组分应用项目马苏产线购置-招标公告", "陕西中烟工业有限责任公司宝鸡卷烟厂制丝线专用机械类零配件采购项目中标结果公示"]}
      ],
      "conclusion": [
        "中招联合公开搜索页人工路径可稳定读取，关键词结果页显示命中数与分页。",
        "10 个关键词累计命中 1294 条，其中“制丝”单独 900 条，覆盖过宽，必须组合过滤并按阶段清洗。",
        "核心命中集中在切梗丝机/梗丝机/切叶/切丝机/切梗相关项目，适合作为中烟平台的补充来源。",
        "3 个“要配件”类关键词为 0 命中，建议改用平台常用表述：备品备件、烟机设备、配件采购、制丝线。",
        "搜索结果混合中标结果与公告阶段，进入商机池前必须排除中标结果公告、中标候选人公示、结果公告与终止公告。"
      ]
    },
    {
      "source": {
        "sourceId": "bidcenter",
        "sourceName": "采招网",
        "homeUrl": "https://www.bidcenter.com.cn/",
        "searchUrlTemplate": "https://www.bidcenter.com.cn/blue/index.html?keywords={keyword}",
        "method": "Computer Use 打开公开首页确认“今日已更新 64487 条招标信息”和搜索框；公开搜索参数 keywords= 可读首屏结果列表。旧列表页 /zbpage-1-1.html 会触发人机验证，本轮不绕过。",
        "testWindowBeijing": "2026-11-23 16:35-16:55",
        "accessBoundary": "仅使用公开首页搜索参数下的首屏列表；未登录、未绕人机验证、不进入需会员/登录的详情页。"
      },
      "cleaningRules": [
        "采招网公开搜索页不显示总命中数，本轮只记录首屏可见结果条数，不推算平台总量。",
        "命中数按关键词首屏可见列表条数记录并累加，存在同一项目在标题与正文匹配中重复出现。",
        "样本标题只做去除首尾空白处理，保留平台原文中的“（关键词在公告正文中）”等标记。",
        "无项目列表的关键词记为 0，不用模拟公告补齐。",
        "结果混合招标公告、中标结果、招标变更、招标预告，进入商机池前必须按阶段过滤。"
      ],
      "summary": {
        "keywordCount": 10,
        "keywordHitCount": 7,
        "keywordZeroCount": 3,
        "sumOfKeywordRecords": 70,
        "uniqueNoticeCount": null,
        "note": "70 为 7 个有命中关键词首屏可见条数累加，不是平台总命中数，也不是去重公告数；本轮未抓取详情页。"
      },
      "classification": {
        "recommendedCoreKeywords": ["切梗", "切梗丝机", "梗丝机", "切叶", "切丝机"],
        "broadKeywordNeedFilter": ["切丝", "制丝"],
        "zeroHitNeedReplace": ["全厂备品配件", "动力要配件", "烟机要配件"],
        "suggestedReplacementKeywords": ["备品备件", "烟机设备", "制丝车间", "配套改造"],
        "stageFilter": ["招标公告", "招标/资审公告", "招标变更"],
        "stageExclude": ["中标结果", "中标候选人公示", "招标预告", "成交公示"]
      },
      "keywordResults": [
        {"keyword": "切丝", "recordCount": 10, "pageCount": null, "status": "有命中", "quality": "宽泛，正文匹配噪声多", "sampleTitles": ["尉氏县市政环卫基础设施领域设备更新项目一期第二标段二次-招标公告（切丝在公告正文中）", "武钢有限热轧厂CSP轧钢工序改造项目设备公开招标-招标公告（切丝在公告正文中）", "年高强钢新材料产品中心工序外包项目-招标公告（切丝在公告正文中）"]},
        {"keyword": "切梗", "recordCount": 10, "pageCount": null, "status": "有命中", "quality": "有效", "sampleTitles": ["四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切梗丝机配套改造项目）-公开招标公告-招标/资审公告", "陕西中烟工业有限责任公司澄城卷烟厂切丝切梗机专用零配件采购项目-变更公告", "河南中烟工业有限责任公司许昌卷烟厂2026年许昌卷烟厂KT2切梗丝机项修及异地供丝烟箱提升系统维修项目中标结果公告"]},
        {"keyword": "切梗丝机", "recordCount": 10, "pageCount": null, "status": "有命中", "quality": "精准命中", "sampleTitles": ["四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切梗丝机配套改造项目）-公开招标公告-招标/资审公告", "河南中烟工业有限责任公司许昌卷烟厂2026年许昌卷烟厂KT2切梗丝机项修及异地供丝烟箱提升系统维修项目-公开招标公告", "山东中烟工业有限责任公司滕州卷烟厂切梗丝机维修项目中标结果"]},
        {"keyword": "全厂备品配件", "recordCount": 0, "pageCount": null, "status": "无命中", "quality": "需替换关键词", "sampleTitles": []},
        {"keyword": "梗丝机", "recordCount": 10, "pageCount": null, "status": "有命中", "quality": "有效", "sampleTitles": ["四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切梗丝机配套改造项目）-公开招标公告-招标/资审公告", "吉林烟草工业有限责任公司烘梗丝机智能单机（长春）项目-公开招标公告", "河南中烟工业有限责任公司许昌卷烟厂2026年许昌卷烟厂KT2切梗丝机项修及异地供丝烟箱提升系统维修项目中标结果公告"]},
        {"keyword": "切叶", "recordCount": 10, "pageCount": null, "status": "有命中", "quality": "需过滤非烟草", "sampleTitles": ["四川中烟工业有限责任公司四川中烟西昌卷烟厂2026年年初申报烟机购置项目（购置一台切叶丝机配套改造项目）-公开招标公告-招标/资审公告", "总堡乡2026年三家村鲜切叶加工壮大提升项目(十大产业—蔬菜)中标(成交)结果公告", "民和回族土族自治县总堡乡人民政府2026年7月政府采购意向-总堡乡2026年三家村鲜切叶加工壮大提升项目"]},
        {"keyword": "制丝", "recordCount": 10, "pageCount": null, "status": "有命中", "quality": "有效但需过滤结果公告", "sampleTitles": ["贵州中烟工业有限责任公司铜仁卷烟厂2026年制丝车间丝线3台输送皮运机升级改造项目-公开招标公告", "龙岩烟草工业有限责任公司购置制丝二区烟包和切片外观异物视觉检测装置成交结果公示", "北京达特集成技术有限责任公司制丝线升级改造物流设备购置及系统集成项目-AGV系统-竞争谈判公告"]},
        {"keyword": "动力要配件", "recordCount": 0, "pageCount": null, "status": "无命中", "quality": "需替换关键词", "sampleTitles": []},
        {"keyword": "烟机要配件", "recordCount": 0, "pageCount": null, "status": "无命中", "quality": "需替换关键词", "sampleTitles": []},
        {"keyword": "切丝机", "recordCount": 10, "pageCount": null, "status": "有命中", "quality": "有效", "sampleTitles": ["分谈分签+云南昆船国际贸易有限公司+老挝LTL切丝机砂轮项目招标公告", "重庆中烟工业有限责任公司2027-2029年制丝专用切丝机类备品备件采购项目-中标候选人公示", "郎岱镇第二小学切肉切丝机采购竞价公告"]}
      ],
      "conclusion": [
        "采招网公开首页与 keywords= 搜索参数可读取首屏公告列表，但不显示总命中数；旧列表页触发人机验证，未绕过。",
        "7 个关键词首屏累计可见 70 条，其中“切丝”多为正文命中噪声，需按标题和公告阶段过滤。",
        "高价值命中集中在切梗丝机、梗丝机、切叶丝机、制丝车间改造及切丝机备件项目，适合作为补充线索源。",
        "3 个“要配件”类关键词无结果，建议替换为采招网常用表述：备品备件、烟机设备、制丝车间、配套改造。",
        "结果混合中标结果与招标变更，进入商机池前必须排除中标结果、中标候选人公示、成交公示与招标预告。"
      ]
    }
  ],
  "sourcesCovered": [
    "cgjy",
    "chengezhao",
    "365trade",
    "bidcenter"
  ]
};
