from __future__ import annotations

from typing import Iterable


HONG_KONG_ISO3 = "HKG"


SCOPE_LABELS = {
    "all_goods": "全部商品 HS01–97",
    "primary_goods": "初级商品 HS01–15、HS25–27",
    "processed_primary_goods": "加工食品与烟草 HS16–24",
    "manufactures": "制造品 HS28–96",
    "special_goods": "特殊商品 HS97",
}


HS_SECTION_DEFINITIONS = [
    ("I", "活动物及动物产品", range(1, 6)),
    ("II", "植物产品", range(6, 15)),
    ("III", "动植物油脂", range(15, 16)),
    ("IV", "食品、饮料、烟草", range(16, 25)),
    ("V", "矿产品", range(25, 28)),
    ("VI", "化学工业产品", range(28, 39)),
    ("VII", "塑料与橡胶", range(39, 41)),
    ("VIII", "皮革、毛皮及其制品", range(41, 44)),
    ("IX", "木材、软木、编结材料", range(44, 47)),
    ("X", "纸浆、纸、印刷品", range(47, 50)),
    ("XI", "纺织品与服装", range(50, 64)),
    ("XII", "鞋帽伞杖及相关制品", range(64, 68)),
    ("XIII", "石材、水泥、陶瓷、玻璃", range(68, 71)),
    ("XIV", "珠宝、贵金属与钱币", range(71, 72)),
    ("XV", "贱金属及其制品", range(72, 84)),
    ("XVI", "机械、电气与电子设备", range(84, 86)),
    ("XVII", "运输设备", range(86, 90)),
    ("XVIII", "精密仪器、钟表、乐器", range(90, 93)),
    ("XIX", "武器弹药", range(93, 94)),
    ("XX", "家具、玩具及杂项制品", range(94, 97)),
    ("XXI", "艺术品、收藏品与古董", range(97, 98)),
]


GROUP_CATEGORY_LABELS = {
    "A": "农牧渔与基础食品原料",
    "B": "加工食品、饮料与烟草",
    "C": "矿产、能源与基础建材",
    "D": "化学品、医药与高分子材料",
    "E": "皮革、木材、纸品与印刷出版物",
    "F": "纺织、服装、鞋帽与生活饰品",
    "G": "非金属矿物制品、陶瓷与玻璃",
    "H": "珠宝、贵金属与钱币",
    "I": "贱金属及金属制品",
    "J": "机械、电气与电子设备",
    "K": "运输设备",
    "L": "精密仪器、钟表与乐器",
    "M": "家具、玩具、体育用品与杂项消费品",
    "N": "武器弹药及特殊监管品",
    "O": "艺术品、收藏品与古董",
    "Z": "未按品类列明商品",
}


GROUP_CATEGORY_COLORS = {
    "A": "#7cbf6b",
    "B": "#f0b35c",
    "C": "#8c7a66",
    "D": "#b392f0",
    "E": "#6ed3cf",
    "F": "#f778ba",
    "G": "#c9a46a",
    "H": "#f2cc60",
    "I": "#d8b26e",
    "J": "#58a6ff",
    "K": "#ff8b5c",
    "L": "#79c0ff",
    "M": "#67d69a",
    "N": "#d7263d",
    "O": "#9e8cff",
    "Z": "#8892a0",
}


