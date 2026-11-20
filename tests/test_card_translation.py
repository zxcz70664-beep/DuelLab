import unittest
from card_translation import map_translation

class TranslationMappingTests(unittest.TestCase):
    def test_official_simplified_chinese_fields(self):
        name, desc, fallback = map_translation({
            "cn_name": "社区译名",
            "text": {"sc_name": "官方简中名", "desc": "官方效果"}
        })
        self.assertEqual(name, "官方简中名")
        self.assertEqual(desc, "官方效果")
        self.assertEqual(fallback, "社区译名")

    def test_pendulum_and_monster_effect_are_both_preserved(self):
        _, desc, _ = map_translation({
            "text": {"pdesc": "灵摆效果", "desc": "怪兽效果"}
        })
        self.assertEqual(desc, "〖灵摆效果〗\n灵摆效果\n〖怪兽效果〗\n怪兽效果")

    def test_no_official_translation_keeps_fallback_separate(self):
        name, desc, fallback = map_translation({"cn_name": "通用译名", "text": {}})
        self.assertIsNone(name)
        self.assertIsNone(desc)
        self.assertEqual(fallback, "通用译名")

    def test_missing_record_is_safe(self):
        self.assertEqual(map_translation(None), (None, None, None))

if __name__ == "__main__":
    unittest.main()
