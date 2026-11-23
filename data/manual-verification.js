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
    }
  ],
  "sourcesCovered": [
    "cgjy",
    "chengezhao"
  ]
};