MINOR_CATEGORY_DEFINITIONS = [
    ("A01", "活动物与畜禽产品", range(1, 3), "A", "primary_goods"),
    ("A02", "水产品", range(3, 4), "A", "primary_goods"),
    ("A03", "乳蛋蜂蜜及其他动物源产品", range(4, 6), "A", "primary_goods"),
    ("A04", "植物、蔬菜、水果与坚果", range(6, 9), "A", "primary_goods"),
    ("A05", "咖啡茶香料与谷物", range(9, 11), "A", "primary_goods"),
    ("A06", "粮食加工与植物工业原料", range(11, 15), "A", "primary_goods"),
    ("A07", "动植物油脂与蜡", range(15, 16), "A", "primary_goods"),
    ("B01", "肉类、水产加工食品", range(16, 17), "B", "processed_primary_goods"),
    ("B02", "糖、可可、谷物乳制食品", range(17, 20), "B", "processed_primary_goods"),
    ("B03", "果蔬加工与杂项食品", range(20, 22), "B", "processed_primary_goods"),
    ("B04", "饮料、酒、醋", range(22, 23), "B", "processed_primary_goods"),
    ("B05", "食品工业残渣与饲料", range(23, 24), "B", "processed_primary_goods"),
    ("B06", "烟草及制品", range(24, 25), "B", "processed_primary_goods"),
    ("C01", "非金属矿物与基础建材原料", range(25, 26), "C", "primary_goods"),
    ("C02", "金属矿石、矿渣与灰", range(26, 27), "C", "primary_goods"),
    ("C03", "矿物燃料与石油产品", range(27, 28), "C", "primary_goods"),
    ("D01", "基础无机化学品", range(28, 29), "D", "manufactures"),
    ("D02", "基础有机化学品", range(29, 30), "D", "manufactures"),
    ("D03", "医药品", range(30, 31), "D", "manufactures"),
    ("D04", "农化投入品与肥料", range(31, 32), "D", "manufactures"),
    ("D05", "染料、颜料、涂料与油墨", range(32, 33), "D", "manufactures"),
    ("D06", "香精、化妆品、日化制品", range(33, 35), "D", "manufactures"),
    ("D07", "胶黏剂、酶、影像材料与特种化学品", range(35, 39), "D", "manufactures"),
    ("D08", "塑料及其制品", range(39, 40), "D", "manufactures"),
    ("D09", "橡胶及其制品", range(40, 41), "D", "manufactures"),
    ("E01", "皮革、毛皮与箱包容器", range(41, 44), "E", "manufactures"),
    ("E02", "木材、软木与编结材料制品", range(44, 47), "E", "manufactures"),
    ("E03", "纸浆与再生纸原料", range(47, 48), "E", "manufactures"),
    ("E04", "纸、纸板及纸制品", range(48, 49), "E", "manufactures"),
    ("E05", "印刷品与出版物", range(49, 50), "E", "manufactures"),
    ("F01", "天然纤维与纱线", range(50, 54), "F", "manufactures"),
    ("F02", "化学纤维与纱线", range(54, 56), "F", "manufactures"),
    ("F03", "产业用与特种纺织材料", range(56, 61), "F", "manufactures"),
    ("F04", "针织服装及附件", range(61, 62), "F", "manufactures"),
    ("F05", "非针织服装及附件", range(62, 63), "F", "manufactures"),
    ("F06", "其他纺织制成品", range(63, 64), "F", "manufactures"),
    ("F07", "鞋帽伞杖与羽毛人发制品", range(64, 68), "F", "manufactures"),
    ("G01", "石材、水泥、石膏及类似制品", range(68, 69), "G", "manufactures"),
    ("G02", "陶瓷制品", range(69, 70), "G", "manufactures"),
    ("G03", "玻璃及玻璃制品", range(70, 71), "G", "manufactures"),
    ("H01", "珠宝、贵金属、首饰与钱币", range(71, 72), "H", "manufactures"),
    ("I01", "钢铁原料与半成品", range(72, 73), "I", "manufactures"),
    ("I02", "钢铁制品", range(73, 74), "I", "manufactures"),
    ("I03", "有色金属及其制品", range(74, 82), "I", "manufactures"),
    ("I04", "金属工具、刃具与餐具", range(82, 83), "I", "manufactures"),
    ("I05", "杂项金属制品", range(83, 84), "I", "manufactures"),
    ("J01", "通用机械、动力与工业设备", range(84, 85), "J", "manufactures"),
    ("J02", "电气、电子、通信与音视频设备", range(85, 86), "J", "manufactures"),
    ("K01", "铁路及轨道交通设备", range(86, 87), "K", "manufactures"),
    ("K02", "汽车及道路车辆", range(87, 88), "K", "manufactures"),
    ("K03", "航空航天器及零部件", range(88, 89), "K", "manufactures"),
    ("K04", "船舶与浮动结构", range(89, 90), "K", "manufactures"),
    ("L01", "光学、测量、医疗与精密仪器", range(90, 91), "L", "manufactures"),
    ("L02", "钟表及零件", range(91, 92), "L", "manufactures"),
    ("L03", "乐器及零件", range(92, 93), "L", "manufactures"),
    ("N01", "武器弹药及零附件", range(93, 94), "N", "manufactures"),
    ("M01", "家具、寝具、灯具与预制建筑", range(94, 95), "M", "manufactures"),
    ("M02", "玩具、游戏与体育用品", range(95, 96), "M", "manufactures"),
    ("M03", "杂项个人与消费制品", range(96, 97), "M", "manufactures"),
    ("O01", "艺术品、收藏品与古董", range(97, 98), "O", "special_goods"),
    ("Z99", "未按品类列明商品", range(99, 100), "Z", "all_goods"),
]


TOPIC_TAG_LABELS = {
    "green_manufacturing": "绿色制造相关",
    "battery_chain": "电池产业链",
    "solar_pv_chain": "光伏产业链",
    "ev_chain": "新能源汽车链",
    "semiconductor_chain": "半导体与电子链",
    "medical_health": "医疗健康制造",
    "industrial_equipment": "工业设备",
    "infrastructure_materials": "基础设施材料",
    "consumer_goods": "消费制造品",
    "strategic_transport": "战略交通装备",
}


