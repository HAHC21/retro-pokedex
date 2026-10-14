"""Checklist method text. A rod is named only when every wild encounter needs one."""

from scripts.poke_compile.helpers import _wild_label


def test_magikarp_names_both_rods_and_a_walked_encounter_stays_wild():
    """UC-CHK-02. Magikarp in Red and Blue is the Old Rod and the Super Rod. A species you can also walk into says a wild encounter."""
    magikarp = _wild_label(
        [
            ("old-rod", 50, "Pallet Town"),
            ("super-rod", 20, "Route 6"),
        ]
    )
    assert "Old Rod" in magikarp
    assert "Super Rod" in magikarp
    assert "Wild Encounter" not in magikarp

    walked = _wild_label(
        [
            ("walk", 40, "Route 1"),
            ("old-rod", 10, "Route 1"),
        ]
    )
    assert walked.startswith("Wild Encounter")
    assert "Old Rod" not in walked

    shuckle = _wild_label([("rock-smash", 30, "Rock Tunnel")])
    assert "Rock Smash" in shuckle
    assert "Wild Encounter" not in shuckle
