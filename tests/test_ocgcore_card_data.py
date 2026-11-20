import unittest
from tools.export_ocgcore_card_data import convert_row, packed_setcodes

TYPE_LINK = 0x04000000


class OcgCoreCardDataTests(unittest.TestCase):
    def test_normal_monster_mapping(self):
        card = convert_row((46986414, 0, 0x123400000000, 0x11, 2500, 2100,
                            7, 2, 32))
        self.assertEqual(card["code"], 46986414)
        self.assertEqual(card["setcodes"], [0x1234])
        self.assertEqual(card["level"], 7)
        self.assertEqual(card["race"], 2)
        self.assertEqual(card["defense"], 2100)
        self.assertEqual(card["link_marker"], 0)

    def test_pendulum_scales(self):
        raw_level = 0x04040007
        card = convert_row((1, 0, 0, 0x01000011, 1000, 1000,
                            raw_level, 1, 1))
        self.assertEqual(card["level"], 7)
        self.assertEqual(card["lscale"], 4)
        self.assertEqual(card["rscale"], 4)

    def test_link_def_field_is_marker(self):
        marker = 0b010010001
        card = convert_row((2, 0, 0, TYPE_LINK | 0x21, 2300, marker,
                            3, 0x1000000, 0x20))
        self.assertEqual(card["defense"], 0)
        self.assertEqual(card["link_marker"], marker)

    def test_setcode_order_and_empty_parts(self):
        self.assertEqual(packed_setcodes(0x00000000000300020001),
                         [1, 2, 3])

    def test_reject_invalid_code(self):
        with self.assertRaises(ValueError):
            convert_row((0, 0, 0, 0, 0, 0, 0, 0, 0))


if __name__ == "__main__":
    unittest.main()