TOPIC_TAG_COLORS = {
    "green_manufacturing": "#7ed957",
    "battery_chain": "#4ecdc4",
    "solar_pv_chain": "#ffd166",
    "ev_chain": "#5fa8ff",
    "semiconductor_chain": "#8b7cff",
    "medical_health": "#ff6b81",
    "industrial_equipment": "#67d69a",
    "infrastructure_materials": "#c9a46a",
    "consumer_goods": "#f778ba",
    "strategic_transport": "#ff8b5c",
}


BATTERY_HS6 = {"850720", "850730", "850740", "850750", "850760", "850780"}
SOLAR_HS6 = {"854140", "854142", "854143", "850440", "850132", "850133"}
EV_HS6 = {"870380", "870390", "870240", "870360", "850760"}
SEMICONDUCTOR_PREFIXES = ("8541", "8542", "8486", "8473", "9030", "9031")
GREEN_HS6 = BATTERY_HS6 | SOLAR_HS6 | {"850760", "854140", "854143"}


FINE_CATEGORY_LABELS = {item[0]: item[1] for item in MINOR_CATEGORY_DEFINITIONS}
CATEGORY_TO_GROUP = {item[0]: item[3] for item in MINOR_CATEGORY_DEFINITIONS}
CATEGORY_SCOPE = {item[0]: item[4] for item in MINOR_CATEGORY_DEFINITIONS}
FINE_CATEGORY_COLORS = {
    fine_id: GROUP_CATEGORY_COLORS[group_id]
    for fine_id, _, _, group_id, _ in MINOR_CATEGORY_DEFINITIONS
}


CHAPTER_TO_FINE: dict[int, str] = {}
FINE_TO_CHAPTERS: dict[str, list[int]] = {}
GROUP_TO_CHAPTERS: dict[str, list[int]] = {}
for fine_id, _, chapters, group_id, _scope in MINOR_CATEGORY_DEFINITIONS:
    chapter_list = list(chapters)
    FINE_TO_CHAPTERS[fine_id] = chapter_list
    GROUP_TO_CHAPTERS.setdefault(group_id, [])
    for chapter in chapter_list:
        CHAPTER_TO_FINE[chapter] = fine_id
        if chapter not in GROUP_TO_CHAPTERS[group_id]:
            GROUP_TO_CHAPTERS[group_id].append(chapter)


SECTION_BY_CHAPTER: dict[int, str] = {}
SECTION_LABELS = {}
for section_id, section_name, chapters in HS_SECTION_DEFINITIONS:
    SECTION_LABELS[section_id] = section_name
    for chapter in chapters:
        SECTION_BY_CHAPTER[chapter] = section_id


def normalize_hs6(code: str | int) -> str:
    return str(code).strip().zfill(6)


def chapter_from_hs6(code: str | int) -> int | None:
    hs6 = normalize_hs6(code)
    if not hs6.isdigit():
        return None
    return int(hs6[:2])


def section_from_chapter(chapter: int) -> str | None:
    return SECTION_BY_CHAPTER.get(int(chapter))


def classify_fine_category(hs2: int) -> str | None:
    return CHAPTER_TO_FINE.get(int(hs2))


def classify_group_category(fine_category: str) -> str | None:
    return CATEGORY_TO_GROUP.get(fine_category)


def classify_scope(fine_category: str) -> str:
    return CATEGORY_SCOPE.get(fine_category, "manufactures")


def classify_hs6(code: str | int) -> dict | None:
    chapter = chapter_from_hs6(code)
    if chapter is None:
        return None
    fine_id = classify_fine_category(chapter)
    if not fine_id:
        return None
    group_id = classify_group_category(fine_id)
    section_id = section_from_chapter(chapter) or "Z"
    return {
        "hs6": normalize_hs6(code),
        "hsChapter": chapter,
        "hsSection": section_id,
        "hsSectionName": SECTION_LABELS.get(section_id, "未按品类列明商品"),
        "analysisMinor": fine_id,
        "analysisMinorName": FINE_CATEGORY_LABELS[fine_id],
        "analysisMajor": group_id,
        "analysisMajorName": GROUP_CATEGORY_LABELS[group_id],
        "scope": classify_scope(fine_id),
    }


