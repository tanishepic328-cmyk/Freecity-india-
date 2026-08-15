"""
NPC Interaction System
Player-NPC interactions and dialogue
"""
from typing import Dict, List, Optional, Any
import logging
import random
import time

logger = logging.getLogger(__name__)

# Try to import NPCAIState from entities.npc if available; otherwise use a small fallback.
try:
    from entities.npc import NPCAIState  # type: ignore
except Exception:
    from enum import Enum

    class NPCAIState(Enum):
        IDLE = 0
        MOVING = 1
        EATING = 2
        FLEEING = 3


class InteractionResult(dict):
    """Helper to create structured interaction results"""

    def __init__(self, success: bool, message: str = "", payload: Optional[dict] = None):
        super().__init__({"success": success, "message": message, "payload": payload or {}})


class NPCInteraction:
    """Handle interactions between player and NPCs"""

    def __init__(self, default_cooldown: float = 2.0):
        self.dialogue_history: Dict[str, List[str]] = {}
        self.interaction_cooldowns: Dict[str, float] = {}
        self.default_cooldown = default_cooldown

    def can_interact(self, npc_id: str, current_time: Optional[float] = None) -> bool:
        """Check if can interact with NPC (time in seconds)."""
        now = current_time if current_time is not None else time.time()
        cooldown_end = self.interaction_cooldowns.get(npc_id, 0.0)
        return now >= cooldown_end

    def _set_cooldown(self, npc_id: str, seconds: Optional[float] = None, current_time: Optional[float] = None) -> None:
        now = current_time if current_time is not None else time.time()
        self.interaction_cooldowns[npc_id] = now + (seconds if seconds is not None else self.default_cooldown)

    def interact_with_npc(self, player: Any, npc: Any, interaction_type: str = "talk", current_time: Optional[float] = None) -> InteractionResult:
        """Handle interaction between player and NPC. Returns an InteractionResult dict-like object."""
        npc_id = getattr(npc, "npc_id", None)
        if npc_id is None:
            return InteractionResult(False, "Invalid NPC.")

        if not self.can_interact(npc_id, current_time=current_time):
            return InteractionResult(False, "You need to wait before interacting again.")

        # Route interaction
        if interaction_type == "talk":
            res = self._talk_to_npc(player, npc)
        elif interaction_type == "trade":
            res = self._trade_with_npc(player, npc)
        elif interaction_type == "work":
            res = self._work_with_npc(player, npc)
        elif interaction_type == "fight":
            res = self._fight_with_npc(player, npc)
        else:
            res = InteractionResult(False, f"Unknown interaction type: {interaction_type}")

        # Set cooldown after any interaction
        self._set_cooldown(npc_id, current_time=current_time)
        return res

    def _talk_to_npc(self, player: Any, npc: Any) -> InteractionResult:
        """Talk to NPC and return dialogue with possible reputation change."""
        npc_id = getattr(npc, "npc_id", "unknown")
        # Ensure player has relationship map
        if not hasattr(player, "npc_relationships"):
            try:
                player.npc_relationships = {}
            except Exception:
                # If we cannot set it, use a temp local
                player.npc_relationships = {}

        reputation = player.npc_relationships.get(npc_id, 0)

        # Select dialogue based on reputation
        if reputation > 50:
            dialogue = getattr(npc, "socialize_with_player", lambda name: f"Good to see you, {name}!")(player.name)
            rep_change = 0
        elif reputation > 0:
            dialogue = f"Hey there, {player.name}!"
            rep_change = 1
        elif reputation > -30:
            dialogue = "Oh, it's you..."
            rep_change = -1
        else:
            dialogue = "Stay away from me!"
            rep_change = -2

        # Update reputation (clamp)
        player.npc_relationships[npc_id] = max(-100, min(100, reputation + rep_change))

        # Add to dialogue history
        self.dialogue_history.setdefault(npc_id, []).append(dialogue)
        logger.info(f"Player talked to {getattr(npc, 'name', npc_id)}: {dialogue}")

        return InteractionResult(True, dialogue, {"reputation": player.npc_relationships[npc_id]})

    def _trade_with_npc(self, player: Any, npc: Any) -> InteractionResult:
        """Trade with NPC: returns trade offers if merchant."""
        npc_type = getattr(getattr(npc, "npc_type", None), "value", None)
        if npc_type == "merchant":
            # Example offer generation (could be replaced with real inventory)
            offers = [
                {"item": "samosa", "price": 10, "qty": 10},
                {"item": "water", "price": 20, "qty": 5},
            ]
            message = f"{getattr(npc, 'name', 'Merchant')} shows you their wares."
            return InteractionResult(True, message, {"offers": offers})
        else:
            return InteractionResult(False, "This NPC is not interested in trading.")

    def _work_with_npc(self, player: Any, npc: Any) -> InteractionResult:
        """Attempt to work with NPC: returns whether job can be taken or partnership formed."""
        # If npc has earning_method and it matches player's current method, offer collaboration
        npc_method = getattr(npc, "earning_method", None)
        player_method = getattr(getattr(player, "stats", None), "current_earning_method", None)
        if npc_method and player_method and npc_method == player_method:
            message = f"You and {getattr(npc,'name','NPC')} can work together in {npc_method}."
            return InteractionResult(True, message, {"method": npc_method})
        else:
            message = f"{getattr(npc,'name','NPC')} cannot help with your current work."
            return InteractionResult(False, message)

    def _fight_with_npc(self, player: Any, npc: Any) -> InteractionResult:
        """Initiate fight: return simple combat-start message (actual combat handled elsewhere)."""
        message = f"{getattr(npc, 'name', 'NPC')}: You want trouble?"
        logger.warning(f"Combat requested between player {getattr(player,'name', None)} and NPC {getattr(npc,'name', None)}")
        return InteractionResult(True, message, {"combat": True})


