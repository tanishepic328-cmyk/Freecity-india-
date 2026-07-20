"""
NPC Interaction System
Player-NPC interactions and dialogue
"""

from typing import Dict, List, Optional
import logging
import random

logger = logging.getLogger(__name__)


class NPCInteraction:
    """Handle interactions between player and NPCs"""
    
    def __init__(self):
        self.dialogue_history: Dict[str, List[str]] = {}
        self.interaction_cooldowns: Dict[str, float] = {}
    
    def can_interact(self, npc_id: str, current_time: float) -> bool:
        """Check if can interact with NPC"""
        if npc_id not in self.interaction_cooldowns:
            return True
        
        cooldown_end = self.interaction_cooldowns[npc_id]
        return current_time >= cooldown_end
    
    def interact_with_npc(self, player, npc, interaction_type: str = "talk") -> Optional[str]:
        """Handle interaction between player and NPC"""
        
        if interaction_type == "talk":
            return self._talk_to_npc(player, npc)
        elif interaction_type == "trade":
            return self._trade_with_npc(player, npc)
        elif interaction_type == "work":
            return self._work_with_npc(player, npc)
        elif interaction_type == "fight":
            return self._fight_with_npc(player, npc)
    
    def _talk_to_npc(self, player, npc) -> str:
        """Talk to NPC"""
        # Get dialogue based on NPC personality and relationship
        npc_id = npc.npc_id
        
        # Check reputation
        reputation = player.npc_relationships.get(npc_id, 0) if hasattr(player, 'npc_relationships') else 0
        
        # Select dialogue based on reputation
        if reputation > 50:
            dialogue = npc.socialize_with_player(player.name)
        elif reputation > 0:
            dialogue = f"Hey there, {player.name}!"
        elif reputation > -30:
            dialogue = "Oh, it's you..."
        else:
            dialogue = "Stay away from me!"
        
        # Add to dialogue history
        if npc_id not in self.dialogue_history:
            self.dialogue_history[npc_id] = []
        
        self.dialogue_history[npc_id].append(dialogue)
        
        logger.info(f"Player talked to {npc.name}: {dialogue}")
        return dialogue
    
    def _trade_with_npc(self, player, npc) -> str:
        """Trade with NPC"""
        if npc.npc_type.value == "merchant":
            dialogue = f"Looking to trade, {player.name}? I have good deals!"
            return dialogue
        else:
            dialogue = "I'm not interested in trading."
            return dialogue
    
    def _work_with_npc(self, player, npc) -> str:
        """Work with NPC"""
        if npc.earning_method == player.stats.current_earning_method:
            dialogue = f"You also work in {npc.earning_method}? Let's work together!"
            return dialogue
        else:
            dialogue = "We work in different fields, can't help much."
            return dialogue
    
    def _fight_with_npc(self, player, npc) -> str:
        """Fight with NPC"""
        dialogue = "You want trouble?"
        # Combat system would handle the actual fight
        return dialogue


class NPCBehavior:
    """Complex NPC behavior patterns"""
    
    def __init__(self):
        self.behavior_patterns = {
            "worker": self._worker_behavior,
            "resident": self._resident_behavior,
            "merchant": self._merchant_behavior,
            "criminal": self._criminal_behavior,
            "tourist": self._tourist_behavior
        }
    
    def execute_behavior(self, npc, world) -> None:
        """Execute NPC behavior"""
        npc_type = npc.npc_type.value
        
        if npc_type in self.behavior_patterns:
            self.behavior_patterns[npc_type](npc, world)
    
    def _worker_behavior(self, npc, world) -> None:
        """Worker NPC behavior"""
        # Workers spend most time working
        if not npc.current_job and random.random() < 0.7:
            npc.start_work()
        elif npc.current_job is None and npc.stats.hunger < 50:
            # Look for food
            npc.ai.current_state = __import__('entities.npc', fromlist=['NPCAIState']).NPCAIState.EATING
    
    def _resident_behavior(self, npc, world) -> None:
        """Resident NPC behavior"""
        # Residents have routine life
        hour = 12  # Simulated hour
        current_activity = npc.daily_routine.get_current_activity(hour)
        
        if current_activity == "working":
            if not npc.current_job:
                npc.start_work()
        elif current_activity == "eating":
            npc.eat()
        elif current_activity == "sleeping":
            npc.rest()
    
    def _merchant_behavior(self, npc, world) -> None:
        """Merchant NPC behavior"""
        # Merchants stay in markets and sell
        if random.random() < 0.8:
            # Stay in place and wait for customers
            npc.stop()
        else:
            # Move around market
            npc.move_towards(random.uniform(0, 1000), random.uniform(0, 1000))
    
    def _criminal_behavior(self, npc, world) -> None:
        """Criminal NPC behavior"""
        # Criminals look for opportunities
        if random.random() < 0.3:
            # Patrol area
            npc.move_towards(random.uniform(0, 1000), random.uniform(0, 1000))
        else:
            # Wait and watch
            npc.stop()
    
    def _tourist_behavior(self, npc, world) -> None:
        """Tourist NPC behavior"""
        # Tourists explore landmarks
        if random.random() < 0.5:
            # Move to random location
            npc.move_towards(random.uniform(0, 1000), random.uniform(0, 1000))
        else:
            # Stop and look around
            npc.stop()


class GroupBehavior:
    """Handle group behaviors like friendships and conflicts"""
    
    @staticmethod
    def form_group(npcs: List) -> None:
        """Form NPC groups"""
        # Find friends and make them hang out together
        for npc in npcs:
            if npc.friends:
                friend_npc = next((n for n in npcs if n.npc_id in npc.friends), None)
                if friend_npc:
                    # Move towards friend
                    npc.move_towards(friend_npc.x, friend_npc.y)
    
    @staticmethod
    def handle_conflicts(npcs: List) -> None:
        """Handle conflicts between NPCs"""
        for npc in npcs:
            if npc.enemies:
                for enemy_id in npc.enemies:
                    enemy_npc = next((n for n in npcs if n.npc_id == enemy_id), None)
                    if enemy_npc:
                        # Move away from enemy or prepare to fight
                        distance = ((npc.x - enemy_npc.x)**2 + (npc.y - enemy_npc.y)**2)**0.5
                        if distance < 100:
                            # Start conflict
                            if random.random() < 0.5:
                                npc.ai.current_state = __import__('entities.npc', fromlist=['NPCAIState']).NPCAIState.FLEEING