def topic_tags_for_product(hs6: str, fine_category: str, product_name: str | None = None) -> list[str]:
    hs6 = normalize_hs6(hs6)
    tags: list[str] = []

    if hs6 in GREEN_HS6:
        tags.append("green_manufacturing")
    if hs6 in BATTERY_HS6:
        tags.append("battery_chain")
    if hs6 in SOLAR_HS6:
        tags.append("solar_pv_chain")
    if hs6 in EV_HS6 or fine_category == "K02":
        tags.append("ev_chain")
    if hs6.startswith(SEMICONDUCTOR_PREFIXES) or fine_category == "J02":
        tags.append("semiconductor_chain")
    if fine_category in {"D03", "L01"}:
        tags.append("medical_health")
    if fine_category == "J01":
        tags.append("industrial_equipment")
    if fine_category in {"C01", "G01", "G02", "G03", "I01", "I02", "I03"}:
        tags.append("infrastructure_materials")
    if fine_category in {"F04", "F05", "F06", "F07", "M01", "M02", "M03"}:
        tags.append("consumer_goods")
    if fine_category in {"K01", "K02", "K03", "K04", "N01"}:
        tags.append("strategic_transport")

    deduped = []
    for tag in tags:
        if tag not in deduped:
            deduped.append(tag)
    return deduped


def topic_tag_text(tags: Iterable[str]) -> str:
    cleaned = [tag for tag in tags if tag in TOPIC_TAG_LABELS]
    return "|".join(cleaned)


def hs_section_metadata() -> list[dict]:
    payload = []
    for section_id, name, chapters in HS_SECTION_DEFINITIONS:
        chapter_list = list(chapters)
        payload.append(
            {
                "id": section_id,
                "name": name,
                "chapterStart": chapter_list[0],
                "chapterEnd": chapter_list[-1],
                "chapters": chapter_list,
            }
        )
    payload.append(
        {
            "id": "Z",
            "name": "未按品类列明商品",
            "chapterStart": 99,
            "chapterEnd": 99,
            "chapters": [99],
        }
    )
    return payload


def hs_chapter_metadata() -> list[dict]:
    payload = []
    for chapter in sorted(CHAPTER_TO_FINE):
        fine_id = CHAPTER_TO_FINE[chapter]
        group_id = CATEGORY_TO_GROUP[fine_id]
        payload.append(
            {
                "chapter": chapter,
                "id": f"HS{chapter:02d}",
                "name": f"HS{chapter:02d}",
                "sectionId": SECTION_BY_CHAPTER.get(chapter, "Z"),
                "sectionName": SECTION_LABELS.get(SECTION_BY_CHAPTER.get(chapter, "Z"), "未按品类列明商品"),
                "analysisMajorId": group_id,
                "analysisMajorName": GROUP_CATEGORY_LABELS[group_id],
                "analysisMinorId": fine_id,
                "analysisMinorName": FINE_CATEGORY_LABELS[fine_id],
                "scope": CATEGORY_SCOPE[fine_id],
            }
        )
    return payload


def group_category_metadata() -> list[dict]:
    order = list(GROUP_CATEGORY_LABELS)
    return [
        {
            "id": group_id,
            "name": GROUP_CATEGORY_LABELS[group_id],
            "color": GROUP_CATEGORY_COLORS[group_id],
            "chapters": sorted(GROUP_TO_CHAPTERS.get(group_id, [])),
            "isDefaultManufacturing": group_id in {"D", "E", "F", "G", "I", "J", "K", "L", "M"},
        }
        for group_id in order
    ]


def fine_category_metadata() -> list[dict]:
    payload = []
    for fine_id, name, _chapters, group_id, scope in MINOR_CATEGORY_DEFINITIONS:
        payload.append(
            {
                "id": fine_id,
                "name": name,
                "color": FINE_CATEGORY_COLORS[fine_id],
                "groupId": group_id,
                "groupName": GROUP_CATEGORY_LABELS[group_id],
                "scope": scope,
                "sectionId": SECTION_BY_CHAPTER.get(FINE_TO_CHAPTERS[fine_id][0], "Z"),
                "sectionName": SECTION_LABELS.get(SECTION_BY_CHAPTER.get(FINE_TO_CHAPTERS[fine_id][0], "Z"), "未按品类列明商品"),
                "chapters": FINE_TO_CHAPTERS[fine_id],
                "isManufacturing": scope == "manufactures",
            }
        )
    return payload


def topic_tag_metadata() -> list[dict]:
    return [
        {
            "id": topic_id,
            "name": TOPIC_TAG_LABELS[topic_id],
            "color": TOPIC_TAG_COLORS[topic_id],
        }
        for topic_id in TOPIC_TAG_LABELS
    ]


def scope_metadata() -> list[dict]:
    return [
        {"id": scope_id, "name": scope_name}
        for scope_id, scope_name in SCOPE_LABELS.items()
    ]