class NPCBehavior:
    """Complex NPC behavior patterns"""

    def __init__(self):
        self.behavior_patterns = {
            "worker": self._worker_behavior,
            "resident": self._resident_behavior,
            "merchant": self._merchant_behavior,
            "criminal": self._criminal_behavior,
            "tourist": self._tourist_behavior,
        }

    def execute_behavior(self, npc: Any, world: Any) -> None:
        """Execute NPC behavior"""
        npc_type = getattr(getattr(npc, "npc_type", None), "value", None)
        if npc_type in self.behavior_patterns:
            try:
                self.behavior_patterns[npc_type](npc, world)
            except Exception as e:
                logger.exception(f"Error executing behavior for NPC {getattr(npc,'npc_id', 'unknown')}: {e}")

    def _worker_behavior(self, npc: Any, world: Any) -> None:
        """Worker NPC behavior"""
        if not getattr(npc, "current_job", None) and random.random() < 0.7:
            try:
                npc.start_work()
            except Exception:
                pass
        elif getattr(npc, "current_job", None) is None and getattr(getattr(npc, 'stats', None), 'hunger', 100) < 50:
            try:
                npc.ai.current_state = NPCAIState.EATING
            except Exception:
                pass

    def _resident_behavior(self, npc: Any, world: Any) -> None:
        """Resident NPC behavior (simple demo routine)"""
        hour = 12
        try:
            current_activity = npc.daily_routine.get_current_activity(hour)
            if current_activity == "working":
                if not npc.current_job:
                    npc.start_work()
            elif current_activity == "eating":
                npc.eat()
            elif current_activity == "sleeping":
                npc.rest()
        except Exception:
            pass

    def _merchant_behavior(self, npc: Any, world: Any) -> None:
        """Merchant NPC behavior"""
        if random.random() < 0.8:
            try:
                npc.stop()
            except Exception:
                pass
        else:
            try:
                npc.move_towards(random.uniform(0, 1000), random.uniform(0, 1000))
            except Exception:
                pass

    def _criminal_behavior(self, npc: Any, world: Any) -> None:
        """Criminal NPC behavior"""
        if random.random() < 0.3:
            try:
                npc.move_towards(random.uniform(0, 1000), random.uniform(0, 1000))
            except Exception:
                pass
        else:
            try:
                npc.stop()
            except Exception:
                pass

    def _tourist_behavior(self, npc: Any, world: Any) -> None:
        """Tourist NPC behavior"""
        if random.random() < 0.5:
            try:
                npc.move_towards(random.uniform(0, 1000), random.uniform(0, 1000))
            except Exception:
                pass
        else:
            try:
                npc.stop()
            except Exception:
                pass


class GroupBehavior:
    """Handle group behaviors like friendships and conflicts"""

    @staticmethod
    def form_group(npcs: List[Any]) -> None:
        """Form NPC groups"""
        for npc in npcs:
            if getattr(npc, "friends", None):
                friend_npc = next((n for n in npcs if getattr(n, "npc_id", None) in npc.friends), None)
                if friend_npc:
                    try:
                        npc.move_towards(friend_npc.x, friend_npc.y)
                    except Exception:
                        pass

    @staticmethod
    def handle_conflicts(npcs: List[Any]) -> None:
        """Handle conflicts between NPCs"""
        for npc in npcs:
            if getattr(npc, "enemies", None):
                for enemy_id in npc.enemies:
                    enemy_npc = next((n for n in npcs if getattr(n, "npc_id", None) == enemy_id), None)
                    if enemy_npc:
                        distance = ((npc.x - enemy_npc.x)**2 + (npc.y - enemy_npc.y)**2)**0.5
                        if distance < 100:
                            if random.random() < 0.5:
                                try:
                                    npc.ai.current_state = NPCAIState.FLEEING
                                except Exception:
                                    pass
