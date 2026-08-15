import sys
import os
from pprint import pprint

# Ensure src is importable when running tests
TEST_ROOT = os.path.dirname(__file__)
REPO_ROOT = os.path.abspath(os.path.join(TEST_ROOT, ".."))
SRC_PATH = os.path.join(REPO_ROOT, "src")
if SRC_PATH not in sys.path:
    sys.path.insert(0, SRC_PATH)

import time
from entities.npc_interaction import NPCInteraction
from entities.npc import NPC, NPCType
from entities.player import Player, PlayerClass


def test_talk_reputation_and_history():
    npc = NPC(npc_id="npc_test_1", name="TestNPC", npc_type=NPCType.MERCHANT)
    player = Player(name="TestPlayer", character_class=PlayerClass.TRADER, player_id="p_test")

    inter = NPCInteraction()
    # initial reputation should be 0
    assert getattr(player, "npc_relationships", None) is None or player.npc_relationships == {}

    res = inter.interact_with_npc(player, npc, interaction_type="talk", current_time=1000.0)
    assert res["success"] is True
    # after first talk, reputation should change by -1 (default branch in code)
    assert player.npc_relationships[npc.npc_id] == -1
    # dialogue history recorded
    assert npc.npc_id in inter.dialogue_history
    assert len(inter.dialogue_history[npc.npc_id]) >= 1


def test_trade_offers_only_merchant():
    merchant = NPC(npc_id="npc_m", name="MerchantMike", npc_type=NPCType.MERCHANT)
    commoner = NPC(npc_id="npc_c", name="CommonChetan", npc_type=NPCType.RESIDENT)
    player = Player(name="P", character_class=PlayerClass.ROGUE, player_id="p2")

    inter = NPCInteraction()
    r1 = inter.interact_with_npc(player, merchant, interaction_type="trade", current_time=2000.0)
    assert r1["success"] is True
    assert "offers" in r1["payload"]

    r2 = inter.interact_with_npc(player, commoner, interaction_type="trade", current_time=2005.0)
    assert r2["success"] is False


def test_work_with_matching_method():
    npc = NPC(npc_id="npc_w", name="Worker", npc_type=NPCType.WORKER)
    npc.earning_method = "street_vendor"

    player = Player(name="P", character_class=PlayerClass.TRADER, player_id="p3")
    player.stats.current_earning_method = "street_vendor"

    inter = NPCInteraction()
    res = inter.interact_with_npc(player, npc, interaction_type="work", current_time=3000.0)
    assert res["success"] is True
    assert res["payload"].get("method") == "street_vendor"


def test_fight_initiates_combat_flag():
    npc = NPC(npc_id="npc_f", name="Baddie", npc_type=NPCType.CRIMINAL)
    player = Player(name="P", character_class=PlayerClass.WARRIOR, player_id="p4")

    inter = NPCInteraction()
    res = inter.interact_with_npc(player, npc, interaction_type="fight", current_time=4000.0)
    assert res["success"] is True
    assert res["payload"].get("combat") is True


def test_cooldown_enforced():
    npc = NPC(npc_id="npc_cd", name="CooldownNPC", npc_type=NPCType.MERCHANT)
    player = Player(name="P", character_class=PlayerClass.SCHOLAR, player_id="p5")

    inter = NPCInteraction(default_cooldown=2.0)
    t = 5000.0
    first = inter.interact_with_npc(player, npc, interaction_type="talk", current_time=t)
    assert first["success"] is True

    # Immediate second interaction should be blocked
    second = inter.interact_with_npc(player, npc, interaction_type="talk", current_time=t)
    assert second["success"] is False

    # After cooldown passes it should be allowed
    third = inter.interact_with_npc(player, npc, interaction_type="talk", current_time=t + 3.0)
    assert third["success"] is True
